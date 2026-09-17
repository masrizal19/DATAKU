import fs from 'fs';

let lines = fs.readFileSync('src/context/AppContext.tsx', 'utf8').split('\n');

const startIndex = 129; // `  const [state, setState] = useState<AppState>(() => {`
const endIndex = 156;   // `  });`

const stateLines = lines.slice(startIndex, endIndex);

// Remove the lines
lines.splice(startIndex, endIndex - startIndex);

// Find insertion point
const insertIndex = lines.findIndex(line => line.includes('const [masterWorkers, setMasterWorkers]'));
lines.splice(insertIndex, 0, ...stateLines);

fs.writeFileSync('src/context/AppContext.tsx', lines.join('\n'));
console.log('Moved state correctly.');
