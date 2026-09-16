import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { SupabaseProject } from '../types/supabase';
import { Project } from '../types';

export interface CreateProjectPayload {
  name: string;
  owner_name: string;
  location: string;
  start_date: string;
  target_date: string;
  budget: number;
  description: string;
  status?: string;
  created_by?: string;
}

export interface UpdateProjectPayload {
  name?: string;
  owner_name?: string;
  location?: string;
  start_date?: string;
  target_date?: string;
  budget?: number;
  description?: string;
  status?: string;
}

export function mapSupabaseProjectToProject(sp: SupabaseProject, activeProjectId: string | null): Project {
  return {
    id: sp.id,
    name: sp.name || '',
    owner: sp.owner_name || '',
    location: sp.location || '',
    startDate: sp.start_date || '',
    targetDate: sp.target_date || '',
    budget: Number(sp.budget) || 0,
    notes: sp.description || '',
    isArchived: sp.status === 'archived',
    isActive: sp.id === activeProjectId,
    createdBy: sp.created_by,
    createdAt: sp.created_at,
    updatedAt: sp.updated_at
  };
}

const isUUID = (str?: string): boolean => {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());
};

export const projectService = {
  async getProjects(mandorId?: string): Promise<SupabaseProject[]> {
    if (!isSupabaseConfigured) {
      console.warn('Supabase belum terkonfigurasi. Memeriksa kredensial...');
      return [];
    }
    let query = supabase.from('projects').select('*');
    if (mandorId && isUUID(mandorId)) {
      query = query.or(`created_by.eq.${mandorId},created_by.is.null`);
    }
    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Gagal mengambil data proyek dari Supabase:', {
        code: error.code,
        message: error.message
      });
      throw error;
    }
    return data || [];
  },

  async getProjectById(id: string): Promise<SupabaseProject | null> {
    if (!isSupabaseConfigured) return null;
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Gagal mengambil detail proyek:', {
        code: error.code,
        message: error.message
      });
      throw error;
    }
    return data;
  },

  async createProject(payload: CreateProjectPayload): Promise<SupabaseProject> {
    if (!isSupabaseConfigured) {
      throw new Error('Koneksi Supabase belum terkonfigurasi.');
    }

    const insertData: Record<string, any> = {
      name: payload.name.trim(),
      owner_name: payload.owner_name.trim(),
      location: payload.location.trim(),
      start_date: payload.start_date,
      target_date: payload.target_date,
      budget: Number(payload.budget) || 0,
      description: (payload.description || '').trim(),
      status: payload.status || 'active'
    };

    // Validasi created_by agar hanya menyertakan format UUID valid
    if (payload.created_by && isUUID(payload.created_by)) {
      insertData.created_by = payload.created_by.trim();
    }

    const { data, error } = await supabase
      .from('projects')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Gagal menambahkan proyek ke public.projects:', {
        code: error.code,
        message: error.message
      });
      throw error;
    }
    return data;
  },

  async updateProject(id: string, updates: UpdateProjectPayload): Promise<SupabaseProject> {
    if (!isSupabaseConfigured) {
      throw new Error('Koneksi Supabase belum terkonfigurasi.');
    }

    const updateData: Record<string, any> = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Gagal memperbarui proyek di public.projects:', {
        code: error.code,
        message: error.message
      });
      throw error;
    }
    return data;
  },

  async setProjectStatus(id: string, status: 'active' | 'archived'): Promise<SupabaseProject> {
    if (!isSupabaseConfigured) {
      throw new Error('Koneksi Supabase belum terkonfigurasi.');
    }

    const { data, error } = await supabase
      .from('projects')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Gagal mengubah status proyek di public.projects:', {
        code: error.code,
        message: error.message
      });
      throw error;
    }
    return data;
  },

  async deleteProject(id: string): Promise<void> {
    if (!isSupabaseConfigured) {
      throw new Error('Koneksi Supabase belum terkonfigurasi.');
    }

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Gagal menghapus proyek dari public.projects:', {
        code: error.code,
        message: error.message
      });
      throw error;
    }
  }
};

