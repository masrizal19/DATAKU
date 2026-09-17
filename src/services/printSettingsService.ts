import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getMandorUuid } from './userService';

export type PaperSize = 'A4' | 'F4';
export type PageOrientation = 'Portrait' | 'Landscape' | 'Otomatis';
export type ImageExportFormat = 'JPEG' | 'PNG';

export interface DocumentPrintConfig {
  paperSize: PaperSize;
  orientation: PageOrientation;
  autoFitContent: boolean;
  imageFormat: ImageExportFormat;
  includeLogo: boolean;
  includeKop: boolean;
  includeSignature: boolean;
}

export interface GlobalPrintSettings {
  defaultPaperSize: PaperSize;
  defaultOrientation: PageOrientation;
  autoFitContent: boolean;
  defaultImageFormat: ImageExportFormat;
  perDocumentSettings: {
    rekapKeuangan: DocumentPrintConfig;
    rekapUpah: DocumentPrintConfig;
    laporanProyek: DocumentPrintConfig;
    slipGaji: DocumentPrintConfig;
  };
}

export const DEFAULT_PRINT_SETTINGS: GlobalPrintSettings = {
  defaultPaperSize: 'A4',
  defaultOrientation: 'Otomatis',
  autoFitContent: true,
  defaultImageFormat: 'JPEG',
  perDocumentSettings: {
    rekapKeuangan: {
      paperSize: 'A4',
      orientation: 'Otomatis',
      autoFitContent: true,
      imageFormat: 'JPEG',
      includeLogo: true,
      includeKop: true,
      includeSignature: true
    },
    rekapUpah: {
      paperSize: 'A4',
      orientation: 'Otomatis',
      autoFitContent: true,
      imageFormat: 'JPEG',
      includeLogo: true,
      includeKop: true,
      includeSignature: true
    },
    laporanProyek: {
      paperSize: 'A4',
      orientation: 'Otomatis',
      autoFitContent: true,
      imageFormat: 'JPEG',
      includeLogo: true,
      includeKop: true,
      includeSignature: true
    },
    slipGaji: {
      paperSize: 'A4',
      orientation: 'Portrait',
      autoFitContent: true,
      imageFormat: 'JPEG',
      includeLogo: true,
      includeKop: true,
      includeSignature: true
    }
  }
};

const STORAGE_KEY = 'dataku_print_settings';

export const printSettingsService = {
  /**
   * Load print settings from localStorage with Supabase sync
   */
  loadSettings(): GlobalPrintSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...DEFAULT_PRINT_SETTINGS,
          ...parsed,
          perDocumentSettings: {
            ...DEFAULT_PRINT_SETTINGS.perDocumentSettings,
            ...(parsed.perDocumentSettings || {})
          }
        };
      }
    } catch (e) {
      console.warn('Error reading local print settings:', e);
    }
    return DEFAULT_PRINT_SETTINGS;
  },

  /**
   * Save settings to localStorage & sync to Supabase mandor profile if available
   */
  async saveSettings(settings: GlobalPrintSettings): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

      if (isSupabaseConfigured) {
        const mandorId = await getMandorUuid();
        if (mandorId) {
          // Attempt to persist in mandor's preferences / metadata column or fallback silently
          try {
            await supabase
              .from('mandors')
              .update({
                print_settings: settings
              } as any)
              .eq('id', mandorId);
          } catch (dbErr) {
            // Non-blocking if column doesn't exist yet
            console.warn('Silent notice: print_settings db column sync:', dbErr);
          }
        }
      }
    } catch (err) {
      console.error('Failed to save print settings:', err);
    }
  },

  /**
   * Fetch settings from Supabase if online, otherwise use local
   */
  async fetchRemoteSettings(): Promise<GlobalPrintSettings> {
    if (isSupabaseConfigured) {
      try {
        const mandorId = await getMandorUuid();
        if (mandorId) {
          const { data, error } = await supabase
            .from('mandors')
            .select('print_settings' as any)
            .eq('id', mandorId)
            .single();

          if (!error && (data as any)?.print_settings) {
            const remoteSettings = (data as any).print_settings as GlobalPrintSettings;
            const merged = {
              ...DEFAULT_PRINT_SETTINGS,
              ...remoteSettings,
              perDocumentSettings: {
                ...DEFAULT_PRINT_SETTINGS.perDocumentSettings,
                ...(remoteSettings.perDocumentSettings || {})
              }
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            return merged;
          }
        }
      } catch (err) {
        console.warn('Failed to fetch remote print settings, using local:', err);
      }
    }
    return this.loadSettings();
  }
};
