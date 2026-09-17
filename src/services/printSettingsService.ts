import { GlobalPrintSettings, } from '../types';
import { APP_SETTINGS_STORAGE_KEY, mapDbToPrintSettings } from './appSettingsService';

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

export const printSettingsService = {
  loadSettings(): GlobalPrintSettings {
    try {
      const stored = localStorage.getItem(APP_SETTINGS_STORAGE_KEY);
      if (stored) {
        return mapDbToPrintSettings(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Error reading local print settings:', e);
    }
    return DEFAULT_PRINT_SETTINGS;
  },

  async saveSettings(settings: GlobalPrintSettings): Promise<void> {
    // This is a no-op locally because appSettingsService.saveSettings will be used
  },

  async fetchRemoteSettings(): Promise<GlobalPrintSettings> {
    // Replaced by appSettingsService.fetchSettings in AppContext
    return this.loadSettings();
  }
};
