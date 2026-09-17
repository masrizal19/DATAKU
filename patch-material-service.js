import fs from 'fs';
let code = fs.readFileSync('src/services/materialService.ts', 'utf8');

code = code.replace(
  "transaction_date: log.transaction_date || new Date().toISOString().substring(0, 10),",
  "transaction_date: log.transaction_date ? log.transaction_date.substring(0, 10) : new Date().toISOString().substring(0, 10),\n      transaction_at: log.transaction_date || new Date().toISOString(),"
);

code = code.replace(
  "date: smt.transaction_date || smt.created_at || new Date().toISOString().substring(0, 10),",
  "date: smt.transaction_at || smt.transaction_date || smt.created_at || new Date().toISOString(),"
);

fs.writeFileSync('src/services/materialService.ts', code);
