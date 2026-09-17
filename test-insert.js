import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://placeholder.supabase.co',
  'placeholder-publishable-key'
);
// I can't do this without the URL and key.
