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
  async getProjectWeeks(projectId: string): Promise<DatakuProjectWeek[]> {
    if (!isSupabaseConfigured || !projectId) {
      return [];
    }
    try {
      const { data, error } = await supabase
        .from('dataku_project_weeks')
        .select('*')
        .eq('project_id', String(projectId))
        .order('week_number', { ascending: true });

      if (error) {
        console.error('Error fetching dataku_project_weeks:', error);
        throw error;
      }

      return (data as DatakuProjectWeek[]) || [];
    } catch (err) {
      console.error('Failed to load dataku_project_weeks:', err);
      throw err;
    }
  },

  /**
   * Ensure that 12 project weeks exist in public.dataku_project_weeks for the project.
   * Creates missing weeks if needed and returns the list with valid database UUIDs.
   */
  async ensureProjectWeeks(projectId: string, projectStartDate?: string): Promise<DatakuProjectWeek[]> {
    if (!isSupabaseConfigured || !projectId) {
      return [];
    }

    try {
      let existing = await this.getProjectWeeks(projectId);
      if (existing && existing.length >= 12) {
        return existing;
      }

      const calculatedWeeks = calcProjectWeeks(
        projectStartDate || new Date().toISOString().substring(0, 10),
        12
      );

      const existingMap = new Map<number, DatakuProjectWeek>();
      existing.forEach(w => existingMap.set(w.week_number, w));

      const weeksToInsert = calculatedWeeks
        .filter(w => !existingMap.has(w.weekNumber))
        .map(w => ({
          project_id: String(projectId),
          week_number: w.weekNumber,
          week_start: w.startDate,
          week_end: w.endDate,
          status: 'active',
          notes: `Minggu ${w.weekNumber}`
        }));

      if (weeksToInsert.length > 0) {
        const { error } = await supabase
          .from('dataku_project_weeks')
          .insert(weeksToInsert);

        if (error) {
          console.error('Error creating missing dataku_project_weeks:', error);
        }
      }

      return await this.getProjectWeeks(projectId);
    } catch (err) {
      console.error('Failed to ensure dataku_project_weeks:', err);
      return await this.getProjectWeeks(projectId);
    }
  }
};
