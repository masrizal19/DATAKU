import fs from 'fs';
let code = fs.readFileSync('src/utils/rekapEngine.ts', 'utf8');

code = code.replace(
  "return new Date(a.date).getTime() - new Date(b.date).getTime();",
  "// Fallback to transaction_at/date ASC\n    const dateA = new Date(a.date).getTime();\n    const dateB = new Date(b.date).getTime();\n    if (dateA !== dateB) return dateA - dateB;\n    return (a.id || '').localeCompare(b.id || '');"
);

fs.writeFileSync('src/utils/rekapEngine.ts', code);
