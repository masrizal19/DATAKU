import fs from 'fs';

let content = fs.readFileSync('src/pages/Pages.tsx', 'utf8');

// Replace local state with context
const oldState = `  // Global Print & Export Settings States
  const [printSettings, setPrintSettings] = useState<GlobalPrintSettings>(() => printSettingsService.loadSettings());
  const [isSavingPrintSettings, setIsSavingPrintSettings] = useState(false);
  const [printSettingsSaved, setPrintSettingsSaved] = useState(false);

  // Load print settings from Supabase on mount
  React.useEffect(() => {
    printSettingsService.fetchRemoteSettings().then((settings) => {
      setPrintSettings(settings);
    });
  }, []);

  const handleSavePrintSettings = async () => {
    setIsSavingPrintSettings(true);
    try {
      await printSettingsService.saveSettings(printSettings);
      setPrintSettingsSaved(true);
      setTimeout(() => setPrintSettingsSaved(false), 3000);
    } catch (err) {
      console.error('Error saving print settings:', err);
    } finally {
      setIsSavingPrintSettings(false);
    }
  };`;

const newState = `  // Global Print & Export Settings States
  const { printSettings, updatePrintSettings, savePrintSettings } = useApp();
  const [isSavingPrintSettings, setIsSavingPrintSettings] = useState(false);
  const [printSettingsSaved, setPrintSettingsSaved] = useState(false);

  // Handler for saving
  const handleSavePrintSettings = async () => {
    setIsSavingPrintSettings(true);
    try {
      await savePrintSettings(printSettings);
      setPrintSettingsSaved(true);
      setTimeout(() => setPrintSettingsSaved(false), 3000);
    } catch (err) {
      console.error('Error saving print settings:', err);
    } finally {
      setIsSavingPrintSettings(false);
    }
  };
  
  // Handler for updates
  const setPrintSettings = updatePrintSettings;`;

content = content.replace(oldState, newState);

fs.writeFileSync('src/pages/Pages.tsx', content);
console.log('Patched Pages.tsx successfully');
