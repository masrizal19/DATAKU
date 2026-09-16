import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { SupabaseFund } from '../types/supabase';

export const fundService = {
  async getFunds(projectId?: string): Promise<SupabaseFund[]> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase database is not configured.');
    }
    let query = supabase.from('funds').select('*');
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    const { data, error } = await query.order('transaction_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createFund(fund: Omit<SupabaseFund, 'id' | 'created_at'>): Promise<SupabaseFund> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase database is not configured.');
    }
    const { data, error } = await supabase
      .from('funds')
      .insert([fund])
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
