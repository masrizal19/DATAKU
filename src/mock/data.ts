/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, Project, Transaction, Material, MaterialLog, Worker, DailyReport, Notification } from '../types';

export const initialCurrentUser: User = {
  name: 'Mandor Ucuk',
  photo: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
  phone: '0812-3456-7890',
  email: 'ucok.mandor@dataku.com'
};

export const initialProjects: Project[] = [
  {
    id: 'PRJ-MDN-2024-08',
    name: 'Pembangunan Rumah Pak Budi',
    owner: 'Bpk. Hendra Gunawan',
    location: 'Rumah Tinggal (Medan)',
    startDate: '2026-02-01',
    targetDate: '2026-10-31',
    budget: 150000000,
    notes: 'Pembangunan rumah tinggal modern minimalis 2 lantai.',
    isArchived: false,
    isActive: true
  },
  {
    id: 'PRJ-RENO-TOKO',
    name: 'Renovasi Toko',
    owner: 'Ibu Listia',
    location: 'Kawasan Ruko Plaza',
    startDate: '2026-05-10',
    targetDate: '2026-08-30',
    budget: 85000000,
    notes: 'Renovasi interior, fasad depan, dan kelistrikan.',
    isArchived: false,
    isActive: false
  },
  {
    id: 'PRJ-GUDANG',
    name: 'Gudang Baru',
    owner: 'PT Maju Bersama',
    location: 'Kawasan Industri KIM',
    startDate: '2025-06-01',
    targetDate: '2025-12-15',
    budget: 200000000,
    notes: 'Pembangunan struktur baja gudang logistik.',
    isArchived: true,
    isActive: false
  }
];

export const initialMaterials: Material[] = [
  {
    id: 'MAT-SEMEN',
    projectId: 'PRJ-MDN-2024-08',
    name: 'Semen Portland 50kg',
    category: 'Semen',
    stock: 25,
    unit: 'sak',
    minStock: 20
  },
  {
    id: 'MAT-BESI-10',
    projectId: 'PRJ-MDN-2024-08',
    name: 'Besi Beton Ulir 10mm',
    category: 'Besi',
    stock: 18,
    unit: 'batang',
    minStock: 30
  },
  {
    id: 'MAT-PASIR',
    projectId: 'PRJ-MDN-2024-08',
    name: 'Pasir Pasang Super',
    category: 'Pasir',
    stock: 8,
    unit: 'kol',
    minStock: 5
  },
  {
    id: 'MAT-CAT',
    projectId: 'PRJ-MDN-2024-08',
    name: 'Cat Eksterior Weatherbond',
    category: 'Cat',
    stock: 2,
    unit: 'kaleng',
    minStock: 5
  }
];

export const initialMaterialLogs: MaterialLog[] = [
  {
    id: 'MLOG-001',
    projectId: 'PRJ-MDN-2024-08',
    type: 'MASUK',
    materialId: 'MAT-SEMEN',
    materialName: 'Semen Portland 50kg',
    date: '2026-09-10T10:00:00-07:00',
    amount: 50,
    unit: 'sak',
    pricePerUnit: 75000,
    totalPrice: 3750000,
    supplier: 'TB Berkah Mandiri',
    notes: 'Semen Padang Typ II',
    photos: []
  },
  {
    id: 'MLOG-002',
    projectId: 'PRJ-MDN-2024-08',
    type: 'KELUAR',
    materialId: 'MAT-SEMEN',
    materialName: 'Semen Portland 50kg',
    date: '2026-09-12T14:30:00-07:00',
    amount: 20,
    unit: 'sak',
    purposeOrWork: 'Plesteran Lantai 2',
    usedBy: 'Kenek Agus',
    notes: 'Dikeluarkan ke gudang lapangan',
    photos: []
  },
  {
    id: 'MLOG-003',
    projectId: 'PRJ-MDN-2024-08',
    type: 'TERPAKAI',
    materialId: 'MAT-SEMEN',
    materialName: 'Semen Portland 50kg',
    date: '2026-09-13T16:00:00-07:00',
    amount: 15,
    unit: 'sak',
    purposeOrWork: 'Pengecoran Lantai',
    location: 'Area Dapur',
    notes: 'Semen dipakai untuk pengecoran dapur',
    photos: []
  },
  {
    id: 'MLOG-004',
    projectId: 'PRJ-MDN-2024-08',
    type: 'MASUK',
    materialId: 'MAT-BESI-10',
    materialName: 'Besi Beton Ulir 10mm',
    category: 'Besi',
    date: '2026-09-14T09:15:00-07:00',
    amount: 30,
    unit: 'batang',
    pricePerUnit: 81666,
    totalPrice: 2450000,
    supplier: 'TB Sentosa Abadi',
    notes: 'Pengadaan besi cor',
    photos: []
  } as any
];

export const initialTransactions: Transaction[] = [
  {
    id: 'TX-001',
    projectId: 'PRJ-MDN-2024-08',
    type: 'DANA_MASUK',
    date: '2026-09-01T08:00:00-07:00',
    amount: 75000000,
    category: 'Pembayaran Termin',
    sourceOrRecipient: 'Transfer Pemilik',
    paymentMethod: 'Transfer',
    notes: 'Dana tahap pertama / Termin Ke-2',
    photos: []
  },
  {
    id: 'TX-002',
    projectId: 'PRJ-MDN-2024-08',
    type: 'PENGELUARAN',
    date: '2026-09-11T11:00:00-07:00',
    amount: 2500000,
    category: 'Material',
    sourceOrRecipient: 'TB Sentosa Abadi',
    paymentMethod: 'Kas Tunai',
    notes: 'Pembelian Besi Beton 10mm (35 Btg)',
    photos: []
  },
  {
    id: 'TX-003',
    projectId: 'PRJ-MDN-2024-08',
    type: 'UPAH_TUKANG',
    date: '2026-09-12T17:00:00-07:00',
    amount: 660000,
    category: 'Upah Tukang',
    sourceOrRecipient: 'Kenek Agus',
    paymentMethod: 'Kas Tunai',
    notes: 'Upah Mingguan (Adukan) - 6 hari',
    photos: [],
    status: 'LUNAS'
  },
  {
    id: 'TX-004',
    projectId: 'PRJ-MDN-2024-08',
    type: 'PENGELUARAN',
    date: '2026-09-12T12:00:00-07:00',
    amount: 150000,
    category: 'Transportasi',
    sourceOrRecipient: 'Bensin Mobil Pickup & Konsumsi Lembur',
    paymentMethod: 'Kas Tunai',
    notes: 'Bensin & konsumsi tambahan lembur sabtu',
    photos: []
  },
  {
    id: 'TX-005',
    projectId: 'PRJ-MDN-2024-08',
    type: 'PENGELUARAN',
    date: '2026-09-13T10:00:00-07:00',
    amount: 39190000,
    category: 'Operasional',
    sourceOrRecipient: 'CV Mulia Utama',
    paymentMethod: 'Transfer',
    notes: 'Biaya sewa scaffolding, excavator mini, dan semen curah awal',
    photos: []
  }
];

export const initialWorkers: Worker[] = [
  {
    id: 'WRK-001',
    projectId: 'PRJ-MDN-2024-08',
    name: 'Budi',
    position: 'Tukang Batu',
    daysWorked: 6,
    dailyRate: 150000,
    totalWages: 900000,
    status: 'BELUM_DIBAYAR'
  },
  {
    id: 'WRK-002',
    projectId: 'PRJ-MDN-2024-08',
    name: 'Kenek Agus',
    position: 'Kenek (Adukan)',
    daysWorked: 6,
    dailyRate: 110000,
    totalWages: 660000,
    status: 'LUNAS'
  },
  {
    id: 'WRK-003',
    projectId: 'PRJ-MDN-2024-08',
    name: 'Tukang Slamet',
    position: 'Tukang Besi',
    daysWorked: 5,
    dailyRate: 150000,
    totalWages: 750000,
    status: 'SEBAGIAN' // Kasbon Rp 150.000, sisa 600.000
  },
  {
    id: 'WRK-004',
    projectId: 'PRJ-MDN-2024-08',
    name: 'Joko & Maman',
    position: 'Instalasi Listrik',
    daysWorked: 8,
    dailyRate: 150000,
    totalWages: 1200000,
    status: 'LUNAS'
  }
];

export const initialDailyReports: DailyReport[] = [
  {
    id: 'REP-001',
    projectId: 'PRJ-MDN-2024-08',
    date: '2026-09-14',
    weather: 'Cerah',
    workerCount: 8,
    todayWork: 'Pekerjaan perakitan begel kolom lantai 2 & plesteran dinding dapur bawah.',
    materialsIn: 'Besi Beton Ulir 10mm (30 batang)',
    materialsUsed: 'Semen Portland 5 sak, Pasir 1 kol',
    challenges: 'Hujan rintik di siang hari selama 30 menit, pekerjaan luar ditunda sebentar.',
    notes: 'Kualitas plesteran dapur sangat rapi.',
    photos: ['https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=400&auto=format&fit=crop&q=80']
  }
];

export const initialNotifications: Notification[] = [
  {
    id: 'NT-001',
    projectId: 'PRJ-MDN-2024-08',
    message: 'Laporan hari ini belum dibuat.',
    date: '2026-09-15T08:00:00-07:00',
    isRead: false,
    type: 'WARNING'
  },
  {
    id: 'NT-002',
    projectId: 'PRJ-MDN-2024-08',
    message: 'Stok Besi Beton Ulir 10mm mulai menipis (Sisa 18 batang).',
    date: '2026-09-14T17:30:00-07:00',
    isRead: false,
    type: 'ALERT'
  },
  {
    id: 'NT-003',
    projectId: 'PRJ-MDN-2024-08',
    message: 'Ada upah Tukang Budi yang belum dibayar.',
    date: '2026-09-13T18:00:00-07:00',
    isRead: false,
    type: 'INFO'
  }
];
