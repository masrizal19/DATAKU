import fs from 'fs';
let code = fs.readFileSync('src/components/Forms.tsx', 'utf8');

code = code.replace(
  "date: combineDateTime(date, time): new Date(date).toISOString(),",
  "date: combineDateTime(date, time),"
);

fs.writeFileSync('src/components/Forms.tsx', code);
