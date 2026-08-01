/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public base URL of the Cloudflare R2 bucket, e.g. https://cdn.narayaneeyam.app */
  readonly VITE_AUDIO_CDN_URL?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SUPABASE_PROJECT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
