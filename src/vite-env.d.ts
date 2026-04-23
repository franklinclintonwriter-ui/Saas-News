/// <reference types="vite/client" />

// Phulpur24 frontend env — keep this list aligned with .env.production.example
// and .env.local.template so the compiler catches typos in import.meta.env
// references.
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_ADMIN_API_BASE_URL?: string;
  readonly VITE_PUBLIC_SITE_URL?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_SENTRY_ENVIRONMENT?: string;
  readonly VITE_SENTRY_TRACES_SAMPLE_RATE?: string;
  readonly VITE_SENTRY_REPLAYS_SAMPLE_RATE?: string;
  readonly VITE_SENTRY_SEND_USER_EMAIL?: 'true' | 'false';
  readonly VITE_PLAUSIBLE_DOMAIN?: string;
  readonly VITE_PLAUSIBLE_SCRIPT?: string;
  readonly VITE_APP_VERSION?: string;
  readonly VITE_APP_SURFACE?: 'public' | 'admin';
  readonly MODE: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly SSR: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
