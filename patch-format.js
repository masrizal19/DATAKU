import fs from 'fs';
let code = fs.readFileSync('src/utils/format.ts', 'utf8');

if (!code.includes('JAKARTA_TZ')) {
  code = `import { JAKARTA_TZ } from './datetime';\n` + code;
}

code = code.replace(
  "const waktu = date.toTimeString().split(' ')[0].substring(0, 5);",
  "const waktu = new Intl.DateTimeFormat('id-ID', {\n      timeZone: JAKARTA_TZ,\n      hour: '2-digit',\n      minute: '2-digit',\n      hour12: false\n    }).format(date).replace('.', ':');"
);

code = code.replace(
  "day: 'numeric',\n      month: 'short',\n      year: 'numeric',\n    }).format(date);",
  "timeZone: JAKARTA_TZ,\n      day: 'numeric',\n      month: 'short',\n      year: 'numeric',\n    }).format(date);"
);

code = code.replace(
  "day: 'numeric',\n      month: 'long',\n      year: 'numeric',\n    }).format(date);",
  "timeZone: JAKARTA_TZ,\n      day: 'numeric',\n      month: 'long',\n      year: 'numeric',\n    }).format(date);"
);

fs.writeFileSync('src/utils/format.ts', code);
