import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Receipt } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePaymentHistory, type PaymentRecord } from "@/hooks/usePaymentHistory";
import SEO from "@/components/SEO";
import { SUBSCRIPTION_ENABLED } from "@/config/features";

function statusStyle(status: string | null) {
  const s = (status ?? "").toLowerCase();
  if (s === "paid" || s === "captured" || s === "success")
    return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
  if (s === "failed") return "bg-destructive/10 text-destructive";
  if (s === "refunded") return "bg-secondary/15 text-secondary";
  return "bg-muted text-muted-foreground";
}

function statusLabel(status: string | null) {
  const s = (status ?? "").toLowerCase();
  if (s === "paid" || s === "captured" || s === "success") return "Successful";
  if (s === "created") return "Pending";
  if (!s) return "Unknown";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatAmount(p: PaymentRecord) {
  if (p.amount == null) return "—";
  const symbol = (p.currency ?? "INR").toUpperCase() === "INR" ? "₹" : `${p.currency} `;
  return `${symbol}${Number(p.amount).toLocaleString("en-IN")}`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function PaymentHistoryPage() {
  const { user } = useAuth();
  const { payments, loading, error } = usePaymentHistory();

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="font-display text-xl font-bold text-foreground mb-2">Sign in to view payments</h2>
          <p className="text-sm text-muted-foreground font-sans mb-4">
            Your payment history is available once you sign in.
          </p>
          <Link
            to="/auth"
            className="rounded-lg bg-primary px-6 py-2.5 text-sm font-sans font-semibold text-primary-foreground hover:opacity-90"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <SEO
        path="/payment-history"
        title="Payment History — Sriman Narayaneeyam"
        description="View your past subscription payments for the Sriman Narayaneeyam app."
      />
      <div className="text-center mb-8">
        <h1 className="font-display text-2xl font-bold text-foreground">Payment History</h1>
        <p className="text-sm text-muted-foreground font-sans mt-1">A record of your subscription payments</p>
      </div>

      {loading ? (
        <p className="text-center text-sm text-muted-foreground font-sans py-12">Loading payments…</p>
      ) : error ? (
        <p className="text-center text-sm text-destructive font-sans py-12">
          Could not load your payments. Please try again.
        </p>
      ) : payments.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <Receipt className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <h2 className="font-display text-lg font-bold text-foreground mb-1">No payments yet</h2>
          <p className="text-sm text-muted-foreground font-sans mb-5">
            When you subscribe, your payments will appear here.
          </p>
          {SUBSCRIPTION_ENABLED && (
            <Link
              to="/subscribe"
              className="inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-sans font-semibold text-primary-foreground hover:opacity-90"
            >
              View Plans
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 8) * 0.05 }}
              className="rounded-2xl border border-border bg-card p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="font-display text-base font-bold text-foreground truncate">
                    {p.plan_display_name ?? (p.transaction_type === "subscription" ? "Subscription" : "Payment")}
                  </h3>
                  <p className="text-xs text-muted-foreground font-sans mt-0.5">
                    {formatDate(p.paid_at ?? p.created_at)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-sans font-semibold text-foreground">{formatAmount(p)}</p>
                  <span
                    className={`inline-block mt-1 rounded-full px-2.5 py-0.5 text-[11px] font-sans font-semibold ${statusStyle(
                      p.payment_status
                    )}`}
                  >
                    {statusLabel(p.payment_status)}
                  </span>
                </div>
              </div>

              {(p.razorpay_payment_id || p.razorpay_order_id) && (
                <p className="mt-3 pt-3 border-t border-border text-[11px] font-sans text-muted-foreground break-all">
                  Reference: {p.razorpay_payment_id ?? p.razorpay_order_id}
                </p>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
