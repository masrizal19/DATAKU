import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { SupabaseTransaction } from '../types/supabase';

export const transactionService = {
  async getTransactions(projectId?: string): Promise<SupabaseTransaction[]> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase database is not configured.');
    }
    let query = supabase.from('transactions').select('*');
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    const { data, error } = await query.order('transaction_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createTransaction(tx: Omit<SupabaseTransaction, 'id' | 'created_at' | 'updated_at'>): Promise<SupabaseTransaction> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase database is not configured.');
    }
    const { data, error } = await supabase
      .from('transactions')
      .insert([tx])
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
