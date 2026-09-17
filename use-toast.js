import fs from 'fs';
const c = fs.readFileSync('src/context/AppContext.tsx', 'utf8');
if(c.includes('triggerNotification')) console.log('Found triggerNotification');
