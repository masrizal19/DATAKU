import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://oiqassfyxzwrwlkzjgyz.supabase.co';

const rawKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.SUPABASE_PUBLISHABLE_KEY ||
  '';

export const SUPABASE_URL = supabaseUrl.trim();
export const SUPABASE_PUBLISHABLE_KEY = rawKey.replace(/['"]/g, '').trim();

console.log({
  hasSupabaseKey: Boolean(SUPABASE_PUBLISHABLE_KEY),
  keyPrefix: SUPABASE_PUBLISHABLE_KEY
    ? SUPABASE_PUBLISHABLE_KEY.substring(0, 14)
    : null,
  supabaseUrl: SUPABASE_URL
});

export const isSupabaseConfigured = Boolean(
  SUPABASE_PUBLISHABLE_KEY && SUPABASE_PUBLISHABLE_KEY !== 'placeholder-publishable-key'
);

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY || 'placeholder-publishable-key'
);

