import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Testing Supabase connection and checking display_order column...');
  const { data, error } = await supabase
    .from('transactions')
    .select('display_order')
    .limit(1);

  if (error) {
    console.log('Error selecting display_order:', error.message);
    if (error.message.includes('column') && error.message.includes('does not exist')) {
      console.log('RESULT: Column display_order does NOT exist.');
    } else {
      console.log('RESULT: Other error:', error);
    }
  } else {
    console.log('RESULT: Column display_order EXISTS!');
    console.log('Data sample:', data);
  }
}

run();
