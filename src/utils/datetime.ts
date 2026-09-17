/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * DATAKU Timezone & Date Helper (Asia/Jakarta / WIB)
 */

export const JAKARTA_TZ = 'Asia/Jakarta';

/**
 * Mendapatkan tanggal string saat ini atau dari Date tertentu dalam format YYYY-MM-DD zona WIB
 */
export function getJakartaDateString(date: Date | string = new Date()): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) {
      return new Date().toISOString().substring(0, 10);
    }
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: JAKARTA_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(d);
  } catch (e) {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().substring(0, 10);
  }
}

/**
 * Mendapatkan waktu string format HH:mm WIB
 */
export function getJakartaTimeString(date: Date | string = new Date()): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '00:00 WIB';
    const formatter = new Intl.DateTimeFormat('id-ID', {
      timeZone: JAKARTA_TZ,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    return `${formatter.format(d)} WIB`;
  } catch (e) {
    return '00:00 WIB';
  }
}

/**
 * Mendapatkan tanggal dan waktu lengkap (contoh: 16 September 2026 18:00 WIB)
 */
export function getJakartaFullDateTime(date: Date | string = new Date()): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    const dateFormatted = new Intl.DateTimeFormat('id-ID', {
      timeZone: JAKARTA_TZ,
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(d);

    const timeFormatted = new Intl.DateTimeFormat('id-ID', {
      timeZone: JAKARTA_TZ,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(d);

    return `${dateFormatted} ${timeFormatted} WIB`;
  } catch (e) {
    return '';
  }
}

/**
 * Struktur Informasi Periode Minggu Proyek
 */
export interface ProjectWeek {
  weekNumber: number;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  label: string;     // e.g. "Minggu 1"
  dateRange: string; // e.g. "1–7 Sep"
  isCurrent: boolean;
}

/**
 * Menghasilkan daftar minggu proyek berdasarkan kalender bulanan (reset setiap bulan).
 * Menghasilkan 4 minggu untuk setiap bulan sejak tanggal mulai proyek sampai beberapa bulan ke depan.
 */
export function getProjectWeeks(startDateStr: string = '2026-09-01', totalMonths: number = 3): ProjectWeek[] {
  const weeks: ProjectWeek[] = [];
  const todayStr = getJakartaDateString();

  let start = new Date(startDateStr);
  if (isNaN(start.getTime())) {
    start = new Date('2026-09-01');
  }

  const startYear = start.getFullYear();
  const startMonth = start.getMonth();

  for (let m = 0; m < totalMonths; m++) {
    const currentMonthDate = new Date(startYear, startMonth + m, 1);
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    
    const monthName = new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(currentMonthDate);

    // Minggu 1: 1-7
    // Minggu 2: 8-14
    // Minggu 3: 15-21
    // Minggu 4: 22-akhir
    const ranges = [
      { start: 1, end: 7, week: 1 },
      { start: 8, end: 14, week: 2 },
      { start: 15, end: 21, week: 3 },
      { start: 22, end: new Date(year, month + 1, 0).getDate(), week: 4 }
    ];

    ranges.forEach(range => {
      const sDate = new Date(year, month, range.start);
      const eDate = new Date(year, month, range.end);
      
      const sStr = getJakartaDateString(sDate);
      const eStr = getJakartaDateString(eDate);
      
      const shortMonth = new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(eDate);
      const dateRange = `${range.start}–${range.end} ${shortMonth}`;
      
      const isCurrent = todayStr >= sStr && todayStr <= eStr;
      
      weeks.push({
        weekNumber: range.week,
        startDate: sStr,
        endDate: eStr,
        label: `Minggu ${range.week} (${monthName} ${year})`,
        dateRange,
        isCurrent
      });
    });
  }

  return weeks;
}

/**
 * Mendapatkan info minggu saat ini
 */
export function getCurrentProjectWeek(startDateStr: string = '2026-09-01'): ProjectWeek {
  const weeks = getProjectWeeks(startDateStr, 12);
  const current = weeks.find(w => w.isCurrent);
  return current || weeks[1] || weeks[0]; // Default ke Minggu 2 / Minggu 1
}

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
  return `${dateStr}T${timeStr}:00+07:00`;
}

/**
 * Menghitung nomor minggu berdasarkan kalender bulanan (reset setiap ganti bulan).
 * 1-7 = Minggu 1, 8-14 = Minggu 2, 15-21 = Minggu 3, 22-akhir = Minggu 4.
 */
export function getWeekNumberForDate(dateStr: string): number {
  const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`);
  if (isNaN(d.getTime())) return 1;

  const day = d.getDate();
  if (day <= 7) return 1;
  if (day <= 14) return 2;
  if (day <= 21) return 3;
  return 4;
}

/**
 * Menghasilkan metadata periode lengkap (Minggu, Bulan Tahun, Tanggal, Jam WIB)
 * menggunakan logika kalender bulanan (reset setiap bulan).
 */
export function getTransactionPeriodMetadata(dateIsoStr: string) {
  const d = new Date(dateIsoStr.includes('T') ? dateIsoStr : `${dateIsoStr}T12:00:00`);
  if (isNaN(d.getTime())) {
    return { weekNumber: 1, monthYear: 'September 2026', dateString: '', timeString: '' };
  }

  const weekNum = getWeekNumberForDate(dateIsoStr);
  
  const monthYearLabel = new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric'
  }).format(d);
  
  const dateLabel = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(d);
  
  const timeLabel = new Intl.DateTimeFormat('id-ID', {
    timeZone: JAKARTA_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(d) + ' WIB';
  
  return {
    weekNumber: weekNum,
    monthYear: monthYearLabel,
    dateString: dateLabel,
    timeString: timeLabel.replace('.', ':')
  };
}

