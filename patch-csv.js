import fs from 'fs';
let code = fs.readFileSync('src/utils/rekapEngine.ts', 'utf8');

if (!code.includes("formatTanggalWaktu")) {
  code = code.replace(
    "import { escapeCsv } from './format';",
    "import { escapeCsv, formatTanggalWaktu } from './format';"
  );
  if (!code.includes("formatTanggalWaktu")) {
     code = "import { formatTanggalWaktu } from './format';\n" + code;
  }
}

code = code.replace(
  "csv += `\"${t.date.substring(0, 10)}\",",
  "csv += `\"${formatTanggalWaktu(t.date)}\","
);

fs.writeFileSync('src/utils/rekapEngine.ts', code);
