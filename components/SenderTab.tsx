
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useData, Template } from "@/contexts/DataContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, Send, Play, AlertCircle, CheckCircle, Loader2, Download, FileJson, Plus, Trash2, Users, UserPlus } from "lucide-react";

interface Recipient {
  [key: string]: any;
}

export default function SenderTab() {
  const { user } = useAuth();
  const { templates, fetchBatches, fetchStats } = useData();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [fileData, setFileData] = useState<any[]>([]);
  const [fileName, setFileName] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  
  const [sending, setSending] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sentCount, setSentCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [totalRecipients, setTotalRecipients] = useState(0);

  // Manual entry mode state
  const [sendMode, setSendMode] = useState<'bulk' | 'manual'>('bulk');
  const [manualFormValues, setManualFormValues] = useState<Record<string, string>>({});
  const [manualRecipients, setManualRecipients] = useState<Recipient[]>([]);

  // Extract variables from template string
  const extractVariables = (text: string) => {
    const regex = /\[([^\]]+)\]/g;
    const matches = new Set<string>();
    let match;
    while ((match = regex.exec(text)) !== null) {
        matches.add(match[1]);
    }
    return Array.from(matches);
  };

  const getTemplateVariables = (template: Template) => {
      const subjectVars = extractVariables(template.subject);
      const bodyVars = extractVariables(template.body);
      // specific standard vars might be excluded if we hardcode logic, but let's keep all [Bracketed] items
      return Array.from(new Set([...subjectVars, ...bodyVars]));
  };

  const downloadSample = (format: 'xlsx' | 'json') => {
      const template = templates.find(t => t.id === selectedTemplateId);
      if (!template) return;

      const variables = getTemplateVariables(template);
      // Create headers: sr_no, hr_email, ...variables
      const headers = ['sr_no', 'hr_email', ...variables];
      
      // Create dummy data row
      const dummyRow: any = { sr_no: 1, hr_email: 'example@company.com' };
      variables.forEach(v => dummyRow[v] = `Value for ${v}`);

      if (format === 'xlsx') {
          const ws = XLSX.utils.json_to_sheet([dummyRow], { header: headers });
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Recipients");
          XLSX.writeFile(wb, `${template.name.replace(/\s+/g, '_')}_sample.xlsx`);
      } else {
          const jsonString = JSON.stringify([dummyRow], null, 2);
          const blob = new Blob([jsonString], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${template.name.replace(/\s+/g, '_')}_sample.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
      }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result as string;
      let data: any[] = [];
      
      if (file.name.endsWith('.json')) {
          try {
              data = JSON.parse(bstr);
          } catch (e) {
              alert("Invalid JSON file");
              return;
          }
      } else {
          const wb = XLSX.read(bstr, { type: "binary" });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          data = XLSX.utils.sheet_to_json(ws);
      }
      
      // Validate columns
      const template = templates.find(t => t.id === selectedTemplateId);
      if (template) {
        // Basic validation: check if hr_email exists (case insensitive)
        const hasEmail = data.some(row => row['hr_email'] || row['HR_EMAIL'] || row['email'] || row['Email']);
        if (!hasEmail && data.length > 0) {
             alert("Warning: Could not find 'hr_email' column in the uploaded file. Please ensure it exists.");
        }
      }

      setRecipients(data as Recipient[]);
    };
    
    if (file.name.endsWith('.json')) {
        reader.readAsText(file);
    } else {
        reader.readAsBinaryString(file);
    }
  };

  const generateAndReplace = (template: Template, recipient: Recipient) => {
    let subject = template.subject;
    let body = template.body;

    // Regex to find content between [brackets]
    const placeholderRegex = /\[([^\]]+)\]/g;

    // Helper to find value case-insensitively
    const getValue = (key: string) => {
        // Direct match
        if (recipient[key] !== undefined) return recipient[key];
        // Case insensitive match
        const foundKey = Object.keys(recipient).find(k => k.toLowerCase() === key.toLowerCase());
        return foundKey ? recipient[foundKey] : "";
    };

    // Replace in Subject
    subject = subject.replace(placeholderRegex, (match, key) => {
        const val = getValue(key);
        return val !== undefined ? val : match;
    });

    // Replace in Body
    body = body.replace(placeholderRegex, (match, key) => {
        const val = getValue(key);
        return val !== undefined ? val : match;
    });

    return { subject, body };
  };

  // Helper to add a manual recipient row
  const addManualRecipient = () => {
    const email = manualFormValues['hr_email']?.trim();
    if (!email) {
      alert('Please enter a recipient email.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert('Please enter a valid email address.');
      return;
    }
    const newRecipient: Recipient = { ...manualFormValues };
    setManualRecipients(prev => [...prev, newRecipient]);
    // Clear form but keep template variable keys
    const cleared: Record<string, string> = {};
    Object.keys(manualFormValues).forEach(k => cleared[k] = '');
    setManualFormValues(cleared);
  };

  const removeManualRecipient = (index: number) => {
    setManualRecipients(prev => prev.filter((_, i) => i !== index));
  };

  // When manual recipients change, sync to the main recipients state so sendBulkEmails works
  useEffect(() => {
    if (sendMode === 'manual') {
      setRecipients(manualRecipients);
    }
  }, [manualRecipients, sendMode]);

  // Effect to update preview based on selection
  useEffect(() => {
    const template = templates.find(t => t.id === selectedTemplateId);
    if (!template) {
        setPreviewHtml("");
        return;
    }

    // In manual mode, show preview from current form values
    if (sendMode === 'manual') {
        const hasAnyValue = Object.values(manualFormValues).some(v => v.trim());
        if (hasAnyValue) {
            const previewRecipient: Recipient = { ...manualFormValues };
            const { subject, body } = generateAndReplace(template, previewRecipient);
            const htmlBody = body.replace(/\n/g, "<br/>");
            const email = manualFormValues['hr_email'] || 'recipient@example.com';
            setPreviewHtml(`
                <div class="border-b pb-2 mb-2"><strong>To:</strong> ${email}</div>
                <div class="border-b pb-2 mb-2"><strong>Subject:</strong> ${subject}</div>
                <div class="whitespace-pre-wrap">${htmlBody}</div>
            `);
        } else {
            const htmlBody = template.body.replace(/\n/g, "<br/>");
            setPreviewHtml(`
                <div class="border-b pb-2 mb-2"><strong>Subject:</strong> ${template.subject}</div>
                <div class="whitespace-pre-wrap text-gray-500 italic">Body preview (placeholders will be replaced):</div>
                <div class="whitespace-pre-wrap">${htmlBody}</div>
            `);
        }
        return;
    }

    // Bulk mode: If recipients loaded, show first recipient data
    if (recipients.length > 0) {
        const firstRecipient = recipients[0];
        const { subject, body } = generateAndReplace(template, firstRecipient);
        const htmlBody = body.replace(/\n/g, "<br/>"); // simple nl2br
        
        // Find email
        const email = firstRecipient['hr_email'] || firstRecipient['email'] || firstRecipient['Email'] || "Unknown";

        setPreviewHtml(`
            <div class="border-b pb-2 mb-2"><strong>To:</strong> ${email}</div>
            <div class="border-b pb-2 mb-2"><strong>Subject:</strong> ${subject}</div>
            <div class="whitespace-pre-wrap">${htmlBody}</div>
        `);
    } else {
        // Show template preview with placeholders
        const htmlBody = template.body.replace(/\n/g, "<br/>");
        setPreviewHtml(`
            <div class="border-b pb-2 mb-2"><strong>Subject:</strong> ${template.subject}</div>
            <div class="whitespace-pre-wrap text-gray-500 italic">Body preview (placeholders will be replaced):</div>
            <div class="whitespace-pre-wrap">${htmlBody}</div>
        `);
    }
  }, [selectedTemplateId, recipients, sendMode, manualFormValues]);


  const sendBulkEmails = async () => {
    if (!user || !selectedTemplateId || recipients.length === 0) return;
    const template = templates.find(t => t.id === selectedTemplateId);
    if (!template) return;

    if (!confirm(`Are you sure you want to send emails to ${recipients.length} recipients?`)) return;

    // Fetch encrypted App Password from Client (Allowed by Rules)
    let encryptedAppPassword = "";
    try {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            encryptedAppPassword = userDoc.data().appPassword;
        }
    } catch (err) {
        console.error("Error fetching credentials:", err);
    }

    if (!encryptedAppPassword) {
        alert("App Password not fully configured. Please check your settings.");
        return;
    }

    setShowSendModal(true);
    setSending(true);
    setProgress(0);
    setSentCount(0);
    setErrorCount(0);
    setLogs([]);
    setTotalRecipients(recipients.length);

    const BATCH_SIZE = 3;
    const total = recipients.length;
    let successCount = 0; // Local counter (not React state) for accurate tracking

    for (let i = 0; i < total; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      const promises = batch.map(async (recipient, idx) => {
        const globalIdx = i + idx;
        const email = recipient['hr_email'] || recipient['email'] || recipient['Email'];
        
        if (!email) {
            setLogs(prev => [`Skipped row ${globalIdx + 1}: No email found`, ...prev]);
            setErrorCount(prev => prev + 1);
            return;
        }

        const { subject, body } = generateAndReplace(template, recipient);
        const html = body.replace(/\n/g, "<br/>");

        try {
          const res = await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: email,
              subject,
              html,
              userId: user.uid,
              userEmail: user.email,
              encryptedAppPassword, // Pass the credential
              attachments: template.attachments || [] // Pass attachments
            })
          });

          if (!res.ok) throw new Error('Failed to send');
          
          successCount++;
          setSentCount(prev => prev + 1);
        } catch (error) {
          setErrorCount(prev => prev + 1);
          setLogs(prev => [`Failed to send to ${email}`, ...prev]);
        }
      });

      await Promise.all(promises);
      setProgress(Math.min(((i + BATCH_SIZE) / total) * 100, 100));
      // Small delay to be nice to the API/SMTP
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Update stats once with actual success count (1 write instead of N)
    if (successCount > 0) {
      const { increment } = await import("firebase/firestore");
      await updateDoc(doc(db, "users", user.uid, "stats", "general"), {
        sent: increment(successCount)
      });
    }

    setSending(false);
    // Modal stays open so user can see results — they close it manually
    
    // Record Batch History
    await addDoc(collection(db, "users", user.uid, "bulk_batches"), {
      templateId: selectedTemplateId,
      templateName: template.name,
      totalRecipients: total,
      sentCount: successCount,
      timestamp: new Date()
    });

    // Refresh shared data
    await Promise.all([fetchBatches(), fetchStats()]);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left Column: Workflow */}
        <div className="space-y-8">
            {/* Step 1: Select Template */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 transition-all hover:shadow-md">
                <div className="flex items-center justify-between mb-4">
                     <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600 dark:bg-blue-900 dark:text-blue-300">1</span>
                        Select Template
                     </h3>
                </div>
                <select
                    value={selectedTemplateId}
                    onChange={(e) => {
                        setSelectedTemplateId(e.target.value);
                        setRecipients([]); // Reset recipients on template change
                        setFileName("");
                        setManualRecipients([]);
                        // Initialize manual form with template variables
                        const tmpl = templates.find(t => t.id === e.target.value);
                        if (tmpl) {
                          const vars = getTemplateVariables(tmpl);
                          const initial: Record<string, string> = { hr_email: '' };
                          vars.forEach(v => initial[v] = '');
                          setManualFormValues(initial);
                        }
                    }}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                >
                    <option value="">-- Choose a Template --</option>
                    {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>


                {/* Mode Toggle */}
                {selectedTemplateId && (
                    <div className="mt-6 border-t border-gray-100 pt-4 dark:border-zinc-800">
                        <p className="text-sm text-gray-500 mb-3">How do you want to add recipients?</p>
                        <div className="flex rounded-lg border border-gray-200 dark:border-zinc-700 overflow-hidden">
                            <button
                                onClick={() => { setSendMode('bulk'); setRecipients([]); setManualRecipients([]); }}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                                    sendMode === 'bulk'
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-zinc-900 dark:text-gray-400 dark:hover:bg-zinc-800'
                                }`}
                            >
                                <Upload className="h-4 w-4" />
                                Bulk File
                            </button>
                            <button
                                onClick={() => { setSendMode('manual'); setRecipients([]); setFileName(''); }}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                                    sendMode === 'manual'
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-zinc-900 dark:text-gray-400 dark:hover:bg-zinc-800'
                                }`}
                            >
                                <UserPlus className="h-4 w-4" />
                                Manual Entry
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Step 2: Upload File (Bulk) or Manual Entry Form */}
            {selectedTemplateId && sendMode === 'bulk' && (
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 transition-all hover:shadow-md animate-in slide-in-from-top-4 duration-500">
                    <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600 dark:bg-blue-900 dark:text-blue-300">2</span>
                        Upload Filled File
                    </h3>
                    <div className="relative flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-8 hover:bg-gray-50 dark:border-zinc-700 dark:hover:bg-zinc-800/50 transition-colors">
                        <input
                            type="file"
                            accept=".xlsx, .xls, .csv, .json"
                            onChange={handleFileUpload}
                            className="absolute inset-0 cursor-pointer opacity-0"
                        />
                        <div className="text-center">
                            {fileName ? (
                            <>
                                <FileSpreadsheet className="mx-auto h-12 w-12 text-green-600 mb-3" />
                                <p className="text-base font-medium text-gray-900 dark:text-white">{fileName}</p>
                                <p className="text-sm text-gray-500 mt-1">{recipients.length} recipients found</p>
                            </>
                            ) : (
                            <>
                                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                                <p className="text-base font-medium text-gray-900 dark:text-white">Click to upload filled file</p>
                                <p className="text-sm text-gray-500 mt-1">Supports .xlsx, .json</p>
                            </>
                            )}
                        </div>
                    </div>
                    <div className="mt-4 border-t border-gray-100 pt-4 dark:border-zinc-800">
                        <p className="text-sm text-gray-500 mb-3">Download a sample file for this template:</p>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => downloadSample('xlsx')}
                                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100 dark:border-green-900/30 dark:bg-green-900/20 dark:text-green-400"
                            >
                                <FileSpreadsheet className="h-4 w-4" />
                                Sample Excel
                            </button>
                            <button 
                                onClick={() => downloadSample('json')}
                                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 dark:border-amber-900/30 dark:bg-amber-900/20 dark:text-amber-400"
                            >
                                <FileJson className="h-4 w-4" />
                                Sample JSON
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 2: Manual Entry Form */}
            {selectedTemplateId && sendMode === 'manual' && (
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 transition-all hover:shadow-md animate-in slide-in-from-top-4 duration-500">
                    <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600 dark:bg-blue-900 dark:text-blue-300">2</span>
                        Add Recipients
                    </h3>

                    {/* Input Row */}
                    <div className="space-y-3">
                        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(Object.keys(manualFormValues).length, 4)}, 1fr)` }}>
                            {Object.keys(manualFormValues).map(key => (
                                <div key={key}>
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 capitalize">
                                        {key === 'hr_email' ? 'Email *' : key}
                                    </label>
                                    <input
                                        type={key === 'hr_email' ? 'email' : 'text'}
                                        value={manualFormValues[key]}
                                        onChange={(e) => setManualFormValues(prev => ({ ...prev, [key]: e.target.value }))}
                                        placeholder={key === 'hr_email' ? 'name@company.com' : `Enter ${key}`}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addManualRecipient(); } }}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    />
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={addManualRecipient}
                            className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors dark:bg-blue-900/20 dark:border-blue-900/30 dark:text-blue-400"
                        >
                            <Plus className="h-4 w-4" />
                            Add Recipient
                        </button>
                    </div>

                    {/* Recipients Table */}
                    {manualRecipients.length > 0 && (
                        <div className="mt-5">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                                    <Users className="h-4 w-4" />
                                    {manualRecipients.length} recipient{manualRecipients.length !== 1 ? 's' : ''} added
                                </p>
                                <button
                                    onClick={() => { setManualRecipients([]); setRecipients([]); }}
                                    className="text-xs text-red-500 hover:text-red-700 transition-colors"
                                >
                                    Clear all
                                </button>
                            </div>
                            <div className="rounded-lg border border-gray-200 dark:border-zinc-700 overflow-hidden">
                                <div className="overflow-x-auto max-h-48 overflow-y-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 dark:bg-zinc-800 sticky top-0">
                                            <tr>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">#</th>
                                                {Object.keys(manualFormValues).map(key => (
                                                    <th key={key} className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 capitalize">{key}</th>
                                                ))}
                                                <th className="px-3 py-2 w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                            {manualRecipients.map((r, i) => (
                                                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                                                    <td className="px-3 py-2 text-gray-400 text-xs">{i + 1}</td>
                                                    {Object.keys(manualFormValues).map(key => (
                                                        <td key={key} className="px-3 py-2 text-gray-700 dark:text-gray-300 truncate max-w-[150px]">{r[key] || '-'}</td>
                                                    ))}
                                                    <td className="px-3 py-2">
                                                        <button onClick={() => removeManualRecipient(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Step 3: Send (Only visible after file uploaded) */}
            {recipients.length > 0 && !sending && (
                <button
                    onClick={sendBulkEmails}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-4 text-lg font-bold text-white shadow-lg transition-all hover:bg-blue-700 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] animate-in slide-in-from-bottom-4"
                >
                    <Send className="h-6 w-6" />
                    Send to {recipients.length} Recipients
                </button>
            )}

            {/* Sending Progress Modal - shown inline placeholder */}
        </div>

        {/* Right Column: Preview & Logs */}
        <div className="space-y-6">
           <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sticky top-6">
             <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Play className="h-5 w-5 text-gray-500" />
                Live Preview
             </h3>
             {previewHtml ? (
               <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 font-mono text-sm dark:border-zinc-700 dark:bg-black dark:text-gray-300" dangerouslySetInnerHTML={{ __html: previewHtml }} />
             ) : (
               <div className="flex flex-col items-center justify-center py-12 text-gray-400 border border-dashed border-gray-200 rounded-lg dark:border-zinc-800">
                 <p>Select a template to see preview</p>
               </div>
             )}
           </div>

           {logs.length > 0 && (
             <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
               <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Activity Log</h3>
               <div className="h-48 overflow-y-auto rounded-lg bg-gray-50 p-4 text-xs font-mono dark:bg-black border border-gray-100 dark:border-zinc-800">
                 {logs.map((log, i) => (
                   <div key={i} className="mb-1 text-gray-600 dark:text-gray-400 border-b border-gray-100 dark:border-zinc-900 pb-1 last:border-0">{log}</div>
                 ))}
               </div>
             </div>
           )}
        </div>
      </div>

      {/* Full-Screen Sending Modal */}
      {showSendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg mx-4 rounded-2xl border border-gray-200 bg-white p-8 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              {sending ? (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                </div>
              ) : errorCount > 0 ? (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                </div>
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              )}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {sending ? 'Sending Emails...' : 'Send Complete'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {sending ? 'Please wait, do not close this page.' : `Finished sending to ${totalRecipients} recipients.`}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-300">Progress</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">{Math.round(progress)}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-zinc-700 mb-4">
              <div
                className={`h-full rounded-full transition-all duration-300 ease-out ${
                  !sending && errorCount === 0 ? 'bg-green-500' : !sending && errorCount > 0 ? 'bg-amber-500' : 'bg-blue-600'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Stats */}
            <div className="flex gap-6 mb-6">
              <div className="flex-1 rounded-lg border border-green-200 bg-green-50 p-3 text-center dark:border-green-900/30 dark:bg-green-900/10">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{sentCount}</p>
                <p className="text-xs font-medium text-green-700 dark:text-green-300 flex items-center justify-center gap-1">
                  <CheckCircle className="h-3 w-3" /> Sent
                </p>
              </div>
              <div className="flex-1 rounded-lg border border-red-200 bg-red-50 p-3 text-center dark:border-red-900/30 dark:bg-red-900/10">
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{errorCount}</p>
                <p className="text-xs font-medium text-red-700 dark:text-red-300 flex items-center justify-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Failed
                </p>
              </div>
              <div className="flex-1 rounded-lg border border-gray-200 bg-gray-50 p-3 text-center dark:border-zinc-700 dark:bg-zinc-800">
                <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">{totalRecipients}</p>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
                  <Send className="h-3 w-3" /> Total
                </p>
              </div>
            </div>

            {/* Activity Log */}
            {logs.length > 0 && (
              <div className="mb-6">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Activity Log</p>
                <div className="h-32 overflow-y-auto rounded-lg bg-gray-50 p-3 text-xs font-mono dark:bg-black border border-gray-100 dark:border-zinc-800">
                  {logs.map((log, i) => (
                    <div key={i} className="mb-1 text-gray-600 dark:text-gray-400 border-b border-gray-100 dark:border-zinc-900 pb-1 last:border-0">{log}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Close Button (only after completion) */}
            {!sending && (
              <button
                onClick={() => setShowSendModal(false)}
                className="w-full rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white hover:bg-gray-800 transition-colors dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
