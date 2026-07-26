import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  VAPID_PUBLIC_KEY,
  getRegistration,
  isPushSupported,
  urlBase64ToUint8Array,
} from "@/lib/pushNotifications";

type PushStatus = "loading" | "unsupported" | "denied" | "ready";

export function usePushReminders() {
  const { user } = useAuth();
  const [status, setStatus] = useState<PushStatus>("loading");
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;

    (async () => {
      if (!isPushSupported()) {
        if (active) setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        if (active) setStatus("denied");
        return;
      }
      const reg = await getRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (!active) return;
      setEnabled(!!sub);
      setStatus("ready");
    })();

    return () => {
      active = false;
    };
  }, [user?.id]);

  const enable = useCallback(async (): Promise<{ error: string | null }> => {
    if (!user) return { error: "Please sign in first." };
    if (!isPushSupported()) return { error: "Your browser does not support reminders." };

    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "ready");
        return { error: "Notification permission was not granted." };
      }

      const reg = await getRegistration();
      if (!reg) return { error: "Could not prepare notifications on this device." };

      const existing = await reg.pushManager.getSubscription();
      const subscription =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        }));

      const json = subscription.toJSON();
      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh: json.keys?.p256dh,
          auth_key: json.keys?.auth,
        },
        { onConflict: "endpoint" },
      );
      if (error) return { error: error.message };

      setEnabled(true);
      return { error: null };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Could not enable reminders." };
    } finally {
      setBusy(false);
    }
  }, [user]);

  const disable = useCallback(async (): Promise<{ error: string | null }> => {
    setBusy(true);
    try {
      const reg = await getRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      const endpoint = sub?.endpoint;
      if (sub) await sub.unsubscribe();

      if (user) {
        let query = supabase.from("push_subscriptions").delete().eq("user_id", user.id);
        if (endpoint) query = query.eq("endpoint", endpoint);
        const { error } = await query;
        if (error) return { error: error.message };
      }

      setEnabled(false);
      return { error: null };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Could not turn off reminders." };
    } finally {
      setBusy(false);
    }
  }, [user]);

  return { status, enabled, busy, enable, disable };
}
