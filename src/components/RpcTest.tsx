import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function RpcTest() {
  useEffect(() => {
    supabase.rpc('get_dataku_app_settings', { p_mandor_id: 'a880ea24-e2eb-4a97-9690-c93a07376e0e' }).then(res => {
      console.log('RPC RES:', JSON.stringify(res.data, null, 2));
    });
  }, []);
  return null;
}
