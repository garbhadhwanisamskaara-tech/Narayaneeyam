import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: SupabaseClient;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  console.warn(
    "Missing Supabase env vars (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). " +
      "Database features will be unavailable."
  );

  const emptyResult = { data: null, error: null, count: null, status: 200, statusText: "OK" };
  const chainable: any = new Proxy(
    {},
    {
      get(_target, _prop) {
        return (..._args: any[]) => chainable;
      },
    }
  );
  chainable.then = (resolve: any) => resolve(emptyResult);

  const handler: ProxyHandler<any> = {
    get(_target, prop) {
      if (prop === "auth") {
        return {
          getSession: () => Promise.resolve({ data: { session: null }, error: null }),
          getUser: () => Promise.resolve({ data: { user: null }, error: null }),
          onAuthStateChange: (_cb: any) => ({ data: { subscription: { unsubscribe: () => {} } } }),
          signUp: () => Promise.resolve({ data: null, error: { message: "Supabase not configured" } }),
          signInWithPassword: () => Promise.resolve({ data: null, error: { message: "Supabase not configured" } }),
          signOut: () => Promise.resolve({ error: null }),
        };
      }
      if (prop === "from" || prop === "rpc") {
        return (..._args: any[]) => chainable;
      }
      return () => chainable;
    },
  };

  supabase = new Proxy({} as SupabaseClient, handler);
}

export { supabase };
