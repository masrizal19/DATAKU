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

    try {
      // 1. Prioritas sorting: display_order ASC, created_at ASC, id ASC as fallback
      const { data, error } = await query
        .order('display_order', { ascending: true, nullsFirst: false })
        .order('transaction_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true })
        .order('id', { ascending: true });

      if (error) {
        // Fallback jika kolom display_order belum ada di db pengguna
        if (error.message.includes('display_order') || error.code === '42703') {
          console.warn('Kolom display_order tidak ditemukan, menggunakan urutan default created_at');
          const fallbackQuery = supabase.from('transactions').select('*');
          if (projectId && isUuidFormat(projectId)) {
            fallbackQuery.eq('project_id', String(projectId));
          }
          const { data: fbData, error: fbError } = await fallbackQuery
            .order('created_at', { ascending: true })
            .order('id', { ascending: true });
          if (fbError) throw fbError;
          return fbData || [];
        }
        throw error;
      }

      // Self-healing migration: Jika ada transaksi yang belum memiliki display_order (> 0)
      if (data && data.length > 0) {
        const needMigration = data.some(t => t.display_order === null || t.display_order === 0);
        if (needMigration) {
          console.log(`Migrating display_order sequentially for project ${projectId}...`);
          // Urutkan berdasarkan created_at ASC, kemudian id ASC
          const sortedForMigration = [...data].sort((a, b) => {
            const dateA = new Date(a.transaction_at || a.transaction_date || a.created_at || 0).getTime();
            const dateB = new Date(b.transaction_at || b.transaction_date || b.created_at || 0).getTime();
            if (dateA !== dateB) return dateA - dateB;
            return (a.id || '').localeCompare(b.id || '');
          });

          const updates = sortedForMigration.map((t, idx) => ({
            id: t.id,
            display_order: idx + 1
          }));

          // Jalankan update secara batch
          const promises = updates.map(item => {
            if (!isUuidFormat(item.id)) return Promise.resolve();
            return supabase
              .from('transactions')
              .update({ display_order: item.display_order })
              .eq('id', item.id);
          });
          
          try {
            await Promise.all(promises);
            // Tempelkan nilai display_order baru secara lokal agar langsung ter-render dengan urutan yang benar
            sortedForMigration.forEach((t, idx) => {
              t.display_order = idx + 1;
            });
            return sortedForMigration;
          } catch (mErr) {
            console.error('Error during batch display_order migration:', mErr);
          }
        }
      }

      return data || [];
    } catch (err) {
      console.error('Error fetching sorted transactions, falling back to basic created_at:', err);
      const safeQuery = supabase.from('transactions').select('*');
      if (projectId && isUuidFormat(projectId)) {
        safeQuery.eq('project_id', String(projectId));
      }
      const { data, error } = await safeQuery.order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    }
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
    display_order?: number;
  }): Promise<SupabaseTransaction> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase database is not configured.');
    }
    if (!isUuidFormat(tx.project_id)) {
      throw new Error('Project ID tidak valid.');
    }

    // Hitung display_order otomatis jika tidak diberikan (mencari max + 1)
    let displayOrder = tx.display_order;
    if (displayOrder === undefined) {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('display_order')
          .eq('project_id', tx.project_id)
          .order('display_order', { ascending: false })
          .limit(1);
        if (!error && data && data.length > 0) {
          displayOrder = (Number(data[0].display_order) || 0) + 1;
        } else {
          displayOrder = 1;
        }
      } catch (err) {
        displayOrder = 1;
      }
    }

    const txType = tx.transaction_type || tx.type || 'expense';
    const insertData: Record<string, any> = {
      project_id: tx.project_id.trim(),
      transaction_type: txType,
      category: tx.category,
      amount: Number(tx.amount) || 0,
      recipient: tx.recipient || '',
      description: tx.description || '',
      transaction_date: tx.transaction_date ? tx.transaction_date.substring(0, 10) : new Date().toISOString().substring(0, 10),
      transaction_at: tx.transaction_date || new Date().toISOString(),
      display_order: displayOrder
    };

    if (tx.created_by && isUuidFormat(tx.created_by)) {
      insertData.created_by = tx.created_by.trim();
    }

    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([insertData])
        .select()
        .single();

      if (error) {
        // Fallback jika kolom display_order belum ada
        if (error.message.includes('display_order') || error.code === '42703') {
          console.warn('display_order column missing during insert, retrying without it');
          const { display_order, ...safeInsertData } = insertData;
          const { data: safeData, error: safeError } = await supabase
            .from('transactions')
            .insert([safeInsertData])
            .select()
            .single();
          if (safeError) throw safeError;
          return safeData;
        }
        throw error;
      }
      return data;
    } catch (err) {
      console.error('Error creating transaction:', err);
      throw err;
    }
  },

  async updateTransaction(id: string, updates: {
    category?: string;
    amount?: number;
    recipient?: string;
    description?: string;
    transaction_date?: string;
    transaction_type?: string;
    type?: string;
    display_order?: number;
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
    if (updates.transaction_date !== undefined) {
      updateData.transaction_date = updates.transaction_date.substring(0, 10);
      updateData.transaction_at = updates.transaction_date;
    }
    const txType = updates.transaction_type || updates.type;
    if (txType !== undefined) updateData.transaction_type = txType;
    if (updates.display_order !== undefined) updateData.display_order = updates.display_order;

    try {
      const { data, error } = await supabase
        .from('transactions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.message.includes('display_order') || error.code === '42703') {
          console.warn('display_order column missing during update, retrying without it');
          const { display_order, ...safeUpdateData } = updateData;
          const { data: safeData, error: safeError } = await supabase
            .from('transactions')
            .update(safeUpdateData)
            .eq('id', id)
            .select()
            .single();
          if (safeError) throw safeError;
          return safeData;
        }
        throw error;
      }
      return data;
    } catch (err) {
      console.error('Error updating transaction:', err);
      throw err;
    }
  },

  async updateTransactionsOrder(items: { id: string; display_order: number }[]): Promise<void> {
    if (!isSupabaseConfigured) return;
    const promises = items.map(item => {
      if (!isUuidFormat(item.id)) return Promise.resolve();
      return supabase
        .from('transactions')
        .update({ display_order: item.display_order })
        .eq('id', item.id);
    });
    try {
      await Promise.all(promises);
    } catch (err) {
      console.error('Error updating transactions order batch:', err);
    }
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
    date: st.transaction_date || st.created_at || new Date().toISOString(),
    amount: Number(st.amount) || 0,
    category: st.category || (type === 'DANA_MASUK' ? 'Dana Masuk' : type === 'UPAH_TUKANG' ? 'Upah Tukang' : 'Pengeluaran'),
    sourceOrRecipient: st.recipient || 'Lainnya',
    paymentMethod: 'Kas Tunai',
    notes: st.description || '',
    photos: [],
    displayOrder: st.display_order || 0,
    createdAt: st.created_at
  };
}

