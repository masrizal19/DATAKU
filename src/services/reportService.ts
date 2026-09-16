import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { SupabaseDailyReport } from '../types/supabase';

export const reportService = {
  async getDailyReports(projectId?: string): Promise<SupabaseDailyReport[]> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase database is not configured.');
    }
    let query = supabase.from('daily_reports').select('*');
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    const { data, error } = await query.order('report_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createDailyReport(report: Omit<SupabaseDailyReport, 'id' | 'created_at' | 'updated_at'>): Promise<SupabaseDailyReport> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase database is not configured.');
    }
    const { data, error } = await supabase
      .from('daily_reports')
      .insert([report])
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
