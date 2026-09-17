import 'dotenv/config';
import { supabase } from './src/lib/supabase';

async function run() {
  const { data, error } = await supabase.rpc('get_dataku_app_settings', {
    p_mandor_id: 'a880ea24-e2eb-4a97-9690-c93a07376e0e'
  });
  console.log(data);
  console.log(error);
}

run();
