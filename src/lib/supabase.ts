import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabasePublishableKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim();

export const SUPABASE_URL = supabaseUrl;
export const SUPABASE_PUBLISHABLE_KEY = supabasePublishableKey;

export const hasSupabaseUrl = Boolean(
  supabaseUrl &&
  (supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://')) &&
  !supabaseUrl.includes('MASUKKAN_SUPABASE_URL')
);

export const hasSupabasePublishableKey = Boolean(
  supabasePublishableKey &&
  supabasePublishableKey !== 'placeholder-publishable-key' &&
  supabasePublishableKey.length > 10 &&
  !supabasePublishableKey.includes('MASUKKAN_SUPABASE_')
);

export const isSupabaseConfigured = hasSupabaseUrl && hasSupabasePublishableKey;

// Safe runtime diagnostic: log presence without revealing secrets
if (typeof window !== 'undefined') {
  console.log('DATAKU Supabase Config Status:', {
    hasSupabaseUrl,
    hasSupabasePublishableKey
  });
}

let client: SupabaseClient;

try {
  if (isSupabaseConfigured) {
    client = createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  } else {
    client = createClient('https://placeholder.supabase.co', 'placeholder-publishable-key');
  }
} catch (initErr) {
  console.error('Supabase initialization warning:', initErr);
  client = createClient('https://placeholder.supabase.co', 'placeholder-publishable-key');
}

export const supabase = client;


