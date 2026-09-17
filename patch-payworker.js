import fs from 'fs';
let code = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

code = code.replace(
  "payWorker: (workerId: string, amountPaid: number, method: string) => Promise<void>;",
  "payWorker: (workerId: string, amountPaid: number, method: string, date?: string) => Promise<void>;"
);

const oldPayWorker = "const payWorker = async (workerId: string, amountPaid: number, method: string) => {";
const newPayWorker = "const payWorker = async (workerId: string, amountPaid: number, method: string, dateStr?: string) => {";
code = code.replace(oldPayWorker, newPayWorker);

code = code.replaceAll(
  "payment_date: new Date().toISOString().substring(0, 10),",
  "payment_date: dateStr || new Date().toISOString(), // Modified for exact time"
);

// We need to also replace the second one in the transaction creation inside payWorker
code = code.replaceAll(
  "transaction_date: new Date().toISOString().substring(0, 10),",
  "transaction_date: dateStr || new Date().toISOString(), // Modified for exact time"
);

// And we must replace the existing .toISOString().substring(0, 10) for other transactions
code = code.replaceAll(
  "tx.date || new Date().toISOString().substring(0, 10)",
  "tx.date || new Date().toISOString()"
);
code = code.replaceAll(
  "log.date || new Date().toISOString().substring(0, 10)",
  "log.date || new Date().toISOString()"
);

fs.writeFileSync('src/context/AppContext.tsx', code);
