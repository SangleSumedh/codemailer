
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
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* Fixed Top Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center border-b border-gray-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2">
           <img src="/codemailer_updated.png" alt="CodeMailer" className="h-12 w-auto object-contain" />
         
        </div>
      </nav>

      {/* Content Wrapper */}
      <div className="flex pt-16 min-h-screen">
        {/* Sticky Sidebar */}
        <aside 
          className="group sticky top-16 h-[calc(100vh-4rem)] w-20 flex flex-col border-r border-gray-200 bg-white transition-all duration-300 ease-in-out hover:w-64 dark:border-zinc-800 dark:bg-zinc-900 shrink-0 z-40"
        >
          <nav className="flex flex-col flex-1 space-y-2 p-3 overflow-y-auto mt-4">
            {[
              { id: 'stats', label: 'Dashboard', icon: BarChart3 },
              { id: 'templates', label: 'Templates', icon: FileText },
              { id: 'sender', label: 'Sender', icon: Send },
              { id: 'responses', label: 'Responses', icon: Mail },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`flex items-center rounded-xl p-3 text-sm font-medium transition-colors ${
                  activeTab === item.id
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-100"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-zinc-800"
                }`}
              >
                <item.icon className="h-6 w-6 flex-shrink-0" />
                <span className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap overflow-hidden">
                  {item.label}
                </span>
              </button>
            ))}
          </nav>

          {/* Sidebar Footer: User & Sign Out */}
          <div className="p-3 border-t border-gray-100 dark:border-zinc-800">
              <div className="flex items-center gap-3 px-3 py-2 overflow-hidden whitespace-nowrap">
                  <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold shrink-0">
                      {user?.email?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[140px]">{user?.email}</span>
                  </div>
              </div>
              <button
                onClick={logout}
                className="flex items-center w-full rounded-xl p-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors mt-1 whitespace-nowrap overflow-hidden"
              >
                <LogOut className="h-6 w-6 flex-shrink-0" />
                <span className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  Sign Out
                </span>
              </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 transition-all duration-300 w-full min-h-full">
          <div className="p-8 mx-auto max-w-8xl">
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
