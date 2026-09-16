import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { SupabaseTransaction } from '../types/supabase';
import { Transaction } from '../types';
import { isUuidFormat } from '../utils/uuid';

export const transactionService = {
  async getTransactions(projectId?: string): Promise<SupabaseTransaction[]> {
    if (!isSupabaseConfigured) {
      return [];
    }
    let query = supabase.from('transactions').select('*');
    if (projectId && isUuidFormat(projectId)) {
      query = query.eq('project_id', String(projectId));
    }
    const { data, error } = await query.order('transaction_date', { ascending: false });

    if (error) {
      console.error('Error getting transactions:', error);
      throw error;
    }
    return data || [];
  },

  async createTransaction(tx: {
    project_id: string;
    type?: string;
    transaction_type?: string;
    category: string;
    amount: number;
    recipient?: string;
    description?: string;
    transaction_date?: string;
    created_by?: string;
  }): Promise<SupabaseTransaction> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase database is not configured.');
    }
    if (!isUuidFormat(tx.project_id)) {
      throw new Error('Project ID tidak valid.');
    }
    const txType = tx.transaction_type || tx.type || 'expense';
    const insertData: Record<string, any> = {
      project_id: tx.project_id.trim(),
      transaction_type: txType,
      category: tx.category,
      amount: Number(tx.amount) || 0,
      recipient: tx.recipient || '',
      description: tx.description || '',
      transaction_date: tx.transaction_date || new Date().toISOString().substring(0, 10)
    };

    if (tx.created_by && isUuidFormat(tx.created_by)) {
      insertData.created_by = tx.created_by.trim();
    }

    const { data, error } = await supabase
      .from('transactions')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
    return data;
  },

  async updateTransaction(id: string, updates: {
    category?: string;
    amount?: number;
    recipient?: string;
    description?: string;
    transaction_date?: string;
    transaction_type?: string;
    type?: string;
  }): Promise<SupabaseTransaction> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase database is not configured.');
    }
    if (!isUuidFormat(id)) {
      throw new Error('Transaction ID tidak valid.');
    }
    const updateData: Record<string, any> = {};
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.amount !== undefined) updateData.amount = Number(updates.amount) || 0;
    if (updates.recipient !== undefined) updateData.recipient = updates.recipient;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.transaction_date !== undefined) updateData.transaction_date = updates.transaction_date;
    const txType = updates.transaction_type || updates.type;
    if (txType !== undefined) updateData.transaction_type = txType;

    const { data, error } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating transaction:', error);
      throw error;
    }
    return data;
  },

  async deleteTransaction(id: string): Promise<void> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase database is not configured.');
    }
    if (!isUuidFormat(id)) {
      throw new Error('Transaction ID tidak valid.');
    }
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  }
};

export function mapSupabaseTransactionToApp(st: SupabaseTransaction): Transaction {
  let type: 'DANA_MASUK' | 'PENGELUARAN' | 'UPAH_TUKANG' = 'PENGELUARAN';
  const rawType = (st.transaction_type || st.type || '').toString().toUpperCase();
  if (rawType === 'INCOME' || rawType === 'DANA_MASUK' || rawType === 'MASUK') {
    type = 'DANA_MASUK';
  } else if (rawType === 'UPAH_TUKANG' || (st.category || '').toLowerCase().includes('upah')) {
    type = 'UPAH_TUKANG';
  } else {
    type = 'PENGELUARAN';
  }

  return {
    id: st.id,
    projectId: st.project_id,
    type: type,
    date: st.transaction_date || st.created_at || new Date().toISOString().substring(0, 10),
    amount: Number(st.amount) || 0,
    category: st.category || (type === 'DANA_MASUK' ? 'Dana Masuk' : type === 'UPAH_TUKANG' ? 'Upah Tukang' : 'Pengeluaran'),
    sourceOrRecipient: st.recipient || 'Lainnya',
    paymentMethod: 'Kas Tunai',
    notes: st.description || '',
    photos: []
  };
}

