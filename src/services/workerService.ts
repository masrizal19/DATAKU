import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { SupabaseWorker, SupabaseWorkerPayment } from '../types/supabase';

export const workerService = {
  async getWorkers(projectId?: string): Promise<SupabaseWorker[]> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase database is not configured.');
    }
    let query = supabase.from('workers').select('*');
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    const { data, error } = await query.order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async createWorker(worker: Omit<SupabaseWorker, 'id' | 'created_at' | 'updated_at'>): Promise<SupabaseWorker> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase database is not configured.');
    }
    const { data, error } = await supabase
      .from('workers')
      .insert([worker])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getWorkerPayments(projectId?: string): Promise<SupabaseWorkerPayment[]> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase database is not configured.');
    }
    let query = supabase.from('worker_payments').select('*');
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    const { data, error } = await query.order('payment_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createWorkerPayment(payment: Omit<SupabaseWorkerPayment, 'id' | 'created_at'>): Promise<SupabaseWorkerPayment> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase database is not configured.');
    }
    const { data, error } = await supabase
      .from('worker_payments')
      .insert([payment])
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
