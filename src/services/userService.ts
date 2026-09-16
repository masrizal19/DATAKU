import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { isUuidFormat } from '../utils/uuid';

export { isUuidFormat };

export async function getMandorUuid(currentUsername?: string): Promise<string | undefined> {
  const storedId = localStorage.getItem('dataku_mandor_id');

  if (storedId && isUuidFormat(storedId)) {
    return storedId;
  }

  const uname = (currentUsername || localStorage.getItem('dataku_user') || 'PAUJI').trim();

  if (isSupabaseConfigured && uname) {
    try {
      const { data, error } = await supabase
        .from('mandors')
        .select('id, username, full_name')
        .or(`username.ilike.${uname},full_name.ilike.${uname}`)
        .limit(1);

      if (!error && data && data.length > 0 && isUuidFormat(data[0].id)) {
        const foundUuid = data[0].id;
        localStorage.setItem('dataku_mandor_id', foundUuid);
        return foundUuid;
      }

      // Fallback ke login_mandor RPC untuk mengambil UUID mandor PAUJI
      const savedPin = localStorage.getItem('dataku_pin') || '1999';
      const rpcRes = await supabase.rpc('login_mandor', {
        p_username: uname,
        p_pin: savedPin
      });

      if (!rpcRes.error && rpcRes.data) {
        let rpcUuid: string | undefined;
        if (typeof rpcRes.data === 'object') {
          rpcUuid = (rpcRes.data as any).mandor?.id || (rpcRes.data as any).id;
        }
        if (rpcUuid && isUuidFormat(rpcUuid)) {
          localStorage.setItem('dataku_mandor_id', rpcUuid);
          return rpcUuid;
        }
      }
    } catch (err) {
      console.warn('[DATAKU] Could not fetch mandor UUID from database:', err);
    }
  }

  return storedId && isUuidFormat(storedId) ? storedId : undefined;
}

