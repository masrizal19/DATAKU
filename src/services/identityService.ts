/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppIdentityConfig, NavigationConfig } from '../types';

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
  logoScale: 100, // in percent (25% - 300%)
  logoX: 0, // px
  logoY: 0, // px
  logoNameGap: 10, // px
  appNameSize: 24, // px
  appNameX: 0, // px
  appNameY: 0, // px
  taglineSize: 9, // px
  taglineGap: 4, // px
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

const STORAGE_KEY = 'DATAKU_APP_IDENTITY_CONFIG';

export const identityService = {
  loadConfig(): AppIdentityConfig {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...DEFAULT_IDENTITY_CONFIG,
          ...parsed,
        };
      }
    } catch (e) {
      console.warn('[identityService] Failed to load identity config from localStorage:', e);
    }
    return { ...DEFAULT_IDENTITY_CONFIG };
  },

  saveConfig(config: AppIdentityConfig): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
      console.warn('[identityService] Failed to save identity config to localStorage:', e);
    }
  },

  resetConfig(): AppIdentityConfig {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('[identityService] Failed to clear identity config from localStorage:', e);
    }
    return { ...DEFAULT_IDENTITY_CONFIG };
  }
};
