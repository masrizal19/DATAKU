/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Card, Button, Badge, Modal, Input, TextArea, Select } from '../components/Common';
import { formatRupiah, formatTanggal, formatTanggalWaktu } from '../utils/format';
import { combineDateTime, getJakartaTimeInputString } from '../utils/datetime';
import { ProjectCalculator } from '../components/Calculator';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertTriangle,
  CheckCircle,
  FileText,
  Calendar,
  CloudSun,
  User,
  Trash2,
  Lock,
  Plus,
  ArrowRight,
  Archive,
  BarChart2,
  Grid,
  MapPin,
  Clock,
  Briefcase,
  FileSpreadsheet,
  FileDown,
  Printer,
  GripVertical,
  Sliders,
  Image as ImageIcon,
  Loader2,
  Check
} from 'lucide-react';
import { Transaction, Material, MaterialLog, Worker, DailyReport, Project, MaterialCategory, MasterWorker, PaperSize, PageOrientation, ImageExportFormat, GlobalPrintSettings } from '../types';
import { buildCurrentReportData, exportReportToExcel, exportReportToCSV } from '../utils/rekapEngine';
import { PrintPreviewModal } from '../components/PrintPreviewModal';
import { documentService } from '../services/documentService';
import { getMandorUuid, isUuidFormat } from '../services/userService';
import { printSettingsService, DEFAULT_PRINT_SETTINGS } from '../services/printSettingsService';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import {
  loadGoogleSheetsConnection,
  connectGoogleSheets,
  disconnectGoogleSheets,
  syncReportToGoogleSheets,
  GoogleSheetsConnection
} from '../services/googleSheetsService';
import { getCurrentProjectWeek, getProjectWeeks } from '../utils/datetime';
import { IdentitySettingsSection } from '../components/IdentitySettingsSection';
import { AppBrand } from '../components/AppBrand';

const colorCachePages = new Map<string, string>();
const getRgbaColorPages = (cssColor: string) => {
  if (colorCachePages.has(cssColor)) return colorCachePages.get(cssColor)!;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) return cssColor;
    ctx.fillStyle = cssColor;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    const rgbaStr = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
    colorCachePages.set(cssColor, rgbaStr);
    return rgbaStr;
  } catch (e) {
    return cssColor;
  }
};

const normalizeColorsOnClonePages = (originalNode: HTMLElement, cloneNode: HTMLElement) => {
  const colorProps = [
    'color',
    'backgroundColor',
    'borderTopColor',
    'borderRightColor',
    'borderBottomColor',
    'borderLeftColor',
    'outlineColor',
    'textDecorationColor',
    'fill',
    'stroke'
  ];
  const originalElements = [originalNode, ...Array.from(originalNode.querySelectorAll<HTMLElement>('*'))];
  const cloneElements = [cloneNode, ...Array.from(cloneNode.querySelectorAll<HTMLElement>('*'))];
  for (let i = 0; i < originalElements.length; i++) {
    const orig = originalElements[i];
    const clone = cloneElements[i];
    if (!orig || !clone) continue;
    const compStyle = window.getComputedStyle(orig);
    colorProps.forEach((prop) => {
      const val = compStyle[prop as any];
      if (val && (val.includes('oklab') || val.includes('color-mix') || val.includes('lab') || val.includes('lch') || val.includes('oklch'))) {
        (clone.style as any)[prop] = getRgbaColorPages(val);
      }
    });
    const boxShadow = compStyle.boxShadow;
    if (boxShadow && (boxShadow.includes('oklab') || boxShadow.includes('color-mix') || boxShadow.includes('lab') || boxShadow.includes('lch') || boxShadow.includes('oklch'))) {
      clone.style.boxShadow = 'none';
    }
    const bgImage = compStyle.backgroundImage;
    if (bgImage && (bgImage.includes('oklab') || bgImage.includes('color-mix') || bgImage.includes('lab') || bgImage.includes('lch') || bgImage.includes('oklch'))) {
      clone.style.backgroundImage = 'none';
    }
  }
};

/// --- VIEW 1: DASHBOARD VIEW ---
interface DashboardViewProps {
  onQuickAction: (actionType: string) => void;
  setTab: (tab: string) => void;
  onEditProject: (project: Project) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onQuickAction,
  setTab,
  onEditProject
}) => {
  const { state, archiveProject } = useApp();
  const activeProj = state.projects.find(p => p.id === state.activeProjectId);

  if (!activeProj) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center select-none">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 border-2 border-[#0F172A] flex items-center justify-center text-3xl shadow-neo mb-4">
          🚧
        </div>
        <h3 className="text-xl font-chunky text-[#0F172A] uppercase mb-2">Belum Ada Proyek Aktif</h3>
        <p className="text-xs text-[#64748B] font-bold max-w-sm mb-6 uppercase">
          Anda perlu membuat atau memilih proyek aktif terlebih dahulu untuk mulai mencatat keuangan dan material.
        </p>
        <Button variant="secondary" onClick={() => setTab('proyek')}>
          <Plus className="w-4.5 h-4.5" /> Buat Proyek Baru
        </Button>
      </div>
    );
  }

  // Calculate totals for active project
  const projectTxs = state.transactions.filter(t => t.projectId === activeProj.id);
  const totalDanaMasuk = projectTxs.filter(t => t.type === 'DANA_MASUK').reduce((acc, c) => acc + c.amount, 0);
  const totalPengeluaran = projectTxs.filter(t => t.type === 'PENGELUARAN' || t.type === 'UPAH_TUKANG').reduce((acc, c) => acc + c.amount, 0);
  const saldoProyek = totalDanaMasuk - totalPengeluaran;

  // Budget calculations
  const budgetTerpakaiPersen = Math.min(100, Math.round((totalPengeluaran / activeProj.budget) * 1000) / 10);

  // Today daily report check
  const todayStr = new Date().toISOString().substring(0, 10);
  const hasReportToday = state.dailyReports.some(r => r.projectId === activeProj.id && r.date === todayStr);
  const todayReport = state.dailyReports.find(r => r.projectId === activeProj.id && r.date === todayStr);

  // Unpaid Wages Summary
  const projectWorkers = state.workers.filter(w => w.projectId === activeProj.id);
  const currentWeek = getCurrentProjectWeek(activeProj.startDate || '2026-09-01');
  const activeWeekNum = currentWeek.weekNumber > 0 ? currentWeek.weekNumber : 2;
  const currentWeekWorkers = projectWorkers.filter(w => (w.weekNumber === activeWeekNum) || (!w.weekNumber && activeWeekNum === 2));
  const unpaidWorkersThisWeek = currentWeekWorkers.filter(w => w.status === 'BELUM_DIBAYAR' || w.status === 'SEBAGIAN');
  const unpaidNamesThisWeek = unpaidWorkersThisWeek.map(w => w.name).join(', ');
  const unpaidWorkersCount = projectWorkers.filter(w => w.status !== 'LUNAS').length;
  const totalUnpaidWages = projectWorkers.filter(w => w.status !== 'LUNAS').reduce((acc, w) => acc + w.totalWages, 0);

  // Notifications summary
  const alertNotifs = state.notifications.filter(n => n.projectId === activeProj.id && !n.isRead);

  // Quick Action triggers mapping
  const quickActions = [
    { label: '💰 DANA MASUK', action: 'dana_masuk', color: 'bg-[#E0F2FE]' },
    { label: '📦 BARANG MASUK', action: 'barang_masuk', color: 'bg-[#FEF3C7]' },
    { label: '📤 BARANG KELUAR', action: 'barang_keluar', color: 'bg-[#FAF8FF]' },
    { label: '🛠️ BARANG TERPAKAI', action: 'barang_terpakai', color: 'bg-[#FEE2E2]' },
    { label: '💸 PENGELUARAN', action: 'pengeluaran', color: 'bg-[#FFF7ED]' },
    { label: '👷 BAYAR UPAH TUKANG', action: 'upah_tukang', color: 'bg-[#D1FAE5]' },
    { label: '📝 LAPORAN HARIAN', action: 'laporan_harian', color: 'bg-[#E0F2FE]' }
  ];

  return (
    <div className="space-y-6">
      {/* 1. BERANDA MOBILE — SAPAAN MANDOR */}
      <div className="bg-[#FAF8FF] border-2 border-[#0F172A] rounded-2xl p-5 shadow-neo relative overflow-hidden select-none">
        <div className="absolute right-4 top-4 text-3xl opacity-25 pointer-events-none select-none">
          👷
        </div>
        <span className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-widest block mb-1">
          SELAMAT DATANG,
        </span>
        <h2 className="text-3xl font-chunky text-[#0F172A] uppercase leading-tight">
          HALO, {state.currentUser?.name || 'PAUJI'}!
        </h2>
        <p className="text-xs text-[#475569] font-bold mt-2 leading-normal uppercase">
          Senang melihat Anda kembali. Mari catat aktivitas proyek hari ini.
        </p>
        <div className="mt-3 flex items-center gap-2 text-[10px] font-extrabold text-[#0284C7] uppercase">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-[#0F172A] animate-pulse" />
          <span>PROYEK AKTIF: {activeProj.name}</span>
        </div>
      </div>

      {/* 2. PROJECT AKTIF - SALDO KAS UTAMA */}
      <Card variant="cyan" className="p-6 relative overflow-hidden select-none">
        <div className="absolute right-4 top-4 opacity-15 select-none pointer-events-none">
          <Wallet className="w-24 h-24 text-[#0284C7]" />
        </div>
        
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#0369A1] bg-white border border-[#0F172A] px-2 py-0.5 rounded shadow-neo-sm inline-block">
          SALDO KAS PROYEK AKTIF
        </span>
        <h1 className="text-4xl md:text-5xl font-chunky text-[#0F172A] mt-2.5 tracking-tight">
          {formatRupiah(saldoProyek)}
        </h1>
        <p className="text-xs text-[#0369A1] font-bold mt-1.5 uppercase">
          Tersedia untuk operasional & upah tukang harian
        </p>

        {/* 3 cards mini overview */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className="bg-white border-1.5 border-[#0F172A] rounded-xl p-3 shadow-neo-sm">
            <span className="text-[9px] font-extrabold text-[#64748B] uppercase tracking-wide flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-[#10B981]" /> Dana Masuk
            </span>
            <p className="text-xs sm:text-sm font-chunky text-[#0F172A] mt-1 truncate">
              {formatRupiah(totalDanaMasuk)}
            </p>
          </div>
          <div className="bg-white border-1.5 border-[#0F172A] rounded-xl p-3 shadow-neo-sm">
            <span className="text-[9px] font-extrabold text-[#64748B] uppercase tracking-wide flex items-center gap-1">
              <TrendingDown className="w-3 h-3 text-[#EF4444]" /> Pengeluaran
            </span>
            <p className="text-xs sm:text-sm font-chunky text-[#0F172A] mt-1 truncate">
              {formatRupiah(totalPengeluaran)}
            </p>
          </div>
          <div className="bg-white border-1.5 border-[#0F172A] rounded-xl p-3 shadow-neo-sm">
            <span className="text-[9px] font-extrabold text-[#64748B] uppercase tracking-wide">
              💰 Sisa Saldo
            </span>
            <p className="text-xs sm:text-sm font-chunky text-[#10B981] mt-1 truncate">
              {formatRupiah(saldoProyek)}
            </p>
          </div>
        </div>

        {/* Progress Budget */}
        <div className="mt-5 pt-4 border-t border-[#0F172A]/10 space-y-2 select-none">
          <div className="flex justify-between items-end text-xs font-bold text-[#0F172A]">
            <span className="uppercase">Progress Budget Proyek</span>
            <span>{budgetTerpakaiPersen}% Terpakai</span>
          </div>
          <div className="w-full h-4 bg-white rounded-full border-2 border-[#0F172A] p-0.5 overflow-hidden shadow-inner flex">
            <div
              style={{ width: `${budgetTerpakaiPersen}%` }}
              className={`h-full rounded-full border border-transparent ${budgetTerpakaiPersen > 85 ? 'bg-[#EF4444]' : budgetTerpakaiPersen > 60 ? 'bg-[#F97316]' : 'bg-[#10B981]'}`}
            />
          </div>
          <div className="flex justify-between text-[10px] text-[#475569] font-bold uppercase">
            <span>Budget: {formatRupiah(activeProj.budget)}</span>
            <span>Pengeluaran: {formatRupiah(totalPengeluaran)}</span>
          </div>
        </div>
      </Card>

      {/* Grid: Laporan Hari ini & Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 select-none">
        {/* Laporan Harian status card */}
        <div className="md:col-span-5 flex flex-col">
          <Card className="flex-1 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider block mb-2">
                STATUS LAPORAN HARIAN
              </span>
              <h3 className="text-lg font-chunky text-[#0F172A] uppercase mb-4">Laporan Hari Ini</h3>
              
              {hasReportToday && todayReport ? (
                <div className="bg-[#D1FAE5] border-1.5 border-[#059669] rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center gap-2 text-[#065F46] font-black text-xs uppercase tracking-wide">
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                    <span>✓ LAPORAN HARI INI SUDAH DIBUAT</span>
                  </div>
                  <div className="text-[11px] font-semibold text-[#065F46]/80 pl-7">
                    Cuaca: <span className="font-extrabold">{todayReport.weather}</span> <br />
                    Tukang: <span className="font-extrabold">{todayReport.workerCount} orang</span> <br />
                    Pekerjaan: <span className="font-bold">{todayReport.todayWork.substring(0, 70)}...</span>
                  </div>
                </div>
              ) : (
                <div className="bg-[#FEE2E2] border-1.5 border-[#EF4444] rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-[#B91C1C] font-black text-xs uppercase tracking-wide">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <span>⚠️ LAPORAN HARI INI BELUM DIBUAT</span>
                  </div>
                  <p className="text-[10px] font-semibold text-[#B91C1C]/80 pl-7 leading-normal">
                    Jangan lupa mencatat absensi tukang, cuaca, dan progress lapangan sebelum pulang pukul 18:00 WIB.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6">
              {hasReportToday ? (
                <Button variant="ghost" fullWidth onClick={() => setTab('laporan')}>
                  Lihat Laporan Harian
                </Button>
              ) : (
                <Button variant="secondary" fullWidth onClick={() => onQuickAction('laporan_harian')}>
                  Buat Laporan
                </Button>
              )}
            </div>
          </Card>
        </div>

        {/* Quick Actions grid 2-column on mobile */}
        <div className="md:col-span-7">
          <Card>
            <span className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider block mb-3">
              AKTIVITAS CEPAT LAPANGAN
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              {quickActions.map((qa, index) => (
                <button
                  key={index}
                  onClick={() => onQuickAction(qa.action)}
                  className={`py-3.5 px-4 rounded-xl border-2 border-[#0F172A] font-bold text-xs text-[#0F172A] hover:bg-opacity-80 active:translate-y-[2px] cursor-pointer transition-all ${qa.color} shadow-neo-sm text-left`}
                >
                  {qa.label}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Alert Upah Minggu Ini Belum Dibayar */}
      {unpaidWorkersThisWeek.length > 0 && (
        <div className="p-4 bg-[#FEF2F2] border-2 border-[#EF4444] rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-neo select-none animate-bounce-subtle">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#DC2626] mt-0.5 shrink-0" />
            <div>
              <h4 className="text-xs font-black text-[#991B1B] uppercase tracking-wide">
                ⚠️ Upah Minggu Ini Belum Dibayar: <span className="font-extrabold underline">{unpaidNamesThisWeek}</span>
              </h4>
              <p className="text-[11px] font-bold text-[#B91C1C] mt-0.5">
                Sebanyak {unpaidWorkersThisWeek.length} tukang menunggu pelunasan upah kerja {currentWeek.label}.
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setTab('upah')}
            className="text-[10px] py-1.5 px-3 bg-white hover:bg-slate-50 border-[#EF4444] text-[#DC2626] self-end sm:self-auto shrink-0 shadow-neo-sm"
          >
            Bayar Upah Sekarang
          </Button>
        </div>
      )}

      {/* Stock warning banner if any item is menipis/habis */}
      {alertNotifs.length > 0 && (
        <div className="p-4 bg-[#FFEDD5] border-2 border-[#F97316] rounded-2xl flex items-start gap-3 shadow-neo-sm select-none animate-bounce-subtle">
          <AlertTriangle className="w-5 h-5 text-[#F97316] mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="text-xs font-extrabold text-[#F97316] uppercase tracking-wider">Perhatian Mandor Lapangan:</h4>
            <ul className="text-xs text-[#9A3412] font-semibold mt-1 list-disc pl-4 space-y-1">
              {alertNotifs.slice(0, 2).map((n) => (
                <li key={n.id}>{n.message}</li>
              ))}
            </ul>
          </div>
          <button onClick={() => setTab('notifikasi')} className="text-xs font-extrabold text-[#F97316] hover:underline cursor-pointer uppercase select-none">
            Lihat
          </button>
        </div>
      )}

      {/* Workers wage summary card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 select-none">
        <Card className="flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider block mb-2">
              RINGKASAN UPAH TUKANG
            </span>
            <h3 className="text-lg font-chunky text-[#0F172A] uppercase mb-3">Tanggungan Pembayaran</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center bg-[#F1F5F9] p-3 rounded-xl border border-[#0F172A]/10 text-xs font-bold">
                <span className="text-[#64748B] uppercase">Tukang Belum Lunas</span>
                <span className="text-[#0F172A] bg-amber-100 px-2.5 py-0.5 rounded border border-[#0F172A]">{unpaidWorkersCount} Orang</span>
              </div>
              <div className="flex justify-between items-center bg-[#F1F5F9] p-3 rounded-xl border border-[#0F172A]/10 text-xs font-bold">
                <span className="text-[#64748B] uppercase">Total Sisa Upah</span>
                <span className="text-[#B91C1C] font-chunky text-sm">{formatRupiah(totalUnpaidWages)}</span>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <Button variant="ghost" fullWidth onClick={() => setTab('upah')}>
              Kelola Pembayaran Upah
            </Button>
          </div>
        </Card>

        {/* Dynamic Project Info Box */}
        <Card className="flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider block mb-2">
              INFORMASI PROYEK AKTIF
            </span>
            <h3 className="text-lg font-chunky text-[#0F172A] uppercase mb-3">{activeProj.name}</h3>
            <div className="text-xs font-semibold text-[#475569] space-y-1.5 uppercase">
              <p>📍 LOKASI: <span className="text-[#0F172A] font-bold">{activeProj.location}</span></p>
              <p>📅 TANGGAL MULAI: <span className="text-[#0F172A] font-bold">{formatTanggal(activeProj.startDate)}</span></p>
              <p>⏱️ STATUS: <span className="text-[#0284C7] font-extrabold bg-[#E0F2FE] border border-[#0F172A] px-2 py-0.5 rounded">SEDANG BERJALAN</span></p>
            </div>
          </div>
          <div className="mt-4">
            <Button variant="ghost" fullWidth onClick={() => setTab('proyek')}>
              Ganti Proyek Aktif
            </Button>
          </div>
        </Card>
      </div>

      {/* Recent Activity Mini List */}
      <Card>
        <div className="flex justify-between items-center mb-4 select-none">
          <span className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider">
            AKTIVITAS & TRANSAKSI TERBARU
          </span>
          <button onClick={() => setTab('keuangan')} className="text-[11px] font-bold text-[#0284C7] hover:underline cursor-pointer flex items-center gap-1 uppercase">
            Semua Transaksi <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="divide-y divide-[#F1F5F9] select-none">
          {projectTxs.slice(0, 4).map((tx) => (
            <div key={tx.id} className="py-3 flex items-center justify-between gap-3 text-sm font-semibold">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg border border-[#0F172A] flex items-center justify-center text-xs shadow-neo-sm ${tx.type === 'DANA_MASUK' ? 'bg-[#D1FAE5]' : 'bg-[#FEE2E2]'}`}>
                  {tx.type === 'DANA_MASUK' ? '＋' : '－'}
                </div>
                <div>
                  <p className="text-xs font-extrabold text-[#0F172A] uppercase leading-tight">{tx.sourceOrRecipient}</p>
                  <p className="text-[10px] text-[#64748B] font-semibold mt-0.5 leading-none">
                    {tx.category} • {formatTanggalWaktu(tx.date)}
                  </p>
                </div>
              </div>
              <div className={`font-chunky text-xs ${tx.type === 'DANA_MASUK' ? 'text-[#065F46]' : 'text-[#B91C1C]'}`}>
                {tx.type === 'DANA_MASUK' ? '+' : '-'} {formatRupiah(tx.amount)}
              </div>
            </div>
          ))}

          {projectTxs.length === 0 && (
            <div className="text-center py-6 text-xs text-[#64748B] font-semibold uppercase">
              Belum ada transaksi tercatat untuk proyek ini.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};


// --- VIEW 2: INVENTORY / BARANG VIEW ---
export const InventoryView: React.FC = () => {
  const { state, addBarangKeluar, addBarangTerpakai, updateMaterial, deleteMaterial, updateMaterialLog, deleteMaterialLog } = useApp();
  const activeProj = state.projects.find(p => p.id === state.activeProjectId);
  const [activeSubTab, setActiveSubTab] = useState<'stok' | 'riwayat'>('stok');

  // Edit material state variables
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<MaterialCategory>('Semen');
  const [editStock, setEditStock] = useState(0);
  const [editUnit, setEditUnit] = useState('');
  const [editMinStock, setEditMinStock] = useState(5);

  // Edit Material Log states
  const [editingLog, setEditingLog] = useState<MaterialLog | null>(null);
  const [showEditLogModal, setShowEditLogModal] = useState(false);
  const [editLogAmount, setEditLogAmount] = useState<number>(0);
  const [editLogPrice, setEditLogPrice] = useState<number>(0);
  const [editLogSupplier, setEditLogSupplier] = useState<string>('');
  const [editLogPurpose, setEditLogPurpose] = useState<string>('');
  const [editLogNotes, setEditLogNotes] = useState<string>('');
  const [editLogDate, setEditLogDate] = useState<string>('');
  const [editLogTime, setEditLogTime] = useState<string>('07:00');
  const [isUpdatingLog, setIsUpdatingLog] = useState(false);

  // Delete Material Log states
  const [deletingLog, setDeletingLog] = useState<MaterialLog | null>(null);
  const [showConfirmDeleteLogModal, setShowConfirmDeleteLogModal] = useState(false);

  if (!activeProj) {
    return <div className="text-center py-8">Pilih proyek aktif terlebih dahulu.</div>;
  }

  const projMaterials = state.materials.filter(m => m.projectId === activeProj.id);
  const projLogs = state.materialLogs.filter(l => l.projectId === activeProj.id);

  // Totals calculations
  const totalJenis = projMaterials.length;
  const totalMasuk = projLogs.filter(l => l.type === 'MASUK').reduce((acc, c) => acc + c.amount, 0);
  const totalTerpakai = projLogs.filter(l => l.type === 'TERPAKAI').reduce((acc, c) => acc + c.amount, 0);
  const totalStok = projMaterials.reduce((acc, c) => acc + c.stock, 0);

  const handleEditMaterialClick = (m: Material) => {
    setEditingMaterial(m);
    setEditName(m.name);
    setEditCategory(m.category);
    setEditStock(m.stock);
    setEditUnit(m.unit);
    setEditMinStock(m.minStock);
  };

  const handleEditLogClick = (log: MaterialLog) => {
    setEditingLog(log);
    setEditLogAmount(log.amount);
    setEditLogPrice(log.pricePerUnit || 0);
    setEditLogSupplier(log.supplier || '');
    setEditLogPurpose(log.purposeOrWork || '');
    setEditLogNotes(log.notes || '');
    
    const isoDateStr = log.date;
    if (isoDateStr && isoDateStr.includes('T')) {
      const parts = isoDateStr.split('T');
      setEditLogDate(parts[0]);
      const timePart = parts[1].substring(0, 5); // HH:MM
      setEditLogTime(timePart);
    } else {
      setEditLogDate(isoDateStr || '');
      setEditLogTime(getJakartaTimeInputString());
    }
    
    setShowEditLogModal(true);
  };

  const handleSaveEditLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLog) return;
    setIsUpdatingLog(true);
    try {
      await updateMaterialLog({
        id: editingLog.id,
        amount: Number(editLogAmount) || 0,
        pricePerUnit: Number(editLogPrice) || 0,
        supplier: editLogSupplier,
        purposeOrWork: editLogPurpose,
        notes: editLogNotes,
        date: combineDateTime(editLogDate, editLogTime)
      });
      setShowEditLogModal(false);
      setEditingLog(null);
    } catch (err) {
      // Handled in updateMaterialLog
    } finally {
      setIsUpdatingLog(false);
    }
  };

  const handleDeleteLogClick = (log: MaterialLog) => {
    setDeletingLog(log);
    setShowConfirmDeleteLogModal(true);
  };

  const confirmDeleteLog = async () => {
    if (deletingLog) {
      await deleteMaterialLog(deletingLog.id);
      setShowConfirmDeleteLogModal(false);
      setDeletingLog(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Metrics Card Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 select-none">
        <div className="bg-white border-2 border-[#0F172A] rounded-2xl p-4 shadow-neo">
          <span className="text-[9px] font-extrabold text-[#64748B] uppercase">Jenis Material</span>
          <p className="text-2xl font-chunky text-[#0F172A] mt-1">{totalJenis} Kategori</p>
        </div>
        <div className="bg-white border-2 border-[#0F172A] rounded-2xl p-4 shadow-neo">
          <span className="text-[9px] font-extrabold text-[#64748B] uppercase">Material Masuk</span>
          <p className="text-2xl font-chunky text-[#0F172A] mt-1">{totalMasuk} unit</p>
        </div>
        <div className="bg-white border-2 border-[#0F172A] rounded-2xl p-4 shadow-neo">
          <span className="text-[9px] font-extrabold text-[#64748B] uppercase">Material Terpakai</span>
          <p className="text-2xl font-chunky text-[#0F172A] mt-1">{totalTerpakai} unit</p>
        </div>
        <div className="bg-white border-2 border-[#0F172A] rounded-2xl p-4 shadow-neo">
          <span className="text-[9px] font-extrabold text-[#64748B] uppercase">Total Stok Gudang</span>
          <p className="text-2xl font-chunky text-[#10B981] mt-1">{totalStok} unit</p>
        </div>
      </div>

      {/* Sub tabs: Stok vs Riwayat log */}
      <div className="flex border-b-2 border-[#0F172A] select-none">
        <button
          onClick={() => setActiveSubTab('stok')}
          className={`px-5 py-2.5 text-xs font-extrabold uppercase border-b-3 transition-colors cursor-pointer ${
            activeSubTab === 'stok' ? 'border-[#0284C7] text-[#0284C7] bg-[#E0F2FE]/45 rounded-t-xl' : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          📦 Stok Gudang
        </button>
        <button
          onClick={() => setActiveSubTab('riwayat')}
          className={`px-5 py-2.5 text-xs font-extrabold uppercase border-b-3 transition-colors cursor-pointer ${
            activeSubTab === 'riwayat' ? 'border-[#0284C7] text-[#0284C7] bg-[#E0F2FE]/45 rounded-t-xl' : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          ⏳ Riwayat Log Material
        </button>
      </div>

      {activeSubTab === 'stok' ? (
        <>
          {/* Desktop view table (hidden on mobile, shown on md and larger) */}
          <div className="hidden md:block">
            <Card className="p-0 overflow-hidden">
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left border-collapse select-none">
                  <thead>
                    <tr className="bg-[#FAF8FF] border-b-2 border-[#0F172A] text-xs font-extrabold uppercase text-[#475569] tracking-wider">
                      <th className="p-4">Material / Barang</th>
                      <th className="p-4">Kategori</th>
                      <th className="p-4">Stok Saat Ini</th>
                      <th className="p-4">Status Stok</th>
                      <th className="p-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] text-sm font-semibold text-[#0F172A]">
                    {projMaterials.map((m) => {
                      let badgeType: 'success' | 'warning' | 'danger' = 'success';
                      let statusText = 'AMAN';
                      if (m.stock === 0) {
                        badgeType = 'danger';
                        statusText = 'HABIS';
                      } else if (m.stock <= m.minStock) {
                        badgeType = 'warning';
                        statusText = 'MENIPIS';
                      }
                      
                      return (
                        <tr key={m.id} className="hover:bg-[#FAF8FF] transition-colors">
                          <td className="p-4">
                            <p className="font-extrabold">{m.name}</p>
                            <p className="text-[10px] text-[#64748B] font-bold uppercase tracking-wider">{m.id}</p>
                          </td>
                          <td className="p-4 uppercase text-xs font-extrabold text-[#475569]">{m.category}</td>
                          <td className="p-4 font-chunky text-[#0F172A]">{m.stock} {m.unit}</td>
                          <td className="p-4">
                            <Badge type={badgeType}>{statusText}</Badge>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => handleEditMaterialClick(m)}
                                className="px-2.5 py-1 text-xs font-bold border border-[#0F172A] bg-white hover:bg-slate-100 rounded-lg cursor-pointer"
                              >
                                ✏️ Edit
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Apakah Anda yakin ingin menghapus material "${m.name}"?`)) {
                                    deleteMaterial(m.id);
                                  }
                                }}
                                className="px-2.5 py-1 text-xs font-bold border border-red-500 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg cursor-pointer"
                              >
                                🗑️ Hapus
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {projMaterials.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-xs font-bold text-[#64748B] uppercase">
                          ⚠️ Belum ada material terdaftar di gudang proyek ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Mobile view cards (shown on mobile, hidden on md and larger) */}
          <div className="block md:hidden space-y-3">
            {projMaterials.map((m) => {
              let badgeType: 'success' | 'warning' | 'danger' = 'success';
              let statusText = 'AMAN';
              if (m.stock === 0) {
                badgeType = 'danger';
                statusText = 'HABIS';
              } else if (m.stock <= m.minStock) {
                badgeType = 'warning';
                statusText = 'MENIPIS';
              }

              return (
                <Card key={m.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-extrabold text-[#0F172A]">{m.name}</p>
                      <p className="text-[10px] text-[#64748B] font-bold uppercase tracking-wider">{m.id} • {m.category}</p>
                    </div>
                    <Badge type={badgeType}>{statusText}</Badge>
                  </div>

                  <div className="flex justify-between items-center bg-[#FAF8FF] border border-[#0F172A]/10 p-2.5 rounded-xl">
                    <span className="text-xs text-slate-500 font-bold">Stok Saat Ini:</span>
                    <span className="font-chunky text-sm text-[#0F172A]">{m.stock} {m.unit}</span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditMaterialClick(m)}
                      className="flex-1 py-2.5 text-xs font-bold border border-[#0F172A] bg-white hover:bg-slate-100 rounded-xl cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Apakah Anda yakin ingin menghapus material "${m.name}"?`)) {
                          deleteMaterial(m.id);
                        }
                      }}
                      className="flex-1 py-2.5 text-xs font-bold border border-red-500 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      🗑️ Hapus
                    </button>
                  </div>
                </Card>
              );
            })}

            {projMaterials.length === 0 && (
              <div className="text-center py-10 bg-white border-2 border-dashed border-[#0F172A]/20 rounded-2xl p-6 select-none">
                <p className="text-xs font-bold text-[#64748B] uppercase">⚠️ Belum ada material terdaftar.</p>
              </div>
            )}
          </div>
        </>
      ) : (
        /* MATERIAL LOGS */
        <div className="space-y-3.5 select-none">
          {projLogs.map((log) => (
            <Card key={log.id} className="p-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2.5 pb-2 border-b border-[#F1F5F9]">
                <div className="flex items-center gap-2">
                  <Badge
                    type={
                      log.type === 'MASUK' ? 'success' : log.type === 'KELUAR' ? 'neutral' : 'warning'
                    }
                  >
                    {log.type === 'MASUK' ? '📥 MASUK' : log.type === 'KELUAR' ? '📤 KELUAR' : '🏗️ TERPAKAI'}
                  </Badge>
                  <span className="text-xs font-extrabold text-[#0F172A]">{log.materialName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-[#64748B] flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {formatTanggalWaktu(log.date)}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleEditLogClick(log)}
                      className="p-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 transition-all cursor-pointer text-[10px]"
                      title="Edit Log Material"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteLogClick(log)}
                      className="p-1 rounded border border-red-200 text-[#EF4444] hover:bg-red-50 hover:border-[#EF4444] transition-all cursor-pointer"
                      title="Hapus Log Material"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-semibold text-[#475569]">
                <div>
                  Jumlah: <span className="text-[#0F172A] font-extrabold">{log.amount} {log.unit}</span> <br />
                  {log.type === 'MASUK' && (
                    <>
                      Toko / Supplier: <span className="text-[#0F172A] font-extrabold">{log.supplier}</span> <br />
                      Biaya: <span className="text-[#0f172a] font-extrabold">{formatRupiah(log.totalPrice || 0)}</span> <br />
                    </>
                  )}
                  {log.type === 'KELUAR' && (
                    <>
                      Tujuan: <span className="text-[#0F172A] font-extrabold">{log.purposeOrWork}</span> <br />
                      Penerima: <span className="text-[#0F172A] font-extrabold">{log.usedBy}</span> <br />
                    </>
                  )}
                  {log.type === 'TERPAKAI' && (
                    <>
                      Item Pekerjaan: <span className="text-[#0F172A] font-extrabold">{log.purposeOrWork}</span> <br />
                      Lokasi: <span className="text-[#0F172A] font-extrabold">{log.location}</span> <br />
                    </>
                  )}
                  Keterangan: <span className="text-[#0F172A] font-medium italic">"{log.notes || 'Tidak ada catatan.'}"</span>
                </div>

                {log.photos && log.photos.length > 0 && (
                  <div className="flex gap-2.5 flex-wrap">
                    {log.photos.map((p, index) => (
                      <div key={index} className="w-16 h-16 rounded-xl border-1.5 border-[#0F172A] overflow-hidden bg-white shadow-neo-sm">
                        <img src={p} alt="Dokumen Lapangan" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ))}

          {projLogs.length === 0 && (
            <div className="text-center py-8 text-xs font-bold text-[#64748B] uppercase select-none">
              Belum ada pencatatan keluar/masuk log material.
            </div>
          )}
        </div>
      )}

      {/* EDIT MATERIAL MODAL */}
      {editingMaterial && (
        <div className="fixed inset-0 bg-[#0F172A]/70 flex items-center justify-center z-50 p-4 select-none animate-fade-in">
          <div className="bg-white border-3 border-[#0F172A] rounded-2xl w-full max-w-md shadow-neo-lg overflow-hidden animate-slide-up">
            <div className="bg-[#FAF8FF] border-b-2 border-[#0F172A] px-4 py-3 flex justify-between items-center">
              <h5 className="font-chunky text-sm text-[#0F172A] uppercase tracking-wide">Edit Material Gudang</h5>
              <button 
                type="button"
                onClick={() => setEditingMaterial(null)}
                className="text-slate-500 hover:text-black font-extrabold text-xs cursor-pointer"
              >
                TUTUP
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              updateMaterial({
                ...editingMaterial,
                name: editName,
                category: editCategory,
                stock: editStock,
                unit: editUnit,
                minStock: editMinStock
              });
              setEditingMaterial(null);
            }} className="p-4 space-y-3">
              <Input
                label="Nama Material"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
              
              <Select
                label="Kategori"
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value as any)}
                options={[
                  { value: 'Semen', label: 'Semen' },
                  { value: 'Besi', label: 'Besi' },
                  { value: 'Pasir', label: 'Pasir' },
                  { value: 'Batu', label: 'Batu' },
                  { value: 'Kayu', label: 'Kayu' },
                  { value: 'Cat', label: 'Cat' },
                  { value: 'Keramik', label: 'Keramik' },
                  { value: 'Paku', label: 'Paku' },
                  { value: 'Alat Kerja', label: 'Alat Kerja' },
                  { value: 'Lainnya', label: 'Lainnya' }
                ]}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Stok"
                  type="number"
                  value={editStock}
                  onChange={(e) => setEditStock(Number(e.target.value))}
                  required
                />
                <Input
                  label="Satuan"
                  value={editUnit}
                  onChange={(e) => setEditUnit(e.target.value)}
                  placeholder="sak, kg, batang..."
                  required
                />
              </div>

              <Input
                label="Batas Minimum Stok (Peringatan)"
                type="number"
                value={editMinStock}
                onChange={(e) => setEditMinStock(Number(e.target.value))}
                required
              />

              <div className="flex gap-2.5 pt-2">
                <Button variant="ghost" fullWidth type="button" onClick={() => setEditingMaterial(null)}>
                  Batal
                </Button>
                <Button variant="secondary" fullWidth type="submit">
                  Simpan Perubahan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MATERIAL LOG MODAL */}
      <Modal
        isOpen={showEditLogModal}
        onClose={() => setShowEditLogModal(false)}
        title={`Edit Log Material: ${editingLog?.materialName}`}
      >
        <form onSubmit={handleSaveEditLog} className="space-y-4">
          <Input
            label="Tanggal Transaksi"
            type="date"
            value={editLogDate}
            onChange={(e) => setEditLogDate(e.target.value)}
            required
          />
          <Input
            label={`Jumlah (${editingLog?.unit || 'satuan'})`}
            type="number"
            value={editLogAmount}
            onChange={(e) => setEditLogAmount(Number(e.target.value))}
            required
            min={0}
          />
          {editingLog?.type === 'MASUK' && (
            <>
              <Input
                label="Harga Satuan (Rp)"
                type="number"
                value={editLogPrice}
                onChange={(e) => setEditLogPrice(Number(e.target.value))}
                min={0}
              />
              <Input
                label="Toko / Supplier"
                value={editLogSupplier}
                onChange={(e) => setEditLogSupplier(e.target.value)}
              />
            </>
          )}
          {(editingLog?.type === 'KELUAR' || editingLog?.type === 'TERPAKAI') && (
            <Input
              label="Tujuan / Peruntukan Pekerjaan"
              value={editLogPurpose}
              onChange={(e) => setEditLogPurpose(e.target.value)}
            />
          )}
          <div>
            <label className="block text-xs font-bold text-[#0F172A] uppercase mb-1">
              Catatan / Keterangan
            </label>
            <textarea
              className="w-full px-3 py-2 rounded-xl border-2 border-[#0F172A] text-xs font-semibold focus:outline-none"
              rows={3}
              value={editLogNotes}
              onChange={(e) => setEditLogNotes(e.target.value)}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              onClick={() => setShowEditLogModal(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              disabled={isUpdatingLog}
            >
              {isUpdatingLog ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM DELETE LOG MODAL */}
      <Modal
        isOpen={showConfirmDeleteLogModal}
        onClose={() => setShowConfirmDeleteLogModal(false)}
        title="Konfirmasi Hapus Log Material"
      >
        <div className="space-y-4">
          <p className="text-sm font-semibold text-[#475569] leading-normal select-none">
            Apakah Anda yakin ingin menghapus log material ini? Stok material di gudang akan disesuaikan otomatis.
          </p>
          {deletingLog && (
            <div className="p-3 bg-[#FAF8FF] border border-[#0F172A] rounded-xl text-xs font-bold select-all">
              <span className="text-[#64748B]">Material:</span> {deletingLog.materialName} <br />
              <span className="text-[#64748B]">Tipe Log:</span> {deletingLog.type} <br />
              <span className="text-[#64748B]">Jumlah:</span> {deletingLog.amount} {deletingLog.unit} <br />
              <span className="text-[#64748B]">Tanggal:</span> {formatTanggal(deletingLog.date)}
            </div>
          )}
          <div className="flex gap-3 pt-2 select-none">
            <Button variant="ghost" className="flex-1" onClick={() => setShowConfirmDeleteLogModal(false)}>Batal</Button>
            <Button variant="danger" className="flex-1" onClick={confirmDeleteLog}>Hapus Log</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};


// --- VIEW 3: KEUANGAN VIEW & LEDGER ---
export const FinanceView: React.FC = () => {
  const { state, deleteTransaction, updateTransaction, updateTransactionsOrder, triggerNotification } = useApp();
  const activeProj = state.projects.find(p => p.id === state.activeProjectId);
  const [activeFilter, setActiveFilter] = useState<'SEMUA' | 'DANA_MASUK' | 'PENGELUARAN' | 'UPAH_TUKANG'>('SEMUA');
  
  if (!activeProj) {
    return <div className="text-center py-8">Pilih proyek aktif terlebih dahulu.</div>;
  }

  const projectTxs = state.transactions.filter(t => t.projectId === activeProj.id);
  
  // Local transactions order to allow draft drag-and-drop
  const [localTxs, setLocalTxs] = useState<Transaction[]>([]);
  const [hasPendingChanges, setHasPendingChanges] = useState<boolean>(false);
  const [isSavingOrder, setIsSavingOrder] = useState<boolean>(false);

  // Sync with projectTxs when projectTxs updates (unless we have unsaved local changes)
  useEffect(() => {
    if (!hasPendingChanges) {
      setLocalTxs(projectTxs);
    }
  }, [projectTxs, hasPendingChanges]);

  // Drag and drop state
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIdx) return;
    if (activeFilter !== 'SEMUA') return;

    // Create reordered copy of localTxs
    const reordered = [...localTxs];
    const [draggedItem] = reordered.splice(draggedIdx, 1);
    reordered.splice(targetIdx, 0, draggedItem);

    setDraggedIdx(null);
    
    // Normalize displayOrder locally (1, 2, 3...)
    const normalized = reordered.map((item, idx) => ({
      ...item,
      displayOrder: idx + 1
    }));
    
    setLocalTxs(normalized);
    setHasPendingChanges(true);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
  };

  const handleSaveOrder = async () => {
    setIsSavingOrder(true);
    try {
      await updateTransactionsOrder(localTxs);
      setHasPendingChanges(false);
      triggerNotification('Urutan alur keuangan berhasil disimpan permanen di database.', 'INFO');
    } catch (err) {
      console.error('Failed to save manual order:', err);
    } finally {
      setIsSavingOrder(false);
    }
  };

  // States for confirmation delete and edit modal
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Edit Transaction states
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editCategory, setEditCategory] = useState<string>('');
  const [editRecipient, setEditRecipient] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [editTime, setEditTime] = useState<string>('07:00');
  const [editType, setEditType] = useState<'DANA_MASUK' | 'PENGELUARAN' | 'UPAH_TUKANG'>('PENGELUARAN');
  const [isUpdatingTx, setIsUpdatingTx] = useState(false);

  const currentReportData = buildCurrentReportData(state, activeProj.id, { periode: 'bulan' });

  const totalDana = projectTxs.filter(t => t.type === 'DANA_MASUK').reduce((acc, c) => acc + c.amount, 0);
  const totalPengeluaran = projectTxs.filter(t => t.type === 'PENGELUARAN' || t.type === 'UPAH_TUKANG').reduce((acc, c) => acc + c.amount, 0);
  const totalWages = projectTxs.filter(t => t.type === 'UPAH_TUKANG').reduce((acc, c) => acc + c.amount, 0);
  const totalExpensesOnly = projectTxs.filter(t => t.type === 'PENGELUARAN').reduce((acc, c) => acc + c.amount, 0);
  const saldoProyek = totalDana - totalPengeluaran;

  const filteredTxs = localTxs.filter(tx => {
    if (activeFilter === 'SEMUA') return true;
    return tx.type === activeFilter;
  });

  // Calculate expenses breakdown by categories
  const categoriesMap: { [key: string]: number } = {};
  projectTxs.filter(t => t.type === 'PENGELUARAN' || t.type === 'UPAH_TUKANG').forEach(t => {
    categoriesMap[t.category] = (categoriesMap[t.category] || 0) + t.amount;
  });
  const categoriesList = Object.keys(categoriesMap).map(k => ({
    name: k,
    amount: categoriesMap[k]
  })).sort((a, b) => b.amount - a.amount);

  const handleEditClick = (tx: Transaction) => {
    setEditingTx(tx);
    setEditAmount(tx.amount);
    setEditCategory(tx.category);
    setEditRecipient(tx.sourceOrRecipient);
    setEditNotes(tx.notes || '');
    
    const isoDateStr = tx.date;
    if (isoDateStr && isoDateStr.includes('T')) {
      const parts = isoDateStr.split('T');
      setEditDate(parts[0]);
      const timePart = parts[1].substring(0, 5); // HH:MM
      setEditTime(timePart);
    } else {
      setEditDate(isoDateStr || '');
      setEditTime(getJakartaTimeInputString());
    }
    
    setEditType(tx.type);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    setIsUpdatingTx(true);
    try {
      await updateTransaction({
        id: editingTx.id,
        amount: Number(editAmount) || 0,
        category: editCategory,
        sourceOrRecipient: editRecipient,
        notes: editNotes,
        date: combineDateTime(editDate, editTime),
        type: editType
      });
      setShowEditModal(false);
      setEditingTx(null);
    } catch (err) {
      // Error notification handled inside updateTransaction
    } finally {
      setIsUpdatingTx(false);
    }
  };

  const handleDeleteClick = (tx: Transaction) => {
    setSelectedTx(tx);
    setShowConfirmDelete(true);
  };

  const confirmDelete = () => {
    if (selectedTx) {
      deleteTransaction(selectedTx.id);
      setShowConfirmDelete(false);
      setSelectedTx(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Visual financial cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 select-none">
        <div className="bg-[#E0F2FE] border-2 border-[#0F172A] rounded-2xl p-4 shadow-neo">
          <span className="text-[9px] font-extrabold text-[#0369A1] uppercase">Saldo Kas</span>
          <p className="text-xl font-chunky text-[#0F172A] mt-1">{formatRupiah(saldoProyek)}</p>
        </div>
        <div className="bg-[#D1FAE5] border-2 border-[#0F172A] rounded-2xl p-4 shadow-neo">
          <span className="text-[9px] font-extrabold text-[#065F46] uppercase">Dana Masuk</span>
          <p className="text-xl font-chunky text-[#0F172A] mt-1">{formatRupiah(totalDana)}</p>
        </div>
        <div className="bg-[#FEE2E2] border-2 border-[#0F172A] rounded-2xl p-4 shadow-neo">
          <span className="text-[9px] font-extrabold text-[#B91C1C] uppercase">Operasional</span>
          <p className="text-xl font-chunky text-[#0F172A] mt-1">{formatRupiah(totalExpensesOnly)}</p>
        </div>
        <div className="bg-[#FEF3C7] border-2 border-[#0F172A] rounded-2xl p-4 shadow-neo">
          <span className="text-[9px] font-extrabold text-[#92400E] uppercase">Upah Tukang</span>
          <p className="text-xl font-chunky text-[#0F172A] mt-1">{formatRupiah(totalWages)}</p>
        </div>
      </div>

      {/* Categories Visualizer Graph (Custom Neo-Brutalist SVG chart) */}
      <Card>
        <span className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider block mb-4 select-none">
          GRAFIK ALOKASI PENGELUARAN PROYEK
        </span>
        
        {categoriesList.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Beautiful SVG bars chart */}
            <div className="space-y-3.5">
              {categoriesList.map((c, idx) => {
                const totalOut = totalExpensesOnly + totalWages;
                const percentage = totalOut > 0 ? Math.round((c.amount / totalOut) * 100) : 0;
                return (
                  <div key={idx} className="space-y-1 select-none">
                    <div className="flex justify-between items-center text-xs font-bold text-[#0F172A]">
                      <span className="uppercase">{c.name}</span>
                      <span>{formatRupiah(c.amount)} ({percentage}%)</span>
                    </div>
                    <div className="w-full h-3.5 bg-white border-2 border-[#0F172A] rounded-full p-0.5 overflow-hidden flex">
                      <div
                        style={{ width: `${percentage}%` }}
                        className={`h-full rounded-full ${idx === 0 ? 'bg-[#0284C7]' : idx === 1 ? 'bg-[#F59E0B]' : idx === 2 ? 'bg-[#F97316]' : 'bg-[#10B981]'}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total sheet summary panel */}
            <div className="bg-[#FAF8FF] border-2 border-[#0F172A] rounded-xl p-4 space-y-3 shadow-neo-sm select-all">
              <h4 className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wide border-b border-[#0F172A]/10 pb-1.5">
                RINGKASAN LAPORAN KEUANGAN
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-[#475569]">
                <div>Total Penerimaan:</div>
                <div className="text-right text-[#0F172A] font-extrabold">{formatRupiah(totalDana)}</div>
                <div>Total Belanja Mat:</div>
                <div className="text-right text-[#0F172A] font-extrabold">{formatRupiah(totalExpensesOnly)}</div>
                <div>Total Pembayaran Upah:</div>
                <div className="text-right text-[#0F172A] font-extrabold">{formatRupiah(totalWages)}</div>
                <div className="border-t border-[#0F172A]/10 pt-1.5 font-bold text-[#0F172A]">SALDO SISA:</div>
                <div className="border-t border-[#0F172A]/10 pt-1.5 text-right text-emerald-600 font-chunky">{formatRupiah(saldoProyek)}</div>
              </div>

              {/* PDF/Excel Export buttons */}
              <div className="flex gap-2 pt-2.5 select-none">
                <button
                  type="button"
                  onClick={() => setShowPrintModal(true)}
                  className="flex-1 py-2 rounded-lg border-1.5 border-[#0F172A] bg-white hover:bg-[#F1F5F9] font-bold text-[10px] text-[#0F172A] flex items-center justify-center gap-1 cursor-pointer shadow-neo-sm transition-all"
                >
                  <FileDown className="w-3.5 h-3.5 text-red-600" /> Cetak / Ekspor PDF
                </button>
                <button
                  type="button"
                  onClick={() => exportReportToExcel(currentReportData)}
                  className="flex-1 py-2 rounded-lg border-1.5 border-[#0F172A] bg-white hover:bg-[#F1F5F9] font-bold text-[10px] text-[#0F172A] flex items-center justify-center gap-1 cursor-pointer shadow-neo-sm transition-all"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Ekspor Excel
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-xs text-[#64748B] font-bold uppercase select-none">
            Belum ada pengeluaran tercatat untuk menampilkan diagram analisis alokasi.
          </div>
        )}
      </Card>

      {/* Transactions list layout */}
      <div className="space-y-4">
        {/* Filters bar */}
        <div className="flex gap-1.5 border-b-2 border-[#0F172A] overflow-x-auto no-scrollbar pb-1.5 select-none">
          {(['SEMUA', 'DANA_MASUK', 'PENGELUARAN', 'UPAH_TUKANG'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                activeFilter === filter
                  ? 'bg-[#0284C7] text-white border-2 border-[#0F172A] shadow-neo-sm'
                  : 'bg-white text-[#475569] border border-transparent hover:border-[#0F172A]'
              }`}
            >
              {filter === 'SEMUA' ? '📄 Semua' : filter === 'DANA_MASUK' ? '📥 Dana Masuk' : filter === 'PENGELUARAN' ? '💸 Pengeluaran' : '👷 Upah Tukang'}
            </button>
          ))}
        </div>

        {/* Timeline list */}
        <div className="space-y-3">
          {activeFilter === 'SEMUA' && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-sky-50 border-2 border-[#0F172A] p-3 rounded-xl select-none shadow-neo-sm">
              <div className="text-[10px] text-[#0284C7] font-extrabold uppercase tracking-wide flex items-center gap-1.5">
                <GripVertical className="w-4 h-4 text-[#0284C7] shrink-0" /> Tahan & geser kartu transaksi untuk mengurutkan posisi alur keuangan secara visual.
              </div>
              {hasPendingChanges && (
                <button
                  type="button"
                  disabled={isSavingOrder}
                  onClick={handleSaveOrder}
                  className="px-4 py-2 bg-[#10B981] hover:bg-[#059669] disabled:bg-slate-300 text-white font-chunky text-xs uppercase rounded-xl border-2 border-[#0F172A] shadow-neo-sm hover:shadow-none transition-all cursor-pointer text-center shrink-0"
                >
                  {isSavingOrder ? '⏳ Menyimpan...' : '💾 Tetapkan Alur / Simpan Urutan'}
                </button>
              )}
            </div>
          )}
          {filteredTxs.map((tx, index) => {
            const isDragged = draggedIdx === index;
            return (
              <Card
                key={tx.id}
                draggable={activeFilter === 'SEMUA'}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                onDrop={(e) => handleDrop(e, index)}
                className={`p-4 select-none transition-all duration-200 border-2 ${
                  isDragged
                    ? 'opacity-40 border-dashed border-[#0F172A] bg-amber-50'
                    : 'border-[#0F172A] hover:bg-[#FAF8FF]'
                } ${
                  activeFilter === 'SEMUA' ? 'hover:cursor-grab active:cursor-grabbing' : ''
                }`}
              >
                <div className="flex justify-between items-start gap-2.5">
                  <div className="flex items-start gap-3">
                    {activeFilter === 'SEMUA' && (
                      <div className="pt-2 text-slate-400 hover:text-slate-600 transition-colors cursor-grab" title="Geser untuk mengurutkan">
                        <GripVertical className="w-4 h-4" />
                      </div>
                    )}
                    <div className={`w-10 h-10 rounded-xl border-2 border-[#0F172A] shadow-neo-sm flex items-center justify-center font-bold text-sm ${tx.type === 'DANA_MASUK' ? 'bg-[#D1FAE5]' : 'bg-[#FEE2E2]'}`}>
                      {tx.type === 'DANA_MASUK' ? '＋' : '－'}
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-[#0F172A] leading-snug uppercase">{tx.sourceOrRecipient}</h4>
                      <p className="text-[10px] text-[#64748B] font-extrabold uppercase mt-1 leading-none tracking-wide">
                        {tx.category} • {formatTanggalWaktu(tx.date)}
                      </p>
                      <p className="text-xs text-[#0F172A] font-semibold italic mt-2">"{tx.notes || 'Tidak ada catatan.'}"</p>
                      
                      {tx.photos && tx.photos.length > 0 && (
                        <div className="flex gap-2 mt-2.5">
                          {tx.photos.map((p, idx) => (
                            <div key={idx} className="w-12 h-12 rounded-lg border border-[#0F172A] overflow-hidden bg-white shadow-neo-sm">
                              <img src={p} alt="Lampiran Bukti" className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end gap-2">
                    <span className={`font-chunky text-sm ${tx.type === 'DANA_MASUK' ? 'text-[#065F46]' : 'text-[#B91C1C]'}`}>
                      {tx.type === 'DANA_MASUK' ? '+' : '-'} {formatRupiah(tx.amount)}
                    </span>
                    
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleEditClick(tx)}
                        className="p-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                        title="Edit Transaksi"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteClick(tx)}
                        className="p-1.5 rounded-lg border border-red-200 text-[#EF4444] hover:bg-red-50 hover:border-[#EF4444] transition-all cursor-pointer"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}

          {filteredTxs.length === 0 && (
            <div className="text-center py-10 bg-white border-2 border-dashed border-[#0F172A]/20 rounded-2xl p-6 select-none">
              <p className="text-xs font-bold text-[#64748B] uppercase">Belum ada transaksi di filter ini</p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal Delete */}
      <Modal
        isOpen={showConfirmDelete}
        onClose={() => setShowConfirmDelete(false)}
        title="Konfirmasi Hapus Transaksi"
      >
        <div className="space-y-4">
          <p className="text-sm font-semibold text-[#475569] leading-normal select-none">
            Apakah Anda yakin ingin menghapus transaksi ini? Tindakan ini bersifat permanen dan saldo kas proyek akan disesuaikan kembali.
          </p>
          {selectedTx && (
            <div className="p-3 bg-[#FAF8FF] border border-[#0F172A] rounded-xl text-xs font-bold select-all">
              <span className="text-[#64748B]">Transaksi:</span> {selectedTx.sourceOrRecipient} <br />
              <span className="text-[#64748B]">Nominal:</span> {formatRupiah(selectedTx.amount)} <br />
              <span className="text-[#64748B]">Tanggal:</span> {formatTanggal(selectedTx.date)}
            </div>
          )}
          <div className="flex gap-3 pt-2 select-none">
            <Button variant="ghost" className="flex-1" onClick={() => setShowConfirmDelete(false)}>Batal</Button>
            <Button variant="danger" className="flex-1" onClick={confirmDelete}>Hapus Sekarang</Button>
          </div>
        </div>
      </Modal>

      {/* Modal Edit Transaksi */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Edit Transaksi: ${editingTx?.type === 'DANA_MASUK' ? 'Dana Masuk' : editingTx?.type === 'UPAH_TUKANG' ? 'Upah Tukang' : 'Pengeluaran'}`}
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3"><Input label="Tanggal Transaksi" type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} required /><Input label="Jam" type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} required /></div>
          <Input
            label="Nominal (Rp)"
            type="number"
            value={editAmount}
            onChange={(e) => setEditAmount(Number(e.target.value))}
            required
            min={0}
          />
          <Input
            label={editType === 'DANA_MASUK' ? 'Sumber Dana' : 'Penerima / Toko / Worker'}
            value={editRecipient}
            onChange={(e) => setEditRecipient(e.target.value)}
            required
          />
          <Input
            label="Kategori"
            value={editCategory}
            onChange={(e) => setEditCategory(e.target.value)}
            required
          />
          <div>
            <label className="block text-xs font-bold text-[#0F172A] uppercase mb-1">
              Catatan / Keterangan
            </label>
            <textarea
              className="w-full px-3 py-2 rounded-xl border-2 border-[#0F172A] text-xs font-semibold focus:outline-none"
              rows={3}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              onClick={() => setShowEditModal(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              disabled={isUpdatingTx}
            >
              {isUpdatingTx ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Unified Print & PDF Export Modal */}
      {showPrintModal && (
        <PrintPreviewModal
          reportData={currentReportData}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
};


// --- VIEW 4: UPAH TUKANG VIEW ---
interface WorkersViewProps {
  onAddWorkerClick: () => void;
  onPayWorkerClick: () => void;
}

export const WorkersView: React.FC<WorkersViewProps> = ({ onAddWorkerClick, onPayWorkerClick }) => {
  const { state, updateWorker, deleteWorker, addWorker, masterWorkers, identityConfig, addNextWeek } = useApp();
  const activeProj = state.projects.find(p => p.id === state.activeProjectId);

  // States for Payroll / Receipt Modal Details
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [printSingleWorker, setPrintSingleWorker] = useState<Worker | null>(null);
  const [printAllWorkers, setPrintAllWorkers] = useState<boolean>(false);
  const [selectedWeek, setSelectedWeek] = useState<number | 'all'>(1); // Default to current active week (Minggu 1)
  const [showMasterWorkerModal, setShowMasterWorkerModal] = useState<boolean>(false);
  const [editSaveError, setEditSaveError] = useState<string | null>(null);
  const [isUploadingDocument, setIsUploadingDocument] = useState<boolean>(false);
  
  // Custom dropdown menu state for individual cards
  const [activeMenuWorkerId, setActiveMenuWorkerId] = useState<string | null>(null);

  // Worker Slip Print & Export States
  const [slipPaperSize, setSlipPaperSize] = useState<PaperSize>('A4');
  const [slipOrientation, setSlipOrientation] = useState<PageOrientation>('Portrait');
  const [slipImageFormat, setSlipImageFormat] = useState<ImageExportFormat>('JPEG');
  const [isExportingSlipImage, setIsExportingSlipImage] = useState<boolean>(false);
  const [slipExportProgress, setSlipExportProgress] = useState<string>('');
  const [showSlipFormatBar, setShowSlipFormatBar] = useState<boolean>(false);

  if (!activeProj) {
    return <div className="text-center py-8">Pilih proyek aktif terlebih dahulu.</div>;
  }

  // Dynamic projectWeeks mapped from DB
  const projectWeeks = (state.projectWeeks && state.projectWeeks.length > 0)
    ? state.projectWeeks.map((w: any) => {
        let dateRange = 'Belum diatur';
        if (w.week_start && w.week_end) {
          const startD = new Date(w.week_start);
          const endD = new Date(w.week_end);
          if (!isNaN(startD.getTime()) && !isNaN(endD.getTime())) {
            const sDay = startD.getDate();
            const eDay = endD.getDate();
            const shortMonth = new Intl.DateTimeFormat('id-ID', {
              month: 'short'
            }).format(endD);
            dateRange = `${sDay}–${eDay} ${shortMonth}`;
          }
        }
        
        const todayStr = new Date().toISOString().substring(0, 10);
        const isCurrent = w.week_start && w.week_end && (todayStr >= w.week_start && todayStr <= w.week_end);

        return {
          weekNumber: w.week_number,
          startDate: w.week_start || '',
          endDate: w.week_end || '',
          label: `Minggu ${w.week_number}`,
          dateRange,
          isCurrent: !!isCurrent
        };
      })
    : getProjectWeeks(activeProj.startDate || '2026-09-01', 1);

  const projWorkers = state.workers.filter(w => w.projectId === activeProj.id);
  
  // Filter workers based on selected week
  const filteredWorkers = projWorkers.filter(w => {
    if (selectedWeek === 'all') return true;
    return (w.weekNumber === selectedWeek) || (!w.weekNumber && selectedWeek === 1);
  });

  // Derive granular stats for payroll from filtered workers
  const totalTukang = filteredWorkers.length;
  const totalHariKerja = filteredWorkers.reduce((acc, w) => acc + w.daysWorked, 0);
  
  // Custom helper to calculate net wages
  const getNetWages = (w: Worker) => {
    return w.totalWages + (w.bonus || 0) - (w.potongan || 0);
  };

  const getPaidAmount = (w: Worker) => {
    if (w.status === 'LUNAS') return getNetWages(w);
    if (w.status === 'SEBAGIAN') return Math.round(getNetWages(w) * 0.4); // Kasbon/sebagian (simulated)
    return 0;
  };

  const totalKewajiban = filteredWorkers.reduce((acc, w) => acc + getNetWages(w), 0);
  const sudahDibayar = filteredWorkers.reduce((acc, w) => acc + getPaidAmount(w), 0);
  const belumDibayar = totalKewajiban - sudahDibayar;

  // Handle Edit Save
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingWorker) {
      setEditSaveError(null);
      try {
        await updateWorker({
          ...editingWorker,
          totalWages: editingWorker.daysWorked * editingWorker.dailyRate
        });
        // Sync detailed viewer if open
        if (selectedWorker?.id === editingWorker.id) {
          setSelectedWorker({
            ...editingWorker,
            totalWages: editingWorker.daysWorked * editingWorker.dailyRate
          });
        }
        setEditingWorker(null);
      } catch (err: any) {
        setEditSaveError(err.message || 'Gagal memperbarui data pekerja.');
      }
    }
  };

  // Export payroll summary to CSV
  const handleExportPayrollCSV = () => {
    let csv = 'data:text/csv;charset=utf-8,';
    csv += 'REKAP UPAH TUKANG DATAKU\n';
    csv += `Proyek,${activeProj.name}\n`;
    csv += `Filter Minggu,${selectedWeek === 'all' ? 'Semua Minggu' : `Minggu ${selectedWeek}`}\n`;
    csv += `Total Tukang,${totalTukang}\n`;
    csv += `Total Hari Kerja,${totalHariKerja}\n`;
    csv += `Total Kewajiban,Rp ${totalKewajiban}\n`;
    csv += `Sudah Dibayar,Rp ${sudahDibayar}\n`;
    csv += `Belum Dibayar,Rp ${belumDibayar}\n\n`;
    csv += 'Minggu,Nama Tukang,Posisi,Hari Kerja,Tarif Harian,Bonus,Potongan,Total Bersih,Status,Metode\n';

    filteredWorkers.forEach(w => {
      const wWeek = w.weekNumber ? `Minggu ${w.weekNumber}` : 'Minggu 2';
      csv += `"${wWeek}","${w.name}","${w.position}",${w.daysWorked},${w.dailyRate},${w.bonus || 0},${w.potongan || 0},${getNetWages(w)},"${w.status}","${w.paymentMethod || 'Tunai'}"\n`;
    });

    const link = document.createElement('a');
    link.href = encodeURI(csv);
    link.download = `DATAKU_Rekap_Upah_${activeProj.name.replace(/\s+/g, '_')}_M${selectedWeek}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export payroll summary to Excel
  const handleExportPayrollExcel = () => {
    let xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Rekap Upah">
  <Table>
   <Row><Cell><Data ss:Type="String">REKAP UPAH TUKANG: ${activeProj.name}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Filter: ${selectedWeek === 'all' ? 'Semua Minggu' : `Minggu ${selectedWeek}`}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Total Tukang: ${totalTukang}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Total Hari Kerja: ${totalHariKerja}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Total Kewajiban: ${totalKewajiban}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Sudah Dibayar: ${sudahDibayar}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Belum Dibayar: ${belumDibayar}</Data></Cell></Row>
   <Row></Row>
   <Row>
    <Cell><Data ss:Type="String">Minggu</Data></Cell>
    <Cell><Data ss:Type="String">Nama Tukang</Data></Cell>
    <Cell><Data ss:Type="String">Posisi</Data></Cell>
    <Cell><Data ss:Type="String">Hari Kerja</Data></Cell>
    <Cell><Data ss:Type="String">Tarif/Hari</Data></Cell>
    <Cell><Data ss:Type="String">Bonus</Data></Cell>
    <Cell><Data ss:Type="String">Potongan</Data></Cell>
    <Cell><Data ss:Type="String">Total Bersih</Data></Cell>
    <Cell><Data ss:Type="String">Status</Data></Cell>
   </Row>
`;

    filteredWorkers.forEach(w => {
      const wWeek = w.weekNumber ? `Minggu ${w.weekNumber}` : 'Minggu 2';
      xml += `   <Row>
    <Cell><Data ss:Type="String">${wWeek}</Data></Cell>
    <Cell><Data ss:Type="String">${w.name}</Data></Cell>
    <Cell><Data ss:Type="String">${w.position}</Data></Cell>
    <Cell><Data ss:Type="Number">${w.daysWorked}</Data></Cell>
    <Cell><Data ss:Type="Number">${w.dailyRate}</Data></Cell>
    <Cell><Data ss:Type="Number">${w.bonus || 0}</Data></Cell>
    <Cell><Data ss:Type="Number">${w.potongan || 0}</Data></Cell>
    <Cell><Data ss:Type="Number">${getNetWages(w)}</Data></Cell>
    <Cell><Data ss:Type="String">${w.status}</Data></Cell>
   </Row>
`;
    });

    xml += `  </Table>
 </Worksheet>
</Workbook>`;

    const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `DATAKU_Rekap_Upah_${activeProj.name.replace(/\s+/g, '_')}_M${selectedWeek}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const triggerPrintReceipt = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* 1. PUSAT REKAP UPAH */}
      <Card className="p-5 select-none bg-[#FAF8FF]">
        <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 border-b border-[#0f172a]/10 pb-4 mb-4">
          <div>
            <span className="text-[9px] font-extrabold text-[#64748B] uppercase tracking-wider block">Pusat Informasi</span>
            <h3 className="text-base font-chunky text-[#0F172A] uppercase mt-1">REKAP GAJI & UPAH TUKANG MINGGUAN</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setPrintAllWorkers(true); }}
              className="py-1.5 px-3 rounded-lg border-2 border-[#0F172A] bg-white hover:bg-slate-50 text-xs font-bold text-[#0F172A] flex items-center gap-1 cursor-pointer transition-all shadow-neo-sm"
            >
              <Printer className="w-3.5 h-3.5 text-blue-600" /> Cetak Semua Bukti
            </button>
            <button
              onClick={handleExportPayrollExcel}
              className="py-1.5 px-3 rounded-lg border-2 border-[#0F172A] bg-white hover:bg-slate-50 text-xs font-bold text-[#0F172A] flex items-center gap-1 cursor-pointer transition-all shadow-neo-sm"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Excel
            </button>
            <button
              onClick={handleExportPayrollCSV}
              className="py-1.5 px-3 rounded-lg border-2 border-[#0F172A] bg-white hover:bg-slate-50 text-xs font-bold text-[#0F172A] flex items-center gap-1 cursor-pointer transition-all shadow-neo-sm"
            >
              <FileDown className="w-3.5 h-3.5 text-orange-500" /> CSV
            </button>
          </div>
        </div>

        {/* Weekly Period Selector Tabs */}
        <div className="space-y-1.5 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider">
              📅 PILIH MINGGU KERJA PROYEK:
            </span>
            <span className="text-[10px] text-sky-700 font-extrabold">
              {selectedWeek === 'all' ? 'Menampilkan Semua Minggu' : `Minggu ${selectedWeek} Aktif`}
            </span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedWeek('all')}
              className={`px-3 py-2 rounded-xl border-2 border-[#0F172A] text-xs font-black whitespace-nowrap transition-all cursor-pointer shadow-neo-sm ${
                selectedWeek === 'all'
                  ? 'bg-[#0F172A] text-white'
                  : 'bg-white text-[#0F172A] hover:bg-slate-50'
              }`}
            >
              📋 Semua Minggu ({projWorkers.length})
            </button>
            {projectWeeks.map((pw) => {
              const countInWeek = projWorkers.filter(w => (w.weekNumber === pw.weekNumber) || (!w.weekNumber && pw.weekNumber === 2)).length;
              const isSelected = selectedWeek === pw.weekNumber;
              return (
                <button
                  key={pw.weekNumber}
                  type="button"
                  onClick={() => setSelectedWeek(pw.weekNumber)}
                  className={`px-3 py-2 rounded-xl border-2 border-[#0F172A] text-xs font-black whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 shadow-neo-sm ${
                    isSelected
                      ? 'bg-[#0284C7] text-white'
                      : 'bg-white text-[#0F172A] hover:bg-slate-50'
                  }`}
                >
                  <span>{pw.label}</span>
                  <span className={`text-[10px] ${isSelected ? 'text-sky-100' : 'text-slate-500'}`}>({pw.dateRange})</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${isSelected ? 'bg-white text-[#0284C7]' : 'bg-slate-200 text-[#0F172A]'}`}>
                    {countInWeek}
                  </span>
                  {pw.isCurrent && (
                    <span className="bg-emerald-500 text-white text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase">
                      Aktif
                    </span>
                  )}
                </button>
              );
            })}

            {/* Sequential Week Adder Button */}
            <button
              type="button"
              onClick={async () => {
                try {
                  await addNextWeek();
                } catch (err) {
                  // Error handled inside AppContext
                }
              }}
              className="px-3 py-2 rounded-xl border-2 border-dashed border-purple-800 text-xs font-black whitespace-nowrap transition-all cursor-pointer bg-purple-50 hover:bg-purple-100 text-purple-950 shadow-neo-sm flex items-center gap-1.5 shrink-0"
            >
              ➕ Buat Minggu {projectWeeks.length > 0 ? Math.max(...projectWeeks.map(pw => pw.weekNumber)) + 1 : 1}
            </button>
          </div>
        </div>

        {/* Grand Payroll Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
          <div className="p-3 bg-white border border-[#0F172A] rounded-xl shadow-neo-sm">
            <span className="text-[9px] font-extrabold text-[#64748B] uppercase">Total Tukang</span>
            <p className="text-base font-chunky text-[#0F172A] mt-1">{totalTukang} Orang</p>
          </div>
          <div className="p-3 bg-white border border-[#0F172A] rounded-xl shadow-neo-sm">
            <span className="text-[9px] font-extrabold text-[#64748B] uppercase">Total Hari Kerja</span>
            <p className="text-base font-chunky text-[#0F172A] mt-1">{totalHariKerja} Hari</p>
          </div>
          <div className="p-3 bg-white border border-[#0F172A] rounded-xl shadow-neo-sm">
            <span className="text-[9px] font-extrabold text-[#1E3A8A] uppercase">Total Kewajiban</span>
            <p className="text-base font-chunky text-[#1E3A8A] mt-1">{formatRupiah(totalKewajiban)}</p>
          </div>
          <div className="p-3 bg-white border border-[#0F172A] rounded-xl shadow-neo-sm bg-emerald-50/50">
            <span className="text-[9px] font-extrabold text-emerald-700 uppercase">Sudah Dibayar</span>
            <p className="text-base font-chunky text-emerald-700 mt-1">{formatRupiah(sudahDibayar)}</p>
          </div>
          <div className="col-span-2 md:col-span-1 p-3 bg-white border border-[#0F172A] rounded-xl shadow-neo-sm bg-red-50/50">
            <span className="text-[9px] font-extrabold text-red-600 uppercase">Belum Dibayar</span>
            <p className="text-base font-chunky text-red-600 mt-1">{formatRupiah(belumDibayar)}</p>
          </div>
        </div>
      </Card>

      {/* Roster Controls Row */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 select-none">
        <h4 className="text-sm font-chunky text-[#0F172A] uppercase">
          DAFTAR TENAGA KERJA ({totalTukang} PEKERJA{selectedWeek !== 'all' ? ` - MINGGU ${selectedWeek}` : ''})
        </h4>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMasterWorkerModal(true)}
            className="text-xs py-2 bg-purple-50 hover:bg-purple-100 border-purple-800 text-purple-900 font-extrabold"
          >
            👥 Database Master Tukang
          </Button>
          <Button variant="secondary" size="sm" onClick={onAddWorkerClick} className="text-xs py-2">
            + Tambah Pekerja
          </Button>
          <Button variant="ghost" size="sm" onClick={onPayWorkerClick} className="text-xs py-2">
            💰 Catat Bayar
          </Button>
        </div>
      </div>

      {/* Roster Cards List */}
      <div className="space-y-3.5">
        {filteredWorkers.map((w) => {
          let badgeType: 'success' | 'warning' | 'danger' = 'success';
          if (w.status === 'BELUM_DIBAYAR') badgeType = 'danger';
          else if (w.status === 'SEBAGIAN') badgeType = 'warning';

          const workerWeek = w.weekNumber ? `Minggu ${w.weekNumber}` : 'Minggu 2';

          return (
            <Card key={w.id} className="p-4 hover:translate-y-[-1.5px] transition-all">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="flex gap-3.5 items-start">
                  <div className="w-11 h-11 rounded-xl border-2 border-[#0F172A] shadow-neo-sm bg-amber-50 flex items-center justify-center text-xl shrink-0 select-none">
                    👷
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-extrabold text-[#0F172A] uppercase">{w.name}</h4>
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-sky-100 text-sky-800 border border-sky-300">
                        {workerWeek}
                      </span>
                    </div>
                    <p className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wide mt-0.5">
                      {w.position} • {w.daysWorked} Hari Kerja {w.weekStartDate && w.weekEndDate ? `(${w.weekStartDate} s/d ${w.weekEndDate})` : ''}
                    </p>
                    <p className="text-xs text-slate-500 font-bold mt-1.5 flex flex-wrap gap-3">
                      <span>Tarif: {formatRupiah(w.dailyRate)}/hari</span>
                      {w.bonus && <span className="text-emerald-600 font-extrabold">Bonus: +{formatRupiah(w.bonus)}</span>}
                      {w.potongan && <span className="text-red-500 font-extrabold">Pot: -{formatRupiah(w.potongan)}</span>}
                    </p>
                  </div>
                </div>

                <div className="flex sm:flex-col justify-between items-end gap-2 shrink-0 select-none">
                  <div className="text-right hidden sm:block">
                    <span className="text-[10px] text-[#64748B] font-bold block">Total Bersih</span>
                    <span className="font-chunky text-sm text-[#0F172A] block mt-0.5">{formatRupiah(getNetWages(w))}</span>
                  </div>
                  
                  {/* Small screen net wages summary */}
                  <div className="flex justify-between items-center w-full sm:hidden border-t border-dashed border-[#0F172A]/10 pt-2 mt-1">
                    <span className="text-[10px] text-[#64748B] font-bold">Total Bersih:</span>
                    <span className="font-chunky text-xs text-[#0F172A]">{formatRupiah(getNetWages(w))}</span>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <Badge type={badgeType}>
                      {w.status === 'BELUM_DIBAYAR' ? 'BELUM BAYAR' : w.status === 'SEBAGIAN' ? 'KASBON / SEBAGIAN' : '✓ LUNAS'}
                    </Badge>
                    <button
                      onClick={() => setSelectedWorker(w)}
                      className="px-2.5 py-1.5 rounded-lg border border-[#0F172A] bg-white hover:bg-slate-100 font-extrabold text-[10px] transition-all cursor-pointer"
                    >
                      👁️ Detail
                    </button>

                    {/* Action Dropdown Menu Toggle for complete parity */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuWorkerId(activeMenuWorkerId === w.id ? null : w.id);
                        }}
                        className="p-1 px-2.5 rounded-lg border-2 border-[#0F172A] bg-[#FAF8FF] hover:bg-slate-100 font-extrabold text-xs cursor-pointer select-none"
                      >
                        ⋮
                      </button>
                      
                      {activeMenuWorkerId === w.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setActiveMenuWorkerId(null)} />
                          <div className="absolute right-0 bottom-full sm:bottom-auto sm:top-full mt-1 bg-white border-2 border-[#0F172A] rounded-xl shadow-neo-lg z-20 w-44 overflow-hidden py-1">
                            <button
                              onClick={() => {
                                setEditingWorker(w);
                                setActiveMenuWorkerId(null);
                              }}
                              className="w-full text-left px-3 py-2.5 text-xs font-bold text-[#0F172A] hover:bg-[#FAF8FF] flex items-center gap-2 cursor-pointer"
                            >
                              📝 Edit Pekerja
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Apakah Anda yakin ingin menghapus pekerja ${w.name} secara permanen?`)) {
                                  deleteWorker(w.id);
                                }
                                setActiveMenuWorkerId(null);
                              }}
                              className="w-full text-left px-3 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                            >
                              🗑️ Hapus Pekerja
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}

        {filteredWorkers.length === 0 && (
          <div className="text-center py-10 bg-white border-2 border-dashed border-[#0F172A]/20 rounded-2xl p-6 select-none">
            <p className="text-xs font-bold text-[#64748B] uppercase">
              Tidak ada tukang yang terdaftar untuk {selectedWeek === 'all' ? 'proyek ini' : `Minggu ${selectedWeek}`}.
            </p>
            <button
              onClick={() => setShowMasterWorkerModal(true)}
              className="mt-3 px-3 py-1.5 bg-[#FAF8FF] border-2 border-[#0F172A] rounded-xl text-xs font-bold text-[#0284C7] hover:bg-sky-50 shadow-neo-sm cursor-pointer"
            >
              + Tugaskan Tukang dari Database Master
            </button>
          </div>
        )}
      </div>

      {/* 2. DETAIL PEMBAYARAN UPAH MODAL */}
      {selectedWorker && (
        <div className="fixed inset-0 bg-[#0F172A]/70 flex items-center justify-center z-50 p-4 select-none animate-fade-in">
          <div className="bg-white border-3 border-[#0F172A] rounded-2xl w-full max-w-lg shadow-neo-lg overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-[#FAF8FF] border-b-2 border-[#0F172A] p-4 flex justify-between items-center">
              <h4 className="font-chunky text-sm text-[#0F172A] uppercase">DETAIL PEMBAYARAN UPAH</h4>
              <button
                onClick={() => setSelectedWorker(null)}
                className="text-xs font-bold border border-slate-300 p-1 px-2.5 rounded hover:bg-slate-100 transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>

            {/* Content scrollable */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="flex items-center gap-3.5 bg-amber-50 border-2 border-[#0F172A] rounded-xl p-4">
                <div className="w-12 h-12 bg-white rounded-lg border border-[#0F172A] flex items-center justify-center text-2xl">👷</div>
                <div>
                  <h5 className="font-chunky text-base text-[#0F172A] uppercase leading-none">{selectedWorker.name}</h5>
                  <p className="text-xs font-bold text-[#64748B] mt-1.5 uppercase tracking-wide">{selectedWorker.position}</p>
                </div>
              </div>

              {/* Specs parameters table */}
              <div className="border-2 border-[#0F172A] rounded-xl overflow-hidden bg-white">
                <div className="grid grid-cols-2 divide-x divide-y divide-[#0F172A]/10 text-xs font-semibold">
                  <div className="p-3">
                    <span className="text-[9px] text-[#64748B] font-extrabold uppercase block">Minggu Kerja</span>
                    <span className="text-slate-800 font-bold block mt-1">Minggu {selectedWorker.weekNumber || 1}</span>
                  </div>
                  <div className="p-3">
                    <span className="text-[9px] text-[#64748B] font-extrabold uppercase block">Status Pembayaran</span>
                    <Badge type={selectedWorker.status === 'BELUM_DIBAYAR' ? 'danger' : selectedWorker.status === 'SEBAGIAN' ? 'warning' : 'success'} className="mt-1">
                      {selectedWorker.status}
                    </Badge>
                  </div>
                  <div className="p-3">
                    <span className="text-[9px] text-[#64748B] font-extrabold uppercase block">Periode Kerja</span>
                    <span className="text-slate-800 font-bold block mt-1">{selectedWorker.weekStartDate || '-'} s/d {selectedWorker.weekEndDate || '-'}</span>
                  </div>
                  <div className="p-3">
                    <span className="text-[9px] text-[#64748B] font-extrabold uppercase block">Tanggal Pembayaran</span>
                    <span className="text-slate-800 font-bold block mt-1">{selectedWorker.paymentDate || formatTanggal(new Date().toISOString())}</span>
                  </div>
                  <div className="p-3">
                    <span className="text-[9px] text-[#64748B] font-extrabold uppercase block">Jumlah Hari Kerja</span>
                    <span className="text-slate-800 font-bold block mt-1">{selectedWorker.daysWorked} Hari</span>
                  </div>
                  <div className="p-3">
                    <span className="text-[9px] text-[#64748B] font-extrabold uppercase block">Upah Harian</span>
                    <span className="text-slate-800 font-bold block mt-1">{formatRupiah(selectedWorker.dailyRate)}</span>
                  </div>
                  <div className="p-3">
                    <span className="text-[9px] text-[#64748B] font-extrabold uppercase block">Tambahan Bonus</span>
                    <span className="text-emerald-600 font-bold block mt-1">+{formatRupiah(selectedWorker.bonus || 0)}</span>
                  </div>
                  <div className="p-3">
                    <span className="text-[9px] text-[#64748B] font-extrabold uppercase block">Potongan Kasbon</span>
                    <span className="text-red-500 font-bold block mt-1">-{formatRupiah(selectedWorker.potongan || 0)}</span>
                  </div>
                  <div className="p-3 col-span-2 bg-[#F1F5F9]/30">
                    <span className="text-[9px] text-[#64748B] font-extrabold uppercase block">Metode Pembayaran</span>
                    <span className="text-slate-800 font-extrabold block mt-1 uppercase">{selectedWorker.paymentMethod || 'Tunai (Kas Mandor)'}</span>
                  </div>
                </div>
                {selectedWorker.attachmentUrl && (
                  <div className="p-3 border-t border-[#0F172A]/10 bg-emerald-50 flex items-center justify-between text-xs font-bold text-emerald-800">
                    <span>📄 Bukti Slip Terlampir</span>
                    <a href={selectedWorker.attachmentUrl} target="_blank" rel="noreferrer" className="underline hover:text-emerald-950">Lihat / Download</a>
                  </div>
                )}
                <div className="p-4 border-t-2 border-[#0F172A] bg-slate-50 flex justify-between items-center">
                  <span className="text-xs font-extrabold text-[#0F172A] uppercase">Total Upah Bersih</span>
                  <span className="font-chunky text-lg text-emerald-700">{formatRupiah(getNetWages(selectedWorker))}</span>
                </div>
              </div>

              {/* Catatan / Keterangan */}
              <div className="space-y-1.5 select-text">
                <span className="text-[10px] font-extrabold text-[#64748B] uppercase block">Catatan Mandor</span>
                <p className="text-xs text-[#334155] bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold leading-relaxed">
                  "{selectedWorker.notes || 'Tidak ada catatan atau rincian tambahan.'}"
                </p>
              </div>

              {/* Action Buttons inside detail - Symmetrical Grid containing Hapus */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={() => { setEditingWorker(selectedWorker); }}
                  className="py-2.5 bg-white hover:bg-slate-50 border-2 border-[#0F172A] rounded-xl font-bold text-xs text-[#0F172A] transition-all cursor-pointer shadow-neo-sm flex items-center justify-center gap-1"
                >
                  ⚙ Edit Slip
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Apakah Anda yakin ingin menghapus pekerja ${selectedWorker.name} secara permanen?`)) {
                      deleteWorker(selectedWorker.id);
                      setSelectedWorker(null);
                    }
                  }}
                  className="py-2.5 bg-red-50 hover:bg-red-100 border-2 border-red-500 rounded-xl font-bold text-xs text-red-600 transition-all cursor-pointer shadow-neo-sm flex items-center justify-center gap-1"
                >
                  🗑️ Hapus Pekerja
                </button>
                <button
                  onClick={() => { setPrintSingleWorker(selectedWorker); }}
                  className="py-2.5 bg-[#FAF8FF] hover:bg-[#F3E8FF] border-2 border-[#0F172A] rounded-xl font-bold text-xs text-blue-700 transition-all cursor-pointer shadow-neo-sm flex items-center justify-center gap-1"
                >
                  🖨 Cetak Slip
                </button>
                <button
                  onClick={() => {
                    alert(`Mengunduh Bukti Slip Pembayaran Upah ${selectedWorker.name} ke perangkat dalam format PDF!`);
                    setPrintSingleWorker(selectedWorker);
                  }}
                  className="py-2.5 bg-[#ECFDF5] hover:bg-[#D1FAE5] border-2 border-[#0F172A] rounded-xl font-bold text-xs text-emerald-800 transition-all cursor-pointer shadow-neo-sm flex items-center justify-center gap-1"
                >
                  📥 Download Slip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. EDIT WORKER / SLIP CONFIG MODAL */}
      {editingWorker && (
        <div className="fixed inset-0 bg-[#0F172A]/70 flex items-center justify-center z-50 p-4 select-none animate-fade-in overflow-y-auto">
          <div className="bg-white border-3 border-[#0F172A] rounded-2xl w-full max-w-md shadow-neo-lg overflow-hidden my-8">
            <div className="bg-[#FAF8FF] border-b-2 border-[#0F172A] p-4 flex justify-between items-center">
              <h4 className="font-chunky text-sm text-[#0F172A] uppercase">EDIT DETIL GAJI: {editingWorker.name}</h4>
              <button onClick={() => setEditingWorker(null)} className="text-xs font-bold p-1 border border-slate-300 rounded">Batal</button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {editSaveError && (
                <div className="p-3 bg-red-50 border-2 border-red-400 rounded-xl text-xs font-bold text-red-700 flex items-start gap-2">
                  <span className="shrink-0">⚠️</span>
                  <span className="leading-snug">{editSaveError}</span>
                </div>
              )}

              <div>
                <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wide block mb-1">Nama Pekerja</label>
                <input
                  type="text"
                  required
                  value={editingWorker.name}
                  onChange={(e) => setEditingWorker({ ...editingWorker, name: e.target.value })}
                  className="w-full bg-white border-2 border-[#0F172A] rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wide block mb-1">Minggu Kerja</label>
                  <select
                    value={editingWorker.weekNumber || 1}
                    onChange={(e) => setEditingWorker({ ...editingWorker, weekNumber: parseInt(e.target.value) || 1 })}
                    className="w-full bg-white border-2 border-[#0F172A] rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(wNum => (
                      <option key={wNum} value={wNum}>Minggu {wNum}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wide block mb-1">Tanggal Pembayaran Gaji</label>
                  <input
                    type="date"
                    value={editingWorker.paymentDate || new Date().toISOString().substring(0, 10)}
                    onChange={(e) => setEditingWorker({ ...editingWorker, paymentDate: e.target.value })}
                    className="w-full bg-white border-2 border-[#0F172A] rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wide block mb-1">Tanggal Mulai Kerja</label>
                  <input
                    type="date"
                    value={editingWorker.weekStartDate || ''}
                    onChange={(e) => setEditingWorker({ ...editingWorker, weekStartDate: e.target.value })}
                    className="w-full bg-white border-2 border-[#0F172A] rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wide block mb-1">Tanggal Selesai Kerja</label>
                  <input
                    type="date"
                    value={editingWorker.weekEndDate || ''}
                    onChange={(e) => setEditingWorker({ ...editingWorker, weekEndDate: e.target.value })}
                    className="w-full bg-white border-2 border-[#0F172A] rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wide block mb-1">Jumlah Hari Kerja</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editingWorker.daysWorked}
                    onChange={(e) => setEditingWorker({ ...editingWorker, daysWorked: parseInt(e.target.value) || 0 })}
                    className="w-full bg-white border-2 border-[#0F172A] rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wide block mb-1">Tarif Upah Harian (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingWorker.dailyRate}
                    onChange={(e) => setEditingWorker({ ...editingWorker, dailyRate: parseInt(e.target.value) || 0 })}
                    className="w-full bg-white border-2 border-[#0F172A] rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wide block mb-1">Bonus Tambahan (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    value={editingWorker.bonus || 0}
                    onChange={(e) => setEditingWorker({ ...editingWorker, bonus: parseInt(e.target.value) || 0 })}
                    className="w-full bg-white border-2 border-[#0F172A] rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wide block mb-1">Potongan Kasbon (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    value={editingWorker.potongan || 0}
                    onChange={(e) => setEditingWorker({ ...editingWorker, potongan: parseInt(e.target.value) || 0 })}
                    className="w-full bg-white border-2 border-[#0F172A] rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wide block mb-1">Status Gaji</label>
                  <select
                    value={editingWorker.status}
                    onChange={(e) => setEditingWorker({ ...editingWorker, status: e.target.value as any })}
                    className="w-full bg-white border-2 border-[#0F172A] rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                  >
                    <option value="BELUM_DIBAYAR">BELUM DIBAYAR</option>
                    <option value="SEBAGIAN">KASBON / SEBAGIAN</option>
                    <option value="LUNAS">LUNAS / BERHASIL</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wide block mb-1">Metode Pembayaran</label>
                  <select
                    value={editingWorker.paymentMethod || 'Tunai'}
                    onChange={(e) => setEditingWorker({ ...editingWorker, paymentMethod: e.target.value })}
                    className="w-full bg-white border-2 border-[#0F172A] rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                  >
                    <option value="Tunai">Tunai</option>
                    <option value="Transfer Bank">Transfer Bank</option>
                    <option value="Dompet Digital">Dompet Digital</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wide block mb-1">Upload Dokumen / Bukti Slip (JPG, PNG, WEBP, PDF)</label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf,image/*,application/pdf"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        setIsUploadingDocument(true);
                        const meta = await documentService.uploadDocument(file, 'SLIP_GAJI');
                        setEditingWorker({ ...editingWorker, attachmentUrl: meta.fileUrl });
                      } catch (err: any) {
                        alert('Gagal mengunggah dokumen: ' + (err.message || 'Error'));
                      } finally {
                        setIsUploadingDocument(false);
                      }
                    }
                  }}
                  className="w-full bg-white border-2 border-[#0F172A] rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#0F172A] file:text-white hover:file:bg-slate-700"
                />
                {isUploadingDocument && (
                  <p className="text-[11px] font-bold text-amber-700 mt-1">Mengunggah dokumen...</p>
                )}
                {editingWorker.attachmentUrl && !isUploadingDocument && (
                  <div className="mt-1 flex items-center justify-between text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 p-2 rounded-lg">
                    <span>✓ Dokumen / Slip Terlampir</span>
                    <a href={editingWorker.attachmentUrl} target="_blank" rel="noreferrer" className="underline font-bold hover:text-emerald-900">Lihat / Download</a>
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wide block mb-1">Catatan Tambahan</label>
                <textarea
                  value={editingWorker.notes || ''}
                  onChange={(e) => setEditingWorker({ ...editingWorker, notes: e.target.value })}
                  placeholder="Keterangan denda, kasbon, upah lembur dsb."
                  rows={2}
                  className="w-full bg-white border-2 border-[#0F172A] rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="ghost" className="flex-1" onClick={() => setEditingWorker(null)}>Batal</Button>
                <Button variant="secondary" className="flex-1" type="submit">Simpan Slip</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. PRINT PREVIEW BUKTI PEMBAYARAN WORKER (A4 / F4 Slip) */}
      {(printSingleWorker || printAllWorkers) && (
        <div className="fixed inset-0 bg-[#0F172A]/80 flex items-center justify-center z-50 p-2 sm:p-4 select-none animate-fade-in overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible">
          <div className="bg-white border-3 border-[#0F172A] rounded-2xl w-full max-w-4xl shadow-neo-lg overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:border-none print:shadow-none print:w-full print:rounded-none">
            <div className="bg-[#FAF8FF] border-b-2 border-[#0F172A] p-3 sm:p-4 flex flex-wrap justify-between items-center gap-2 print:hidden">
              <div className="flex items-center gap-2">
                <h3 className="font-chunky text-xs sm:text-sm text-[#0F172A] uppercase">
                  {printAllWorkers ? 'PREVIEW CETAK SEMUA BUKTI UPAH' : `PREVIEW CETAK BUKTI UPAH: ${printSingleWorker?.name}`}
                </h3>
                <span className="text-[10px] font-extrabold bg-white border border-[#0F172A] px-2 py-0.5 rounded shadow-neo-sm">
                  {slipPaperSize} • {slipOrientation}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Format Settings Toggle */}
                <button
                  onClick={() => setShowSlipFormatBar(!showSlipFormatBar)}
                  className={`px-2.5 py-1.5 font-bold text-xs rounded-xl border-2 border-[#0F172A] shadow-neo-sm flex items-center gap-1 cursor-pointer transition-all ${
                    showSlipFormatBar ? 'bg-amber-300 text-slate-950' : 'bg-white hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Format</span>
                </button>

                {/* Print PDF Button */}
                <Button variant="secondary" size="sm" onClick={triggerPrintReceipt}>
                  <Printer className="w-4 h-4 mr-1.5" /> Cetak / Save PDF
                </Button>

                {/* Export JPEG / PNG */}
                <button
                  onClick={async () => {
                    const printableArea = document.getElementById('printable-area');
                    if (!printableArea) return;
                    setIsExportingSlipImage(true);
                    setSlipExportProgress('Menyiapkan gambar slip...');
                    try {
                      const pageElements = Array.from(printableArea.querySelectorAll<HTMLElement>('.page-break-container'));
                      const ext = slipImageFormat === 'PNG' ? 'png' : 'jpg';
                      const mime = slipImageFormat === 'PNG' ? 'image/png' : 'image/jpeg';
                      const cleanProject = activeProj.name.replace(/[^a-zA-Z0-9]/g, '_');
                      
                      const images: { name: string; blob: Blob; dataUrl: string }[] = [];
                      for (let i = 0; i < pageElements.length; i++) {
                        const el = pageElements[i];
                        setSlipExportProgress(`Merender slip ${i + 1} dari ${pageElements.length}...`);

                        // Extract worker info for file naming
                        const rawName = el.getAttribute('data-worker-name') || 'Tukang';
                        const rawDate = el.getAttribute('data-payment-date') || new Date().toISOString();
                        const cleanWorkerName = rawName.replace(/[^a-zA-Z0-9]/g, '-').replace(/--+/g, '-');
                        let cleanDate = '';
                        try {
                          cleanDate = new Date(rawDate).toISOString().substring(0, 10);
                        } catch (e) {
                          cleanDate = new Date().toISOString().substring(0, 10);
                        }

                        // Target filename: DATAKU-Slip-Gaji-[Nama-Tukang]-[Tanggal].jpg (dan png)
                        const fileName = `DATAKU-Slip-Gaji-${cleanWorkerName}-${cleanDate}.${ext}`;

                        // Clone the element offscreen to prevent HMR and visible artifacts
                        const exportClone = el.cloneNode(true) as HTMLElement;
                        exportClone.style.position = 'absolute';
                        exportClone.style.left = '-9999px';
                        exportClone.style.top = '0';
                        exportClone.style.width = el.offsetWidth ? `${el.offsetWidth}px` : '800px';
                        el.parentNode?.insertBefore(exportClone, el.nextSibling);

                        // Normalize all colors (translating oklch/color-mix/lab/lch to standard RGB via Canvas fallback)
                        normalizeColorsOnClonePages(el, exportClone);

                        const canvas = await html2canvas(exportClone, {
                          scale: 3.0, // High quality, crystal clear, no cut-off
                          useCORS: true,
                          allowTaint: false,
                          backgroundColor: '#ffffff',
                          logging: false,
                          onclone: (clonedDoc) => {
                            const styleTags = clonedDoc.querySelectorAll('style');
                            styleTags.forEach(tag => {
                              if (tag.textContent) {
                                tag.textContent = tag.textContent
                                  .replace(/oklch/g, 'rgba')
                                  .replace(/oklab/g, 'rgba')
                                  .replace(/color-mix/g, 'rgba')
                                  .replace(/lab\(/g, 'rgba(')
                                  .replace(/lch\(/g, 'rgba(');
                              }
                            });
                          }
                        });

                        exportClone.remove();

                        const dataUrl = canvas.toDataURL(mime, 0.95);
                        const blob = await (await fetch(dataUrl)).blob();
                        images.push({
                          name: fileName,
                          blob,
                          dataUrl
                        });
                      }

                      if (images.length === 1) {
                        const item = images[0];
                        const a = document.createElement('a');
                        a.href = item.dataUrl;
                        a.download = item.name;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      } else if (images.length > 1) {
                        setSlipExportProgress('Mengemas ke file ZIP...');
                        const zip = new JSZip();
                        images.forEach(img => zip.file(img.name, img.blob));
                        const zipBlob = await zip.generateAsync({ type: 'blob' });
                        const zipUrl = URL.createObjectURL(zipBlob);
                        const a = document.createElement('a');
                        a.href = zipUrl;
                        a.download = `DATAKU_Semua_Slip_Gaji_${cleanProject}.zip`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(zipUrl);
                      }
                    } catch (err) {
                      console.error('Error exporting slip image:', err);
                      alert('Gagal mengekspor gambar slip gaji.');
                    } finally {
                      setIsExportingSlipImage(false);
                      setSlipExportProgress('');
                    }
                  }}
                  disabled={isExportingSlipImage}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl border-2 border-[#0F172A] shadow-neo-sm flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                >
                  {isExportingSlipImage ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> {slipExportProgress || 'Export...'}
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-4 h-4" /> Export {slipImageFormat}
                    </>
                  )}
                </button>

                <Button variant="ghost" size="sm" onClick={() => { setPrintSingleWorker(null); setPrintAllWorkers(false); }}>
                  Tutup
                </Button>
              </div>
            </div>

            {/* Quick Slip Format Drawer */}
            {showSlipFormatBar && (
              <div className="bg-amber-50 border-b-2 border-[#0F172A] p-3 text-xs font-bold text-slate-900 grid grid-cols-1 sm:grid-cols-3 gap-3 print:hidden">
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-slate-500 block mb-1">Ukuran Kertas:</label>
                  <div className="flex gap-1.5">
                    {(['A4', 'F4'] as PaperSize[]).map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setSlipPaperSize(sz)}
                        className={`flex-1 py-1 px-2 rounded-lg border-2 text-xs font-extrabold cursor-pointer ${
                          slipPaperSize === sz ? 'bg-[#0284C7] text-white border-[#0F172A]' : 'bg-white text-slate-700 border-slate-300'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-extrabold text-slate-500 block mb-1">Orientasi:</label>
                  <div className="flex gap-1.5">
                    {(['Portrait', 'Landscape'] as PageOrientation[]).map((ori) => (
                      <button
                        key={ori}
                        type="button"
                        onClick={() => setSlipOrientation(ori)}
                        className={`flex-1 py-1 px-2 rounded-lg border-2 text-xs font-extrabold cursor-pointer ${
                          slipOrientation === ori ? 'bg-[#0284C7] text-white border-[#0F172A]' : 'bg-white text-slate-700 border-slate-300'
                        }`}
                      >
                        {ori}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-extrabold text-slate-500 block mb-1">Format Gambar:</label>
                  <div className="flex gap-1.5">
                    {(['JPEG', 'PNG'] as ImageExportFormat[]).map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setSlipImageFormat(fmt)}
                        className={`flex-1 py-1 px-2 rounded-lg border-2 text-xs font-extrabold cursor-pointer ${
                          slipImageFormat === fmt ? 'bg-purple-600 text-white border-[#0F172A]' : 'bg-white text-slate-700 border-slate-300'
                        }`}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Document display area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100 flex justify-center print:p-0 print:bg-white print:overflow-visible">
              <div
                id="printable-area"
                className={`w-full space-y-8 select-text ${
                  slipPaperSize === 'A4'
                    ? slipOrientation === 'Portrait' ? 'max-w-[210mm]' : 'max-w-[297mm]'
                    : slipOrientation === 'Portrait' ? 'max-w-[215mm]' : 'max-w-[330mm]'
                }`}
              >
                
                {/* Resolve which workers are rendered */}
                {(printAllWorkers ? projWorkers : [printSingleWorker]).map((w, idx) => {
                  if (!w) return null;
                  const uNum = `UPH-2026-000${idx + 101}`;
                  return (
                    <div
                      key={w.id}
                      className="bg-white border-2 border-dashed border-slate-400 p-8 text-black font-sans leading-relaxed shadow-md relative break-after-page page-break-container"
                      style={{ pageBreakAfter: 'always', marginBottom: '24px' }}
                      data-worker-name={w.name}
                      data-payment-date={w.paymentDate || new Date().toISOString()}
                    >
                      {/* Logo / Header banner */}
                      <div className="flex justify-between items-center border-b-2 border-black pb-4 mb-4 select-none">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex-shrink-0 flex items-center justify-center"
                            style={{
                              width: '48px',
                              height: '48px',
                              borderWidth: identityConfig?.logoOutlineEnabled !== false ? `${identityConfig?.logoOutlineWidth ?? 2}px` : '0px',
                              borderStyle: identityConfig?.logoOutlineEnabled !== false && (identityConfig?.logoOutlineWidth ?? 2) > 0 ? 'solid' : 'none',
                              borderColor: identityConfig?.logoOutlineEnabled !== false ? (identityConfig?.logoOutlineColor || '#0F172A') : 'transparent',
                              borderRadius: identityConfig?.logoOutlineEnabled !== false ? `${identityConfig?.logoOutlineRadius ?? 12}px` : '0px',
                              padding: identityConfig?.logoOutlineEnabled !== false ? `${identityConfig?.logoOutlinePadding ?? 4}px` : '0px',
                              backgroundColor: identityConfig?.logoOutlineEnabled !== false ? '#FFFFFF' : 'transparent',
                            }}
                          >
                            <img
                              src={identityConfig?.logoUrl || '/LOGO.png'}
                              alt={identityConfig?.appName || 'DATAKU'}
                              className="w-full h-full object-contain"
                              crossOrigin="anonymous"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div>
                            <h1 className="text-xl font-black tracking-tight leading-none">{identityConfig?.appName || 'DATAKU'}</h1>
                            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider mt-0.5">{identityConfig?.tagline || 'SISTEM MANDOR'}</p>
                            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">SISTEM KEUANGAN MANDOR</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-extrabold uppercase bg-black text-white px-2.5 py-1 rounded">
                            BUKTI PEMBAYARAN UPAH TUKANG
                          </span>
                          <p className="text-[10px] font-mono text-slate-600 mt-1.5">No: {uNum}</p>
                        </div>
                      </div>

                      {/* Content Specs block */}
                      <div className="grid grid-cols-2 gap-4 text-xs font-semibold pb-4 border-b border-slate-300">
                        <div className="space-y-1">
                          <p><span className="text-slate-500 uppercase font-bold text-[10px]">Nama Proyek:</span> <br /><b className="text-sm font-black">{activeProj.name}</b></p>
                          <p><span className="text-slate-500 uppercase font-bold text-[10px]">Lokasi Proyek:</span> <br />{activeProj.location}</p>
                        </div>
                        <div className="space-y-1 text-right">
                          <p><span className="text-slate-500 uppercase font-bold text-[10px]">Tanggal Bayar:</span> <br />{w.paymentDate || formatTanggal(new Date().toISOString())}</p>
                          <p><span className="text-slate-500 uppercase font-bold text-[10px]">Metode:</span> <br /><span className="uppercase">{w.paymentMethod || 'Tunai'}</span></p>
                        </div>
                      </div>

                      {/* Workers detail fields */}
                      <div className="my-6 space-y-3 text-xs">
                        <div className="bg-slate-50 rounded p-3 grid grid-cols-2 gap-3 border border-slate-200">
                          <div>
                            <span className="text-slate-500 font-bold text-[9px] uppercase">Penerima Upah (Tukang)</span>
                            <p className="text-sm font-black text-slate-900 mt-0.5">{w.name}</p>
                          </div>
                          <div>
                            <span className="text-slate-500 font-bold text-[9px] uppercase">Posisi / Keahlian</span>
                            <p className="text-sm font-black text-slate-900 mt-0.5 uppercase">{w.position}</p>
                          </div>
                        </div>

                        {/* Calculation ledger list */}
                        <div className="border border-slate-300 rounded overflow-hidden">
                          <div className="grid grid-cols-3 bg-slate-100 p-2 font-bold text-slate-700 text-[10px] uppercase border-b border-slate-300">
                            <div>Uraian Upah Kerja</div>
                            <div className="text-center">Perhitungan</div>
                            <div className="text-right font-black">Nominal</div>
                          </div>
                          <div className="divide-y divide-slate-200 text-xs">
                            <div className="grid grid-cols-3 p-2.5 font-semibold text-slate-800">
                              <div>Upah Hari Kerja Pokok</div>
                              <div className="text-center text-slate-600">{w.daysWorked} Hari x {formatRupiah(w.dailyRate)}</div>
                              <div className="text-right font-bold text-slate-900">{formatRupiah(w.totalWages)}</div>
                            </div>
                            {w.bonus ? (
                              <div className="grid grid-cols-3 p-2.5 font-semibold text-emerald-800 bg-emerald-50/20">
                                <div>Bonus / Lemburan Lapangan</div>
                                <div className="text-center text-emerald-600">Insentif</div>
                                <div className="text-right font-bold">+{formatRupiah(w.bonus)}</div>
                              </div>
                            ) : null}
                            {w.potongan ? (
                              <div className="grid grid-cols-3 p-2.5 font-semibold text-red-800 bg-red-50/20">
                                <div>Potongan Kasbon / Denda</div>
                                <div className="text-center text-red-500">Kasbon</div>
                                <div className="text-right font-bold">-{formatRupiah(w.potongan)}</div>
                              </div>
                            ) : null}
                          </div>
                          {/* Grand total clean */}
                          <div className="grid grid-cols-3 bg-slate-100 p-3 text-sm font-bold border-t border-slate-300">
                            <div className="col-span-2 uppercase font-black text-slate-900">Total Dibayarkan (Bersih):</div>
                            <div className="text-right font-black text-emerald-700">{formatRupiah(getNetWages(w))}</div>
                          </div>
                        </div>
                      </div>

                      {/* Catatan Slip */}
                      {w.notes && (
                        <div className="my-4 text-xs italic bg-slate-50 rounded p-2.5 border border-slate-200">
                          <b>Catatan Lapangan:</b> "{w.notes}"
                        </div>
                      )}

                      {/* Signatures */}
                      <div className="mt-12 grid grid-cols-2 gap-12 text-center text-xs font-bold select-none">
                        <div>
                          <p className="mb-14 text-slate-500 uppercase font-bold text-[9px]">Pemberi Dana (Mandor)</p>
                          <p className="underline uppercase">{state.currentUser?.name || 'PAUJI'}</p>
                          <p className="text-[9px] text-slate-400 font-semibold mt-0.5">DATAKU MANDOR SYSTEM</p>
                        </div>
                        <div>
                          <p className="mb-14 text-slate-500 uppercase font-bold text-[9px]">Penerima Upah (Tukang)</p>
                          <p className="underline uppercase">{w.name}</p>
                          <p className="text-[9px] text-slate-400 font-semibold mt-0.5">TERTANDA DI LAPANGAN</p>
                        </div>
                      </div>

                      {/* Separation footer */}
                      <div className="mt-8 pt-3 border-t border-slate-200 flex justify-between items-center text-[9px] text-slate-400 uppercase tracking-widest select-none">
                        <span>DATAKU VERIFIED GAJI</span>
                        <span>PRODUK MANDOR DIGITAL INDONESIA</span>
                      </div>
                    </div>
                  );
                })}

              </div>
            </div>
          </div>

          <style>{`
            @page {
              size: ${slipPaperSize === 'A4' ? 'A4 portrait' : '215mm 330mm portrait'};
              margin: 10mm;
            }
          `}</style>
        </div>
      )}

      {/* 4. MASTER WORKERS MODAL / DAFTAR TUKANG UTAMA */}
      {showMasterWorkerModal && (
        <div className="fixed inset-0 bg-[#0F172A]/70 flex items-center justify-center z-50 p-4 select-none animate-fade-in">
          <div className="bg-white border-3 border-[#0F172A] rounded-2xl w-full max-w-xl shadow-neo-lg overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-[#FAF8FF] border-b-2 border-[#0F172A] p-4 flex justify-between items-center">
              <div>
                <h4 className="font-chunky text-sm text-[#0F172A] uppercase">👥 DATABASE MASTER TUKANG</h4>
                <p className="text-[10px] text-[#64748B] font-extrabold uppercase mt-0.5">
                  Tugaskan tukang ke proyek untuk {selectedWeek === 'all' ? 'Minggu 1' : `Minggu ${selectedWeek}`}
                </p>
              </div>
              <button
                onClick={() => setShowMasterWorkerModal(false)}
                className="text-xs font-bold border border-slate-300 p-1 px-2.5 rounded hover:bg-slate-100 transition-all cursor-pointer"
              >
                ✕ Tutup
              </button>
            </div>

            <div className="p-4 bg-sky-50 border-b border-[#0F172A]/10 flex items-center justify-between text-xs">
              <span className="font-bold text-[#0F172A]">
                🎯 Target Penugasan: <b className="text-sky-800 uppercase">{selectedWeek === 'all' ? 'Minggu 1' : `Minggu ${selectedWeek}`}</b>
              </span>
              <span className="text-[10px] text-[#64748B] font-extrabold">
                {masterWorkers.length} Tukang Terdaftar di Master
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {masterWorkers.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-300 rounded-xl p-4">
                  <p className="text-xs font-bold text-slate-600">Belum ada data Master Tukang di database Supabase.</p>
                  <p className="text-[10px] text-slate-400 mt-1">Gunakan tombol "+ Tambah Pekerja" untuk menambahkan tukang ke proyek.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMasterWorkerModal(false);
                      onAddWorkerClick();
                    }}
                    className="mt-3 px-3 py-1.5 bg-[#0284C7] hover:bg-sky-700 text-white rounded-lg text-xs font-extrabold cursor-pointer transition-all shadow-neo-sm"
                  >
                    + Tambah Pekerja Baru
                  </button>
                </div>
              ) : (
                masterWorkers.map((mw) => {
                  const targetW = selectedWeek === 'all' ? 1 : selectedWeek;
                  const isAssigned = projWorkers.some(
                    pw => (pw.masterWorkerId === mw.id || pw.name.toLowerCase() === mw.name.toLowerCase()) && 
                          ((pw.weekNumber === targetW) || (!pw.weekNumber && targetW === 1))
                  );

                  return (
                    <div
                      key={mw.id}
                      className={`p-3 rounded-xl border-2 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isAssigned
                          ? 'bg-slate-50 border-slate-300 opacity-80'
                          : 'bg-white border-[#0F172A] hover:shadow-neo-sm'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-50 border border-[#0F172A] flex items-center justify-center text-lg shrink-0">
                          👷
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="font-bold text-xs text-[#0F172A] uppercase">{mw.name}</h5>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-slate-100 text-slate-700 border border-slate-300">
                              {mw.specialty}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                            {mw.position} • {formatRupiah(mw.dailyRate)}/hari • {mw.phone}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center justify-end">
                        {isAssigned ? (
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[10px] font-black uppercase">
                            ✓ Sudah Ditugaskan
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              const weekObj = projectWeeks.find(p => p.weekNumber === targetW);
                              addWorker({
                                name: mw.name,
                                position: mw.position,
                                dailyRate: mw.dailyRate,
                                daysWorked: 6,
                                status: 'BELUM_DIBAYAR',
                                paymentMethod: 'Tunai',
                                weekNumber: targetW,
                                weekStartDate: weekObj?.startDate || '2026-09-08',
                                weekEndDate: weekObj?.endDate || '2026-09-14',
                                masterWorkerId: mw.id,
                                notes: `Penugasan Master Tukang (${mw.specialty})`
                              });
                            }}
                            className="px-3 py-1.5 bg-[#0284C7] hover:bg-sky-700 text-white rounded-lg text-xs font-extrabold transition-all cursor-pointer shadow-neo-sm flex items-center gap-1"
                          >
                            + Tugaskan Minggu {targetW}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t-2 border-[#0F172A] flex justify-between items-center text-xs">
              <span className="text-[10px] text-slate-500 font-bold">
                Tukang berbeda setiap minggu dapat ditugaskan ke dalam proyek yang sama.
              </span>
              <button
                onClick={() => setShowMasterWorkerModal(false)}
                className="px-3 py-1 bg-white border border-[#0F172A] rounded-lg font-bold text-xs hover:bg-slate-100 cursor-pointer"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Specific CSS to support exact layout printing */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-area, #printable-area *, #printable-rekap-area, #printable-rekap-area *, .dataku-print-page, .dataku-print-page * {
            visibility: visible;
          }
          #printable-area, #printable-rekap-area, .dataku-print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
          .break-after-page {
            page-break-after: always;
            break-after: page;
            margin-bottom: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
          aside, header, nav, button, .lg\\:pl-64, div.fixed.inset-0.bg-\\[\\#0F172A\\]\\/80 .bg-\\#FAF8FF {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};


// --- VIEW 5: LAPORAN HARIAN VIEW ---
export const ReportsView: React.FC = () => {
  const { state, deleteDailyReport } = useApp();
  const activeProj = state.projects.find(p => p.id === state.activeProjectId);

  // Delete state confirmation
  const [selectedRep, setSelectedRep] = useState<DailyReport | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!activeProj) {
    return <div className="text-center py-8">Pilih proyek aktif terlebih dahulu.</div>;
  }

  const reports = state.dailyReports.filter(r => r.projectId === activeProj.id);

  const handleDeleteClick = (rep: DailyReport) => {
    setSelectedRep(rep);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (selectedRep) {
      deleteDailyReport(selectedRep.id);
      setShowDeleteConfirm(false);
      setSelectedRep(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Reports feed */}
      {reports.map((rep) => (
        <Card key={rep.id} className="p-4 select-none">
          <div className="flex justify-between items-center border-b border-[#F1F5F9] pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-[#0F172A]">
                📅 {formatTanggal(rep.date)}
              </span>
              <Badge type="success">✓ Sudah Dilaporkan</Badge>
            </div>
            
            <button
              onClick={() => handleDeleteClick(rep)}
              className="p-1.5 rounded-lg border border-red-200 text-[#EF4444] hover:bg-red-50 hover:border-[#EF4444] transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-[#475569]">
            <div className="space-y-2">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#64748B]">Info Dasar:</span> <br />
                Cuaca: <span className="text-[#0F172A] font-extrabold">{rep.weather}</span> • Pekerja Aktif: <span className="text-[#0F172A] font-extrabold">{rep.workerCount} orang</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-[#64748B]">Pekerjaan Hari Ini:</span> <br />
                <span className="text-[#0F172A] font-bold block bg-[#F8FAFC] border border-[#0F172A]/10 p-2.5 rounded-xl mt-1 italic">
                  "{rep.todayWork}"
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-[#64748B]">Log Barang Hari Ini:</span> <br />
                Masuk: <span className="text-[#0F172A] font-bold">{rep.materialsIn || 'Tidak ada'}</span> <br />
                Terpakai: <span className="text-[#0F172A] font-bold">{rep.materialsUsed || 'Tidak ada'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-[#64748B]">Kendala / Tantangan Lapangan:</span> <br />
                <span className="text-[#B91C1C] font-bold">{rep.challenges || 'Lancar / aman.'}</span>
              </div>
            </div>

            {/* Photos */}
            {rep.photos && rep.photos.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase text-[#64748B]">Foto Dokumentasi Lapangan:</span>
                <div className="flex gap-2.5 flex-wrap">
                  {rep.photos.map((p, idx) => (
                    <div key={idx} className="w-24 h-24 rounded-xl border-1.5 border-[#0F172A] overflow-hidden bg-white shadow-neo-sm">
                      <img src={p} alt="Progress Lapangan" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      ))}

      {reports.length === 0 && (
        <div className="text-center py-12 bg-white border-2 border-dashed border-[#0F172A]/20 rounded-2xl p-6 select-none">
          <p className="text-xs font-bold text-[#64748B] uppercase mb-1">Belum ada laporan harian dibuat</p>
          <p className="text-[10px] text-[#94A3B8] font-semibold uppercase">Mandor perlu membuat laporan harian melalui Dashboard.</p>
        </div>
      )}

      {/* Confirmation Modal Delete */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Hapus Laporan Harian"
      >
        <div className="space-y-4">
          <p className="text-sm font-semibold text-[#475569] leading-normal select-none">
            Apakah Anda yakin ingin menghapus Laporan Harian ini? Tindakan ini bersifat permanen.
          </p>
          {selectedRep && (
            <div className="p-3 bg-[#FAF8FF] border border-[#0F172A] rounded-xl text-xs font-bold select-all">
              <span className="text-[#64748B]">Laporan Tanggal:</span> {formatTanggal(selectedRep.date)} <br />
              <span className="text-[#64748B]">Tukang:</span> {selectedRep.workerCount} orang <br />
              <span className="text-[#64748B]">Pekerjaan:</span> {selectedRep.todayWork.substring(0, 50)}...
            </div>
          )}
          <div className="flex gap-3 pt-2 select-none">
            <Button variant="ghost" className="flex-1" onClick={() => setShowDeleteConfirm(false)}>Batal</Button>
            <Button variant="danger" className="flex-1" onClick={confirmDelete}>Hapus Laporan</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};


// --- VIEW 6: PROJECT LIST & DETAILS VIEW ---
interface ProjectListViewProps {
  onCreateProjectClick: () => void;
}

export const ProjectListView: React.FC<ProjectListViewProps> = ({ onCreateProjectClick }) => {
  const { state, setActiveProject, archiveProject, updateProject, deleteProject } = useApp();

  // Deletion state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [typedConfirm, setTypedConfirm] = useState('');

  // Editing state
  const [showEditModal, setShowEditModal] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  
  // Edit form fields
  const [editName, setEditName] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editOwner, setEditOwner] = useState('');
  const [editBudget, setEditBudget] = useState(0);
  const [editStartDate, setEditStartDate] = useState('');
  const [editTargetDate, setEditTargetDate] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const handleOpenEdit = (p: Project) => {
    setProjectToEdit(p);
    setEditName(p.name);
    setEditLocation(p.location);
    setEditOwner(p.owner);
    setEditBudget(p.budget);
    setEditStartDate(p.startDate);
    setEditTargetDate(p.targetDate);
    setEditNotes(p.notes || '');
    setShowEditModal(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectToEdit) return;

    updateProject({
      ...projectToEdit,
      name: editName,
      location: editLocation,
      owner: editOwner,
      budget: Number(editBudget),
      startDate: editStartDate,
      targetDate: editTargetDate,
      notes: editNotes
    });

    setShowEditModal(false);
    setProjectToEdit(null);
  };

  const handleOpenDelete = (p: Project) => {
    setProjectToDelete(p);
    setTypedConfirm('');
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    if (!projectToDelete || typedConfirm !== 'HAPUS') return;

    deleteProject(projectToDelete.id);
    setShowDeleteModal(false);
    setProjectToDelete(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center select-none">
        <span className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider">
          DAFTAR PROYEK KONSTRUKSI
        </span>
        <Button variant="secondary" size="sm" onClick={onCreateProjectClick}>
          + Buat Proyek Baru
        </Button>
      </div>

      <div className="space-y-4">
        {state.projects.map((p) => {
          const isActive = p.id === state.activeProjectId;
          
          return (
            <Card
              key={p.id}
              className={`p-5 transition-all ${
                isActive ? 'bg-[#E0F2FE] border-[#0F172A] shadow-neo-lg' : 'bg-white hover:bg-[#FAF8FF]'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-2.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-chunky text-[#0F172A] uppercase truncate">
                      {p.name}
                    </h3>
                    <Badge type={p.isArchived ? 'neutral' : 'success'}>
                      {p.isArchived ? 'Selesai / Diarsipkan' : 'Aktif Berjalan'}
                    </Badge>
                  </div>

                  <div className="text-xs font-semibold text-[#475569] space-y-1">
                    <p className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-[#64748B]" /> {p.location}</p>
                    <p className="flex items-center gap-1"><User className="w-3.5 h-3.5 text-[#64748B]" /> Pemilik: <span className="font-extrabold text-[#0F172A]">{p.owner}</span></p>
                    <p className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-[#64748B]" /> Mulai: {formatTanggal(p.startDate)} s/d {formatTanggal(p.targetDate)}</p>
                  </div>

                  <div className="pt-2">
                    <span className="text-[9px] font-extrabold text-[#64748B] uppercase block">BUDGET TOTAL PROYEK</span>
                    <span className="text-lg font-chunky text-[#0F172A]">{formatRupiah(p.budget)}</span>
                  </div>
                </div>

                <div className="flex flex-row sm:flex-col gap-2 select-none flex-wrap">
                  {!isActive && !p.isArchived && (
                    <Button variant="ghost" size="sm" onClick={() => setActiveProject(p.id)}>
                      Buka Proyek
                    </Button>
                  )}
                  {isActive && (
                    <span className="text-[10px] font-black text-emerald-600 border border-emerald-500 bg-emerald-50 rounded-lg px-2 py-1 uppercase text-center block">
                      ✓ Sedang Dibuka
                    </span>
                  )}
                  
                  {/* Edit Project Button */}
                  <button
                    onClick={() => handleOpenEdit(p)}
                    className="p-2 border border-[#0F172A]/15 hover:border-blue-500 rounded-xl hover:bg-blue-50 text-[#475569] hover:text-blue-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    📝 Edit Proyek
                  </button>

                  <button
                    onClick={() => archiveProject(p.id)}
                    className="p-2 border border-[#0F172A]/15 hover:border-amber-500 rounded-xl hover:bg-amber-50 text-[#475569] hover:text-amber-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    {p.isArchived ? 'Aktifkan Kembali' : 'Arsipkan Proyek'}
                  </button>

                  {/* Permanently Delete Project */}
                  <button
                    onClick={() => handleOpenDelete(p)}
                    className="p-2 border border-red-200 hover:border-red-500 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Hapus Permanen
                  </button>
                </div>
              </div>
            </Card>
          );
        })}

        {state.projects.length === 0 && (
          <div className="text-center py-16 bg-white border-2 border-dashed border-[#0F172A]/20 rounded-2xl p-8 select-none">
            <Briefcase className="w-10 h-10 text-[#64748B] mx-auto opacity-40 mb-3" />
            <h3 className="text-base font-chunky text-[#0F172A] uppercase mb-1">Belum Ada Proyek Terdaftar</h3>
            <p className="text-[10px] text-[#94A3B8] font-bold uppercase mb-4">Mulai bangun karir Mandor dengan mendaftarkan proyek pertama Anda.</p>
            <Button variant="secondary" onClick={onCreateProjectClick}>
              + Buat Proyek Baru
            </Button>
          </div>
        )}
      </div>

      {/* EDIT MODAL */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Informasi Proyek">
        <form onSubmit={handleSaveEdit} className="space-y-4 select-none">
          <div>
            <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wide block mb-1">Nama Proyek *</label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full bg-white border-2 border-[#0F172A] rounded-xl px-3 py-2 text-xs font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wide block mb-1">Lokasi Proyek *</label>
            <input
              type="text"
              required
              value={editLocation}
              onChange={(e) => setEditLocation(e.target.value)}
              className="w-full bg-white border-2 border-[#0F172A] rounded-xl px-3 py-2 text-xs font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wide block mb-1">Nama Pemilik Proyek (Owner) *</label>
            <input
              type="text"
              required
              value={editOwner}
              onChange={(e) => setEditOwner(e.target.value)}
              className="w-full bg-white border-2 border-[#0F172A] rounded-xl px-3 py-2 text-xs font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wide block mb-1">Budget Total Proyek (Rupiah) *</label>
            <input
              type="number"
              required
              value={editBudget}
              onChange={(e) => setEditBudget(Number(e.target.value))}
              className="w-full bg-white border-2 border-[#0F172A] rounded-xl px-3 py-2 text-xs font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wide block mb-1">Tanggal Mulai</label>
              <input
                type="date"
                value={editStartDate}
                onChange={(e) => setEditStartDate(e.target.value)}
                className="w-full bg-white border-2 border-[#0F172A] rounded-xl px-3 py-2 text-xs font-bold text-[#0F172A] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wide block mb-1">Target Selesai</label>
              <input
                type="date"
                value={editTargetDate}
                onChange={(e) => setEditTargetDate(e.target.value)}
                className="w-full bg-white border-2 border-[#0F172A] rounded-xl px-3 py-2 text-xs font-bold text-[#0F172A] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wide block mb-1">Catatan / Deskripsi Proyek</label>
            <textarea
              rows={2}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Deskripsi singkat proyek..."
              className="w-full bg-white border-2 border-[#0F172A] rounded-xl px-3 py-2 text-xs font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="ghost" className="flex-1" type="button" onClick={() => setShowEditModal(false)}>Batal</Button>
            <Button variant="secondary" className="flex-1" type="submit">Simpan Perubahan</Button>
          </div>
        </form>
      </Modal>

      {/* SECURITY CONFIRMATION DELETE MODAL */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="🚨 HAPUS PROYEK?">
        <div className="space-y-4 select-none">
          <div className="p-3.5 bg-red-50 border-2 border-red-500 rounded-xl">
            <p className="text-xs font-extrabold text-red-700 leading-normal uppercase">
              Semua data proyek seperti keuangan, material, tukang, upah, dan laporan terkait akan ikut dihapus.
            </p>
          </div>

          {projectToDelete && (
            <div className="text-xs font-bold text-[#0F172A]">
              Proyek yang akan dihapus: <span className="font-chunky text-red-600 block uppercase mt-1">{projectToDelete.name}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wide block">
              Ketik <span className="text-red-600 font-extrabold">HAPUS</span> untuk mengonfirmasi:
            </label>
            <input
              type="text"
              value={typedConfirm}
              onChange={(e) => setTypedConfirm(e.target.value)}
              placeholder="Ketik HAPUS"
              className="w-full bg-white border-2 border-[#0F172A] rounded-xl px-3 py-2.5 text-xs font-extrabold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-red-500 uppercase tracking-widest text-center"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="ghost" className="flex-1" onClick={() => setShowDeleteModal(false)}>Batal</Button>
            <button
              onClick={handleConfirmDelete}
              disabled={typedConfirm !== 'HAPUS'}
              className="flex-1 py-2.5 rounded-xl border-2 border-[#0F172A] bg-red-600 hover:bg-red-700 disabled:bg-slate-100 disabled:border-slate-300 disabled:text-slate-400 font-extrabold text-xs text-white uppercase text-center transition-all cursor-pointer shadow-neo-sm"
            >
              Hapus Permanen
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};


// --- VIEW 7: NOTIFIKASI SYSTEM VIEW ---
export const NotificationsView: React.FC = () => {
  const { state, markNotificationsRead } = useApp();
  const activeProj = state.projects.find(p => p.id === state.activeProjectId);

  React.useEffect(() => {
    // Automatically read when viewing
    markNotificationsRead();
  }, []);

  if (!activeProj) {
    return <div className="text-center py-8">Pilih proyek aktif terlebih dahulu.</div>;
  }

  const list = state.notifications.filter(n => n.projectId === activeProj.id);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center select-none">
        <span className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider">
          NOTIFIKASI & ALARM LAPANGAN
        </span>
        <span className="text-xs font-bold text-[#64748B] uppercase">Proyek: {activeProj.name}</span>
      </div>

      <div className="space-y-3">
        {list.map((n) => (
          <Card
            key={n.id}
            className={`p-4 transition-all ${
              n.type === 'WARNING'
                ? 'bg-[#FEE2E2] border-red-500'
                : n.type === 'ALERT'
                ? 'bg-[#FFEDD5] border-orange-500'
                : 'bg-white'
            }`}
          >
            <div className="flex gap-3 items-start select-none">
              <span className="text-lg">
                {n.type === 'WARNING' ? '🚨' : n.type === 'ALERT' ? '⚠️' : 'ℹ️'}
              </span>
              <div className="flex-1">
                <p className="text-xs font-extrabold text-[#0F172A] leading-normal">{n.message}</p>
                <p className="text-[9px] text-[#64748B] font-bold uppercase tracking-wider mt-1">
                  ⏱️ {formatTanggalWaktu(n.date)}
                </p>
              </div>
            </div>
          </Card>
        ))}

        {list.length === 0 && (
          <div className="text-center py-12 bg-white border-2 border-dashed border-[#0F172A]/20 rounded-2xl p-6 select-none">
            <p className="text-xs font-bold text-[#64748B] uppercase">Belum ada notifikasi baru untuk proyek ini.</p>
          </div>
        )}
      </div>
    </div>
  );
};


// --- VIEW 8: SETTINGS & BACKUP ENGINE ---
export const SettingsView: React.FC = () => {
  const { state, clearAllState, logoutUser, updateCurrentUser, restoreAllState } = useApp();
  const [sheetsConfig, setSheetsConfig] = useState<GoogleSheetsConnection>(loadGoogleSheetsConnection);
  const [syncingSheets, setSyncingSheets] = useState(false);

  // Profile Form States
  const [profileName, setProfileName] = useState(state.currentUser?.name || 'PAUJI');
  const [profilePhone, setProfilePhone] = useState(state.currentUser?.phone || '0812-3456-7890');
  const [profileEmail, setProfileEmail] = useState(state.currentUser?.email || 'pauji.mandor@dataku.com');
  const [profileAddress, setProfileAddress] = useState(state.currentUser?.address || 'Jl. Raya Konstruksi No. 45, Jakarta');
  const [profileCompany, setProfileCompany] = useState(state.currentUser?.company || 'PT Mandor Bangunan Sejahtera');
  const [profileJobTitle, setProfileJobTitle] = useState(state.currentUser?.jobTitle || 'Mandor Utama Proyek');

  // Supabase Profile Avatar States
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string>(state.currentUser?.photo || '');
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarDeleting, setAvatarDeleting] = useState(false);

  // Hidden Input References
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const galleryInputRef = React.useRef<HTMLInputElement>(null);

  // Security Update States
  const [pinCurrent, setPinCurrent] = useState('');
  const [pinNew, setPinNew] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');

  // Notification Configuration States
  const [notifDaily, setNotifDaily] = useState(true);
  const [notifBalance, setNotifBalance] = useState(true);
  const [notifMaterial, setNotifMaterial] = useState(true);

  // Global Print & Export Settings States
  const { printSettings, updatePrintSettings, savePrintSettings } = useApp();
  const [isSavingPrintSettings, setIsSavingPrintSettings] = useState(false);
  const [printSettingsSaved, setPrintSettingsSaved] = useState(false);

  // Handler for saving
  const handleSavePrintSettings = async () => {
    setIsSavingPrintSettings(true);
    try {
      await savePrintSettings(printSettings);
      setPrintSettingsSaved(true);
      setTimeout(() => setPrintSettingsSaved(false), 3000);
    } catch (err) {
      console.error('Error saving print settings:', err);
    } finally {
      setIsSavingPrintSettings(false);
    }
  };
  
  // Handler for updates
  const setPrintSettings = updatePrintSettings;

  // File restore helper reference
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleSheetsConnect = () => {
    setSyncingSheets(true);
    setTimeout(() => {
      if (sheetsConfig.google_sheets_connected) {
        const updated = disconnectGoogleSheets();
        setSheetsConfig(updated);
      } else {
        const updated = connectGoogleSheets();
        setSheetsConfig(updated);
      }
      setSyncingSheets(false);
    }, 600);
  };

  const handleManualSyncSheets = async () => {
    if (!sheetsConfig.google_sheets_connected) return;
    setSyncingSheets(true);
    try {
      const activeProj = state.projects.find(p => p.id === state.activeProjectId);
      const res = await syncReportToGoogleSheets({
        projectName: activeProj?.name || 'Proyek DATAKU',
        exportDate: new Date().toISOString()
      });
      setSheetsConfig(loadGoogleSheetsConnection());
      alert(res.message);
    } catch (err) {
      alert('Gagal sinkronisasi data ke Google Sheets.');
    } finally {
      setSyncingSheets(false);
    }
  };

  const handleFileSelection = (file: File) => {
    // 10. VALIDASI
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      alert('Format foto harus JPG, PNG, atau WEBP.');
      return;
    }
    const maxSize = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxSize) {
      alert('Ukuran foto maksimal 5 MB.');
      return;
    }

    // 8. PREVIEW
    setSelectedAvatarFile(file);
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
  };

  const handleCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelection(file);
    }
  };

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelection(file);
    }
  };

  // 12. EDIT PROFIL & 4. UPLOAD & 5. URL FOTO & 7. GANTI FOTO
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentUser_id = (state.currentUser?.id && isUuidFormat(state.currentUser?.id))
      ? state.currentUser.id
      : ((await getMandorUuid(state.currentUser?.name)) || '');
    let finalPhotoUrl = currentAvatarUrl;

    if (isSupabaseConfigured) {
      setAvatarUploading(true);
      try {
        if (selectedAvatarFile) {
          // 3. NAMA FILE
          const mandorIdClean = currentUser_id.replace('MDR-', 'UUID-');
          const timestamp = Math.floor(Date.now() / 1000);
          const randomStr = Math.random().toString(36).substring(2, 7);
          const extension = selectedAvatarFile.name.split('.').pop() || 'jpg';
          const filePath = `profiles/${mandorIdClean}/${timestamp}-${randomStr}.${extension}`;

          // 4. UPLOAD
          const { error: uploadError } = await supabase.storage
            .from('dataku-profiles')
            .upload(filePath, selectedAvatarFile, {
              upsert: false,
              contentType: selectedAvatarFile.type
            });

          if (uploadError) {
            console.error('Upload error detail:', uploadError);
            throw new Error('Foto gagal diunggah. Silakan coba lagi.');
          }

          // 5. URL FOTO
          const { data: { publicUrl } } = supabase.storage
            .from('dataku-profiles')
            .getPublicUrl(filePath);

          finalPhotoUrl = publicUrl;

          // RPC or direct table update
          try {
            const { error: rpcError } = await supabase.rpc('update_mandor_avatar', {
              p_mandor_id: currentUser_id,
              p_avatar_url: publicUrl
            });
            if (rpcError) {
              // Direct table update fallback
              await supabase
                .from('mandors')
                .update({ avatar_url: publicUrl })
                .eq('id', currentUser_id);
            }
          } catch (rpcErr) {
            await supabase
              .from('mandors')
              .update({ avatar_url: publicUrl })
              .eq('id', currentUser_id);
          }

          // 7. GANTI FOTO (Delete old file from Storage if exists and was uploaded to Supabase)
          if (currentAvatarUrl && currentAvatarUrl.includes('dataku-profiles')) {
            try {
              const urlParts = currentAvatarUrl.split('/dataku-profiles/');
              if (urlParts.length > 1) {
                const oldPath = decodeURIComponent(urlParts[1]);
                await supabase.storage.from('dataku-profiles').remove([oldPath]);
              }
            } catch (delError) {
              console.error('Failed to delete old avatar:', delError);
            }
          }
        }

        // Save metadata fields (full_name, phone, email, company_name, job_title, address)
        const mandorData = {
          full_name: profileName,
          phone: profilePhone,
          email: profileEmail,
          company_name: profileCompany,
          job_title: profileJobTitle,
          address: profileAddress,
          office_address: profileAddress,
          avatar_url: finalPhotoUrl
        };

        let { error: dbError } = await supabase
          .from('mandors')
          .update(mandorData)
          .eq('id', currentUser_id);

        if (dbError) {
          // Fallback profiles update if mandors doesn't exist yet
          await supabase
            .from('profiles')
            .update({
              full_name: profileName,
              phone: profilePhone,
              email: profileEmail,
              avatar_url: finalPhotoUrl
            })
            .eq('id', currentUser_id);
        }

        setCurrentAvatarUrl(finalPhotoUrl);
        setAvatarPreview(null);
        setSelectedAvatarFile(null);

        // Update local app context
        updateCurrentUser({
          id: currentUser_id,
          name: profileName,
          phone: profilePhone,
          email: profileEmail,
          address: profileAddress,
          company: profileCompany,
          jobTitle: profileJobTitle,
          photo: finalPhotoUrl
        });

        // 16. SUCCESS TOAST
        alert('✓ Foto profil berhasil diperbarui.');
      } catch (err: any) {
        console.error('Profile save failure:', err);
        // 17. ERROR HANDLING
        alert(err.message === 'Foto gagal diunggah. Silakan coba lagi.' ? err.message : 'Terjadi masalah saat mengunggah foto.');
      } finally {
        setAvatarUploading(false);
      }
    } else {
      // Local localStorage mode
      if (selectedAvatarFile && avatarPreview) {
        finalPhotoUrl = avatarPreview;
      }
      setCurrentAvatarUrl(finalPhotoUrl);
      setAvatarPreview(null);
      setSelectedAvatarFile(null);

      updateCurrentUser({
        id: currentUser_id,
        name: profileName,
        phone: profilePhone,
        email: profileEmail,
        address: profileAddress,
        company: profileCompany,
        jobTitle: profileJobTitle,
        photo: finalPhotoUrl
      });
      alert('✓ Foto profil berhasil diperbarui.');
    }
  };

  // 6. HAPUS FOTO
  const handleHapusFoto = async () => {
    // Dialog check
    if (!window.confirm("Hapus foto profil?\n\nFoto profil akan dihapus dari akun Anda.")) {
      return;
    }

    const currentUser_id = (state.currentUser?.id && isUuidFormat(state.currentUser?.id))
      ? state.currentUser.id
      : ((await getMandorUuid(state.currentUser?.name)) || '');

    if (isSupabaseConfigured) {
      setAvatarDeleting(true);
      try {
        // 1. Cari file avatar lama & hapus dari bucket dataku-profiles
        if (currentAvatarUrl && currentAvatarUrl.includes('dataku-profiles')) {
          try {
            const urlParts = currentAvatarUrl.split('/dataku-profiles/');
            if (urlParts.length > 1) {
              const oldPath = decodeURIComponent(urlParts[1]);
              await supabase.storage.from('dataku-profiles').remove([oldPath]);
            }
          } catch (delError) {
            console.error('Failed to delete avatar file from storage:', delError);
          }
        }

        // 2. Update avatar_url = null
        let { error: dbError } = await supabase
          .from('mandors')
          .update({ avatar_url: null })
          .eq('id', currentUser_id);

        if (dbError) {
          await supabase
            .from('profiles')
            .update({ avatar_url: null })
            .eq('id', currentUser_id);
        }

        setCurrentAvatarUrl('');
        setAvatarPreview(null);
        setSelectedAvatarFile(null);

        // 4. Refresh profile locally
        updateCurrentUser({
          id: currentUser_id,
          name: profileName,
          phone: profilePhone,
          email: profileEmail,
          address: profileAddress,
          company: profileCompany,
          jobTitle: profileJobTitle,
          photo: ''
        });

        alert('✓ Foto profil berhasil dihapus.');
      } catch (err) {
        console.error('Error during photo delete:', err);
        alert('Terjadi masalah saat menghapus foto.');
      } finally {
        setAvatarDeleting(false);
      }
    } else {
      // Local mode
      setCurrentAvatarUrl('');
      setAvatarPreview(null);
      setSelectedAvatarFile(null);

      updateCurrentUser({
        id: currentUser_id,
        name: profileName,
        phone: profilePhone,
        email: profileEmail,
        address: profileAddress,
        company: profileCompany,
        jobTitle: profileJobTitle,
        photo: ''
      });
      alert('✓ Foto profil berhasil dihapus.');
    }
  };

  const handleSecuritySave = (e: React.FormEvent) => {
    e.preventDefault();
    // Validate PIN changing logic
    const savedPin = localStorage.getItem('dataku_pin') || '1999';
    if (pinCurrent !== savedPin) {
      alert('PIN Lama salah! Mohon masukkan PIN lama dengan benar.');
      return;
    }
    if (pinNew !== pinConfirm) {
      alert('Konfirmasi PIN Baru tidak cocok!');
      return;
    }
    if (pinNew.length < 4) {
      alert('PIN harus terdiri dari minimal 4 angka numerik!');
      return;
    }

    // Save
    localStorage.setItem('dataku_pin', pinNew);
    alert('Sukses mengubah PIN login! Silakan gunakan PIN baru pada saat login berikutnya.');
    setPinCurrent('');
    setPinNew('');
    setPinConfirm('');
  };

  // Backup DATAKU state as raw JSON file download
  const handleBackupData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `DATAKU_BACKUP_DATABASE_${new Date().toISOString().substring(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
  };

  // Restore DATAKU state from uploaded JSON file
  const handleRestoreData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        // Verify minimum valid keys for safety
        if (parsed && typeof parsed === 'object' && 'projects' in parsed && 'transactions' in parsed) {
          restoreAllState(parsed);
          alert('SUKSES RESTORE DATA: Seluruh data proyek, transaksi, tukang, dan material berhasil dipulihkan dari file backup!');
          window.location.reload();
        } else {
          alert('RESTORE GAGAL: Format file backup DATAKU tidak valid!');
        }
      } catch (err) {
        alert('RESTORE GAGAL: Error membaca file JSON backup!');
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = () => {
    if (window.confirm('PERINGATAN: Ini akan menghapus seluruh data kustom dan mereset sistem DATAKU ke data demo awal. Lanjutkan?')) {
      clearAllState();
      window.location.reload();
    }
  };



  return (
    <div className="space-y-6">
      {/* 0. PENGATURAN IDENTITAS APLIKASI & LOGO (FRONTEND ONLY) */}
      <IdentitySettingsSection />

      {/* 1. EDIT PROFIL MANDOR & FOTO */}
      <Card className="p-5 select-none">
        <span className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider block mb-3">
          📝 DOKUMEN PROFIL MANDOR
        </span>

        <form onSubmit={handleProfileSave} className="space-y-5">
          {/* Foto Upload & Camera Block */}
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#FAF8FF] border-2 border-[#0F172A] rounded-xl p-4">
            {/* Hidden Input Pickers */}
            <input
              type="file"
              accept="image/*"
              capture="user"
              ref={cameraInputRef}
              className="hidden"
              onChange={handleCameraChange}
            />
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              ref={galleryInputRef}
              className="hidden"
              onChange={handleGalleryChange}
            />

            <div className="w-20 h-20 rounded-xl border-3 border-[#0F172A] overflow-hidden bg-amber-50 shadow-neo shrink-0 relative flex items-center justify-center select-none">
              {avatarPreview || currentAvatarUrl ? (
                <img
                  src={avatarPreview || currentAvatarUrl}
                  alt="Foto Profil"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-center">
                  <span className="text-3xl text-slate-400">👷</span>
                </div>
              )}
              {(avatarPreview || currentAvatarUrl) && (
                <button
                  type="button"
                  disabled={avatarUploading || avatarDeleting}
                  onClick={handleHapusFoto}
                  className="absolute bottom-0 left-0 right-0 py-0.5 bg-red-600 border-t border-[#0F172A] text-[9px] text-white font-extrabold text-center hover:bg-red-700 cursor-pointer disabled:opacity-50"
                >
                  {avatarDeleting ? 'Menghapus...' : 'Hapus Foto'}
                </button>
              )}
            </div>
            
            <div className="space-y-1.5 text-center sm:text-left">
              <p className="text-xs font-extrabold text-[#0F172A] uppercase leading-none">Foto Profil Mandor</p>
              <p className="text-[10px] text-[#64748B] font-bold uppercase tracking-wide">
                Gunakan kamera HP atau upload file JPG / PNG / WEBP
              </p>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 pt-1">
                <button
                  type="button"
                  disabled={avatarUploading || avatarDeleting}
                  onClick={() => cameraInputRef.current?.click()}
                  className="px-2.5 py-1.5 bg-white border border-[#0F172A] hover:bg-slate-50 text-[10px] font-extrabold text-[#0F172A] rounded-lg transition-all cursor-pointer shadow-neo-sm disabled:opacity-50"
                >
                  {avatarUploading ? 'Mengunggah...' : '📷 Ambil Foto HP'}
                </button>
                <button
                  type="button"
                  disabled={avatarUploading || avatarDeleting}
                  onClick={() => galleryInputRef.current?.click()}
                  className="px-2.5 py-1.5 bg-white border border-[#0F172A] hover:bg-slate-50 text-[10px] font-extrabold text-[#0F172A] rounded-lg transition-all cursor-pointer shadow-neo-sm disabled:opacity-50"
                >
                  {avatarUploading ? 'Mengunggah...' : '📁 Unggah Galeri'}
                </button>
              </div>
            </div>
          </div>

          {/* Granular Profile Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wide block mb-1">Nama Lengkap Mandor *</label>
              <input
                type="text"
                required
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full bg-white border-2 border-[#0F172A] rounded-xl px-3 py-2 text-xs font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0284C7] shadow-neo-sm"
              />
            </div>
            <div>
              <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wide block mb-1">Nomor HP Lapangan *</label>
              <input
                type="text"
                required
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                className="w-full bg-white border-2 border-[#0F172A] rounded-xl px-3 py-2 text-xs font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0284C7] shadow-neo-sm"
              />
            </div>
            <div>
              <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wide block mb-1">Alamat Email Kontak</label>
              <input
                type="email"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                className="w-full bg-white border-2 border-[#0F172A] rounded-xl px-3 py-2 text-xs font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0284C7] shadow-neo-sm"
              />
            </div>
            <div>
              <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wide block mb-1">Nama Perusahaan / CV</label>
              <input
                type="text"
                value={profileCompany}
                onChange={(e) => setProfileCompany(e.target.value)}
                className="w-full bg-white border-2 border-[#0F172A] rounded-xl px-3 py-2 text-xs font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0284C7] shadow-neo-sm"
              />
            </div>
            <div>
              <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wide block mb-1">Jabatan Kontraktor</label>
              <input
                type="text"
                value={profileJobTitle}
                onChange={(e) => setProfileJobTitle(e.target.value)}
                className="w-full bg-white border-2 border-[#0F172A] rounded-xl px-3 py-2 text-xs font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0284C7] shadow-neo-sm"
              />
            </div>
            <div>
              <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wide block mb-1">Alamat Kantor Lapangan</label>
              <input
                type="text"
                value={profileAddress}
                onChange={(e) => setProfileAddress(e.target.value)}
                className="w-full bg-white border-2 border-[#0F172A] rounded-xl px-3 py-2 text-xs font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0284C7] shadow-neo-sm"
              />
            </div>
          </div>

          <div className="pt-2">
            <Button variant="secondary" type="submit">
              Simpan Perubahan Profil
            </Button>
          </div>
        </form>
      </Card>

      {/* 2. SECURITY SETTINGS - CHANGE PASSWORD / PIN */}
      <Card className="p-5 select-none">
        <span className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider block mb-3">
          🔒 KEAMANAN AKUN MANDOR
        </span>

        <form onSubmit={handleSecuritySave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wide block mb-1">PIN Lama Mandor *</label>
              <input
                type="password"
                maxLength={6}
                required
                placeholder="Masukkan PIN saat ini"
                value={pinCurrent}
                onChange={(e) => setPinCurrent(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-white border-2 border-[#0F172A] rounded-xl px-3 py-2 text-xs font-bold text-[#0F172A] focus:outline-none shadow-neo-sm font-mono tracking-widest text-center"
              />
            </div>
            <div>
              <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wide block mb-1">PIN Baru (4-6 Angka) *</label>
              <input
                type="password"
                maxLength={6}
                required
                placeholder="Masukkan PIN baru"
                value={pinNew}
                onChange={(e) => setPinNew(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-white border-2 border-[#0F172A] rounded-xl px-3 py-2 text-xs font-bold text-[#0F172A] focus:outline-none shadow-neo-sm font-mono tracking-widest text-center"
              />
            </div>
            <div>
              <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wide block mb-1">Konfirmasi PIN Baru *</label>
              <input
                type="password"
                maxLength={6}
                required
                placeholder="Ketik ulang PIN baru"
                value={pinConfirm}
                onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-white border-2 border-[#0F172A] rounded-xl px-3 py-2 text-xs font-bold text-[#0F172A] focus:outline-none shadow-neo-sm font-mono tracking-widest text-center"
              />
            </div>
          </div>

          <div className="pt-2">
            <Button variant="secondary" type="submit">
              Perbarui PIN Keamanan
            </Button>
          </div>
        </form>
      </Card>

      {/* 3. PENGATURAN NOTIFIKASI */}
      <Card className="p-5 select-none">
        <span className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider block mb-3">
          🔔 PENGATURAN ALARM & NOTIFIKASI
        </span>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3.5 bg-white border-2 border-[#0F172A]/10 rounded-xl hover:border-[#0F172A] transition-all">
            <div>
              <p className="text-xs font-extrabold text-[#0F172A] uppercase">Pengingat Laporan Harian (17:00 WIB)</p>
              <p className="text-[10px] text-[#64748B] font-bold mt-1 uppercase">Mengingatkan untuk merekap cuaca, pekerja, dan progress konstruksi harian.</p>
            </div>
            <input
              type="checkbox"
              checked={notifDaily}
              onChange={() => setNotifDaily(!notifDaily)}
              className="w-5 h-5 rounded border-[#0F172A] text-[#0284C7] focus:ring-[#0284C7] cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 bg-white border-2 border-[#0F172A]/10 rounded-xl hover:border-[#0F172A] transition-all">
            <div>
              <p className="text-xs font-extrabold text-[#0F172A] uppercase">Alert Minimum Sisa Kas Proyek</p>
              <p className="text-[10px] text-[#64748B] font-bold mt-1 uppercase">Pemberitahuan jika sisa dana kas proyek kritis di bawah Rp 5.000.000.</p>
            </div>
            <input
              type="checkbox"
              checked={notifBalance}
              onChange={() => setNotifBalance(!notifBalance)}
              className="w-5 h-5 rounded border-[#0F172A] text-[#0284C7] focus:ring-[#0284C7] cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 bg-white border-2 border-[#0F172A]/10 rounded-xl hover:border-[#0F172A] transition-all">
            <div>
              <p className="text-xs font-extrabold text-[#0F172A] uppercase">Alert Stok Material Menipis</p>
              <p className="text-[10px] text-[#64748B] font-bold mt-1 uppercase">Pemberitahuan otomatis jika persediaan barang logistik tersisa kurang dari 5 unit.</p>
            </div>
            <input
              type="checkbox"
              checked={notifMaterial}
              onChange={() => setNotifMaterial(!notifMaterial)}
              className="w-5 h-5 rounded border-[#0F172A] text-[#0284C7] focus:ring-[#0284C7] cursor-pointer"
            />
          </div>
        </div>
      </Card>

      {/* 4. PENGATURAN DOKUMEN & FORMAT CETAK */}
      <Card className="p-5 select-none bg-[#FAF8FF]">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-[#0F172A]/10 pb-3 mb-4">
          <div>
            <span className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider block">
              🖨️ PENGATURAN DOKUMEN & FORMAT CETAK
            </span>
            <h4 className="text-sm font-chunky text-[#0F172A] uppercase mt-0.5">
              Standar Ukuran Kertas & Export Gambar
            </h4>
          </div>
          <button
            onClick={handleSavePrintSettings}
            disabled={isSavingPrintSettings}
            className="px-3.5 py-2 bg-[#0284C7] hover:bg-[#0369A1] text-white font-extrabold text-xs rounded-xl border-2 border-[#0F172A] shadow-neo-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
          >
            {isSavingPrintSettings ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Menyimpan...
              </>
            ) : printSettingsSaved ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" /> Tersimpan!
              </>
            ) : (
              <>
                <Printer className="w-3.5 h-3.5" /> Simpan Format Dokumen
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-[#475569] font-medium leading-relaxed mb-4">
          Atur format standar cetak PDF, ukuran kertas (A4 / F4 Folio), orientasi, serta format gambar (JPEG / PNG) untuk seluruh modul cetak DATAKU.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Default Paper Size */}
          <div className="p-4 bg-white border-2 border-[#0F172A] rounded-xl shadow-neo-sm space-y-2">
            <label className="text-xs font-black text-[#0F172A] uppercase flex items-center justify-between">
              <span>1. Ukuran Kertas Default</span>
              <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                {printSettings.defaultPaperSize} ({printSettings.defaultPaperSize === 'A4' ? '210 x 297 mm' : '215 x 330 mm'})
              </span>
            </label>
            <p className="text-[10px] text-[#64748B] font-bold uppercase">
              Pilih ukuran standar yang digunakan pada printer lapangan.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPrintSettings(prev => ({ ...prev, defaultPaperSize: 'A4' }))}
                className={`py-2 px-3 rounded-xl border-2 text-xs font-extrabold cursor-pointer transition-all ${
                  printSettings.defaultPaperSize === 'A4'
                    ? 'bg-[#0284C7] text-white border-[#0F172A] shadow-neo-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                📄 A4 (Standard ISO)
              </button>
              <button
                type="button"
                onClick={() => setPrintSettings(prev => ({ ...prev, defaultPaperSize: 'F4' }))}
                className={`py-2 px-3 rounded-xl border-2 text-xs font-extrabold cursor-pointer transition-all ${
                  printSettings.defaultPaperSize === 'F4'
                    ? 'bg-[#0284C7] text-white border-[#0F172A] shadow-neo-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                📑 F4 / Folio (Indonesia)
              </button>
            </div>
          </div>

          {/* Default Orientation */}
          <div className="p-4 bg-white border-2 border-[#0F172A] rounded-xl shadow-neo-sm space-y-2">
            <label className="text-xs font-black text-[#0F172A] uppercase flex items-center justify-between">
              <span>2. Orientasi Cetak Default</span>
              <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                {printSettings.defaultOrientation}
              </span>
            </label>
            <p className="text-[10px] text-[#64748B] font-bold uppercase">
              Otomatis menyesuaikan dengan jenis dan lebar kolom laporan.
            </p>
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {(['Otomatis', 'Portrait', 'Landscape'] as PageOrientation[]).map((ori) => (
                <button
                  key={ori}
                  type="button"
                  onClick={() => setPrintSettings(prev => ({ ...prev, defaultOrientation: ori }))}
                  className={`py-2 px-2 rounded-xl border-2 text-[11px] font-extrabold cursor-pointer transition-all ${
                    printSettings.defaultOrientation === ori
                      ? 'bg-[#0284C7] text-white border-[#0F172A] shadow-neo-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {ori === 'Otomatis' ? '⚡ Otomatis' : ori === 'Portrait' ? '↕️ Portrait' : '↔️ Landscape'}
                </button>
              ))}
            </div>
          </div>

          {/* Auto Fit Checkbox */}
          <div className="p-4 bg-white border-2 border-[#0F172A] rounded-xl shadow-neo-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-black text-[#0F172A] uppercase">3. Auto Fit Margin & Skala</p>
              <p className="text-[10px] text-[#64748B] font-bold mt-1 uppercase">
                Menyesuaikan tata letak agar tabel rapi dan pas tanpa terpotong di tepi kertas.
              </p>
            </div>
            <input
              type="checkbox"
              checked={printSettings.autoFitContent}
              onChange={() => setPrintSettings(prev => ({ ...prev, autoFitContent: !prev.autoFitContent }))}
              className="w-5 h-5 rounded border-[#0F172A] text-[#0284C7] focus:ring-[#0284C7] cursor-pointer"
            />
          </div>

          {/* Default Image Export Format */}
          <div className="p-4 bg-white border-2 border-[#0F172A] rounded-xl shadow-neo-sm space-y-2">
            <label className="text-xs font-black text-[#0F172A] uppercase flex items-center justify-between">
              <span>4. Format Gambar Export</span>
              <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                {printSettings.defaultImageFormat}
              </span>
            </label>
            <p className="text-[10px] text-[#64748B] font-bold uppercase">
              Format saat men-download laporan sebagai gambar WhatsApp atau arsip ZIP.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPrintSettings(prev => ({ ...prev, defaultImageFormat: 'JPEG' }))}
                className={`py-2 px-3 rounded-xl border-2 text-xs font-extrabold cursor-pointer transition-all ${
                  printSettings.defaultImageFormat === 'JPEG'
                    ? 'bg-purple-600 text-white border-[#0F172A] shadow-neo-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                🖼️ JPEG (Ukuran Kecil)
              </button>
              <button
                type="button"
                onClick={() => setPrintSettings(prev => ({ ...prev, defaultImageFormat: 'PNG' }))}
                className={`py-2 px-3 rounded-xl border-2 text-xs font-extrabold cursor-pointer transition-all ${
                  printSettings.defaultImageFormat === 'PNG'
                    ? 'bg-purple-600 text-white border-[#0F172A] shadow-neo-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                💎 PNG (Kualitas Tajam)
              </button>
            </div>
          </div>
        </div>

        {/* Per Module Overrides */}
        <div className="mt-4 pt-4 border-t border-[#0F172A]/10">
          <span className="text-[10px] font-black text-[#0F172A] uppercase tracking-wider block mb-2">
            Preset Dokumen per Modul
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-center">
              <span className="text-[10px] font-black text-slate-800 block uppercase">Rekap Keuangan</span>
              <span className="text-[9px] font-bold text-sky-700 uppercase mt-0.5 block">{printSettings.perDocumentSettings.rekapKeuangan.paperSize} • {printSettings.perDocumentSettings.rekapKeuangan.orientation}</span>
            </div>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-center">
              <span className="text-[10px] font-black text-slate-800 block uppercase">Alur Keuangan</span>
              <span className="text-[9px] font-bold text-sky-700 uppercase mt-0.5 block">{printSettings.perDocumentSettings.rekapKeuangan.paperSize} • {printSettings.perDocumentSettings.rekapKeuangan.orientation}</span>
            </div>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-center">
              <span className="text-[10px] font-black text-slate-800 block uppercase">Upah Tukang</span>
              <span className="text-[9px] font-bold text-sky-700 uppercase mt-0.5 block">{printSettings.perDocumentSettings.rekapUpah.paperSize} • {printSettings.perDocumentSettings.rekapUpah.orientation}</span>
            </div>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-center">
              <span className="text-[10px] font-black text-slate-800 block uppercase">Laporan Harian</span>
              <span className="text-[9px] font-bold text-sky-700 uppercase mt-0.5 block">{printSettings.perDocumentSettings.laporanProyek.paperSize} • {printSettings.perDocumentSettings.laporanProyek.orientation}</span>
            </div>
          </div>
        </div>
      </Card>


      {/* 4. BACKUP & RESTORE DATABASE JSON */}
      <Card className="p-5 select-none bg-[#F8FAFC]">
        <span className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider block mb-3">
          💾 BACKUP & RESTORE DATA LAPANGAN
        </span>

        <p className="text-xs text-[#475569] font-medium leading-relaxed mb-4">
          Ekspor seluruh data transaksi, tukang, material, dan konfigurasi proyek Anda ke dalam file JSON lokal. File ini dapat Anda simpan secara pribadi dan di-restore kapan saja untuk memulihkan keadaan sistem DATAKU.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-white border-2 border-[#0F172A] rounded-xl p-4">
          {/* Backup Action */}
          <div className="space-y-2 border-b sm:border-b-0 sm:border-r border-[#0F172A]/10 pb-4 sm:pb-0 sm:pr-4">
            <h5 className="text-xs font-extrabold text-[#0F172A] uppercase leading-none">Unduh Backup Mandiri</h5>
            <p className="text-[9px] text-[#64748B] font-bold uppercase mt-1">Mengunduh database lokal dalam format JSON.</p>
            <button
              onClick={handleBackupData}
              className="w-full py-2.5 bg-[#FAF8FF] hover:bg-[#F3E8FF] border-2 border-[#0F172A] rounded-xl font-bold text-xs text-blue-700 transition-all cursor-pointer shadow-neo-sm flex items-center justify-center gap-1.5"
            >
              📥 Download Backup (.JSON)
            </button>
          </div>

          {/* Restore Action */}
          <div className="space-y-2 pl-0 sm:pl-2">
            <h5 className="text-xs font-extrabold text-[#0F172A] uppercase leading-none">Pulihkan / Restore Data</h5>
            <p className="text-[9px] text-[#64748B] font-bold uppercase mt-1">Pilih file backup (.json) untuk memulihkan data.</p>
            
            <input
              type="file"
              accept=".json"
              ref={fileInputRef}
              onChange={handleRestoreData}
              className="hidden"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 bg-[#ECFDF5] hover:bg-[#D1FAE5] border-2 border-[#0F172A] rounded-xl font-bold text-xs text-emerald-800 transition-all cursor-pointer shadow-neo-sm flex items-center justify-center gap-1.5"
            >
              📤 Unggah & Pulihkan State (.JSON)
            </button>
          </div>
        </div>
      </Card>



      {/* 5. Google Sheets Sync System (Workspace integration mockup) */}
      <Card>
        <span className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider block mb-2 select-none">
          INTEGRASI GOOGLE WORKSPACE
        </span>
        <h3 className="text-base font-chunky text-[#0F172A] uppercase mb-1.5 select-none">
          Backup Otomatis Google Sheets
        </h3>
        <p className="text-xs text-[#475569] font-medium leading-relaxed mb-4 select-none">
          DATAKU mendukung ekspor real-time seluruh laporan harian, mutasi keuangan, dan inventory ke file Google Sheets pribadi Anda di Google Drive.
        </p>

        <div className="bg-[#FAF8FF] border-2 border-[#0F172A] rounded-xl p-4 space-y-4 shadow-neo-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 border-2 border-[#0F172A] flex items-center justify-center text-xl shadow-neo-sm">
                📊
              </div>
              <div>
                <p className="text-xs font-extrabold text-[#0F172A] uppercase leading-none">Google Sheets Connector</p>
                <p className="text-[10px] text-[#64748B] font-bold uppercase mt-1">
                  Status: {sheetsConfig.google_sheets_connected ? '🟢 Tersambung & Aktif' : '⚪ Belum Terhubung'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {sheetsConfig.google_sheets_connected && (
                <button
                  type="button"
                  onClick={handleManualSyncSheets}
                  disabled={syncingSheets}
                  className="px-3 py-1.5 rounded-lg border-2 border-[#0F172A] bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-neo-sm transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {syncingSheets ? 'Menyinkronkan...' : '🔄 Sinkron Sekarang'}
                </button>
              )}
              <Button
                variant={sheetsConfig.google_sheets_connected ? 'ghost' : 'secondary'}
                size="sm"
                onClick={handleSheetsConnect}
                disabled={syncingSheets}
              >
                {syncingSheets ? 'Memproses...' : sheetsConfig.google_sheets_connected ? 'Putuskan' : 'Hubungkan'}
              </Button>
            </div>
          </div>

          {sheetsConfig.google_sheets_connected ? (
            <div className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-white border border-[#0F172A]/20 rounded-xl p-3">
                <div>
                  <span className="text-[9px] text-[#64748B] font-extrabold uppercase block">Lembar Kerja Target</span>
                  <span className="font-bold text-[#0F172A]">{sheetsConfig.google_sheets_document_name}</span>
                </div>
                <div>
                  <span className="text-[9px] text-[#64748B] font-extrabold uppercase block">Jadwal Auto-Backup</span>
                  <span className="font-bold text-emerald-700">{sheetsConfig.google_sheets_backup_schedule}</span>
                </div>
                <div className="sm:col-span-2 pt-1 border-t border-slate-100 flex flex-wrap justify-between items-center text-[10px]">
                  <span className="text-slate-500 font-bold">Terakhir Sinkron:</span>
                  <span className="font-black text-slate-800">{sheetsConfig.google_sheets_last_sync || 'Belum pernah'}</span>
                </div>
              </div>

              <div className="text-xs font-semibold text-[#065F46] bg-[#D1FAE5] border border-[#059669] p-3 rounded-xl flex items-center gap-2 select-all">
                <span>🚀 <b>Sukses Tersambung:</b> Backup lembar kerja '{sheetsConfig.google_sheets_document_name}' persisten & tersinkronisasi.</span>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 font-medium">
              💡 Hubungkan akun Google Workspace Anda untuk mengaktifkan backup otomatis data harian dan rekap upah ke Google Sheets.
            </div>
          )}
        </div>
      </Card>

      {/* 6. Developer and Reset Settings */}
      <Card className="border-red-500 bg-[#FEE2E2]/30 select-none">
        <span className="text-[10px] font-extrabold text-red-600 uppercase tracking-wider block mb-1">
          ZONA BERBAHAYA
        </span>
        <h4 className="text-sm font-chunky text-[#0F172A] uppercase mb-1">Reset Seluruh Data Prototype</h4>
        <p className="text-xs text-[#475569] font-medium leading-normal mb-4">
          Menghapus seluruh proyek, transaksi, tukang, dan material kustom yang telah Anda input dari memori LocalStorage.
        </p>
        <button
          onClick={handleResetData}
          className="px-4 py-2 bg-red-100 border-2 border-red-500 rounded-xl font-bold text-xs text-red-700 hover:bg-red-200 cursor-pointer transition-all"
        >
          🚨 Reset Semua Data State
        </button>
      </Card>
    </div>
  );
};
