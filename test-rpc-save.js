import { loadEnv } from 'vite';

const env = loadEnv('development', process.cwd(), '');
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function run() {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/save_dataku_app_settings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    },
    body: JSON.stringify({ p_mandor_id: 'a880ea24-e2eb-4a97-9690-c93a07376e0e', p_settings: { app_name: 'DATAKU TEST' } })
  });
  const data = await response.text();
  console.log(data);
}

run();
