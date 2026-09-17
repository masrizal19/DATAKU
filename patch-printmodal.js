import fs from 'fs';

let content = fs.readFileSync('src/components/PrintPreviewModal.tsx', 'utf8');

// Replace local load
content = content.replace(
  "const { identityConfig } = useApp();\n\n  // Load initial settings\n  const [globalSettings, setGlobalSettings] = useState(() => printSettingsService.loadSettings());",
  "const { identityConfig, printSettings, savePrintSettings } = useApp();\n\n  // Load initial settings\n  const [globalSettings, setGlobalSettings] = useState(printSettings);"
);

// Replace save
content = content.replace(
  "await printSettingsService.saveSettings(updated);",
  "if (savePrintSettings) await savePrintSettings(updated);"
);

fs.writeFileSync('src/components/PrintPreviewModal.tsx', content);
console.log('Patched PrintPreviewModal.tsx successfully');
