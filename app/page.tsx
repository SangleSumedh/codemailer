
"use client";

import { useAuth } from "@/contexts/AuthContext";
import Login from "@/components/Login";
import Layout from "@/components/Layout";
import Onboarding from "@/components/Onboarding";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { user, loading, appPasswordConfigured } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (!appPasswordConfigured) {
    return <Onboarding />;
  }

  return <Layout />;
}
