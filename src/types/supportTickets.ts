/**
 * Row types for the support-ticket tables.
 * Mirrors supabase/migrations/20260823_support_tickets_hardening.sql
 * (this project uses an external Supabase project, so
 * src/integrations/supabase/types.ts is not generated here).
 */

export type TicketCategory =
  | "audio_issue"
  | "content_error"
  | "subscription"
  | "technical"
  | "feature_request"
  | "other";
export type TicketPriority = "low" | "normal" | "high" | "urgent";
export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

export interface SupportTicketRow {
  id: string;
  user_id: string;
  /** Reporter's email — canonical column name in the database. */
  email: string | null;
  subject: string;
  category: TicketCategory | string;
  priority: TicketPriority | string;
  status: TicketStatus | string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface TicketUpdateRow {
  id: string;
  ticket_id: string;
  user_id: string;
  /** Author's email at time of writing. */
  user_email: string | null;
  message: string;
  is_admin_reply: boolean;
  is_internal: boolean;
  created_at: string;
}

export interface TicketAttachmentRow {
  id: string;
  ticket_id: string;
  /** References ticket_updates.id — null for attachments on the ticket itself. */
  update_id: string | null;
  file_url: string;
  file_name: string;
  created_at: string;
}
