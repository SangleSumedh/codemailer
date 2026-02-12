
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { db } from "@/lib/firebase";
import { deleteDoc, doc } from "firebase/firestore";
import { useState } from "react";
import { Trash2, MessageSquare, Briefcase, Calendar, MessageCircle, Search } from "lucide-react";

export default function ResponsesTab() {
  const { user } = useAuth();
  const { replies, loading, fetchReplies } = useData();
  const [filterHR, setFilterHR] = useState("");
  const [filterCompany, setFilterCompany] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDate, setFilterDate] = useState("");

  const handleDelete = async (id: string) => {
    if (!user || !confirm("Delete this response record? This will NOT decrement your global stats manually.")) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "replies", id));
      await fetchReplies(); // Refresh shared data
    } catch (error) {
      console.error("Error deleting reply:", error);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading responses...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Responses Received</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Track and manage your interactions.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Filter by HR Name..."
            value={filterHR}
            onChange={(e) => setFilterHR(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
          />
        </div>
        <div className="relative flex-1">
          <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Filter by Company..."
            value={filterCompany}
            onChange={(e) => setFilterCompany(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
          />
        </div>
        <div className="relative sm:w-40">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-white appearance-none"
          >
            <option value="">All Status</option>
            <option value="Positive">Positive</option>
            <option value="Negative">Negative</option>
            <option value="Neutral">Neutral</option>
          </select>
        </div>
        <div className="relative sm:w-44">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
          />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden dark:border-zinc-800 dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
            <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-zinc-800 dark:text-gray-300">
              <tr>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">HR Name</th>
                <th className="px-6 py-3 font-medium">Company</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Reply Content</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
              {(() => {
                const filtered = replies.filter(r => {
                  const matchHR = r.hrName.toLowerCase().includes(filterHR.toLowerCase());
                  const matchCompany = r.companyName.toLowerCase().includes(filterCompany.toLowerCase());
                  const matchStatus = !filterStatus || r.status === filterStatus;
                  const matchDate = !filterDate || (r.date && new Date(r.date.toDate()).toISOString().split('T')[0] === filterDate);
                  return matchHR && matchCompany && matchStatus && matchDate;
                });
                return filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                       <MessageSquare className="h-8 w-8 text-gray-300" />
                       <p>{replies.length === 0 ? 'No responses recorded yet.' : 'No matches found.'}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((reply) => (
                  <tr key={reply.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {new Date(reply.date.toDate()).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                      {reply.hrName}
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-gray-400" />
                          {reply.companyName}
                       </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        reply.status === 'Positive' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                        reply.status === 'Negative' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                        'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                      }`}>
                        {reply.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate" title={reply.replyContent}>
                      {reply.replyContent ? (
                         <span className="text-gray-700 dark:text-gray-300">{reply.replyContent}</span>
                      ) : (
                         <span className="text-gray-400 italic">No content</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDelete(reply.id)}
                        className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              );
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
