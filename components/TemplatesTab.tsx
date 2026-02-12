
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useData, Template, Resume } from "@/contexts/DataContext";
import { db } from "@/lib/firebase";
import { addDoc, collection, deleteDoc, doc, updateDoc } from "firebase/firestore";
import React, { useState, useRef } from "react";
import { Copy, Edit, Plus, Trash2, X, Save, ChevronDown, Paperclip, Loader2, FileText, Upload, Download, Import } from "lucide-react";

const DEFAULT_TEMPLATES = [
  {
    name: "Cold Mail 1",
    subject: "Application for [Job_Title]",
    body: `Hi [HR_Name],
I came across opportunities at [Company_Name] and wanted to express my interest. I’m a final-year Computer Engineering student with hands-on experience building scalable backend systems and REST APIs.
Currently, I’m working on production-grade features including role-based systems and high-concurrency testing platforms at Gryphon Academy as Software Engineer - Intern. I would love to bring this experience to your team.

Please find my resume attached. Looking forward to connecting.

Regards,
Sumedh Sangle`,
    attachments: [] // Attachments are specific to the user, so we leave this empty for the default template
  }
];

const ALLOWED_VARIABLES = [
  "[HR_Name]",
  "[Company_Name]",
  "[Job_Title]",
  "[Your_Name]",
  "[Your_Phone]",
  "[Your_Email]",
  "[Resume_Link]"
];

export default function TemplatesTab() {
  const { user } = useAuth();
  const { templates, resumes, loading, fetchTemplates, fetchResumes } = useData();
  const [activeTab, setActiveTab] = useState<'templates' | 'resumes'>('templates');
  
  // Templates State
  const [isEditing, setIsEditing] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<Partial<Template>>({ name: "", subject: "", body: "", attachments: [] });

  // Resumes State
  const [uploadingResume, setUploadingResume] = useState(false);

  // Refs
  const subjectRef = useRef<HTMLTextAreaElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [lastFocusedField, setLastFocusedField] = useState<'subject' | 'body' | null>(null);


  // --- Resume Logic ---

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0 || !user) return;

      if (resumes.length + files.length > 3) {
          alert("You can only have a maximum of 3 resumes.");
          e.target.value = ""; // reset
          return;
      }

      setUploadingResume(true);

      for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (file.size > 500 * 1024) { // 500KB
              alert(`File ${file.name} is too large (max 500KB).`);
              continue;
          }

          const formData = new FormData();
          formData.append('file', file);

          try {
              const res = await fetch('/api/upload', {
                  method: 'POST',
                  body: formData
              });
              const data = await res.json();
              if (data.url) {
                  // Save to Firestore
                  await addDoc(collection(db, "users", user.uid, "resumes"), {
                      name: file.name,
                      url: data.url,
                      public_id: data.public_id,
                      createdAt: new Date()
                  });
              }
          } catch (err) {
              console.error("Upload failed", err);
              alert("Failed to upload " + file.name);
          }
      }
      await fetchResumes();
      setUploadingResume(false);
      e.target.value = "";
  };

  const deleteResume = async (id: string) => {
      if (!user || !confirm("Delete this resume?")) return;
      try {
          await deleteDoc(doc(db, "users", user.uid, "resumes", id));
          await fetchResumes();
      } catch (err) {
          console.error("Error deleting resume", err);
      }
  };


  // --- Template Logic ---

  const handleSaveTemplate = async () => {
    if (!user || !currentTemplate.name || !currentTemplate.subject || !currentTemplate.body) {
        alert("Please fill in all fields.");
        return;
    }
    
    try {
      if (currentTemplate.id) {
        await updateDoc(doc(db, "users", user.uid, "templates", currentTemplate.id), {
          name: currentTemplate.name,
          subject: currentTemplate.subject,
          body: currentTemplate.body,
          attachments: currentTemplate.attachments || [],
          updatedAt: new Date()
        });
      } else {
        await addDoc(collection(db, "users", user.uid, "templates"), {
          ...currentTemplate,
          attachments: currentTemplate.attachments || [],
          createdAt: new Date()
        });
      }
      await fetchTemplates();
      setIsEditing(false);
      setCurrentTemplate({ name: "", subject: "", body: "", attachments: [] });
    } catch (error: any) {
      console.error("Error saving template:", error);
      alert("Failed to save template");
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!user || !confirm("Are you sure you want to delete this template?")) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "templates", id));
      await fetchTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
    }
  };

  const exportTemplate = (template: Template) => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(template, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `${template.name.replace(/\s+/g, '_')}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
  };

  const handleImportFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const json = JSON.parse(event.target?.result as string);
              // Open editor with imported data (removing ID so it creates new)
              setCurrentTemplate({
                  name: json.name || "",
                  subject: json.subject || "",
                  body: json.body || "",
                  attachments: [] // We don't import attachments as URLs might be invalid/external
              });
              setShowImportModal(false);
              setIsEditing(true);
          } catch (error) {
              alert("Invalid JSON file");
          }
      };
      reader.readAsText(file);
      e.target.value = ""; // reset
  };

  const loadDefaultTemplate = (template: any) => {
      setCurrentTemplate({ ...template });
      setShowImportModal(false);
      setIsEditing(true);
  };

  const startEdit = (template?: Template) => {
    if (template) {
      setCurrentTemplate({ ...template, attachments: template.attachments || [] });
    } else {
      setCurrentTemplate({ name: "", subject: "", body: "", attachments: [] });
    }
    setIsEditing(true);
    setLastFocusedField(null);
  };

  const toggleResumeAttachment = (resume: Resume) => {
      const currentAttachments = currentTemplate.attachments || [];
      const isAlreadyAttached = currentAttachments.some(a => a.url === resume.url);
      if (isAlreadyAttached) {
          // Remove
          setCurrentTemplate(prev => ({
              ...prev,
              attachments: prev.attachments?.filter(a => a.url !== resume.url)
          }));
      } else {
          if (currentAttachments.length >= 3) {
            alert("Max 3 attachments allowed.");
            return;
          }
          setCurrentTemplate(prev => ({
              ...prev,
              attachments: [...(prev.attachments || []), { name: resume.name, url: resume.url }]
          }));
      }
  };

  // ... insertVariable (unchanged)
  const insertVariable = (variable: string) => {
    if (!lastFocusedField) {
        // Default to body if nothing focused
        const textarea = bodyRef.current;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = currentTemplate.body || "";
            const newText = text.substring(0, start) + variable + text.substring(end);
            setCurrentTemplate({ ...currentTemplate, body: newText });
            
            // Restore focus and cursor
            setTimeout(() => {
                textarea.focus();
                textarea.selectionStart = textarea.selectionEnd = start + variable.length;
            }, 0);
        }
        return;
    }

    if (lastFocusedField === 'subject' && subjectRef.current) {
        const textarea = subjectRef.current;
        const start = textarea.selectionStart || 0;
        const end = textarea.selectionEnd || 0;
        const text = currentTemplate.subject || "";
        const newText = text.substring(0, start) + variable + text.substring(end);
        setCurrentTemplate({ ...currentTemplate, subject: newText });
         setTimeout(() => {
            textarea.focus();
            textarea.selectionStart = textarea.selectionEnd = start + variable.length;
        }, 0);
    } else if (lastFocusedField === 'body' && bodyRef.current) {
        const textarea = bodyRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = currentTemplate.body || "";
        const newText = text.substring(0, start) + variable + text.substring(end);
        setCurrentTemplate({ ...currentTemplate, body: newText });
         setTimeout(() => {
            textarea.focus();
            textarea.selectionStart = textarea.selectionEnd = start + variable.length;
        }, 0);
    }
  };


  return (
    <div className="space-y-6">
      {/* Top Bar with Tabs */}
      <div className="flex items-center justify-between">
         <div className="flex items-center bg-gray-100 dark:bg-zinc-800 p-1 rounded-lg">
             <button
                onClick={() => setActiveTab('templates')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'templates' ? 'bg-white text-blue-600 shadow-sm dark:bg-zinc-700 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
             >
                 Templates
             </button>
             <button
                onClick={() => setActiveTab('resumes')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'resumes' ? 'bg-white text-blue-600 shadow-sm dark:bg-zinc-700 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
             >
                 Resumes
             </button>
         </div>

         {activeTab === 'templates' && (
           <>
           <div className="flex items-center gap-2">
            <button
              onClick={() => startEdit()}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Create Template
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="ml-2 flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-gray-300 dark:hover:bg-zinc-700"
            >
              <Import className="h-4 w-4" />
              Import
            </button>
          </div>
          </> // Added fragment to wrap buttons
         )}
         {activeTab === 'resumes' && (
             <label className={`flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 cursor-pointer ${uploadingResume ? 'opacity-50 pointer-events-none' : ''}`}>
                 {uploadingResume ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                 Upload Resume
                 <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleResumeUpload} disabled={uploadingResume} multiple />
             </label>
         )}
      </div>

      {/* --- TEMPLATES VIEW --- */}
      {activeTab === 'templates' && (
        <div className="animate-in fade-in slide-in-from-left-4 duration-300">
             {loading ? <p className="text-center p-8 text-gray-500">Loading templates...</p> : (
                <>
                 {templates.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center dark:border-zinc-700">
                        <p className="text-gray-500 dark:text-gray-400">No templates yet. Create your first one!</p>
                    </div>
                 ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {templates.map((t) => (
                        <div key={t.id} className="group relative rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
                            <div className="mb-2 flex items-start justify-between">
                                <h3 className="font-semibold text-gray-900 dark:text-white">{t.name}</h3>
                                <div className="flex gap-2">
                                    <button onClick={() => startEdit(t)} className="text-gray-400 hover:text-blue-500 dark:hover:text-blue-400">
                                        <Edit className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => deleteTemplate(t.id)} className="text-gray-400 hover:text-red-500 dark:hover:text-red-400">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => exportTemplate(t)} className="text-gray-400 hover:text-blue-500 dark:hover:text-blue-400" title="Export JSON">
                                        <Download className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            <p className="mb-4 text-xs text-gray-500 dark:text-gray-400 truncate">Subject: {t.subject}</p>
                            <div className="line-clamp-3 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                                {t.body}
                            </div>
                            {t.attachments && t.attachments.length > 0 && (
                                <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
                                    <Paperclip className="h-3 w-3" />
                                    {t.attachments.length} Attachment(s)
                                </div>
                            )}
                        </div>
                    ))}
                    </div>
                 )}
                </>
             )}
        </div>
      )}


      {/* --- RESUMES VIEW --- */}
      {activeTab === 'resumes' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              {loading ? <p className="text-center p-8 text-gray-500">Loading resumes...</p> : (
                <>
                    {resumes.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center dark:border-zinc-700">
                            <p className="text-gray-500 dark:text-gray-400">No resumes uploaded. Upload one to use in your templates.</p>
                            <p className="text-xs text-gray-400 mt-1">Max 3 resumes allowed (500KB limit each).</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {resumes.map(r => (
                                <div key={r.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                            <FileText className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-gray-900 dark:text-white">{r.name}</h4>
                                            <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">View File</a>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => deleteResume(r.id)}
                                        className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                </div>
                            ))}
                            <p className="text-xs text-center text-gray-400 mt-4">Showing {resumes.length}/3 allowed resumes.</p>
                        </div>
                    )}
                </>
              )}
          </div>
      )}

      {/* --- TEMPLATE MODAL --- */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="flex h-[85vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-xl dark:bg-zinc-900 dark:border dark:border-zinc-800">
                <div className="flex items-center justify-between border-b border-gray-200 p-6 dark:border-zinc-800">
                    <h2 className="text-xl font-bold dark:text-white">{currentTemplate.id ? "Edit Template" : "New Template"}</h2>
                    <button onClick={() => setIsEditing(false)} className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-zinc-800">
                        <X className="h-5 w-5 dark:text-white" />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Template Name</label>
                        <input
                            type="text"
                            value={currentTemplate.name}
                            onChange={(e) => setCurrentTemplate({ ...currentTemplate, name: e.target.value })}
                            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                            placeholder="e.g. Follow Up #1"
                        />
                    </div>

                    {/* Variable Toolbar (Same as before) */}
                    <div className="flex items-center justify-between rounded-lg bg-gray-50 p-2 border border-gray-200 dark:bg-zinc-800 dark:border-zinc-700">
                        <span className="text-xs font-medium text-gray-500 ml-2 dark:text-gray-400">Insert Variable:</span>
                        <div className="relative group">
                            <select 
                                onChange={(e) => {
                                    if(e.target.value) {
                                        insertVariable(e.target.value);
                                        e.target.value = ""; 
                                    }
                                }}
                                className="appearance-none cursor-pointer rounded-md border border-gray-300 bg-white py-1.5 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                            >
                                <option value="">Select a variable...</option>
                                {ALLOWED_VARIABLES.map(v => (
                                    <option key={v} value={v}>{v}</option>
                                ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subject Line</label>
                        <HighlightedEditor
                            ref={subjectRef}
                            value={currentTemplate.subject || ""}
                            onChange={(val) => setCurrentTemplate({ ...currentTemplate, subject: val })}
                            onFocus={() => setLastFocusedField('subject')}
                            placeholder="Regarding..."
                            className="h-10 text-sm font-sans"
                            singleLine={true}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Content (HTML supported)
                        </label>
                        <HighlightedEditor
                            ref={bodyRef}
                            value={currentTemplate.body || ""}
                            onChange={(val) => setCurrentTemplate({ ...currentTemplate, body: val })}
                            onFocus={() => setLastFocusedField('body')}
                            placeholder="Hi [HR_Name], ..."
                            className="h-[300px] text-sm font-mono"
                        />
                    </div>

                    {/* Resume Selection Section */}
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                        <div className="flex items-center justify-between mb-2">
                             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Attach Resumes</label>
                             <span className="text-xs text-gray-500">{currentTemplate.attachments?.length || 0} selected</span>
                        </div>
                        
                        {resumes.length === 0 ? (
                            <p className="text-sm text-gray-500 italic">No resumes uploaded yet. Go to the "Resumes" tab to upload.</p>
                        ) : (
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                {resumes.map(resume => {
                                    const isSelected = currentTemplate.attachments?.some(a => a.url === resume.url);
                                    return (
                                        <div key={resume.id} 
                                             onClick={() => toggleResumeAttachment(resume)}
                                             className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 bg-white hover:border-blue-300 dark:border-zinc-700 dark:bg-zinc-900'}`}
                                        >
                                            <div className={`flex h-5 w-5 items-center justify-center rounded border ${isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white'}`}>
                                                {isSelected && <Upload className="h-3 w-3 rotate-180" />} {/* Just a check icon equivalent */}
                                            </div>
                                            <div className="flex-1 overflow-hidden">
                                                <p className="text-sm font-medium truncate dark:text-gray-200">{resume.name}</p>
                                            </div>
                                             <a href={resume.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs text-gray-400 hover:text-blue-500">
                                                <FileText className="h-4 w-4" />
                                            </a>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                </div>

                <div className="border-t border-gray-200 p-6 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 rounded-b-2xl flex justify-end gap-3">
                    <button
                        onClick={() => setIsEditing(false)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg dark:text-gray-300 dark:hover:bg-zinc-800"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSaveTemplate}
                        className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                        <Save className="h-4 w-4" />
                        Save Template
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* --- IMPORT MODAL --- */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900 dark:border dark:border-zinc-800">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold dark:text-white">Import Template</h2>
                    <button onClick={() => setShowImportModal(false)} className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-zinc-800">
                        <X className="h-5 w-5 dark:text-white" />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Option 1: Default Templates */}
                    <div>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Start with a Default Template</h3>
                        <div className="grid gap-2">
                            {DEFAULT_TEMPLATES.map((t, idx) => (
                                <button 
                                    key={idx}
                                    onClick={() => loadDefaultTemplate(t)}
                                    className="flex items-center justify-between w-full p-3 text-left rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 dark:border-zinc-700 dark:hover:bg-zinc-800 transition-all group"
                                >
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">{t.name}</p>
                                        <p className="text-xs text-gray-500 truncate max-w-[250px]">{t.subject}</p>
                                    </div>
                                    <Plus className="h-4 w-4 text-gray-400 group-hover:text-blue-500" />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-gray-200 dark:border-zinc-700" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-2 text-gray-500 dark:bg-zinc-900">Or</span>
                        </div>
                    </div>

                    {/* Option 2: Upload JSON */}
                    <div>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Upload JSON File</h3>
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800 dark:border-zinc-700 transition-colors">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Upload className="h-8 w-8 text-gray-400 mb-2" />
                                <p className="text-sm text-gray-500 dark:text-gray-400">Click to upload template JSON</p>
                            </div>
                            <input type="file" className="hidden" accept=".json" onChange={handleImportFileUpload} />
                        </label>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}

// Highlighted Textarea Component
interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  placeholder?: string;
  ref?: React.Ref<HTMLTextAreaElement>;
  className?: string; // Add className
  singleLine?: boolean; // Add singleLine
}


const HighlightedEditor = React.forwardRef<HTMLTextAreaElement, EditorProps>(({ value, onChange, onFocus, placeholder, className, singleLine }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const backdropRef = useRef<HTMLDivElement>(null);

    const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
        if (backdropRef.current) {
            backdropRef.current.scrollTop = e.currentTarget.scrollTop;
            backdropRef.current.scrollLeft = e.currentTarget.scrollLeft;
        }
    };

    // Parse text to wrap variables in spans
    const renderHighlights = (text: string) => {
        // Regex to match [Variable_Name]
        const parts = text.split(/(\[[a-zA-Z0-9_]+\])/g);
        
        return parts.map((part, index) => {
            if (part.startsWith('[') && part.endsWith(']')) {
                return <span key={index} className="bg-blue-100 text-transparent dark:bg-blue-900 inline-block align-top">{part}</span>;
            }
            return <span key={index}>{part}</span>;
        });
    };

    // Need to ensure trailing newline is handled in backdrop so height matches
    const safeValue = value.endsWith('\n') ? value + ' ' : value;

    // Handle keydown for single line: prevent enter
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (singleLine && e.key === 'Enter') {
            e.preventDefault();
        }
    };

    return (
        <div className={`relative mt-1 w-full rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 overflow-hidden focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500 ${className || 'h-[300px]'}`}>
            {/* Backdrop Layer */}
            <div 
                ref={backdropRef}
                className={`absolute inset-0 pointer-events-none whitespace-pre-wrap break-words p-3 text-transparent bg-transparent z-0 overflow-hidden ${singleLine ? 'overflow-hidden whitespace-nowrap' : ''}`}
                style={{ fontFamily: 'inherit' }} // Changed to inherit to respect container font
            >
                {renderHighlights(safeValue)}
            </div>

            {/* Editing Layer */}
            <textarea
                ref={ref}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onFocus={onFocus}
                onScroll={handleScroll}
                onKeyDown={handleKeyDown}
                className={`absolute inset-0 w-full h-full resize-none p-3 bg-transparent z-10 focus:outline-none dark:text-white ${singleLine ? 'overflow-hidden whitespace-nowrap' : ''}`}
                style={{ fontFamily: 'inherit' }} // Changed to inherit
                placeholder={placeholder}
                spellCheck={false}
                rows={singleLine ? 1 : undefined}
            />
        </div>
    );
});
HighlightedEditor.displayName = "HighlightedEditor";
