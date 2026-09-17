import fs from 'fs';
let code = fs.readFileSync('src/pages/Pages.tsx', 'utf8');

if (!code.includes('import { combineDateTime }')) {
  code = code.replace(
    "import { formatRupiah, formatTanggal, formatTanggalWaktu } from '../utils/format';",
    "import { formatRupiah, formatTanggal, formatTanggalWaktu } from '../utils/format';\nimport { combineDateTime } from '../utils/datetime';"
  );
}

// 1. Transaction Edit
code = code.replace(
  "const [editDate, setEditDate] = useState<string>('');",
  "const [editDate, setEditDate] = useState<string>('');\n  const [editTime, setEditTime] = useState<string>('07:00');"
);

// When clicking edit transaction
code = code.replace(
  "setEditDate(tx.date || new Date().toISOString().substring(0, 10));",
  "const txDateStr = tx.date || new Date().toISOString();\n    setEditDate(txDateStr.substring(0, 10));\n    try {\n      const t = new Date(txDateStr);\n      const formatter = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false });\n      setEditTime(formatter.format(t).replace('.', ':'));\n    } catch (e) { setEditTime('07:00'); }"
);

// When saving edit transaction
code = code.replace(
  "date: editDate,",
  "date: combineDateTime(editDate, editTime),"
);

// Update Modal for Transaction
const txModalRegex = /<Input\s+label="Tanggal Transaksi"\s+type="date"\s+value=\{editDate\}\s+onChange=\{\(e\) => setEditDate\(e\.target\.value\)\}\s+required\s+\/>/s;
code = code.replace(txModalRegex, `<div className="grid grid-cols-2 gap-3"><Input label="Tanggal Transaksi" type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} required /><Input label="Jam" type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} required /></div>`);

// 2. Material Log Edit
code = code.replace(
  "const [editLogDate, setEditLogDate] = useState<string>('');",
  "const [editLogDate, setEditLogDate] = useState<string>('');\n  const [editLogTime, setEditLogTime] = useState<string>('07:00');"
);

// When clicking edit material log
code = code.replace(
  "setEditLogDate(log.date || new Date().toISOString().substring(0, 10));",
  "const logDateStr = log.date || new Date().toISOString();\n    setEditLogDate(logDateStr.substring(0, 10));\n    try {\n      const t = new Date(logDateStr);\n      const formatter = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false });\n      setEditLogTime(formatter.format(t).replace('.', ':'));\n    } catch (e) { setEditLogTime('07:00'); }"
);

// When saving edit material log
code = code.replace(
  "date: editLogDate",
  "date: combineDateTime(editLogDate, editLogTime)"
);

// Update Modal for Material Log
const logModalRegex = /<Input\s+label="Tanggal"\s+type="date"\s+value=\{editLogDate\}\s+onChange=\{\(e\) => setEditLogDate\(e\.target\.value\)\}\s+required\s+\/>/s;
code = code.replace(logModalRegex, `<div className="grid grid-cols-2 gap-3"><Input label="Tanggal" type="date" value={editLogDate} onChange={(e) => setEditLogDate(e.target.value)} required /><Input label="Jam" type="time" value={editLogTime} onChange={(e) => setEditLogTime(e.target.value)} required /></div>`);

fs.writeFileSync('src/pages/Pages.tsx', code);
