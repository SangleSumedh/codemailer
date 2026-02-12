
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Mail, BarChart3, FileText, Send, LogOut, Code2 } from "lucide-react";
import { useState } from "react";
import StatsTab from "@/components/StatsTab";
import TemplatesTab from "@/components/TemplatesTab";
import SenderTab from "@/components/SenderTab";
import ResponsesTab from "@/components/ResponsesTab";

export default function Layout() {
  const { logout, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'stats' | 'templates' | 'sender' | 'responses'>('stats');

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-black overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-gray-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex h-16 items-center px-6 border-b border-gray-100 dark:border-zinc-800">
           <Code2 className="h-6 w-6 text-blue-600 mr-2" />
           <span className="text-lg font-bold text-gray-900 dark:text-white">CodeMailer</span>
        </div>
        <nav className="flex flex-col space-y-1 p-4">
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'stats'
                ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-100"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-zinc-800"
            }`}
          >
            <BarChart3 className="h-5 w-5" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'templates'
                ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-100"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-zinc-800"
            }`}
          >
            <FileText className="h-5 w-5" />
            Templates
          </button>
          <button
            onClick={() => setActiveTab('sender')}
            className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'sender'
                ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-100"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-zinc-800"
            }`}
          >
            <Send className="h-5 w-5" />
            Sender
          </button>
          <button
            onClick={() => setActiveTab('responses')}
            className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'responses'
                ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-100"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-zinc-800"
            }`}
          >
            <Mail className="h-5 w-5" />
            Responses
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-8 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-4">
           
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-gray-500 sm:block dark:text-gray-400">
              {user?.email}
            </span>
            <button
              onClick={logout}
              className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-zinc-700 dark:text-gray-300 dark:hover:bg-zinc-800"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </header>

        {/* content area */}
        <main className="flex-1 overflow-y-auto p-8">
            <div className="mx-auto max-w-6xl">
                {activeTab === 'stats' && <StatsTab />}
                {activeTab === 'templates' && <TemplatesTab />}
                {activeTab === 'sender' && <SenderTab />}
                {activeTab === 'responses' && <ResponsesTab />}
            </div>
        </main>
      </div>
    </div>
  );
}
