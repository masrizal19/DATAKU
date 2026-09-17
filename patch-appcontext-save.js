import fs from 'fs';

let content = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

// Update return type of saveIdentityConfig
content = content.replace(
  "saveIdentityConfig: (cfg?: AppIdentityConfig) => void;",
  "saveIdentityConfig: (cfg?: AppIdentityConfig) => Promise<boolean>;"
);
content = content.replace(
  "savePrintSettings: (cfg?: any) => void;",
  "savePrintSettings: (cfg?: any) => Promise<boolean>;"
);

// Update implementation of saveIdentityConfig
content = content.replace(
  "  const saveIdentityConfig = useCallback(async (cfg?: AppIdentityConfig) => {\n    const configToSave = cfg || identityConfig;\n    setIdentityConfig(configToSave);\n    if (state.currentUser?.id) {\n      await appSettingsService.saveSettings(state.currentUser.id, configToSave, printSettings, state.currentUser);\n    }\n  }, [identityConfig, printSettings, state.currentUser]);",
  "  const saveIdentityConfig = useCallback(async (cfg?: AppIdentityConfig): Promise<boolean> => {\n    const configToSave = cfg || identityConfig;\n    setIdentityConfig(configToSave);\n    if (state.currentUser?.id) {\n      const success = await appSettingsService.saveSettings(state.currentUser.id, configToSave, printSettings, state.currentUser);\n      if (!success) alert('Gagal menyimpan ke database.');\n      return success;\n    }\n    return true;\n  }, [identityConfig, printSettings, state.currentUser]);"
);

// Update implementation of savePrintSettings
content = content.replace(
  "  const savePrintSettings = useCallback(async (cfg?: any) => {\n    const configToSave = cfg || printSettings;\n    setPrintSettings(configToSave);\n    if (state.currentUser?.id) {\n      await appSettingsService.saveSettings(state.currentUser.id, identityConfig, configToSave, state.currentUser);\n    }\n  }, [identityConfig, printSettings, state.currentUser]);",
  "  const savePrintSettings = useCallback(async (cfg?: any): Promise<boolean> => {\n    const configToSave = cfg || printSettings;\n    setPrintSettings(configToSave);\n    if (state.currentUser?.id) {\n      const success = await appSettingsService.saveSettings(state.currentUser.id, identityConfig, configToSave, state.currentUser);\n      if (!success) alert('Gagal menyimpan ke database.');\n      return success;\n    }\n    return true;\n  }, [identityConfig, printSettings, state.currentUser]);"
);

fs.writeFileSync('src/context/AppContext.tsx', content);
