import { JAKARTA_TZ } from './datetime';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Memformat nominal angka ke format Rupiah (contoh: Rp 10.000.000)
 */
export function formatRupiah(value: number): string {
  if (value === undefined || value === null || isNaN(value)) {
    return 'Rp 0';
  }
  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
  
  // Memastikan format "Rp 10.000.000" dengan spasi yang konsisten
  return formatted.replace(/^Rp\s?/, 'Rp ');
}

/**
 * Memformat tanggal string (YYYY-MM-DD) ke format Indonesia (contoh: 15 September 2026)
 */
export function formatTanggal(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: JAKARTA_TZ,
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch (e) {
    return dateStr;
  }
}

/**
 * Memformat tanggal string ke format pendek (contoh: 15 Sep 2026, 08:30)
 */
export function formatTanggalWaktu(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const tgl = new Intl.DateTimeFormat('id-ID', {
      timeZone: JAKARTA_TZ,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
    
    const waktu = new Intl.DateTimeFormat('id-ID', {
      timeZone: JAKARTA_TZ,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date).replace('.', ':');
    return `${tgl}, ${waktu}`;
  } catch (e) {
    return dateStr;
  }
}
