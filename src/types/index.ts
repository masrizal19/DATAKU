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
}
