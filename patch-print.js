import fs from 'fs';
let code = fs.readFileSync('src/components/PrintPreviewModal.tsx', 'utf8');

code = code.replace(
  "import { formatRupiah, formatTanggal }",
  "import { formatRupiah, formatTanggal, formatTanggalWaktu }"
);

code = code.replace(
  "{formatTanggal(tx.date)}",
  "{formatTanggalWaktu(tx.date)}"
);

fs.writeFileSync('src/components/PrintPreviewModal.tsx', code);
