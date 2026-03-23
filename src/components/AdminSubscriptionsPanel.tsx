import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Edit2, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SubRow {
  id: string;
  user_id: string;
  email: string;
  tier: string;
  status: string;
  started_at: string;
  expires_at: string;
  notes?: string;
}

const STATUS_OPTIONS = ["trial", "active", "expired", "paused"];
const TIER_OPTIONS = ["trial", "chanting", "learner", "premium"];

export default function AdminSubscriptionsPanel() {
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [filtered, setFiltered] = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<SubRow>>({});
  const { toast } = useToast();

  const fetchSubs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("subscriptions")
        .select("id, user_id, tier, status, started_at, expires_at, notes")
        .order("started_at", { ascending: false });

      if (!data) { setSubs([]); setLoading(false); return; }

      // Fetch emails for user_ids
      const userIds = [...new Set(data.map((d: any) => d.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email")
        .in("id", userIds);

      const emailMap: Record<string, string> = {};
      (profiles ?? []).forEach((p: any) => { emailMap[p.id] = p.email || "unknown"; });

      const rows: SubRow[] = data.map((d: any) => ({
        ...d,
        email: emailMap[d.user_id] || d.user_id.slice(0, 8),
      }));
      setSubs(rows);
    } catch {
      setSubs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSubs(); }, [fetchSubs]);

  useEffect(() => {
    let result = subs;
    if (statusFilter !== "all") result = result.filter(s => s.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(s => s.email.toLowerCase().includes(q));
    }
    setFiltered(result);
  }, [subs, statusFilter, search]);

  const startEdit = (sub: SubRow) => {
    setEditingId(sub.id);
    setEditForm({ tier: sub.tier, status: sub.status, expires_at: sub.expires_at, notes: sub.notes || "" });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const { error } = await supabase
      .from("subscriptions")
      .update({
        tier: editForm.tier,
        status: editForm.status,
        expires_at: editForm.expires_at,
        notes: editForm.notes,
      })
      .eq("id", editingId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Updated" });
      setEditingId(null);
      fetchSubs();
    }
  };

  const daysLeft = (exp: string) => Math.max(0, Math.ceil((new Date(exp).getTime() - Date.now()) / 86400000));

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      trial: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
      active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
      expired: "bg-muted text-muted-foreground",
      paused: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    };
    return map[s] || "bg-muted text-muted-foreground";
  };

  // Summary stats
  const totalActive = subs.filter(s => s.status === "active" || s.status === "trial").length;
  const totalExpired = subs.filter(s => s.status === "expired").length;
  const totalTrial = subs.filter(s => s.status === "trial").length;

  return (
    <div>
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground font-sans">Total Subscribers</p>
          <p className="font-display text-2xl font-bold text-foreground">{subs.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground font-sans">Active</p>
          <p className="font-display text-2xl font-bold text-green-600">{totalActive}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground font-sans">On Trial</p>
          <p className="font-display text-2xl font-bold text-amber-600">{totalTrial}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground font-sans">Expired</p>
          <p className="font-display text-2xl font-bold text-muted-foreground">{totalExpired}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by email..."
            className="w-full rounded-lg border border-border bg-background pl-10 pr-3 py-2 text-sm font-sans"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-sans"
        >
          <option value="all">All Status</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-sm text-muted-foreground font-sans py-8 text-center">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm font-sans">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2 text-xs text-muted-foreground">Email</th>
                <th className="text-left px-3 py-2 text-xs text-muted-foreground">Tier</th>
                <th className="text-left px-3 py-2 text-xs text-muted-foreground">Status</th>
                <th className="text-left px-3 py-2 text-xs text-muted-foreground">Started</th>
                <th className="text-left px-3 py-2 text-xs text-muted-foreground">Expires</th>
                <th className="text-left px-3 py-2 text-xs text-muted-foreground">Days Left</th>
                <th className="text-left px-3 py-2 text-xs text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(sub => (
                <tr key={sub.id} className="border-t border-border">
                  {editingId === sub.id ? (
                    <>
                      <td className="px-3 py-2 text-xs">{sub.email}</td>
                      <td className="px-3 py-2">
                        <select value={editForm.tier} onChange={e => setEditForm(f => ({ ...f, tier: e.target.value }))}
                          className="rounded border border-border bg-background px-2 py-1 text-xs">
                          {TIER_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                          className="rounded border border-border bg-background px-2 py-1 text-xs">
                          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-xs">{new Date(sub.started_at).toLocaleDateString()}</td>
                      <td className="px-3 py-2">
                        <input type="date" value={editForm.expires_at?.split("T")[0] || ""}
                          onChange={e => setEditForm(f => ({ ...f, expires_at: e.target.value }))}
                          className="rounded border border-border bg-background px-2 py-1 text-xs" />
                      </td>
                      <td className="px-3 py-2 text-xs">{daysLeft(editForm.expires_at || sub.expires_at)}</td>
                      <td className="px-3 py-2 flex gap-1">
                        <button onClick={saveEdit} className="p-1 text-green-600 hover:text-green-700"><Save className="h-4 w-4" /></button>
                        <button onClick={() => setEditingId(null)} className="p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2 text-xs">{sub.email}</td>
                      <td className="px-3 py-2 text-xs capitalize">{sub.tier}</td>
                      <td className="px-3 py-2">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold capitalize ${statusBadge(sub.status)}`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs">{new Date(sub.started_at).toLocaleDateString()}</td>
                      <td className="px-3 py-2 text-xs">{new Date(sub.expires_at).toLocaleDateString()}</td>
                      <td className="px-3 py-2 text-xs">{daysLeft(sub.expires_at)}</td>
                      <td className="px-3 py-2">
                        <button onClick={() => startEdit(sub)} className="p-1 text-muted-foreground hover:text-foreground">
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-muted-foreground text-xs">No subscriptions found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
