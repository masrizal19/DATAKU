import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { SupabaseProject } from '../types/supabase';

export const projectService = {
  async getProjects(): Promise<SupabaseProject[]> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase database is not configured.');
    }
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getProjectById(id: string): Promise<SupabaseProject | null> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase database is not configured.');
    }
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async createProject(project: Omit<SupabaseProject, 'id' | 'created_at' | 'updated_at'>): Promise<SupabaseProject> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase database is not configured.');
    }
    const { data, error } = await supabase
      .from('projects')
      .insert([project])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateProject(id: string, updates: Partial<SupabaseProject>): Promise<SupabaseProject> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase database is not configured.');
    }
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
