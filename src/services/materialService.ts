import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { SupabaseMaterial, SupabaseMaterialTransaction } from '../types/supabase';

export const materialService = {
  async getMaterials(projectId?: string): Promise<SupabaseMaterial[]> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase database is not configured.');
    }
    let query = supabase.from('materials').select('*');
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    const { data, error } = await query.order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async createMaterial(material: Omit<SupabaseMaterial, 'id' | 'created_at' | 'updated_at'>): Promise<SupabaseMaterial> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase database is not configured.');
    }
    const { data, error } = await supabase
      .from('materials')
      .insert([material])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateMaterialStock(id: string, newStock: number): Promise<SupabaseMaterial> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase database is not configured.');
    }
    const { data, error } = await supabase
      .from('materials')
      .update({ stock: newStock })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getMaterialTransactions(projectId?: string): Promise<SupabaseMaterialTransaction[]> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase database is not configured.');
    }
    let query = supabase.from('material_transactions').select('*');
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    const { data, error } = await query.order('transaction_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createMaterialTransaction(log: Omit<SupabaseMaterialTransaction, 'id' | 'created_at'>): Promise<SupabaseMaterialTransaction> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase database is not configured.');
    }
    const { data, error } = await supabase
      .from('material_transactions')
      .insert([log])
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
