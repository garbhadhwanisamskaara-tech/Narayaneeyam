import { useRef, useState } from "react";
import { Download, Loader2, Upload, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type BulkResult = "CONFIRMED_NOW" | "ALREADY_CONFIRMED" | "EMAIL_NOT_IN_APP" | "NOT_IN_PARAYANAM" | "DECLINED" | "LEFT";

interface ResultRow {
  email: string;
  result: BulkResult | string;
  participant_status: string | null;
  contribution_status: string | null;
  access_status: string | null;
}

const RESULT_LABEL: Record<string, string> = {
  CONFIRMED_NOW: "Confirmed",
  ALREADY_CONFIRMED: "Already Confirmed",
  EMAIL_NOT_IN_APP: "Email Not In App",
  NOT_IN_PARAYANAM: "Not In Parayanam",
  DECLINED: "Declined",
  LEFT: "Left",
};

const EMAIL_HEADINGS = ["email", "email_id", "email id"];

/** Splits one CSV line, honouring double quotes. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else quoted = false;
      } else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

type ParseOutcome = { emails: string[] } | { error: string };

/** Pulls unique, normalised email addresses out of raw CSV text. */
export function parseEmailsFromCsv(text: string): ParseOutcome {
  const lines = text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((l) => l.trim().length > 0);
  if (!lines.length) return { error: "Could not find an email column in this CSV." };

  const header = splitCsvLine(lines[0]).map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
  const idx = header.findIndex((h) => EMAIL_HEADINGS.includes(h));
  if (idx === -1) return { error: "Could not find an email column in this CSV." };

  const seen = new Set<string>();
  for (const line of lines.slice(1)) {
    const cell = (splitCsvLine(line)[idx] ?? "").trim().replace(/^"|"$/g, "").trim().toLowerCase();
    if (cell) seen.add(cell);
  }
  const emails = Array.from(seen);
  if (!emails.length) return { error: "No valid email addresses were found." };
  return { emails };
}

function csvCell(v: string | null): string {
  const s = v ?? "";
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

interface Props {
  sessionId: string;
  /** Refresh participant data after a successful run. */
  onChanged: () => void | Promise<void>;
}

/**
 * Guru-only utility to reconcile contributions received outside the app.
 * All matching and status changes happen inside the existing Supabase RPC.
 */
export default function BulkConfirmContributions({ sessionId, onChanged }: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [emails, setEmails] = useState<string[]>([]);
  const [rows, setRows] = useState<ResultRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setFileName(null);
    setEmails([]);
    setRows(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleFile = async (file: File) => {
    setRows(null);
    setError(null);
    setEmails([]);
    setFileName(file.name);
    let text: string;
    try {
      text = await file.text();
    } catch {
      setError("This CSV could not be read. Please try uploading it again.");
      return;
    }
    const parsed = parseEmailsFromCsv(text);
    if ("error" in parsed) {
      setError(parsed.error);
      return;
    }
    setEmails(parsed.emails);
  };

  const handleConfirm = async () => {
    if (!emails.length || busy) return;
    setBusy(true);
    setError(null);
    const { data, error: rpcError } = await (supabase as any).rpc("bulk_confirm_parayanam_contributions", {
      p_session_id: sessionId,
      p_emails: emails,
    });
    setBusy(false);

    if (rpcError) {
      setError(rpcError.message || "The contributions could not be confirmed.");
      toast({ title: "Could not confirm contributions", description: rpcError.message, variant: "destructive" });
      return;
    }

    setRows((data ?? []) as ResultRow[]);
    toast({ title: "Contributions processed", description: `${emails.length} email addresses were reconciled.` });
    await onChanged();
  };

  const counts = (r: BulkResult) => (rows ?? []).filter((x) => x.result === r).length;

  const downloadCsv = () => {
    if (!rows) return;
    const lines = [
      "email,result,participant_status,contribution_status,access_status",
      ...rows.map((r) =>
        [r.email, r.result, r.participant_status, r.contribution_status, r.access_status].map(csvCell).join(","),
      ),
    ];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "contribution-reconciliation.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4">
      <h3 className="flex items-center gap-2 font-sans text-sm font-semibold text-foreground">
        <Users className="h-4 w-4 text-primary" /> Bulk Confirm Contributions
      </h3>
      <p className="mt-1 font-sans text-xs leading-relaxed text-muted-foreground">
        Upload a CSV containing the email addresses of participants whose contributions have been received. Email
        addresses will be matched against their Narayaneeyam.app login email.
      </p>

      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />

      {!rows && (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 font-sans text-sm font-semibold text-foreground hover:border-primary disabled:opacity-60"
        >
          <Upload className="h-4 w-4" /> Upload CSV
        </button>
      )}

      {fileName && !rows && <p className="mt-2 font-sans text-xs text-muted-foreground">{fileName}</p>}

      {error && <p className="mt-3 font-sans text-xs text-destructive">{error}</p>}

      {!rows && emails.length > 0 && (
        <div className="mt-3">
          <p className="font-sans text-sm font-semibold text-foreground">
            {emails.length} unique email {emails.length === 1 ? "address" : "addresses"} found
          </p>
          <ul className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-border bg-background p-2">
            {emails.map((e) => (
              <li key={e} className="truncate font-sans text-xs text-muted-foreground">
                {e}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={reset}
              disabled={busy}
              className="rounded-lg border border-border px-4 py-2 font-sans text-sm font-semibold text-foreground hover:border-primary disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-peacock px-4 py-2 font-sans text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {busy ? "Confirming…" : "Confirm Contributions"}
            </button>
          </div>
        </div>
      )}

      {rows && (
        <div className="mt-4">
          <h4 className="font-sans text-sm font-semibold text-foreground">Contribution Reconciliation</h4>
          <ul className="mt-2 grid gap-1 font-sans text-xs text-muted-foreground sm:grid-cols-2">
            <li>Uploaded: {emails.length}</li>
            <li>Confirmed now: {counts("CONFIRMED_NOW")}</li>
            <li>Already confirmed: {counts("ALREADY_CONFIRMED")}</li>
            <li>Email not in app: {counts("EMAIL_NOT_IN_APP")}</li>
            <li>Not in this Parayanam: {counts("NOT_IN_PARAYANAM")}</li>
            <li>Declined: {counts("DECLINED")}</li>
            <li>Left: {counts("LEFT")}</li>
          </ul>

          <div className="mt-3 max-h-56 overflow-auto rounded-lg border border-border bg-background">
            <table className="w-full min-w-[520px] border-collapse font-sans text-xs">
              <thead className="sticky top-0 bg-muted/60">
                <tr className="text-left text-muted-foreground">
                  <th className="px-2 py-1.5 font-semibold">Email</th>
                  <th className="px-2 py-1.5 font-semibold">Result</th>
                  <th className="px-2 py-1.5 font-semibold">Participant Status</th>
                  <th className="px-2 py-1.5 font-semibold">Contribution Status</th>
                  <th className="px-2 py-1.5 font-semibold">Access Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`${r.email}-${i}`} className="border-t border-border">
                    <td className="px-2 py-1.5 text-foreground">{r.email}</td>
                    <td className="px-2 py-1.5 text-foreground">{RESULT_LABEL[r.result] ?? r.result}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">{r.participant_status || "—"}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">{r.contribution_status || "—"}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">{r.access_status || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={downloadCsv}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 font-sans text-sm font-semibold text-foreground hover:border-primary"
            >
              <Download className="h-4 w-4" /> Download Results CSV
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-border px-4 py-2 font-sans text-sm font-semibold text-muted-foreground hover:border-primary hover:text-primary"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
