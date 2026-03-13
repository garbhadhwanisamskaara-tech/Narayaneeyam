import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send } from "lucide-react";
import { submitIssue } from "@/hooks/useUserIssues";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onClose: () => void;
}

const issueTypes = ["Audio not playing", "App crash / freeze", "Wrong text displayed", "Feature request", "Other"];

export default function ReportIssueDialog({ open, onClose }: Props) {
  const [issueType, setIssueType] = useState(issueTypes[0]);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!description.trim()) return;
    setSubmitting(true);
    const ok = await submitIssue(issueType, description);
    setSubmitting(false);
    if (ok) {
      toast({ title: "Report submitted", description: "Thank you for your feedback 🙏" });
      setDescription("");
      onClose();
    } else {
      toast({ title: "Failed to submit", description: "Please try again later", variant: "destructive" });
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[70] rounded-t-2xl bg-card border-t border-border shadow-lg max-h-[80vh] overflow-auto"
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="px-5 pb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-base font-semibold text-foreground">Report an Issue</h3>
                <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground font-sans mb-1 block">Issue Type</label>
                  <select value={issueType} onChange={e => setIssueType(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-sans text-foreground">
                    {issueTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-sans mb-1 block">Description</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)}
                    placeholder="Describe what happened…"
                    rows={4}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-sans text-foreground resize-none" />
                </div>
                <button onClick={handleSubmit} disabled={submitting || !description.trim()}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-gold px-4 py-2.5 text-sm font-sans font-semibold text-primary shadow-gold disabled:opacity-50 transition-transform hover:scale-[1.02]">
                  <Send className="h-4 w-4" />
                  {submitting ? "Submitting…" : "Submit Report"}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
