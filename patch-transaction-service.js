import fs from 'fs';
let code = fs.readFileSync('src/services/transactionService.ts', 'utf8');

// We want to add transaction_at to insertData and updateData.
code = code.replace(
  "transaction_date: tx.transaction_date || new Date().toISOString().substring(0, 10),",
  "transaction_date: tx.transaction_date ? tx.transaction_date.substring(0, 10) : new Date().toISOString().substring(0, 10),\n      transaction_at: tx.transaction_date || new Date().toISOString(),"
);

code = code.replace(
  "if (updates.transaction_date !== undefined) updateData.transaction_date = updates.transaction_date;",
  "if (updates.transaction_date !== undefined) {\n      updateData.transaction_date = updates.transaction_date.substring(0, 10);\n      updateData.transaction_at = updates.transaction_date;\n    }"
);

// Map back to app using transaction_at if available
code = code.replace(
  "date: st.transaction_date || st.created_at || new Date().toISOString().substring(0, 10),",
  "date: st.transaction_at || st.transaction_date || st.created_at || new Date().toISOString(),"
);

fs.writeFileSync('src/services/transactionService.ts', code);
