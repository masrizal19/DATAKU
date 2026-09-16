import { createClient, SupabaseClient } from '@supabase/supabase-js';

const fallbackUrl = 'https://oiqassfyxzwrwlkzjgyz.supabase.co';

const rawUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  fallbackUrl;

const rawKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.SUPABASE_PUBLISHABLE_KEY ||
  '';

export const SUPABASE_URL = (rawUrl || fallbackUrl).trim();
export const SUPABASE_PUBLISHABLE_KEY = rawKey.replace(/['"]/g, '').trim();

export const isSupabaseConfigured = Boolean(
  SUPABASE_PUBLISHABLE_KEY &&
  SUPABASE_PUBLISHABLE_KEY !== 'placeholder-publishable-key' &&
  SUPABASE_PUBLISHABLE_KEY.length > 10
);

let client: SupabaseClient;

try {
  client = createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY || 'placeholder-publishable-key',
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    }
  );
} catch (initErr) {
  console.error('Supabase initialization warning:', initErr);
  client = createClient(fallbackUrl, 'placeholder-publishable-key');
}

export const supabase = client;

