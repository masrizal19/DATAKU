import fs from 'fs';
let code = fs.readFileSync('src/components/Forms.tsx', 'utf8');

code = code.replaceAll(
  ": new Date(date).toISOString()",
  ""
);
code = code.replaceAll(
  ": combineDateTime(date, time),,",
  ": combineDateTime(date, time),"
);

fs.writeFileSync('src/components/Forms.tsx', code);
