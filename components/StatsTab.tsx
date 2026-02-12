
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc, collection, query, orderBy, addDoc, Timestamp, increment, writeBatch } from "firebase/firestore";
import { useEffect, useState } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { Mail, MessageSquare, TrendingUp, Plus, X, Loader2, Trash2, Calendar, Zap, Building2 } from "lucide-react";

interface Stats {
  sent: number;
  replies: number;
}

interface Batch {
  id: string;
  sentCount: number;
  timestamp: Timestamp;
}

interface Reply {
  id: string;
  hrName: string;
  companyName: string;
  status: string;
  date: Timestamp;
}

interface ResponseRow {
  id: string; // temp id for UI
  hrName: string;
  companyName: string;
  status: string;
  replyContent: string;
}

export default function StatsTab() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({ sent: 0, replies: 0 });
  const [batches, setBatches] = useState<Batch[]>([]);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('7d');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [savingReply, setSavingReply] = useState(false);
  
  // Bulk Entry State
  const [responseDate, setResponseDate] = useState(new Date().toISOString().split('T')[0]);
  const [responseRows, setResponseRows] = useState<ResponseRow[]>([
    { id: 'form', hrName: '', companyName: '', status: 'Positive', replyContent: '' }
  ]);

  useEffect(() => {
    if (!user) return;
    
    // 1. Fetch General Stats (Real-time)
    const statsUnsub = onSnapshot(doc(db, "users", user.uid, "stats", "general"), (doc) => {
      if (doc.exists()) {
        const data = doc.data() as Stats;
        setStats(data);
      }
    });

    // 2. Fetch Bulk Batches History
    const batchesQuery = query(collection(db, "users", user.uid, "bulk_batches"), orderBy("timestamp", "asc"));
    const batchesUnsub = onSnapshot(batchesQuery, (snapshot) => {
      const b = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Batch));
      setBatches(b);
      setLoading(false);
    });

    // 3. Fetch Replies (for breakdown & top companies)
    const repliesQuery = query(collection(db, "users", user.uid, "replies"), orderBy("date", "desc"));
    const repliesUnsub = onSnapshot(repliesQuery, (snapshot) => {
      setReplies(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Reply)));
    });

    return () => {
      statsUnsub();
      batchesUnsub();
      repliesUnsub();
    };
  }, [user]);

  const addRow = () => {
    // Validate current input (index 0)
    const current = responseRows[0];
    if (!current.hrName.trim() && !current.companyName.trim()) {
        alert("Please enter HR Name or Company Name before adding.");
        return;
    }

    // Add current to end of list (as a confirmed item)
    // We actually just want to keep index 0 as the 'form', and push a copy to the list
    // But since my previous logic used the whole array as the list, let's adapt:
    // Index 0 is ALWAYS the form. Indices 1+ are the queue.
    
    const newItem = { ...current, id: Date.now().toString() };
    // Reset index 0
    const emptyForm = { id: 'form', hrName: '', companyName: '', status: 'Positive', replyContent: '' };
    
    setResponseRows([emptyForm, ...responseRows.slice(1), newItem]); // actually order: Form, Item 1, Item 2...
    // Wait, let me maintain order: [Form, ...Queue]
    setResponseRows([emptyForm, ...responseRows.slice(1), newItem]);
  };

  const removeRow = (id: string) => {
    if (responseRows.length > 1) {
        setResponseRows(responseRows.filter(r => r.id !== id));
    }
  };

  const updateRow = (id: string, field: keyof ResponseRow, value: string) => {
    setResponseRows(responseRows.map(row => 
        row.id === id ? { ...row, [field]: value } : row
    ));
  };

  const handleSaveResponses = async () => {
    if (!user) return;
    setSavingReply(true);
    
    try {
      // Validate: Save only items in the queue (index 1+)
      const queue = responseRows.slice(1);
      
      if (queue.length === 0) {
        alert("No responses in the queue to save. Add them first!");
        setSavingReply(false);
        return;
      }

      const batch = writeBatch(db);
      
      // 1. Create documents for each row
      // Note: writeBatch doesn't support addDoc directly with auto-ID in the same way, 
      // so we use doc() to generate a ref then batch.set()
      
      // so we use doc() to generate a ref then batch.set()
      
      queue.forEach(row => {
          const newDocRef = doc(collection(db, "users", user.uid, "replies"));
          batch.set(newDocRef, {
            hrName: row.hrName,
            companyName: row.companyName,
            status: row.status,
            replyContent: row.replyContent,
            date: Timestamp.fromDate(new Date(responseDate)),
            createdAt: new Date()
          });
      });

      // 2. Increment global stats
      const statsRef = doc(db, "users", user.uid, "stats", "general");
      batch.update(statsRef, {
        replies: increment(queue.length)
      });

      await batch.commit();

      alert(`Saved ${queue.length} responses!`);
      setIsModalOpen(false);
      // Reset form
      setResponseDate(new Date().toISOString().split('T')[0]);
      setResponseRows([{ id: 'form', hrName: '', companyName: '', status: 'Positive', replyContent: '' }]);

    } catch (error) {
      console.error("Error adding responses:", error);
      alert("Failed to save responses.");
    } finally {
      setSavingReply(false);
    }
  };

  // Process data for charts
  const getChartData = () => {
    const now = new Date();
    let filteredBatches = batches;

    if (timeRange === '7d') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      filteredBatches = batches.filter(b => b.timestamp.toDate() >= sevenDaysAgo);
    } else if (timeRange === '30d') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      filteredBatches = batches.filter(b => b.timestamp.toDate() >= thirtyDaysAgo);
    }

    const grouped: { [key: string]: number } = {};
    
    filteredBatches.forEach(batch => {
      const date = batch.timestamp.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      grouped[date] = (grouped[date] || 0) + batch.sentCount;
    });

    return Object.entries(grouped).map(([name, sent]) => ({ name, sent }));
  };

  const chartData = getChartData();
  const responseRate = stats.sent > 0 ? ((stats.replies / stats.sent) * 100).toFixed(1) : "0";

  // Sent This Week
  const sentThisWeek = (() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    return batches
      .filter(b => b.timestamp.toDate() >= startOfWeek)
      .reduce((sum, b) => sum + b.sentCount, 0);
  })();

  // Response Breakdown
  const responseBreakdown = (() => {
    const counts = { Positive: 0, Negative: 0, Neutral: 0 };
    replies.forEach(r => {
      if (r.status in counts) counts[r.status as keyof typeof counts]++;
    });
    return [
      { name: 'Positive', value: counts.Positive, color: '#22c55e' },
      { name: 'Negative', value: counts.Negative, color: '#ef4444' },
      { name: 'Neutral', value: counts.Neutral, color: '#3b82f6' },
    ].filter(d => d.value > 0);
  })();

  // Top Companies
  const topCompanies = (() => {
    const counts: Record<string, number> = {};
    replies.forEach(r => {
      if (r.companyName) counts[r.companyName] = (counts[r.companyName] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
  })();

  if (loading) return <div className="p-8 text-center">Loading analytics...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative">
      {/* Header & Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
           <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Dashboard Overview</h2>
           <p className="text-sm text-gray-500 dark:text-gray-400">Track your cold email performance</p>
        </div>
        <div className="flex items-center gap-4">
            <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
                <Plus className="h-4 w-4" />
                Response Tracker
            </button>
            <div className="flex items-center gap-2 rounded-lg bg-white p-1 shadow-sm border border-gray-200 dark:bg-zinc-900 dark:border-zinc-800">
            {(['7d', '30d', 'all'] as const).map((range) => (
                <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                    timeRange === range
                    ? "bg-gray-100 text-gray-900 shadow-sm dark:bg-zinc-800 dark:text-white"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
                >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : 'All Time'}
                </button>
            ))}
            </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Sent</p>
            <Mail className="h-4 w-4 text-gray-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white">{stats.sent}</h3>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Replies</p>
            <MessageSquare className="h-4 w-4 text-gray-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white">{stats.replies}</h3>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
             <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Response Rate</p>
             <TrendingUp className="h-4 w-4 text-gray-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white">{responseRate}%</h3>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
             <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Sent This Week</p>
             <Zap className="h-4 w-4 text-gray-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white">{sentThisWeek}</h3>
          </div>
        </div>
      </div>

     
      {/* Response Breakdown & Top Companies */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Response Breakdown Donut */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-6 text-lg font-semibold text-gray-900 dark:text-white">Response Breakdown</h3>
          {responseBreakdown.length > 0 ? (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={responseBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {responseBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={((value: any, name: any) => [`${value} replies`, name]) as any}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value: string) => <span className="text-sm text-gray-600 dark:text-gray-400">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <MessageSquare className="h-8 w-8 mb-2" />
              <p className="text-sm">No replies yet to show breakdown.</p>
            </div>
          )}
        </div>

        {/* Top Companies */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-6 text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="h-5 w-5 text-gray-400" />
            Top Responding Companies
          </h3>
          {topCompanies.length > 0 ? (
            <div className="space-y-4">
              {topCompanies.map((company, i) => (
                <div key={company.name} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600 dark:bg-zinc-800 dark:text-gray-300">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{company.name}</p>
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 ml-2">{company.count} {company.count === 1 ? 'reply' : 'replies'}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all duration-500"
                        style={{ width: `${topCompanies[0] ? (company.count / topCompanies[0].count) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Building2 className="h-8 w-8 mb-2" />
              <p className="text-sm">No company data yet.</p>
            </div>
          )}
        </div>
      </div>

       {/* Charts */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="mb-6 text-lg font-semibold text-gray-900 dark:text-white">Sending Volume</h3>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-zinc-800" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#6B7280', fontSize: 12 }} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#6B7280', fontSize: 12 }} 
              />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                cursor={{ stroke: '#3b82f6', strokeWidth: 1 }}
              />
              <Area 
                type="monotone" 
                dataKey="sent" 
                stroke="#3b82f6" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorSent)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bulk Entry Modal */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
              <div className="flex h-[90vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-xl dark:bg-zinc-900 dark:border dark:border-zinc-800">
                  <div className="flex items-center justify-between border-b border-gray-200 p-6 dark:border-zinc-800">
                      <div>
                        <h3 className="text-xl font-bold dark:text-white">Response Tracker</h3>
                        <p className="text-sm text-gray-500">Log multiple responses for a single day.</p>
                      </div>
                      <button onClick={() => setIsModalOpen(false)} className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-zinc-800">
                          <X className="h-5 w-5 dark:text-white" />
                      </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6">
                      <div className="mb-6 flex items-center gap-4">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date Received:</label>
                          <input 
                              type="date" 
                              value={responseDate}
                              onChange={(e) => setResponseDate(e.target.value)}
                              className="rounded-lg border border-gray-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                          />
                      </div>

                      {/* Entry Form */}
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
                          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">Add New Entry</h4>
                          <div className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-3">
                                <div>
                                    <input 
                                        placeholder="HR Name"
                                        value={responseRows[0].hrName}
                                        onChange={(e) => updateRow(responseRows[0].id, 'hrName', e.target.value)}
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <input 
                                        placeholder="Company"
                                        value={responseRows[0].companyName}
                                        onChange={(e) => updateRow(responseRows[0].id, 'companyName', e.target.value)}
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <select 
                                        value={responseRows[0].status}
                                        onChange={(e) => updateRow(responseRows[0].id, 'status', e.target.value)}
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                                    >
                                        <option>Positive</option>
                                        <option>Negative</option>
                                        <option>Neutral</option>
                                        <option>Scheduled Interview</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <textarea 
                                    placeholder="Reply Content (e.g. 'Interested in your profile, please send availability')"
                                    value={responseRows[0].replyContent}
                                    onChange={(e) => updateRow(responseRows[0].id, 'replyContent', e.target.value)}
                                    rows={3}
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                                />
                            </div>
                            <div className="flex justify-end">
                                <button 
                                    onClick={addRow}
                                    className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
                                >
                                    <Plus className="h-4 w-4" />
                                    Add to Queue
                                </button>
                            </div>
                          </div>
                      </div>

                      {/* Review Grid */}
                      {responseRows.length > 1 && (
                          <div className="mt-8">
                             <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">Ready to Save ({responseRows.length - 1})</h4>
                             <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                {responseRows.slice(1).map((row) => (
                                    <div key={row.id} className="relative flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
                                        <button 
                                            onClick={() => removeRow(row.id)}
                                            className="absolute right-2 top-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                        <div>
                                            <div className="mb-1 text-xs text-gray-500">{new Date(responseDate).toLocaleDateString()}</div>
                                            <h5 className="font-semibold text-gray-900 dark:text-white truncate" title={row.hrName}>{row.hrName || "Unknown HR"}</h5>
                                            <div className="mb-2 text-sm text-gray-600 dark:text-gray-400 truncate" title={row.companyName}>{row.companyName || "Unknown Company"}</div>
                                            
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                                row.status === 'Positive' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                                                row.status === 'Negative' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                                                'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                            }`}>
                                                {row.status}
                                            </span>
                                        </div>
                                        {row.replyContent && (
                                            <div className="mt-3 border-t border-gray-100 pt-2 dark:border-zinc-800">
                                                <p className="line-clamp-2 text-xs text-gray-500 italic">"{row.replyContent}"</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                             </div>
                          </div>
                      )}
                  </div>

                  <div className="border-t border-gray-200 p-6 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 rounded-b-2xl flex justify-end gap-3">
                       <button 
                           onClick={() => setIsModalOpen(false)}
                           className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg dark:text-gray-300 dark:hover:bg-zinc-800"
                       >
                           Cancel
                       </button>
                       <button 
                           onClick={handleSaveResponses}
                           disabled={savingReply || responseRows.length <= 1}
                           className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
                       >
                           {savingReply && <Loader2 className="h-4 w-4 animate-spin" />}
                           Save All ({responseRows.length - 1})
                       </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
