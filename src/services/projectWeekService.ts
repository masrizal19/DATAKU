import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getProjectWeeks as calcProjectWeeks } from '../utils/datetime';

export interface DatakuProjectWeek {
  id: string; // UUID from database
  project_id: string;
  week_number: number;
  week_start?: string | null;
  week_end?: string | null;
  status?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const projectWeekService = {
  /**
   * Fetch weeks for a project directly from public.dataku_project_weeks
   */
  async getProjectWeeks(projectId?: string): Promise<DatakuProjectWeek[]> {
    if (!isSupabaseConfigured) {
      return [];
    }
    try {
      let query = supabase.from('dataku_project_weeks').select('*');
      if (projectId) {
        query = query.eq('project_id', String(projectId));
      }
      const { data, error } = await query.order('week_number', { ascending: true });

      if (error) {
        console.warn('Error fetching dataku_project_weeks:', error.message);
        return [];
      }

      return (data as DatakuProjectWeek[]) || [];
    } catch (err: any) {
      console.warn('Failed to load dataku_project_weeks:', err?.message || err);
      return [];
    }
  },

  /**
   * Ensure that at least "Minggu 1" exists in public.dataku_project_weeks for the project.
   * Creates the first week if missing and returns the list with valid database UUIDs.
   */
  async ensureProjectWeeks(projectId: string, projectStartDate?: string): Promise<DatakuProjectWeek[]> {
    if (!isSupabaseConfigured || !projectId) {
      return [];
    }

    try {
      let existing = await this.getProjectWeeks(projectId);
      if (existing && existing.length > 0) {
        return existing;
      }

      const calculatedWeeks = calcProjectWeeks(
        projectStartDate || new Date().toISOString().substring(0, 10),
        1
      );

      const weeksToInsert = [{
        project_id: String(projectId),
        week_number: 1,
        week_start: calculatedWeeks[0].startDate,
        week_end: calculatedWeeks[0].endDate,
        status: 'active',
        notes: `Minggu 1`
      }];

      const { error } = await supabase
        .from('dataku_project_weeks')
        .insert(weeksToInsert);

      if (error) {
        console.error('Error creating missing dataku_project_weeks:', error);
      }

      return await this.getProjectWeeks(projectId);
    } catch (err) {
      console.error('Failed to ensure dataku_project_weeks:', err);
      return await this.getProjectWeeks(projectId);
    }
  },

  /**
   * Create the next sequential week for a project.
   * e.g., if existing has weeks 1 and 2, this will create week 3.
   */
  async addNextProjectWeek(projectId: string, projectStartDate?: string): Promise<DatakuProjectWeek[]> {
    if (!isSupabaseConfigured || !projectId) {
      return [];
    }

    try {
      let existing = await this.getProjectWeeks(projectId);
      if (!existing || existing.length === 0) {
        return await this.ensureProjectWeeks(projectId, projectStartDate);
      }

      const maxWeek = Math.max(...existing.map(w => w.week_number));
      const nextWeekNumber = maxWeek + 1;

      const calculatedWeeks = calcProjectWeeks(
        projectStartDate || new Date().toISOString().substring(0, 10),
        nextWeekNumber
      );

      const targetWeek = calculatedWeeks.find(w => w.weekNumber === nextWeekNumber);
      if (!targetWeek) {
        throw new Error(`Failed to calculate dates for week ${nextWeekNumber}`);
      }

      const { error } = await supabase
        .from('dataku_project_weeks')
        .insert({
          project_id: String(projectId),
          week_number: nextWeekNumber,
          week_start: targetWeek.startDate,
          week_end: targetWeek.endDate,
          status: 'active',
          notes: `Minggu ${nextWeekNumber}`
          // Let's not pass timestamps to let Supabase default them, or pass valid ISO
        });

      if (error) {
        console.error('Error adding next dataku_project_week:', error);
        throw error;
      }

      return await this.getProjectWeeks(projectId);
    } catch (err) {
      console.error('Failed to add next dataku_project_week:', err);
      throw err;
    }
  },

  async updateProjectWeek(id: string, updates: { week_start?: string; week_end?: string; notes?: string }): Promise<DatakuProjectWeek | null> {
    if (!isSupabaseConfigured || !id) return null;
    const { data, error } = await supabase
      .from('dataku_project_weeks')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating dataku_project_week:', error);
      throw error;
    }
    return data as DatakuProjectWeek;
  }
};
