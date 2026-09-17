import fs from 'fs';
let c = fs.readFileSync('src/context/AppContext.tsx', 'utf8');
c = c.replace(
  "if (!success) alert('Gagal menyimpan ke database.');",
  "if (!success) triggerNotification('Gagal menyimpan pengaturan identitas.', 'ALERT');"
);
c = c.replace(
  "if (!success) alert('Gagal menyimpan ke database.');",
  "if (!success) triggerNotification('Gagal menyimpan pengaturan cetak.', 'ALERT');"
);
fs.writeFileSync('src/context/AppContext.tsx', c);
