import fs from 'fs';

let content = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

// Add import
content = content.replace(
  "import { identityService, DEFAULT_IDENTITY_CONFIG } from '../services/identityService';",
  `import { identityService, DEFAULT_IDENTITY_CONFIG } from '../services/identityService';\nimport { appSettingsService } from '../services/appSettingsService';\nimport { printSettingsService } from '../services/printSettingsService';`
);

// Add printSettings to AppContextType
content = content.replace(
  "saveIdentityConfig: (cfg?: AppIdentityConfig) => void;",
  "saveIdentityConfig: (cfg?: AppIdentityConfig) => void;\n  printSettings: any;\n  updatePrintSettings: (cfg: any) => void;\n  savePrintSettings: (cfg?: any) => void;"
);

// Update AppProvider state
const statePattern = `  const [identityConfig, setIdentityConfig] = useState<AppIdentityConfig>(() => {
    return identityService.loadConfig();
  });`;

const newState = `  const [identityConfig, setIdentityConfig] = useState<AppIdentityConfig>(() => identityService.loadConfig());
  const [printSettings, setPrintSettings] = useState<any>(() => printSettingsService.loadSettings());

  // Cross-device settings fetch on login
  useEffect(() => {
    const fetchSettings = async () => {
      if (state.currentUser?.id) {
        const dbRow = await appSettingsService.fetchSettings(state.currentUser.id);
        if (dbRow) {
          setIdentityConfig(identityService.loadConfig());
          setPrintSettings(printSettingsService.loadSettings());
        }
      }
    };
    fetchSettings();
  }, [state.currentUser?.id]);`;

content = content.replace(statePattern, newState);

// Update saveIdentityConfig
const saveIdentityPattern = `  const saveIdentityConfig = useCallback((cfg?: AppIdentityConfig) => {
    if (cfg) {
      setIdentityConfig(cfg);
      identityService.saveConfig(cfg);
    } else {
      setIdentityConfig(prev => {
        identityService.saveConfig(prev);
        return prev;
      });
    }
  }, []);`;

const newSaveIdentity = `  const saveIdentityConfig = useCallback(async (cfg?: AppIdentityConfig) => {
    const configToSave = cfg || identityConfig;
    setIdentityConfig(configToSave);
    if (state.currentUser?.id) {
      await appSettingsService.saveSettings(state.currentUser.id, configToSave, printSettings, state.currentUser);
    }
  }, [identityConfig, printSettings, state.currentUser]);

  const updatePrintSettings = useCallback((cfg: any) => {
    setPrintSettings(cfg);
  }, []);

  const savePrintSettings = useCallback(async (cfg?: any) => {
    const configToSave = cfg || printSettings;
    setPrintSettings(configToSave);
    if (state.currentUser?.id) {
      await appSettingsService.saveSettings(state.currentUser.id, identityConfig, configToSave, state.currentUser);
    }
  }, [identityConfig, printSettings, state.currentUser]);`;

content = content.replace(saveIdentityPattern, newSaveIdentity);

// Add to context value
content = content.replace(
  "saveIdentityConfig,",
  "saveIdentityConfig,\n        printSettings,\n        updatePrintSettings,\n        savePrintSettings,"
);

// Add realtime channel listener for dataku_app_settings
const realtimePattern = `.on('postgres_changes', { event: '*', schema: 'public', table: 'dataku_week_workers' }, () => {
        loadWorkers();
      })
      .subscribe();`;

const newRealtime = `.on('postgres_changes', { event: '*', schema: 'public', table: 'dataku_week_workers' }, () => {
        loadWorkers();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dataku_app_settings' }, async (payload) => {
        if (state.currentUser?.id && payload.new && payload.new.mandor_id === state.currentUser.id) {
          console.log('[Realtime] dataku_app_settings updated externally');
          const dbRow = await appSettingsService.fetchSettings(state.currentUser.id);
          if (dbRow) {
            setIdentityConfig(identityService.loadConfig());
            setPrintSettings(printSettingsService.loadSettings());
          }
        }
      })
      .subscribe();`;

content = content.replace(realtimePattern, newRealtime);

fs.writeFileSync('src/context/AppContext.tsx', content);
console.log('Patched AppContext.tsx successfully');
