
"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { encrypt } from "@/lib/encryption";
import { KeyRound, CheckCircle, ExternalLink, Loader2 } from "lucide-react";

export default function Onboarding() {
  const { user, checkAppPassword } = useAuth();
  const [appPassword, setAppPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user || !appPassword) return;
    setSaving(true);
    try {
      const encrypted = encrypt(appPassword);
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        appPassword: encrypted,
        updatedAt: new Date(),
      }, { merge: true });
      await checkAppPassword();
    } catch (error) {
      console.error("Error saving app password", error);
      alert("Failed to save password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-zinc-900">
      <div className="max-w-2xl overflow-hidden rounded-xl bg-white shadow-xl dark:bg-zinc-800">
        <div className="border-b border-gray-100 bg-gray-50/50 p-8 text-center dark:border-zinc-700 dark:bg-zinc-800/50">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
            <KeyRound className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Setup Email Sending</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            To send emails on your behalf, we need a Gmail App Password.
          </p>
        </div>

        <div className="p-8">
          <div className="mb-8 space-y-4 rounded-lg bg-blue-50 p-6 dark:bg-blue-900/20">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100">How to get an App Password:</h3>
            <ol className="list-inside list-decimal space-y-2 text-sm text-blue-800 dark:text-blue-200">
              <li>Go to your <a href="https://myaccount.google.com/security" target="_blank" className="underline hover:text-blue-600 dark:hover:text-blue-300">Google Account Security</a> page.</li>
              <li>Enable <span className="font-medium">2-Step Verification</span> if not already enabled.</li>
              <li>Search for "App Passwords" in the search bar.</li>
              <li>Create a new app password named "CodeMailer".</li>
              <li>Copy the 16-character password generated.</li>
            </ol>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Paste App Password
            </label>
            <input
              type="text"
              value={appPassword}
              onChange={(e) => setAppPassword(e.target.value)}
              placeholder="abcd efgh ijkl mnop"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
            />
            <button
              onClick={handleSave}
              disabled={!appPassword || saving}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
              {saving ? "Encrypting & Saving..." : "Save Securely"}
            </button>
          </div>
          
          <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
            Your password is encrypted before being stored. We cannot read it without your session.
          </p>
        </div>
      </div>
    </div>
  );
}
