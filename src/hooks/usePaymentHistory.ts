import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PaymentRecord {
  id: string;
  amount: number | null;
  currency: string | null;
  payment_status: string | null;
  transaction_type: string | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  paid_at: string | null;
  created_at: string | null;
  subscription_plan_id: string | null;
  plan_display_name: string | null;
}

/**
 * A user's own payments, newest first. RLS scopes rows to the signed-in user;
 * the explicit user_id filter keeps the query cheap and intent obvious.
 */
export function usePaymentHistory() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["payment-history", user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<PaymentRecord[]> => {
      const { data, error } = await (supabase as any)
        .from("payments")
        .select(
          "id, amount, currency, payment_status, transaction_type, razorpay_order_id, razorpay_payment_id, paid_at, created_at, subscription_plan_id, subscription_plans(display_name)"
        )
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        id: String(row.id),
        amount: row.amount ?? null,
        currency: row.currency ?? null,
        payment_status: row.payment_status ?? null,
        transaction_type: row.transaction_type ?? null,
        razorpay_order_id: row.razorpay_order_id ?? null,
        razorpay_payment_id: row.razorpay_payment_id ?? null,
        paid_at: row.paid_at ?? null,
        created_at: row.created_at ?? null,
        subscription_plan_id: row.subscription_plan_id ?? null,
        plan_display_name: row.subscription_plans?.display_name ?? null,
      }));
    },
  });

  return {
    payments: query.data ?? [],
    loading: query.isLoading,
    error: query.error as Error | null,
  };
}
