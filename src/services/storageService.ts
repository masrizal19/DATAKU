import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { SupabaseAttachment } from '../types/supabase';

export const storageService = {
  // Upload raw file to bucket
  async uploadFile(
    file: File | Blob, 
    folder: 'profiles' | 'projects' | 'materials' | 'transactions' | 'worker-payments' | 'daily-reports', 
    fileName: string
  ): Promise<string> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase Storage is not configured.');
    }
    
    const filePath = `${folder}/${Date.now()}_${fileName}`;
    
    const { data, error } = await supabase.storage
      .from('dataku-files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
      
    if (error) throw error;
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('dataku-files')
      .getPublicUrl(filePath);
      
    return publicUrl;
  },

  // Save metadata to attachments table
  async saveAttachment(attachment: Omit<SupabaseAttachment, 'id' | 'created_at'>): Promise<SupabaseAttachment> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase database is not configured.');
    }
    
    const { data, error } = await supabase
      .from('attachments')
      .insert([attachment])
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },

  // Retrieve attachments for a specific entity
  async getAttachments(referenceType: string, referenceId: string): Promise<SupabaseAttachment[]> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase database is not configured.');
    }
    
    const { data, error } = await supabase
      .from('attachments')
      .select('*')
      .eq('reference_type', referenceType)
      .eq('reference_id', referenceId);
      
    if (error) throw error;
    return data || [];
  }
};
