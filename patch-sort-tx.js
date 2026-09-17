import fs from 'fs';
let code = fs.readFileSync('src/services/transactionService.ts', 'utf8');

code = code.replace(
  ".order('created_at', { ascending: true })",
  ".order('transaction_at', { ascending: true, nullsLast: true })\n        .order('created_at', { ascending: true })"
);

code = code.replace(
  "const dateA = new Date(a.created_at || 0).getTime();\n            const dateB = new Date(b.created_at || 0).getTime();",
  "const dateA = new Date(a.transaction_at || a.transaction_date || a.created_at || 0).getTime();\n            const dateB = new Date(b.transaction_at || b.transaction_date || b.created_at || 0).getTime();"
);

fs.writeFileSync('src/services/transactionService.ts', code);
