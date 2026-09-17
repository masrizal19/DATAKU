import fs from 'fs';

let content = fs.readFileSync('src/services/appSettingsService.ts', 'utf8');

// Replace saveSettings
const oldSave = `  async saveSettings(mandorId: string, identity: AppIdentityConfig, print: GlobalPrintSettings, user?: any) {
    if (!isSupabaseConfigured || !mandorId) {
      console.warn('[appSettingsService] Cannot save: Supabase not configured or no mandorId');
      return false;
    }
    
    try {
      const payload = mapStateToDb(identity, print, user);
      
      const { data, error } = await supabase.rpc('save_dataku_app_settings', {
        p_mandor_id: mandorId,
        p_settings: payload
      });`;

const newSave = `  async saveSettings(mandorId: string, identity: AppIdentityConfig, print: GlobalPrintSettings, user?: any) {
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
      });`;

content = content.replace(oldSave, newSave);
fs.writeFileSync('src/services/appSettingsService.ts', content);
console.log('Patched appSettingsService.ts successfully');
