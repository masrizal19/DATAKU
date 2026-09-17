import fs from 'fs';
let code = fs.readFileSync('src/components/Forms.tsx', 'utf8');

function addTimeState(funcName) {
  const regex = new RegExp(`(export const ${funcName}.*?)(const \\[date, setDate\\] = useState\\(.*?\\);)`, 's');
  code = code.replace(regex, `$1const [date, setDate] = useState(getJakartaDateString());\n  const [time, setTime] = useState(getJakartaTimeInputString());`);
}

function updateOnSubmit(funcName) {
  const regex = new RegExp(`(export const ${funcName}.*?onSubmit\\(\\{.*?)(date)(.*?\\})`, 's');
  code = code.replace(regex, `$1date: combineDateTime(date, time)$3`);
}

function updateInput(funcName, oldInput, newInput) {
  const regex = new RegExp(`(export const ${funcName}.*?)${oldInput.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&')}`, 's');
  code = code.replace(regex, `$1${newInput}`);
}

addTimeState('BarangMasukForm');
updateOnSubmit('BarangMasukForm');
updateInput('BarangMasukForm',
  `<Input label="Tanggal Masuk *" type="date" value={date} onChange={(e) => setDate(e.target.value)} />`,
  `<div><Input label="Tanggal Masuk *" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div><div><Input label="Jam Masuk *" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>`
);

addTimeState('BarangKeluarForm');
updateOnSubmit('BarangKeluarForm');
updateInput('BarangKeluarForm',
  `<Input label="Tanggal Pengeluaran Gudang *" type="date" value={date} onChange={(e) => setDate(e.target.value)} />`,
  `<div className="grid grid-cols-2 gap-3"><Input label="Tanggal *" type="date" value={date} onChange={(e) => setDate(e.target.value)} /><Input label="Jam *" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>`
);

addTimeState('BarangTerpakaiForm');
updateOnSubmit('BarangTerpakaiForm');
updateInput('BarangTerpakaiForm',
  `<Input label="Tanggal Pemakaian *" type="date" value={date} onChange={(e) => setDate(e.target.value)} />`,
  `<div className="grid grid-cols-2 gap-3"><Input label="Tanggal *" type="date" value={date} onChange={(e) => setDate(e.target.value)} /><Input label="Jam *" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>`
);

addTimeState('PengeluaranForm');
updateOnSubmit('PengeluaranForm');
updateInput('PengeluaranForm',
  `<Input label="Tanggal Pengeluaran *" type="date" value={date} onChange={(e) => setDate(e.target.value)} />`,
  `<div className="grid grid-cols-2 gap-3"><Input label="Tanggal *" type="date" value={date} onChange={(e) => setDate(e.target.value)} /><Input label="Jam *" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>`
);

// UpahForm needs date and time entirely added
const upahStateRegex = /(export const UpahForm.*?const \[error, setError\] = useState<string \| null>\(null\);)/s;
code = code.replace(upahStateRegex, `$1\n  const [date, setDate] = useState(getJakartaDateString());\n  const [time, setTime] = useState(getJakartaTimeInputString());`);

const upahSubmitRegex = /(export const UpahForm.*?onSubmit\(\{.*?)(workerId,.*?\} *\))/s;
code = code.replace(upahSubmitRegex, `$1workerId, amount: parsedAmount, date: combineDateTime(date, time) })`);

// We need to add the inputs to UpahForm UI
const upahInputRegex = /(export const UpahForm.*?)(<Input\s+label="Jumlah Bayar \(Rp\)" \*)/s;
code = code.replace(upahInputRegex, `$1<div className="grid grid-cols-2 gap-3"><Input label="Tanggal Pembayaran *" type="date" value={date} onChange={(e) => setDate(e.target.value)} /><Input label="Jam *" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>\n      $2`);

fs.writeFileSync('src/components/Forms.tsx', code);
