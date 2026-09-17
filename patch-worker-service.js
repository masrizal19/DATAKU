import fs from 'fs';
let code = fs.readFileSync('src/services/workerService.ts', 'utf8');

code = code.replace(
  "payment_date: payment.payment_date || new Date().toISOString().substring(0, 10),",
  "payment_date: payment.payment_date ? payment.payment_date.substring(0, 10) : new Date().toISOString().substring(0, 10),\n      payment_at: payment.payment_date || new Date().toISOString(),"
);

fs.writeFileSync('src/services/workerService.ts', code);
