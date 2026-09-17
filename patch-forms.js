import fs from 'fs';
let code = fs.readFileSync('src/components/Forms.tsx', 'utf8');

// Import utilities
if (!code.includes('getJakartaDateString')) {
  code = code.replace(
    "import { X, Camera, Image as ImageIcon } from 'lucide-react';",
    "import { X, Camera, Image as ImageIcon } from 'lucide-react';\nimport { getJakartaDateString, getJakartaTimeInputString, combineDateTime } from '../utils/datetime';"
  );
}

// 1. DanaMasukForm
code = code.replace(
  "const [date, setDate] = useState(new Date().toISOString().substring(0, 10));",
  "const [date, setDate] = useState(getJakartaDateString());\n  const [time, setTime] = useState(getJakartaTimeInputString());"
);

code = code.replace(
  "date\n    });",
  "date: combineDateTime(date, time)\n    });"
);

// We need to replace the Date input in DanaMasukForm
code = code.replace(
  "<Input label=\"Tanggal Transaksi *\" type=\"date\" value={date} onChange={(e) => setDate(e.target.value)} />",
  `<div className="grid grid-cols-2 gap-3">
        <Input label="Tanggal *" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Input label="Jam *" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </div>`
);

fs.writeFileSync('src/components/Forms.tsx', code);
