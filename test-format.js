import { formatTanggalWaktu } from './src/utils/format.ts'; // Doesn't work without typescript. Let's just write plain JS.
function formatTanggalWaktuJS(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const tgl = new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
    
    // The original code does:
    const waktu = date.toTimeString().split(' ')[0].substring(0, 5);
    return `${tgl}, ${waktu}`;
  } catch (e) {
    return dateStr;
  }
}
console.log(formatTanggalWaktuJS('2026-09-17T15:30:00+07:00'));
console.log(formatTanggalWaktuJS('2026-09-17'));
