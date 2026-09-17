import fs from 'fs';
let code = fs.readFileSync('src/components/Forms.tsx', 'utf8');

code = code.replace(
  "onSubmit: (workerId: string, amountPaid: number, method: string) => void;",
  "onSubmit: (workerId: string, amountPaid: number, method: string, dateStr: string) => void;"
);

code = code.replace(
  "    onSubmit(workerId, parsedAmount, method);\n  };",
  "    onSubmit(workerId, parsedAmount, method, combineDateTime(date, time));\n  };"
);

fs.writeFileSync('src/components/Forms.tsx', code);
