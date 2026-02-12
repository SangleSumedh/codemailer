
"use client";

import { createContext, useContext, useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, doc, getDocs, getDoc, query, orderBy, Timestamp } from "firebase/firestore";

// ─── Shared Interfaces ───────────────────────────────────────────────

export interface Attachment {
  name: string;
  url: string;
}

export interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
  attachments?: Attachment[];
  createdAt: any;
}

export interface Resume {
  id: string;
  name: string;
  url: string;
  public_id: string;
  createdAt: any;
}

export interface Reply {
  id: string;
  hrName: string;
  companyName: string;
  date: Timestamp;
  status: string;
  replyContent?: string;
  notes?: string;
}

export interface Batch {
  id: string;
  sentCount: number;
  timestamp: Timestamp;
  templateId?: string;
  templateName?: string;
  totalRecipients?: number;
}

export interface Stats {
  sent: number;
  replies: number;
}

// ─── Context Shape ───────────────────────────────────────────────────

interface DataContextType {
  // Data
  templates: Template[];
  resumes: Resume[];
  replies: Reply[];
  batches: Batch[];
  stats: Stats;

  // Loading states
  loading: boolean;

  // Refetch functions (call after mutations)
  fetchTemplates: () => Promise<void>;
  fetchResumes: () => Promise<void>;
  fetchReplies: () => Promise<void>;
  fetchBatches: () => Promise<void>;
  fetchStats: () => Promise<void>;
}

const DataContext = createContext<DataContextType>({} as DataContextType);

// ─── Provider ────────────────────────────────────────────────────────

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [stats, setStats] = useState<Stats>({ sent: 0, replies: 0 });
  const [loading, setLoading] = useState(true);

  // ── Fetch Functions ──

  const fetchTemplates = useCallback(async () => {
    if (!user) return;
    const q = query(collection(db, "users", user.uid, "templates"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    setTemplates(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Template)));
  }, [user]);

  const fetchResumes = useCallback(async () => {
    if (!user) return;
    const q = query(collection(db, "users", user.uid, "resumes"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    setResumes(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Resume)));
  }, [user]);

  const fetchReplies = useCallback(async () => {
    if (!user) return;
    const q = query(collection(db, "users", user.uid, "replies"), orderBy("date", "desc"));
    const snapshot = await getDocs(q);
    setReplies(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Reply)));
  }, [user]);

  const fetchBatches = useCallback(async () => {
    if (!user) return;
    const q = query(collection(db, "users", user.uid, "bulk_batches"), orderBy("timestamp", "asc"));
    const snapshot = await getDocs(q);
    setBatches(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Batch)));
  }, [user]);

  const fetchStats = useCallback(async () => {
    if (!user) return;
    const docSnap = await getDoc(doc(db, "users", user.uid, "stats", "general"));
    if (docSnap.exists()) {
      setStats(docSnap.data() as Stats);
    }
  }, [user]);

  // ── Initial Load ──

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadAll = async () => {
      setLoading(true);
      await Promise.all([
        fetchTemplates(),
        fetchResumes(),
        fetchReplies(),
        fetchBatches(),
        fetchStats(),
      ]);
      setLoading(false);
    };

    loadAll();
  }, [user, fetchTemplates, fetchResumes, fetchReplies, fetchBatches, fetchStats]);

  return (
    <DataContext.Provider
      value={{
        templates,
        resumes,
        replies,
        batches,
        stats,
        loading,
        fetchTemplates,
        fetchResumes,
        fetchReplies,
        fetchBatches,
        fetchStats,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);
