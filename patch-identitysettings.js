import fs from 'fs';

let content = fs.readFileSync('src/components/IdentitySettingsSection.tsx', 'utf8');

content = content.replace(
  "  const handleSave = () => {\n    saveIdentityConfig(formData);\n    setSaveSuccess(true);\n    setTimeout(() => setSaveSuccess(false), 3000);\n  };",
  "  const [isSaving, setIsSaving] = useState(false);\n  const handleSave = async () => {\n    setIsSaving(true);\n    const success = await saveIdentityConfig(formData);\n    setIsSaving(false);\n    if (success) {\n      setSaveSuccess(true);\n      setTimeout(() => setSaveSuccess(false), 3000);\n    }\n  };"
);

content = content.replace(
  "onClick={handleSave}",
  "onClick={handleSave}\n            disabled={isSaving}"
);

content = content.replace(
  "<>                <Save className=\"w-4 h-4\" />                Simpan Pengaturan              </>",
  "isSaving ? <>Menyimpan...</> : <>                <Save className=\"w-4 h-4\" />                Simpan Pengaturan              </>"
);

fs.writeFileSync('src/components/IdentitySettingsSection.tsx', content);
