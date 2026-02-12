
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Mail } from "lucide-react";

export default function Login() {
  const { signInWithGoogle } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-zinc-900">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-10 shadow-2xl dark:bg-zinc-800">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 rounded-full bg-blue-100 p-3 dark:bg-blue-900/30">
            <Mail className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            CodeMailer
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Sign in to manage your cold email campaigns
          </p>
        </div>

        <button
          onClick={signInWithGoogle}
          className="group relative flex w-full justify-center rounded-lg border border-transparent bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-800"
        >
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
             <svg className="h-5 w-5 text-blue-500 group-hover:text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                 <path d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.99 19.27 5 15.6 5 12s3.99-7.27 7.18-7.27c2.45 0 3.96 1.05 4.97 2.01L19.9 4.19C17.74 2.15 14.88 1 12.18 1c-6.19 0-11.22 5.03-11.22 11.22s5.03 11.22 11.22 11.22c5.63 0 10.88-4 10.88-11.34 0-.74-.08-1.46-.23-2.18z"/>
             </svg>
          </span>
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
