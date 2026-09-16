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
  console.info('[DATAKU] Supabase configured:', {
    url: Boolean(import.meta.env.VITE_SUPABASE_URL),
    publishableKey: Boolean(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)
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
  console.error('[DATAKU] Supabase initialization warning:', initErr);
  client = createClient('https://placeholder.supabase.co', 'placeholder-publishable-key');
}

export const supabase = client;

// Safe internal database connection test function
export async function testSupabaseConnection(): Promise<boolean> {
  if (!isSupabaseConfigured) {
    console.info('[DATAKU] Supabase connection test skipped: not configured');
    return false;
  }
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('id')
      .limit(1);

    console.info('[DATAKU] projects query:', {
      success: !error,
      count: data?.length ?? 0
    });

    if (error) {
      console.error('[DATAKU] projects query error:', {
        code: error.code,
        message: error.message
      });
      return false;
    }
    return true;
  } catch (err: any) {
    console.error('[DATAKU] projects connection test exception:', err?.message || err);
    return false;
  }
}

// Automatically test connection when running in browser
if (typeof window !== 'undefined') {
  testSupabaseConnection();
}



