import fs from 'fs';
let code = fs.readFileSync('src/pages/Pages.tsx', 'utf8');

code = code.replace(
  "#printable-area, #printable-area * {",
  "#printable-area, #printable-area *, #printable-rekap-area, #printable-rekap-area *, .dataku-print-page, .dataku-print-page * {"
);

code = code.replace(
  "#printable-area {",
  "#printable-area, #printable-rekap-area, .dataku-print-container {"
);

fs.writeFileSync('src/pages/Pages.tsx', code);
