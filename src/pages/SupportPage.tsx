import { useState } from "react";
import { motion } from "framer-motion";
import {
  LifeBuoy, Plus, ArrowLeft, Send, Paperclip, X, Image,
  Clock, AlertTriangle, CheckCircle, XCircle, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  useSupportTickets,
  useTicketDetail,
  CATEGORIES,
  PRIORITIES,
  type Ticket,
} from "@/hooks/useSupportTickets";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import SEO from "@/components/SEO";

const statusConfig: Record<string, { color: string; icon: any; bg: string }> = {
  Open: { color: "text-amber-700", icon: Clock, bg: "bg-amber-100" },
  "In Progress": { color: "text-blue-700", icon: AlertTriangle, bg: "bg-blue-100" },
  Resolved: { color: "text-green-700", icon: CheckCircle, bg: "bg-green-100" },
  Closed: { color: "text-gray-600", icon: XCircle, bg: "bg-gray-100" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] || statusConfig.Open;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-sans font-semibold ${cfg.bg} ${cfg.color}`}>
      <Icon className="h-3 w-3" /> {status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    Normal: "bg-muted text-muted-foreground",
    High: "bg-amber-100 text-amber-700",
    Urgent: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-sans font-semibold ${colors[priority] || colors.Normal}`}>
      {priority}
    </span>
  );
}

// ─── Raise Ticket Form ───
function RaiseTicketForm({ onSuccess, onCancel }: { onSuccess: (id: string) => void; onCancel: () => void }) {
  const { createTicket } = useSupportTickets();
  const { toast } = useToast();
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [priority, setPriority] = useState("Normal");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const addFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const valid = Array.from(newFiles).filter(f => {
      if (!f.type.startsWith("image/")) { toast({ title: "Only images allowed", variant: "destructive" }); return false; }
      if (f.size > 2 * 1024 * 1024) { toast({ title: "Max 2MB per file", variant: "destructive" }); return false; }
      return true;
    });
    setFiles(prev => [...prev, ...valid].slice(0, 3));
  };

  const handleSubmit = async () => {
    if (!subject.trim() || description.trim().length < 20) {
      toast({ title: "Please fill all required fields (description min 20 chars)", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const ticket = await createTicket({ subject, category, priority, description });
      // Upload attachments if any — we'll use the ticket detail hook for that
      if (ticket && files.length > 0) {
        const { uploadAttachment } = await import("@/hooks/useSupportTickets").then(m => {
          // Can't use hook here, so do direct upload
          return { uploadAttachment: null };
        });
        // Direct upload for creation attachments
        const { supabase } = await import("@/integrations/supabase/client");
        for (const file of files) {
          const ext = file.name.split(".").pop();
          const path = `${ticket.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
          await supabase.storage.from("ticket-attachments").upload(path, file);
          const { data: urlData } = supabase.storage.from("ticket-attachments").getPublicUrl(path);
          await supabase.from("ticket_attachments").insert({
            ticket_id: ticket.id,
            file_url: urlData.publicUrl,
            file_name: file.name,
          });
        }
      }
      toast({ title: `Ticket raised! ID: ${ticket?.id?.slice(0, 8)}`, description: "We will respond within 24 hours." });
      onSuccess(ticket?.id || "");
    } catch (e: any) {
      toast({ title: "Failed to create ticket", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onCancel} className="p-1 rounded hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h2 className="font-display text-lg font-semibold text-foreground">Raise a Ticket</h2>
      </div>

      <div>
        <label className="text-xs font-sans font-medium text-foreground mb-1 block">Subject *</label>
        <input
          value={subject}
          onChange={e => setSubject(e.target.value)}
          placeholder="Brief summary of the issue"
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-sans font-medium text-foreground mb-1 block">Category</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-sans text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-sans font-medium text-foreground mb-1 block">Priority</label>
          <select
            value={priority}
            onChange={e => setPriority(e.target.value)}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-sans text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs font-sans font-medium text-foreground mb-1 block">Description * (min 20 characters)</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={5}
          placeholder="Describe the issue in detail…"
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
        <p className="text-[10px] text-muted-foreground font-sans mt-1">{description.length}/20 min</p>
      </div>

      <div>
        <label className="text-xs font-sans font-medium text-foreground mb-1 block">Screenshots (max 3, images only, 2MB each)</label>
        <div className="flex items-center gap-2 flex-wrap">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-1 bg-muted rounded-lg px-2 py-1 text-xs font-sans">
              <Image className="h-3 w-3 text-muted-foreground" />
              <span className="truncate max-w-[120px]">{f.name}</span>
              <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}>
                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
          ))}
          {files.length < 3 && (
            <label className="cursor-pointer flex items-center gap-1 border border-dashed border-border rounded-lg px-3 py-1.5 text-xs font-sans text-muted-foreground hover:bg-muted transition-colors">
              <Paperclip className="h-3 w-3" /> Attach
              <input type="file" accept="image/*" multiple className="hidden" onChange={e => addFiles(e.target.files)} />
            </label>
          )}
        </div>
      </div>

      <Button onClick={handleSubmit} disabled={submitting} className="w-full bg-primary text-primary-foreground">
        {submitting ? "Submitting…" : "Submit Ticket"}
      </Button>
    </div>
  );
}

// ─── Ticket Detail View ───
function TicketDetailView({
  ticketId,
  onBack,
  isAdmin = false,
}: {
  ticketId: string;
  onBack: () => void;
  isAdmin?: boolean;
}) {
  const { ticket, updates, attachments, loading, addUpdate, uploadAttachment, refetch } = useTicketDetail(ticketId);
  const { updateTicketStatus, updateTicketPriority } = useSupportTickets(isAdmin);
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [replyAsAdmin, setReplyAsAdmin] = useState(false);
  const [isInternal, setIsInternal] = useState(false);

  if (loading) return <p className="text-sm text-muted-foreground font-sans p-4">Loading…</p>;
  if (!ticket) return <p className="text-sm text-muted-foreground font-sans p-4">Ticket not found</p>;

  const ticketAttachments = attachments.filter(a => !a.update_id);

  const handleSendUpdate = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      const update = await addUpdate(message, isAdmin ? replyAsAdmin : false, isAdmin ? isInternal : false);
      for (const file of newFiles) {
        await uploadAttachment(file, update?.id);
      }
      setMessage("");
      setNewFiles([]);
      toast({ title: "Update added" });
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateTicketStatus(ticketId, newStatus);
      refetch();
      toast({ title: `Status changed to ${newStatus}` });
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="p-1 rounded hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <div className="flex-1">
          <h2 className="font-display text-base font-semibold text-foreground">{ticket.subject}</h2>
          <p className="text-[11px] text-muted-foreground font-sans">
            #{ticket.id.slice(0, 8)} · {ticket.category} · {new Date(ticket.created_at).toLocaleDateString()}
          </p>
        </div>
        <StatusBadge status={ticket.status} />
        <PriorityBadge priority={ticket.priority} />
      </div>

      {/* Admin controls */}
      {isAdmin && (
        <div className="flex gap-2 flex-wrap">
          <select
            value={ticket.status}
            onChange={e => handleStatusChange(e.target.value)}
            className="rounded-lg border border-border bg-card px-2 py-1 text-xs font-sans"
          >
            {["Open", "In Progress", "Resolved", "Closed"].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={ticket.priority}
            onChange={async e => {
              await updateTicketPriority(ticketId, e.target.value);
              refetch();
            }}
            className="rounded-lg border border-border bg-card px-2 py-1 text-xs font-sans"
          >
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {ticket.user_email && (
            <span className="text-xs text-muted-foreground font-sans self-center">User: {ticket.user_email}</span>
          )}
        </div>
      )}

      {/* Description */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground font-sans mb-1">Description</p>
        <p className="text-sm font-sans text-foreground whitespace-pre-wrap">{ticket.description}</p>
        {ticketAttachments.length > 0 && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {ticketAttachments.map(a => (
              <a key={a.id} href={a.file_url} target="_blank" rel="noopener noreferrer"
                className="rounded-lg border border-border overflow-hidden w-20 h-20 block">
                <img src={a.file_url} alt={a.file_name} className="w-full h-full object-cover" />
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="space-y-2">
        <p className="text-xs font-sans font-medium text-foreground">Timeline</p>
        {updates.length === 0 && (
          <p className="text-xs text-muted-foreground font-sans italic">No updates yet</p>
        )}
        {updates
          .filter(u => isAdmin || !u.is_internal)
          .map(u => {
            const updateAttachments = attachments.filter(a => a.update_id === u.id);
            return (
              <div
                key={u.id}
                className={`rounded-xl p-3 text-sm font-sans ${
                  u.is_internal
                    ? "bg-muted/50 border border-dashed border-border"
                    : u.is_admin_reply
                    ? "bg-primary/10 border border-primary/20"
                    : "bg-secondary/10 border border-secondary/20"
                }`}
              >
                <div className="flex justify-between mb-1">
                  <span className="text-[11px] font-semibold text-foreground">
                    {u.is_internal ? "🔒 Internal Note" : u.is_admin_reply ? "Admin" : u.user_email || "User"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(u.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-foreground whitespace-pre-wrap">{u.message}</p>
                {updateAttachments.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {updateAttachments.map(a => (
                      <a key={a.id} href={a.file_url} target="_blank" rel="noopener noreferrer"
                        className="rounded border border-border overflow-hidden w-16 h-16 block">
                        <img src={a.file_url} alt={a.file_name} className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* Add Update */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <p className="text-xs font-sans font-medium text-foreground">Add Update</p>
        {isAdmin && (
          <div className="flex gap-3 text-xs font-sans">
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={replyAsAdmin} onChange={e => setReplyAsAdmin(e.target.checked)} className="rounded" />
              Reply as Admin
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={isInternal} onChange={e => setIsInternal(e.target.checked)} className="rounded" />
              Internal note
            </label>
          </div>
        )}
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={3}
          placeholder="Write your update…"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {newFiles.map((f, i) => (
              <span key={i} className="text-[10px] font-sans bg-muted rounded px-1.5 py-0.5 flex items-center gap-1">
                {f.name}
                <button onClick={() => setNewFiles(prev => prev.filter((_, j) => j !== i))}>
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
            {newFiles.length < 3 && (
              <label className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                <Paperclip className="h-4 w-4" />
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={e => {
                    if (e.target.files) {
                      setNewFiles(prev => [...prev, ...Array.from(e.target.files!)].slice(0, 3));
                    }
                  }}
                />
              </label>
            )}
          </div>
          <Button size="sm" onClick={handleSendUpdate} disabled={sending || !message.trim()} className="bg-primary text-primary-foreground">
            <Send className="h-3.5 w-3.5 mr-1" /> {sending ? "Sending…" : "Send"}
          </Button>
        </div>
      </div>

      {/* Close / Reopen */}
      <div className="flex gap-2">
        {ticket.status !== "Closed" ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleStatusChange("Closed")}
            className="text-xs"
          >
            <XCircle className="h-3.5 w-3.5 mr-1" /> Close Ticket
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleStatusChange("Open")}
            className="text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reopen Ticket
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Tickets List ───
function TicketsList({ tickets, onSelect }: { tickets: Ticket[]; onSelect: (id: string) => void }) {
  if (tickets.length === 0) {
    return (
      <div className="text-center py-12">
        <LifeBuoy className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground font-sans">No tickets yet</p>
        <p className="text-xs text-muted-foreground font-sans mt-1">Click "Raise Ticket" to get help</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tickets.map(t => (
        <button
          key={t.id}
          onClick={() => onSelect(t.id)}
          className="w-full text-left rounded-xl border border-border bg-card p-3 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground font-sans">#{t.id.slice(0, 8)}</span>
            <StatusBadge status={t.status} />
          </div>
          <p className="text-sm font-sans font-medium text-foreground truncate">{t.subject}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-muted-foreground font-sans">{t.category}</span>
            <span className="text-[10px] text-muted-foreground font-sans">·</span>
            <PriorityBadge priority={t.priority} />
            <span className="text-[10px] text-muted-foreground font-sans ml-auto">
              {new Date(t.created_at).toLocaleDateString()}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── Main Support Page ───
export default function SupportPage() {
  const { user } = useAuth();
  const { tickets, loading } = useSupportTickets();
  const [view, setView] = useState<"list" | "create" | "detail">("list");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <LifeBuoy className="h-12 w-12 mx-auto text-primary/40" />
          <h2 className="font-display text-lg text-foreground">Sign in to get help</h2>
          <p className="text-sm text-muted-foreground font-sans">Please sign in to raise or view support tickets.</p>
          <Link to="/auth">
            <Button className="bg-primary text-primary-foreground mt-2">Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO path="/support" title="Support — Sriman Narayaneeyam" description="Get help, raise a support ticket or report an issue with the Sriman Narayaneeyam app." />
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {view === "list" && (
            <>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <LifeBuoy className="h-5 w-5 text-primary" />
                  <h1 className="font-display text-xl font-bold text-foreground">Support</h1>
                </div>
                <Button onClick={() => setView("create")} size="sm" className="bg-primary text-primary-foreground">
                  <Plus className="h-4 w-4 mr-1" /> Raise Ticket
                </Button>
              </div>

              {loading ? (
                <p className="text-sm text-muted-foreground font-sans p-4">Loading tickets…</p>
              ) : (
                <TicketsList
                  tickets={tickets}
                  onSelect={id => { setSelectedTicketId(id); setView("detail"); }}
                />
              )}
            </>
          )}

          {view === "create" && (
            <RaiseTicketForm
              onSuccess={id => { setSelectedTicketId(id); setView("detail"); }}
              onCancel={() => setView("list")}
            />
          )}

          {view === "detail" && selectedTicketId && (
            <TicketDetailView
              ticketId={selectedTicketId}
              onBack={() => { setSelectedTicketId(null); setView("list"); }}
            />
          )}
        </motion.div>
      </div>
    </div>
  );
}

// Export sub-components for admin reuse
export { TicketDetailView, StatusBadge, PriorityBadge };
