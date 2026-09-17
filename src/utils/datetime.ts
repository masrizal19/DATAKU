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
 * Menghasilkan daftar minggu proyek berdasarkan tanggal mulai proyek
 */
export function getProjectWeeks(startDateStr: string = '2026-09-01', totalWeeks: number = 6): ProjectWeek[] {
  const weeks: ProjectWeek[] = [];
  const todayStr = getJakartaDateString();

  let start = new Date(startDateStr);
  if (isNaN(start.getTime())) {
    start = new Date('2026-09-01');
  }

  for (let i = 1; i <= totalWeeks; i++) {
    const weekStart = new Date(start);
    weekStart.setDate(start.getDate() + (i - 1) * 7);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const sStr = getJakartaDateString(weekStart);
    const eStr = getJakartaDateString(weekEnd);

    const sDay = weekStart.getDate();
    const eDay = weekEnd.getDate();
    const shortMonth = new Intl.DateTimeFormat('id-ID', {
      timeZone: JAKARTA_TZ,
      month: 'short'
    }).format(weekEnd);
    const dateRange = `${sDay}–${eDay} ${shortMonth}`;

    const isCurrent = todayStr >= sStr && todayStr <= eStr;

    weeks.push({
      weekNumber: i,
      startDate: sStr,
      endDate: eStr,
      label: `Minggu ${i}`,
      dateRange,
      isCurrent
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
 * Menghitung nomor minggu proyek secara otomatis berdasarkan tanggal transaksi dan tanggal mulai proyek.
 * Mendukung minggu melintasi batas pergantian bulan dengan sempurna.
 */
export function getWeekNumberForDate(dateStr: string, projectStartDateStr: string): number {
  const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const cleanStart = projectStartDateStr.includes('T') ? projectStartDateStr.split('T')[0] : projectStartDateStr;
  
  const dDate = new Date(cleanDate + 'T12:00:00');
  const dStart = new Date(cleanStart + 'T12:00:00');
  
  if (isNaN(dDate.getTime()) || isNaN(dStart.getTime())) {
    return 1;
  }
  
  const diffTime = dDate.getTime() - dStart.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return 1; // Transaksi sebelum proyek dimulai otomatis masuk Minggu 1
  }
  
  return Math.floor(diffDays / 7) + 1;
}

/**
 * Menghasilkan metadata periode lengkap (Minggu, Bulan Tahun, Tanggal, Jam WIB)
 * dari ISO string transaksi untuk konsistensi seluruh modul.
 */
export function getTransactionPeriodMetadata(dateIsoStr: string, projectStartDateStr: string) {
  const cleanDate = dateIsoStr.includes('T') ? dateIsoStr.split('T')[0] : dateIsoStr;
  const weekNum = getWeekNumberForDate(cleanDate, projectStartDateStr);
  
  let monthYearLabel = '';
  try {
    const d = new Date(cleanDate + 'T12:00:00');
    if (!isNaN(d.getTime())) {
      monthYearLabel = new Intl.DateTimeFormat('id-ID', {
        month: 'long',
        year: 'numeric'
      }).format(d);
    }
  } catch (e) {
    monthYearLabel = 'September 2026';
  }
  
  let dateLabel = '';
  try {
    const d = new Date(cleanDate + 'T12:00:00');
    if (!isNaN(d.getTime())) {
      dateLabel = new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(d);
    }
  } catch (e) {
    dateLabel = cleanDate;
  }
  
  let timeLabel = '07:00 WIB';
  try {
    if (dateIsoStr.includes('T')) {
      const parts = dateIsoStr.split('T');
      const timePart = parts[1].substring(0, 5); // HH:MM
      timeLabel = `${timePart} WIB`;
    } else {
      timeLabel = `${getJakartaTimeInputString(dateIsoStr)} WIB`;
    }
  } catch (e) {
    // fallback
  }
  
  return {
    weekNumber: weekNum,
    monthYear: monthYearLabel,
    dateString: dateLabel,
    timeString: timeLabel
  };
}

