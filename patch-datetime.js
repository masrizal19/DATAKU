import fs from 'fs';
let code = fs.readFileSync('src/utils/datetime.ts', 'utf8');

// Add getJakartaTimeInputString
const timeInputCode = `
/**
 * Mendapatkan waktu string format HH:mm untuk input type="time"
 */
export function getJakartaTimeInputString(date: Date | string = new Date()): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '07:00';
    const formatter = new Intl.DateTimeFormat('id-ID', {
      timeZone: JAKARTA_TZ,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    return formatter.format(d).replace('.', ':');
  } catch (e) {
    return '07:00';
  }
}

/**
 * Menggabungkan tanggal dan jam menjadi ISO string dengan offset +07:00
 */
export function combineDateTime(dateStr: string, timeStr: string): string {
  if (!dateStr) dateStr = getJakartaDateString();
  if (!timeStr) timeStr = getJakartaTimeInputString();
  return \`\${dateStr}T\${timeStr}:00+07:00\`;
}
`;

code += timeInputCode;

fs.writeFileSync('src/utils/datetime.ts', code);
