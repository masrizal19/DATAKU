import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { SupabaseDailyReport } from '../types/supabase';
import { DailyReport } from '../types';
import { isUuidFormat } from '../utils/uuid';

export const reportService = {
  async getDailyReports(projectId?: string): Promise<SupabaseDailyReport[]> {
    if (!isSupabaseConfigured) {
      return [];
    }
    let query = supabase.from('daily_reports').select('*');
    if (projectId && isUuidFormat(projectId)) {
      query = query.eq('project_id', String(projectId));
    }
    const { data, error } = await query.order('report_date', { ascending: false });

    if (error) {
      console.error('Error getting daily reports:', error);
      throw error;
    }
    return data || [];
  },

  async createDailyReport(report: {
    project_id: string;
    report_date?: string;
    weather?: string;
    worker_count?: number;
    work_description?: string;
    materials_used?: string;
    obstacles?: string;
    notes?: string;
    created_by?: string;
  }): Promise<SupabaseDailyReport> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase database is not configured.');
    }
    if (!isUuidFormat(report.project_id)) {
      throw new Error('Project ID tidak valid.');
    }
    const insertData: Record<string, any> = {
      project_id: report.project_id.trim(),
      report_date: report.report_date || new Date().toISOString().substring(0, 10),
      weather: report.weather || 'Cerah',
      worker_count: Number(report.worker_count) || 0,
      work_description: report.work_description || '',
      materials_used: report.materials_used || '',
      obstacles: report.obstacles || '',
      notes: report.notes || ''
    };

    if (report.created_by && isUuidFormat(report.created_by)) {
      insertData.created_by = report.created_by.trim();
    }

    const { data, error } = await supabase
      .from('daily_reports')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('Error creating daily report:', error);
      throw error;
    }
    return data;
  }
};

export function mapSupabaseDailyReportToApp(sdr: SupabaseDailyReport): DailyReport {
  return {
    id: sdr.id,
    projectId: sdr.project_id,
    date: sdr.report_date || sdr.created_at || new Date().toISOString().substring(0, 10),
    weather: sdr.weather || 'Cerah',
    workerCount: Number(sdr.worker_count) || 0,
    todayWork: sdr.work_description || '',
    materialsIn: '',
    materialsUsed: sdr.materials_used || '',
    challenges: sdr.obstacles || '',
    notes: sdr.notes || '',
    photos: []
  };
}

