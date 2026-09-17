import { AppIdentityConfig, NavigationConfig } from '../types';
import { APP_SETTINGS_STORAGE_KEY, mapDbToIdentity } from './appSettingsService';

export const DEFAULT_NAVIGATION_CONFIG: NavigationConfig = {
  activeOutlineEnabled: true,
  activeOutlineWidth: 2,
  activeOutlineColor: '#0F172A',
  activeBackgroundColor: '#E0F2FE',
  activeTextColor: '#0F172A',
  activeRadius: 12,
  activePaddingX: 16,
  activePaddingY: 10,
  iconTextGap: 12,
  iconSize: 18,
  iconOffsetY: 0,
  textSize: 14,
  textWeight: 'bold',
  menuGap: 6,
  hoverBackgroundColor: '#F8FAFC',
  hoverTextColor: '#0F172A',
  hoverOutlineEnabled: false,
  hoverOutlineWidth: 1,
};

export const DEFAULT_IDENTITY_CONFIG: AppIdentityConfig = {
  appName: 'DATAKU',
  tagline: 'SISTEM MANDOR',
  logoUrl: '/LOGO.png',
  logoScale: 100,
  logoX: 0,
  logoY: 0,
  logoNameGap: 10,
  appNameSize: 24,
  appNameX: 0,
  appNameY: 0,
  taglineSize: 9,
  taglineGap: 4,
  appNameColor: '#0F172A',
  taglineColor: '#0F172A',
  taglineBgColor: '#38BDF8',
  logoOutlineEnabled: true,
  logoOutlineWidth: 2,
  logoOutlineColor: '#0F172A',
  logoOutlineRadius: 12,
  logoOutlinePadding: 4,
  navigationSettings: DEFAULT_NAVIGATION_CONFIG,
};

export const identityService = {
  loadConfig(): AppIdentityConfig {
    try {
      const stored = localStorage.getItem(APP_SETTINGS_STORAGE_KEY);
      if (stored) {
        return mapDbToIdentity(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('[identityService] Failed to load identity config from cache:', e);
    }
    return { ...DEFAULT_IDENTITY_CONFIG };
  },

  saveConfig(config: AppIdentityConfig): void {
    // This is a no-op locally because appSettingsService.saveSettings will be used for actual persistence
  },

  resetConfig(): AppIdentityConfig {
    return { ...DEFAULT_IDENTITY_CONFIG };
  }
};
