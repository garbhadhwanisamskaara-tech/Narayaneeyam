import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type {
  SupportTicketRow,
  TicketUpdateRow,
  TicketAttachmentRow,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from "@/types/supportTickets";

export type { TicketCategory, TicketPriority, TicketStatus };

const ATTACHMENT_BUCKET = "ticket-attachments";

/** UI-facing ticket. `user_email` is derived from the DB column `email`. */
export interface Ticket {
  id: string;
  user_id: string;
  user_email?: string | null;
  subject: string;
  category: TicketCategory | string;
  priority: TicketPriority | string;
  status: TicketStatus | string;
  description: string;
  created_at: string;
  updated_at: string;
}

export type TicketUpdate = TicketUpdateRow;
export type TicketAttachment = TicketAttachmentRow;

const mapTicket = (row: any): Ticket => ({
  id: row.id,
  user_id: row.user_id,
  user_email: row.email ?? row.user_email ?? null,
  subject: row.subject,
  category: row.category,
  priority: row.priority,
  status: row.status,
  description: row.description,
  created_at: row.created_at,
  updated_at: row.updated_at ?? row.created_at,
});


export const CATEGORY_OPTIONS: { value: TicketCategory; label: string }[] = [
  { value: "audio_issue", label: "Audio Issue" },
  { value: "content_error", label: "Content Error" },
  { value: "subscription", label: "Subscription" },
  { value: "technical", label: "Technical" },
  { value: "feature_request", label: "Feature Request" },
  { value: "other", label: "Other" },
];

export const PRIORITY_OPTIONS: { value: TicketPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

export const categoryLabel = (v: string) =>
  CATEGORY_OPTIONS.find((o) => o.value === v?.toLowerCase())?.label || v;
export const priorityLabel = (v: string) =>
  PRIORITY_OPTIONS.find((o) => o.value === v?.toLowerCase())?.label || v;
export const statusLabel = (v: string) =>
  STATUS_OPTIONS.find((o) => o.value === v?.toLowerCase())?.label || v;

export function useSupportTickets(isAdmin = false) {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (!isAdmin && user) {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setTickets(((data as any[]) || []).map(mapTicket));
    } catch (e) {
      console.warn("Failed to fetch tickets:", e);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    if (user) fetchTickets();
    else setLoading(false);
  }, [user, fetchTickets]);

  const createTicket = async (data: {
    subject: string;
    category: string;
    priority: string;
    description: string;
  }) => {
    if (!user) throw new Error("Must be logged in");
    const { data: ticket, error } = await supabase
      .from("support_tickets")
      .insert({
        user_id: user.id,
        email: user.email,
        ...data,
        status: "open",
      })
      .select()
      .single();
    if (error) throw error;
    await fetchTickets();
    return mapTicket(ticket);
  };


  const updateTicketStatus = async (ticketId: string, status: TicketStatus) => {
    const { error } = await supabase
      .from("support_tickets")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", ticketId);
    if (error) throw error;
    await fetchTickets();
  };

  const updateTicketPriority = async (ticketId: string, priority: TicketPriority) => {
    const { error } = await supabase
      .from("support_tickets")
      .update({ priority, updated_at: new Date().toISOString() })
      .eq("id", ticketId);
    if (error) throw error;
    await fetchTickets();
  };

  return {
    tickets,
    loading,
    createTicket,
    updateTicketStatus,
    updateTicketPriority,
    refetch: fetchTickets,
  };
}

export function useTicketDetail(ticketId: string | null) {
  const { user } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [updates, setUpdates] = useState<TicketUpdate[]>([]);
  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDetail = useCallback(async () => {
    if (!ticketId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [ticketRes, updatesRes, attachRes] = await Promise.all([
        supabase.from("support_tickets").select("*").eq("id", ticketId).single(),
        supabase.from("ticket_updates").select("*").eq("ticket_id", ticketId).order("created_at", { ascending: true }),
        supabase.from("ticket_attachments").select("*").eq("ticket_id", ticketId).order("created_at", { ascending: true }),
      ]);
      setTicket(ticketRes.data as Ticket);
      setUpdates((updatesRes.data as TicketUpdate[]) || []);
      setAttachments((attachRes.data as TicketAttachment[]) || []);
    } catch (e) {
      console.warn("Failed to fetch ticket detail:", e);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const addUpdate = async (message: string, isAdminReply = false, isInternal = false) => {
    if (!user || !ticketId) throw new Error("Missing context");
    const { data, error } = await supabase
      .from("ticket_updates")
      .insert({
        ticket_id: ticketId,
        user_id: user.id,
        user_email: user.email,
        message,
        is_admin_reply: isAdminReply,
        is_internal: isInternal,
      })
      .select()
      .single();
    if (error) throw error;

    // Update ticket timestamp
    await supabase
      .from("support_tickets")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", ticketId);

    await fetchDetail();
    return data;
  };

  const uploadAttachment = async (file: File, updateId?: string) => {
    if (!user || !ticketId) throw new Error("Missing context");
    const ext = file.name.split(".").pop();
    const path = `${ticketId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("ticket-attachments")
      .upload(path, file);
    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from("ticket-attachments")
      .getPublicUrl(path);

    const { error: insertError } = await supabase
      .from("ticket_attachments")
      .insert({
        ticket_id: ticketId,
        update_id: updateId || null,
        file_url: urlData.publicUrl,
        file_name: file.name,
      });
    if (insertError) throw insertError;

    await fetchDetail();
  };

  return {
    ticket,
    updates,
    attachments,
    loading,
    addUpdate,
    uploadAttachment,
    refetch: fetchDetail,
  };
}
