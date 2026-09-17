import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { AppIdentityConfig, GlobalPrintSettings, NavigationConfig } from '../types';
import { DEFAULT_IDENTITY_CONFIG } from './identityService';
import { DEFAULT_PRINT_SETTINGS } from './printSettingsService';

export const APP_SETTINGS_STORAGE_KEY = 'dataku_app_settings_cache';

// Convert DB row to frontend Identity state
export function mapDbToIdentity(dbRow: any): AppIdentityConfig {
  const nav: NavigationConfig = {
    ...DEFAULT_IDENTITY_CONFIG.navigationSettings!,
    activeBackgroundColor: dbRow.active_menu_color || DEFAULT_IDENTITY_CONFIG.navigationSettings!.activeBackgroundColor,
    activeTextColor: dbRow.active_menu_text_color || DEFAULT_IDENTITY_CONFIG.navigationSettings!.activeTextColor,
    activeOutlineColor: dbRow.active_menu_border_color || DEFAULT_IDENTITY_CONFIG.navigationSettings!.activeOutlineColor,
    activeOutlineWidth: dbRow.navigation_border_width ?? DEFAULT_IDENTITY_CONFIG.navigationSettings!.activeOutlineWidth,
    activeRadius: dbRow.navigation_radius ?? DEFAULT_IDENTITY_CONFIG.navigationSettings!.activeRadius,
    menuGap: dbRow.navigation_spacing ?? DEFAULT_IDENTITY_CONFIG.navigationSettings!.menuGap,
  };

  return {
    ...DEFAULT_IDENTITY_CONFIG,
    appName: dbRow.app_name || DEFAULT_IDENTITY_CONFIG.appName,
    tagline: dbRow.app_tagline || DEFAULT_IDENTITY_CONFIG.tagline,
    logoUrl: dbRow.logo_url || dbRow.logo_data || DEFAULT_IDENTITY_CONFIG.logoUrl,
    logoScale: dbRow.logo_scale != null ? dbRow.logo_scale * 100 : DEFAULT_IDENTITY_CONFIG.logoScale,
    logoX: dbRow.logo_position_x ?? 0,
    logoY: dbRow.logo_position_y ?? 0,
    appNameSize: dbRow.app_name_font_size ?? DEFAULT_IDENTITY_CONFIG.appNameSize,
    appNameX: dbRow.app_name_position_x ?? 0,
    appNameY: dbRow.app_name_position_y ?? 0,
    taglineSize: dbRow.tagline_font_size ?? DEFAULT_IDENTITY_CONFIG.taglineSize,
    appNameColor: dbRow.primary_color || DEFAULT_IDENTITY_CONFIG.appNameColor,
    taglineColor: dbRow.secondary_color || DEFAULT_IDENTITY_CONFIG.taglineColor,
    taglineBgColor: dbRow.background_color || DEFAULT_IDENTITY_CONFIG.taglineBgColor,
    logoOutlineEnabled: dbRow.logo_outline_enabled ?? true,
    logoOutlineWidth: dbRow.logo_outline_width ?? 2,
    logoOutlineColor: dbRow.logo_outline_color ?? '#0F172A',
    logoOutlineRadius: dbRow.logo_outline_radius ?? 12,
    navigationSettings: nav
  };
}

// Convert DB row to frontend Print state
export function mapDbToPrintSettings(dbRow: any): GlobalPrintSettings {
  const defaultPS = DEFAULT_PRINT_SETTINGS;
  const remotePerDoc = dbRow.settings?.perDocumentSettings || {};
  
  return {
    ...defaultPS,
    defaultPaperSize: (dbRow.print_paper_size as any) || 'A4',
    defaultOrientation: (dbRow.print_orientation as any) || 'Otomatis',
    perDocumentSettings: {
      rekapKeuangan: { ...defaultPS.perDocumentSettings.rekapKeuangan, ...(remotePerDoc.rekapKeuangan || {}) },
      rekapUpah: { ...defaultPS.perDocumentSettings.rekapUpah, ...(remotePerDoc.rekapUpah || {}) },
      laporanProyek: { ...defaultPS.perDocumentSettings.laporanProyek, ...(remotePerDoc.laporanProyek || {}) },
      slipGaji: { ...defaultPS.perDocumentSettings.slipGaji, ...(remotePerDoc.slipGaji || {}) }
    }
  };
}

// Convert Frontend states to DB payload
export function mapStateToDb(identity: AppIdentityConfig, print: GlobalPrintSettings, user?: any) {
  const isDataUrl = identity.logoUrl?.startsWith('data:');
  
  return {
    app_name: identity.appName,
    app_tagline: identity.tagline,
    logo_url: !isDataUrl ? identity.logoUrl : null,
    logo_data: isDataUrl ? identity.logoUrl : null,
    logo_scale: identity.logoScale / 100,
    logo_position_x: identity.logoX,
    logo_position_y: identity.logoY,
    app_name_font_size: identity.appNameSize,
    app_name_position_x: identity.appNameX,
    app_name_position_y: identity.appNameY,
    tagline_font_size: identity.taglineSize,
    primary_color: identity.appNameColor,
    secondary_color: identity.taglineColor,
    background_color: identity.taglineBgColor,
    logo_outline_enabled: identity.logoOutlineEnabled ?? true,
    logo_outline_width: identity.logoOutlineWidth ?? 2,
    logo_outline_color: identity.logoOutlineColor ?? '#0F172A',
    logo_outline_radius: identity.logoOutlineRadius ?? 12,
    
    // Navigation
    active_menu_color: identity.navigationSettings?.activeBackgroundColor || null,
    active_menu_text_color: identity.navigationSettings?.activeTextColor || null,
    active_menu_border_color: identity.navigationSettings?.activeOutlineColor || null,
    navigation_border_width: identity.navigationSettings?.activeOutlineWidth ?? 2,
    navigation_radius: identity.navigationSettings?.activeRadius ?? 12,
    navigation_spacing: identity.navigationSettings?.menuGap ?? 6,

    // Print
    print_paper_size: print.defaultPaperSize,
    print_orientation: print.defaultOrientation,

    // Identity (Mandor)
    full_name: user?.name || null,
    username: user?.name || null,
    phone: user?.phone || null,
    email: user?.email || null,
    company_name: user?.company || null,
    job_title: user?.jobTitle || null,
    address: user?.address || null,
    
    // Pass existing print per-document settings through JSONB
    settings: {
      perDocumentSettings: print.perDocumentSettings
    }
  };
}

export const appSettingsService = {
  async fetchSettings(mandorId: string): Promise<any | null> {
    if (!isSupabaseConfigured || !mandorId) return null;
    try {
      const { data, error } = await supabase.rpc('get_dataku_app_settings', { p_mandor_id: mandorId });
      if (error) {
        console.error('[appSettingsService] RPC Error get_dataku_app_settings:', error);
        return null;
      }
      if (data) {
        // Cache to localStorage
        localStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(data));
      }
      return data;
    } catch (err) {
      console.error('[appSettingsService] Failed to load app settings:', err);
      return null;
    }
  },

  loadCachedPrintSettings(): GlobalPrintSettings {
    try {
      const stored = localStorage.getItem(APP_SETTINGS_STORAGE_KEY);
      if (stored) return mapDbToPrintSettings(JSON.parse(stored));
    } catch(e) {}
    return DEFAULT_PRINT_SETTINGS;
  },

  async saveSettings(mandorId: string, identity: AppIdentityConfig, print: GlobalPrintSettings, user?: any) {
    if (!isSupabaseConfigured || !mandorId) {
      console.warn('[appSettingsService] Cannot save: Supabase not configured or no mandorId');
      return false;
    }
    
    try {
      const basePayload = mapStateToDb(identity, print, user);
      
      // Merge with existing cached row to preserve unknown columns
      let existing = {};
      try {
        const stored = localStorage.getItem(APP_SETTINGS_STORAGE_KEY);
        if (stored) existing = JSON.parse(stored);
      } catch(e) {}
      
      const payload = { ...existing, ...basePayload };
      
      const { data, error } = await supabase.rpc('save_dataku_app_settings', {
        p_mandor_id: mandorId,
        p_settings: payload
      });
      
      if (error) {
        console.error('[appSettingsService] RPC Error save_dataku_app_settings:', error);
        return false;
      }
      
      // Update cache
      localStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(data || payload));
      
      return true;
    } catch (err) {
      console.error('[appSettingsService] Failed to save app settings:', err);
      return false;
    }
  }
};
