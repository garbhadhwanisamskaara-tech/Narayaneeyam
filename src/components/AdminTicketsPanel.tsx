import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, Filter, Ticket as TicketIcon, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import {
  useSupportTickets,
  CATEGORIES,
  PRIORITIES,
  STATUSES,
  type Ticket,
} from "@/hooks/useSupportTickets";
import { TicketDetailView, StatusBadge, PriorityBadge } from "@/pages/SupportPage";

function SummaryCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 flex items-center gap-3">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground font-sans">{label}</p>
        <p className="font-display text-xl font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

export default function AdminTicketsPanel() {
  const { tickets, loading } = useSupportTickets(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return tickets.filter(t => {
      if (statusFilter !== "All" && t.status !== statusFilter) return false;
      if (priorityFilter !== "All" && t.priority !== priorityFilter) return false;
      if (categoryFilter !== "All" && t.category !== categoryFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!t.subject.toLowerCase().includes(q) && !(t.user_email || "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [tickets, statusFilter, priorityFilter, categoryFilter, search]);

  // Summary stats
  const openCount = tickets.filter(t => t.status === "Open").length;
  const urgentCount = tickets.filter(t => t.priority === "High" || t.priority === "Urgent").filter(t => t.status !== "Closed" && t.status !== "Resolved").length;
  const resolvedToday = tickets.filter(t => {
    if (t.status !== "Resolved") return false;
    const today = new Date().toDateString();
    return new Date(t.updated_at).toDateString() === today;
  }).length;

  if (selectedId) {
    return (
      <TicketDetailView
        ticketId={selectedId}
        onBack={() => setSelectedId(null)}
        isAdmin
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard icon={TicketIcon} label="Open Tickets" value={openCount} color="bg-amber-100 text-amber-700" />
        <SummaryCard icon={AlertTriangle} label="High/Urgent" value={urgentCount} color="bg-red-100 text-red-700" />
        <SummaryCard icon={Clock} label="Total Tickets" value={tickets.length} color="bg-blue-100 text-blue-700" />
        <SummaryCard icon={CheckCircle} label="Resolved Today" value={resolvedToday} color="bg-green-100 text-green-700" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search email or subject…"
            className="w-full rounded-lg border border-border bg-card pl-8 pr-3 py-1.5 text-xs font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs font-sans">
          <option value="All">All Status</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs font-sans">
          <option value="All">All Priority</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs font-sans">
          <option value="All">All Category</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-sm text-muted-foreground font-sans p-4">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground font-sans p-4 text-center">No tickets found</p>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-sans">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground">
                  <th className="text-left px-3 py-2">ID</th>
                  <th className="text-left px-3 py-2">User</th>
                  <th className="text-left px-3 py-2">Subject</th>
                  <th className="text-left px-3 py-2">Category</th>
                  <th className="text-left px-3 py-2">Priority</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">Raised</th>
                  <th className="text-left px-3 py-2">Days Open</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => {
                  const daysOpen = t.status === "Closed" || t.status === "Resolved"
                    ? "—"
                    : Math.ceil((Date.now() - new Date(t.created_at).getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedId(t.id)}
                      className="border-t border-border hover:bg-muted/30 cursor-pointer transition-colors"
                    >
                      <td className="px-3 py-2 text-muted-foreground">#{t.id.slice(0, 8)}</td>
                      <td className="px-3 py-2 truncate max-w-[140px]">{t.user_email || "—"}</td>
                      <td className="px-3 py-2 font-medium truncate max-w-[200px]">{t.subject}</td>
                      <td className="px-3 py-2">{t.category}</td>
                      <td className="px-3 py-2"><PriorityBadge priority={t.priority} /></td>
                      <td className="px-3 py-2"><StatusBadge status={t.status} /></td>
                      <td className="px-3 py-2">{new Date(t.created_at).toLocaleDateString()}</td>
                      <td className="px-3 py-2">{daysOpen}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
