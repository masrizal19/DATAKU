import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface DocumentMetadata {
  id?: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  fileSize?: number;
  uploadedAt: string;
  category?: 'SLIP_GAJI' | 'BUKTI_PEMBAYARAN' | 'MATERIAL' | 'LAPORAN';
}

export const documentService = {
  /**
   * Upload file (JPG, JPEG, PNG, WEBP, PDF) to Supabase Storage.
   * Falls back to Data URL if storage bucket is not created or restricted.
   */
  async uploadDocument(
    file: File,
    category: 'SLIP_GAJI' | 'BUKTI_PEMBAYARAN' | 'MATERIAL' | 'LAPORAN' = 'BUKTI_PEMBAYARAN'
  ): Promise<DocumentMetadata> {
    const uploadedAt = new Date().toISOString();
    const cleanFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.storage
          .from('dataku_documents')
          .upload(cleanFileName, file, { upsert: true });

        if (!error && data?.path) {
          const { data: publicUrlData } = supabase.storage
            .from('dataku_documents')
            .getPublicUrl(data.path);

          return {
            fileName: file.name,
            fileType: file.type || 'application/octet-stream',
            fileUrl: publicUrlData.publicUrl,
            fileSize: file.size,
            uploadedAt,
            category
          };
        }
      } catch (err) {
        console.warn('Supabase storage upload fallback to Data URL:', err);
      }
    }

    // Fallback: Read as Data URL (base64) so file works immediately cross-device / local
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });

    return {
      fileName: file.name,
      fileType: file.type || 'image/jpeg',
      fileUrl: dataUrl,
      fileSize: file.size,
      uploadedAt,
      category
    };
  }
};
