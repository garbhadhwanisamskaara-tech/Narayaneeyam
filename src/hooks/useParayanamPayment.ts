import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { loadRazorpayScript } from "@/lib/razorpayCheckout";

/**
 * Razorpay checkout for a PAID parayanam contribution.
 *
 * Mirrors the subscription checkout flow: create an order server-side, open
 * Razorpay, then call verify-razorpay-payment on success. Confirmation of the
 * participant row happens server-side (verify + webhook); the caller only
 * needs to update its own UI optimistically via `onPaid`.
 *
 * Retrying is safe — each attempt simply creates a fresh order.
 */
export function useParayanamPayment() {
  const { user } = useAuth();
  const [payingId, setPayingId] = useState<string | null>(null);

  const pay = useCallback(
    async (
      parayanamId: string,
      handlers: { onPaid: () => void; onError: (message: string) => void },
    ) => {
      if (!user) {
        handlers.onError("Please sign in to continue.");
        return;
      }
      setPayingId(parayanamId);

      try {
        const { data: orderData, error: orderError } = await supabase.functions.invoke(
          "create-parayanam-payment-order",
          { body: { parayanam_id: parayanamId } },
        );

        if (orderError || orderData?.error) {
          throw new Error(orderData?.error || orderError?.message || "Could not start payment");
        }

        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          throw new Error("Could not load the payment gateway. Check your connection and try again.");
        }

        const razorpay = new window.Razorpay({
          key: orderData.key_id,
          amount: orderData.amount,
          currency: orderData.currency,
          name: "Sriman Narayaneeyam",
          description: orderData.parayanam_name ?? "Parayanam contribution",
          order_id: orderData.order_id,
          prefill: { email: user.email ?? undefined },
          theme: { color: "#0f766e" },
          handler: async (response: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
              "verify-razorpay-payment",
              { body: response },
            );

            setPayingId(null);

            if (verifyError || verifyData?.error) {
              // The webhook independently confirms the participant, so the
              // payment is not lost — surface a soft message and let the
              // realtime refresh catch up.
              handlers.onError(
                "Your payment went through. It may take a minute to reflect here — please refresh shortly.",
              );
              return;
            }

            handlers.onPaid();
          },
          modal: {
            ondismiss: () => setPayingId(null),
          },
        });

        razorpay.on("payment.failed", (response: any) => {
          setPayingId(null);
          handlers.onError(response?.error?.description || "Payment failed. Please try again.");
        });

        razorpay.open();
      } catch (e: any) {
        setPayingId(null);
        handlers.onError(e?.message ?? "Could not start payment. Please try again.");
      }
    },
    [user],
  );

  return { pay, payingId };
}
