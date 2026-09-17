/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id?: string;
  name: string;
  photo: string;
  phone: string;
  email: string;
  address?: string;
  company?: string;
  jobTitle?: string;
}

export interface Project {
  id: string;
  name: string;
  owner: string;
  location: string;
  startDate: string;
  targetDate: string;
  budget: number;
  notes: string;
  isArchived: boolean;
  isActive: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type TransactionType = 'DANA_MASUK' | 'PENGELUARAN' | 'UPAH_TUKANG';

export interface Transaction {
  id: string;
  projectId: string;
  type: TransactionType;
  date: string;
  amount: number;
  category: string;
  sourceOrRecipient: string; // Sumber Dana atau Penerima
  paymentMethod: string;
  notes: string;
  photos: string[];
  status?: 'BELUM_DIBAYAR' | 'SEBAGIAN' | 'LUNAS'; // Khusus upah
  displayOrder?: number;
  createdAt?: string;
}

export type MaterialCategory =
  | 'Semen'
  | 'Pasir'
  | 'Batu'
  | 'Besi'
  | 'Kayu'
  | 'Cat'
  | 'Keramik'
  | 'Paku'
  | 'Alat Kerja'
  | 'Lainnya';

export interface Material {
  id: string;
  projectId: string;
  name: string;
  category: MaterialCategory;
  stock: number;
  unit: string;
  minStock: number; // untuk status "Menipis"
}

export type MaterialLogType = 'MASUK' | 'KELUAR' | 'TERPAKAI';

export interface MaterialLog {
  id: string;
  projectId: string;
  type: MaterialLogType;
  materialId: string;
  materialName: string;
  date: string;
  amount: number;
  unit: string;
  pricePerUnit?: number; // Khusus MASUK
  totalPrice?: number; // Khusus MASUK
  supplier?: string; // Khusus MASUK
  purposeOrWork?: string; // Khusus KELUAR/TERPAKAI (e.g. Pekerjaan Kolom, Pengecoran Lantai)
  usedBy?: string; // Khusus KELUAR (Digunakan Oleh)
  location?: string; // Khusus TERPAKAI
  notes: string;
  photos: string[];
}

export interface MasterWorker {
  id: string;
  projectId?: string;
  name: string;
  position: string;
  dailyRate: number;
  phone?: string;
  photo?: string;
  specialty?: string;
}

export interface Worker {
  id: string;
  projectId: string;
  name: string;
  position: string;
  daysWorked: number;
  dailyRate: number;
  totalWages: number;
  status: 'BELUM_DIBAYAR' | 'SEBAGIAN' | 'LUNAS';
  potongan?: number;
  bonus?: number;
  paymentDate?: string;
  paymentMethod?: string;
  notes?: string;
  photo?: string;
  weekNumber?: number;
  weekStartDate?: string;
  weekEndDate?: string;
  masterWorkerId?: string;
  attachmentUrl?: string;
}

export interface CurrentReportData {
  project: {
    id: string;
    name: string;
    location: string;
    owner: string;
    mandorName: string;
    budget: number;
    startDate: string;
  };
  period: {
    type: 'hari' | 'minggu' | 'bulan' | 'custom' | 'project_week';
    weekNumber?: number;
    startDate: string;
    endDate: string;
    label: string;
  };
  printDate: string;
  ringkasan: {
    danaMasuk: number;
    pengeluaran: number;
    upahTukang: number;
    pembelianMaterial: number;
    saldoKas: number;
  };
  mutasiDana: Transaction[];
  rekapUpah: Worker[];
  ringkasanMaterial: {
    materialName: string;
    unit: string;
    masuk: number;
    keluar: number;
    terpakai: number;
    sisaStok: number;
  }[];
  laporanHarian: DailyReport[];
}

export interface DailyReport {
  id: string;
  projectId: string;
  date: string;
  weather: string;
  workerCount: number;
  todayWork: string;
  materialsIn: string;
  materialsUsed: string;
  challenges: string;
  notes: string;
  photos: string[];
}

export interface Notification {
  id: string;
  projectId: string;
  message: string;
  date: string;
  isRead: boolean;
  type: 'WARNING' | 'ALERT' | 'INFO';
}

export interface AppState {
  currentUser: User | null;
  projects: Project[];
  activeProjectId: string | null;
  transactions: Transaction[];
  materials: Material[];
  materialLogs: MaterialLog[];
  workers: Worker[];
  dailyReports: DailyReport[];
  notifications: Notification[];
  projectWeeks: any[];
}

export type PaperSize = 'A4' | 'F4';
export type PageOrientation = 'Portrait' | 'Landscape' | 'Otomatis';
export type ImageExportFormat = 'JPEG' | 'PNG';

export interface DocumentPrintConfig {
  paperSize: PaperSize;
  orientation: PageOrientation;
  autoFitContent: boolean;
  imageFormat: ImageExportFormat;
  includeLogo: boolean;
  includeKop: boolean;
  includeSignature: boolean;
}

export interface GlobalPrintSettings {
  defaultPaperSize: PaperSize;
  defaultOrientation: PageOrientation;
  autoFitContent: boolean;
  defaultImageFormat: ImageExportFormat;
  perDocumentSettings: {
    rekapKeuangan: DocumentPrintConfig;
    rekapUpah: DocumentPrintConfig;
    laporanProyek: DocumentPrintConfig;
    slipGaji: DocumentPrintConfig;
  };
}

export interface NavigationConfig {
  activeOutlineEnabled: boolean; // default: true
  activeOutlineWidth: number; // 0 - 6 px, default: 2
  activeOutlineColor: string; // hex, default: '#0F172A'
  activeBackgroundColor: string; // hex, default: '#E0F2FE'
  activeTextColor: string; // hex, default: '#0F172A'
  activeRadius: number; // 0 - 30 px, default: 12
  activePaddingX: number; // 4 - 32 px, default: 16
  activePaddingY: number; // 4 - 24 px, default: 10
  iconTextGap: number; // 0 - 30 px, default: 12
  iconSize: number; // 14 - 32 px, default: 18
  iconOffsetY: number; // -5 to +5 px, default: 0
  textSize: number; // 12 - 20 px, default: 14
  textWeight: 'regular' | 'medium' | 'semibold' | 'bold'; // default: 'bold'
  menuGap: number; // 0 - 30 px, default: 6
  hoverBackgroundColor: string; // hex, default: '#F8FAFC'
  hoverTextColor: string; // hex, default: '#0F172A'
  hoverOutlineEnabled: boolean; // default: false
  hoverOutlineWidth: number; // 0 - 4 px, default: 1
}

export interface AppIdentityConfig {
  appName: string;
  tagline: string;
  logoUrl: string;
  logoScale: number; // percentage (25% - 300%)
  logoX: number; // px horizontal offset (-50 to 50)
  logoY: number; // px vertical offset (-50 to 50)
  logoNameGap: number; // px gap between logo and name (0 - 40)
  appNameSize: number; // px font size (12 - 40)
  appNameX: number; // px offset (-50 to 50)
  appNameY: number; // px offset (-50 to 50)
  taglineSize: number; // px font size (8 - 24)
  taglineGap: number; // px gap between name and tagline (0 - 20)
  appNameColor: string; // hex
  taglineColor: string; // hex
  taglineBgColor: string; // hex
  // OUTLINE / BINGKAI LOGO
  logoOutlineEnabled?: boolean; // default true
  logoOutlineWidth?: number; // 0 - 10 px, default 2
  logoOutlineColor?: string; // hex, default '#0F172A'
  logoOutlineRadius?: number; // 0 - 50 px, default 12
  logoOutlinePadding?: number; // 0 - 30 px, default 4
  // PENGATURAN NAVIGATION & ACTIVE MENU
  navigationSettings?: NavigationConfig;
}

