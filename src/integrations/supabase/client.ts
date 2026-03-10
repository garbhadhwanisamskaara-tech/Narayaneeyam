import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

let supabaseInstance: SupabaseClient | null = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  try {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    console.warn("Failed to initialize Supabase client:", e);
  }
} else {
  console.warn("Supabase credentials not configured. Backend features will be unavailable.");
}

// Export as potentially null - consumers must null-check
export const supabase: SupabaseClient | null = supabaseInstance;
