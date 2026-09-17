import fs from 'fs';
let code = fs.readFileSync('src/components/Forms.tsx', 'utf8');

// Replace all remaining date declarations EXCEPT LaporanForm
code = code.replaceAll(
  "const [date, setDate] = useState(new Date().toISOString().substring(0, 10));",
  "const [date, setDate] = useState(getJakartaDateString());\n  const [time, setTime] = useState(getJakartaTimeInputString());"
);

// We need to restore LaporanForm back to single date if it got replaced
code = code.replace(
  "export const LaporanForm: React.FC<LaporanFormProps> = ({ onSubmit, onCancel }) => {\n  const [date, setDate] = useState(getJakartaDateString());\n  const [time, setTime] = useState(getJakartaTimeInputString());",
  "export const LaporanForm: React.FC<LaporanFormProps> = ({ onSubmit, onCancel }) => {\n  const [date, setDate] = useState(getJakartaDateString());"
);

// For LaporanForm, restore the combineDateTime
code = code.replace(
  "date: combineDateTime(date, time)",
  "date" // wait, this might be tricky if it replaces everywhere.
);
// Actually, let's do precise replacements.
