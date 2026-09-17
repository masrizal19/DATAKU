/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Card, Button, Badge } from '../components/Common';
import { formatRupiah, formatTanggal } from '../utils/format';
import {
  TrendingUp,
  TrendingDown,
  FileDown,
  FileSpreadsheet,
  Printer,
  Calendar,
  Search,
  ChevronDown,
  Layers,
  Users,
  Wallet,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { Transaction, CurrentReportData } from '../types';
import { buildCurrentReportData, exportReportToExcel, exportReportToCSV, ReportFilterOptions } from '../utils/rekapEngine';
import { PrintPreviewModal } from '../components/PrintPreviewModal';
import { getProjectWeeks, getJakartaDateString, getTransactionPeriodMetadata } from '../utils/datetime';
import { syncReportToGoogleSheets, loadGoogleSheetsConnection } from '../services/googleSheetsService';

export const RekapView: React.FC = () => {
  const { state } = useApp();
  const activeProj = state.projects.find(p => p.id === state.activeProjectId);

  // Filters State
  const [filterMode, setFilterMode] = useState<'semua' | 'hari' | 'minggu' | 'minggu_ini' | 'bulan' | 'tahun' | 'project_week' | 'custom'>('bulan');
  const [selectedWeekNum, setSelectedWeekNum] = useState<number>(2); // Default ke Minggu 2
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [kategoriFilter, setKategoriFilter] = useState<string>('Semua');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals & UI States
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [isSyncingSheets, setIsSyncingSheets] = useState<boolean>(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);

  // Weeks available for this project
  const projectWeeks = useMemo(() => {
    return getProjectWeeks(activeProj?.startDate || '2026-09-01', 6);
  }, [activeProj?.startDate]);

  // Filter options for the central Rekap Engine
  const filterOptions: ReportFilterOptions = useMemo(() => {
    return {
      periode: filterMode,
      weekNumber: selectedWeekNum,
      startDate: startDate || undefined,
      endDate: endDate || undefined
    };
  }, [filterMode, selectedWeekNum, startDate, endDate]);

  // SINGLE SOURCE OF TRUTH: currentReportData
  const currentReportData: CurrentReportData | null = useMemo(() => {
    if (!activeProj) return null;
    return buildCurrentReportData(state, activeProj.id, filterOptions);
  }, [state, activeProj, filterOptions]);

  // Further filter transactions for on-screen list by Category & Search
  const filteredTxs = useMemo(() => {
    if (!currentReportData) return [];
    return currentReportData.mutasiDana.filter(tx => {
      // Category filter
      let matchCat = true;
      if (kategoriFilter !== 'Semua') {
        if (kategoriFilter === 'Dana Masuk') {
          matchCat = tx.type === 'DANA_MASUK';
        } else if (kategoriFilter === 'Pengeluaran') {
          matchCat = tx.type === 'PENGELUARAN' && tx.category !== 'Material';
        } else if (kategoriFilter === 'Upah Tukang') {
          matchCat = tx.type === 'UPAH_TUKANG' || tx.category === 'Upah Tukang';
        } else if (kategoriFilter === 'Material') {
          matchCat = tx.category === 'Material';
        } else {
          matchCat = tx.category.toLowerCase() === kategoriFilter.toLowerCase();
        }
      }

      // Search term filter
      let matchSearch = true;
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        matchSearch =
          tx.sourceOrRecipient.toLowerCase().includes(query) ||
          (tx.notes && tx.notes.toLowerCase().includes(query)) ||
          tx.category.toLowerCase().includes(query);
      }

      return matchCat && matchSearch;
    });
  }, [currentReportData, kategoriFilter, searchTerm]);

  // View state for grouping presentation: 'pohon' (default) or 'tabel' (classic list)
  const [viewType, setViewType] = useState<'pohon' | 'tabel'>('pohon');

  // Compute active period details matching Indonesian local formats exactly
  const activePeriodMeta = useMemo(() => {
    if (!activeProj) return null;
    const targetDate = startDate || getJakartaDateString();
    const meta = getTransactionPeriodMetadata(targetDate);
    
    let dateRangeStr = '';
    if (filterMode === 'project_week') {
      const selectedWeek = projectWeeks.find(pw => pw.weekNumber === selectedWeekNum);
      if (selectedWeek) {
        try {
          const s = new Date(selectedWeek.startDate + 'T12:00:00');
          const e = new Date(selectedWeek.endDate + 'T12:00:00');
          const dayS = s.getDate();
          const dayE = e.getDate();
          const monthS = new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(s);
          const monthE = new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(e);
          const yearS = s.getFullYear();
          const yearE = e.getFullYear();
          if (yearS === yearE) {
            if (monthS === monthE) {
              dateRangeStr = `${dayS}–${dayE} ${monthS} ${yearS}`;
            } else {
              dateRangeStr = `${dayS} ${monthS} – ${dayE} ${monthE} ${yearS}`;
            }
          } else {
            dateRangeStr = `${dayS} ${monthS} ${yearS} – ${dayE} ${monthE} ${yearE}`;
          }
        } catch (err) {
          dateRangeStr = `${selectedWeek.startDate} s/d ${selectedWeek.endDate}`;
        }
      }
    } else {
      dateRangeStr = currentReportData?.period.label || '';
    }
    
    return {
      proyek: activeProj.name.toUpperCase(),
      bulan: meta.monthYear.toUpperCase(),
      minggu: `MINGGU ${meta.weekNumber}`,
      periode: dateRangeStr.toUpperCase()
    };
  }, [activeProj, filterMode, selectedWeekNum, startDate, projectWeeks, currentReportData]);

  // Hierarchically group filtered transactions into Year -> Month -> Week -> Date structure
  const groupedTransactions = useMemo(() => {
    const groups: any = {};
    if (!activeProj) return groups;

    // Pre-sort transactions to maintain display_order & exact time sequencing
    const sorted = [...filteredTxs].sort((a, b) => {
      const dayA = a.date.substring(0, 10);
      const dayB = b.date.substring(0, 10);
      if (dayA !== dayB) return dayA.localeCompare(dayB);
      
      const orderA = a.displayOrder || 0;
      const orderB = b.displayOrder || 0;
      if (orderA !== orderB) return orderA - orderB;
      
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    sorted.forEach(tx => {
      const meta = getTransactionPeriodMetadata(tx.date);
      const year = tx.date.substring(0, 4);
      const month = meta.monthYear.replace(` ${year}`, '').toUpperCase();
      const week = `MINGGU ${meta.weekNumber}`;
      const dateLabel = meta.dateString;
      
      if (!groups[year]) groups[year] = {};
      if (!groups[year][month]) groups[year][month] = {};
      if (!groups[year][month][week]) groups[year][month][week] = {};
      if (!groups[year][month][week][dateLabel]) groups[year][month][week][dateLabel] = [];
      
      groups[year][month][week][dateLabel].push({
        ...tx,
        timeLabel: meta.timeString
      });
    });
    
    return groups;
  }, [filteredTxs, activeProj]);

  if (!activeProj || !currentReportData) {
    return (
      <div className="text-center py-12 select-none">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 border-2 border-[#0F172A] flex items-center justify-center text-3xl shadow-neo mx-auto mb-4">
          🚧
        </div>
        <h3 className="text-lg font-chunky text-[#0F172A] uppercase">Belum Ada Proyek Aktif</h3>
        <p className="text-xs text-[#64748B] font-bold max-w-sm mx-auto uppercase mt-2">
          Pilih atau buat proyek baru di menu Proyek Saya terlebih dahulu.
        </p>
      </div>
    );
  }

  const { ringkasan } = currentReportData;

  const handleSyncToSheets = async () => {
    setIsSyncingSheets(true);
    setSyncSuccessMessage(null);
    try {
      const res = await syncReportToGoogleSheets(currentReportData);
      setSyncSuccessMessage(res.message);
      setTimeout(() => setSyncSuccessMessage(null), 5000);
    } catch (e) {
      alert('Gagal sinkronisasi data ke Google Sheets');
    } finally {
      setIsSyncingSheets(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Proyek Aktif Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-2 border-[#0F172A] pb-4 select-none">
        <div>
          <span className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider bg-slate-100 border border-[#0f172a]/20 px-2 py-1 rounded-lg">
            PROYEK: {activeProj.name}
          </span>
          <h2 className="text-xl font-chunky text-[#0F172A] uppercase mt-2">REKAP KEUANGAN PROYEK</h2>
          <p className="text-xs font-bold text-[#64748B] uppercase mt-0.5">
            Periode: <span className="text-[#0F172A]">{currentReportData.period.label}</span>
          </p>
        </div>

        {/* Action Buttons: Unified Print, PDF, Excel, CSV, Google Sheets */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowPreviewModal(true)}
            className="shadow-neo-sm"
          >
            <Printer className="w-4 h-4 mr-1.5" /> Cetak / Save PDF
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => exportReportToExcel(currentReportData)}
            className="shadow-neo-sm"
          >
            <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-600" /> Ekspor Excel (5 Sheet)
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => exportReportToCSV(currentReportData)}
            className="shadow-neo-sm"
          >
            <FileDown className="w-4 h-4 mr-1.5 text-[#0284C7]" /> Ekspor CSV
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleSyncToSheets}
            disabled={isSyncingSheets}
            className="shadow-neo-sm bg-[#ECFDF5] text-emerald-800 border-emerald-600 hover:bg-[#D1FAE5]"
          >
            <span className="mr-1.5">📊</span> {isSyncingSheets ? 'Menyinkronkan...' : 'Sync Google Sheets'}
          </Button>
        </div>
      </div>

      {syncSuccessMessage && (
        <div className="p-3 bg-[#D1FAE5] border-2 border-[#0F172A] rounded-xl flex items-center gap-2 text-xs font-bold text-emerald-900 shadow-neo-sm animate-fade-in select-all">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{syncSuccessMessage}</span>
        </div>
      )}

      {/* 2. Ringkasan Finansial Card Row (Derived directly from currentReportData) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 select-none">
        <div className="bg-[#E0F2FE] border-2 border-[#0F172A] rounded-2xl p-4 shadow-neo">
          <span className="text-[9px] font-extrabold text-[#0369A1] uppercase block mb-1">Dana Masuk</span>
          <p className="text-lg font-chunky text-[#0F172A] truncate">{formatRupiah(ringkasan.danaMasuk)}</p>
          <TrendingUp className="w-4 h-4 text-emerald-600 mt-2" />
        </div>

        <div className="bg-[#FEE2E2] border-2 border-[#0F172A] rounded-2xl p-4 shadow-neo">
          <span className="text-[9px] font-extrabold text-[#B91C1C] uppercase block mb-1">Pengeluaran</span>
          <p className="text-lg font-chunky text-red-600 truncate">{formatRupiah(ringkasan.pengeluaran)}</p>
          <TrendingDown className="w-4 h-4 text-red-600 mt-2" />
        </div>

        <div className="bg-[#FEF3C7] border-2 border-[#0F172A] rounded-2xl p-4 shadow-neo">
          <span className="text-[9px] font-extrabold text-[#92400E] uppercase block mb-1">Upah Tukang</span>
          <p className="text-lg font-chunky text-[#92400E] truncate">{formatRupiah(ringkasan.upahTukang)}</p>
          <Users className="w-4 h-4 text-[#92400E] mt-2" />
        </div>

        <div className="bg-[#F1F5F9] border-2 border-[#0F172A] rounded-2xl p-4 shadow-neo">
          <span className="text-[9px] font-extrabold text-[#475569] uppercase block mb-1">Bahan / Material</span>
          <p className="text-lg font-chunky text-slate-800 truncate">{formatRupiah(ringkasan.pembelianMaterial)}</p>
          <Layers className="w-4 h-4 text-slate-600 mt-2" />
        </div>

        <div className="col-span-2 lg:col-span-1 bg-[#D1FAE5] border-2 border-[#0F172A] rounded-2xl p-4 shadow-neo">
          <span className="text-[9px] font-extrabold text-[#065F46] uppercase block mb-1">Sisa Kas</span>
          <p className="text-lg font-chunky text-emerald-700 truncate">{formatRupiah(ringkasan.saldoKas)}</p>
          <Wallet className="w-4 h-4 text-emerald-600 mt-2" />
        </div>
      </div>

      {/* Active Period Information Dashboard Panel */}
      {activePeriodMeta && (
        <div className="bg-[#FAF8FF] border-2 border-[#0F172A] rounded-2xl p-5 shadow-neo flex flex-col md:flex-row items-stretch gap-4 select-none">
          <div className="flex-1 space-y-1">
            <span className="text-[9px] font-extrabold text-[#64748B] uppercase block">Proyek Aktif</span>
            <div className="text-xs font-black text-[#0F172A] uppercase tracking-wide">{activePeriodMeta.proyek}</div>
          </div>
          <div className="w-px bg-[#0F172A]/10 hidden md:block"></div>
          <div className="flex-1 space-y-1">
            <span className="text-[9px] font-extrabold text-[#64748B] uppercase block">Bulan</span>
            <div className="text-xs font-black text-[#0284C7] uppercase tracking-wide">{activePeriodMeta.bulan}</div>
          </div>
          <div className="w-px bg-[#0F172A]/10 hidden md:block"></div>
          <div className="flex-1 space-y-1">
            <span className="text-[9px] font-extrabold text-[#64748B] uppercase block">Minggu Proyek</span>
            <div className="text-xs font-black text-amber-600 uppercase tracking-wide">
              {filterMode === 'project_week' ? `MINGGU ${selectedWeekNum}` : activePeriodMeta.minggu}
            </div>
          </div>
          <div className="w-px bg-[#0F172A]/10 hidden md:block"></div>
          <div className="flex-1 space-y-1">
            <span className="text-[9px] font-extrabold text-[#64748B] uppercase block">Rentang Tanggal Periode</span>
            <div className="text-xs font-black text-emerald-700 uppercase tracking-wide">{currentReportData.period.label.toUpperCase()}</div>
          </div>
        </div>
      )}

      {/* 3. Filters & Search Controls (Hari Ini, Minggu Ini, Bulan Ini, Minggu Proyek, Custom) */}
      <Card className="p-4 select-none">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {/* Period Selection Mode */}
          <div>
            <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wide block mb-1.5">
              Filter Periode
            </label>
            <div className="relative">
              <select
                value={filterMode}
                onChange={(e) => setFilterMode(e.target.value as any)}
                className="w-full bg-white border-2 border-[#0F172A] rounded-xl px-3.5 py-2 text-xs font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0284C7] shadow-neo-sm appearance-none cursor-pointer"
              >
                <option value="semua">📄 Semua</option>
                <option value="hari">📅 Hari Ini</option>
                <option value="minggu_ini">⚡ Minggu Ini</option>
                <option value="project_week">👷 Pilih Minggu Proyek</option>
                <option value="bulan">🗓️ Bulan Ini</option>
                <option value="tahun">📅 Tahun Ini</option>
                <option value="custom">🔍 Custom Tanggal</option>
              </select>
              <ChevronDown className="w-4 h-4 text-[#0F172A] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Conditional: Project Week Picker */}
          {filterMode === 'project_week' && (
            <div className="animate-fade-in">
              <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wide block mb-1.5">
                Pilih Minggu Proyek
              </label>
              <div className="relative">
                <select
                  value={selectedWeekNum}
                  onChange={(e) => setSelectedWeekNum(Number(e.target.value))}
                  className="w-full bg-white border-2 border-[#0F172A] rounded-xl px-3.5 py-2 text-xs font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0284C7] shadow-neo-sm appearance-none cursor-pointer"
                >
                  {projectWeeks.map((pw) => (
                    <option key={pw.weekNumber} value={pw.weekNumber}>
                      {pw.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-[#0F172A] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Conditional: Custom Dates */}
          {filterMode === 'custom' && (
            <div className="md:col-span-2 grid grid-cols-2 gap-2 animate-fade-in">
              <div>
                <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wide block mb-1.5">Tanggal Mulai</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-white border-2 border-[#0F172A] rounded-xl px-3 py-1.5 text-xs font-bold text-[#0F172A] focus:outline-none shadow-neo-sm"
                />
              </div>
              <div>
                <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wide block mb-1.5">Tanggal Akhir</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-white border-2 border-[#0F172A] rounded-xl px-3 py-1.5 text-xs font-bold text-[#0F172A] focus:outline-none shadow-neo-sm"
                />
              </div>
            </div>
          )}

          {/* Kategori Filter */}
          <div>
            <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wide block mb-1.5">Kategori Transaksi</label>
            <div className="relative">
              <select
                value={kategoriFilter}
                onChange={(e) => setKategoriFilter(e.target.value)}
                className="w-full bg-white border-2 border-[#0F172A] rounded-xl px-3.5 py-2 text-xs font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0284C7] shadow-neo-sm appearance-none cursor-pointer"
              >
                <option value="Semua">📄 Semua Transaksi</option>
                <option value="Dana Masuk">📥 Dana Masuk</option>
                <option value="Material">🧱 Pembelian Material</option>
                <option value="Upah Tukang">👷 Pembayaran Upah</option>
                <option value="Transportasi">🚚 Transportasi</option>
                <option value="Operasional">⚡ Operasional</option>
                <option value="Lainnya">🧩 Lain-lain</option>
              </select>
              <ChevronDown className="w-4 h-4 text-[#0F172A] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Search Term */}
          <div className={filterMode === 'custom' ? 'md:col-span-4' : 'md:col-span-1'}>
            <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wide block mb-1.5">Cari Keterangan / Pihak</label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari transaksi..."
                className="w-full bg-white border-2 border-[#0F172A] rounded-xl pl-9 pr-3.5 py-2 text-xs font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0284C7] shadow-neo-sm"
              />
              <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      </Card>

      {/* 4. Tabulasi / Section Preview Rings (Mutasi, Upah Mingguan, Material, Laporan Harian) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Rekap Upah Mingguan Mini Card */}
        <div className="bg-amber-50/70 border-2 border-[#0F172A] rounded-2xl p-4 shadow-neo">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-chunky text-xs text-[#0F172A] uppercase">Upah Tenaga Kerja</h4>
            <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
              {currentReportData.rekapUpah.length} Tukang
            </span>
          </div>
          <div className="space-y-1.5">
            {currentReportData.rekapUpah.slice(0, 3).map((w, i) => (
              <div key={i} className="flex justify-between items-center text-xs font-bold bg-white p-2 rounded-lg border border-[#0F172A]/20">
                <span className="uppercase">{w.name} ({w.position})</span>
                <span className={w.status === 'LUNAS' ? 'text-emerald-700' : 'text-red-600'}>
                  {formatRupiah(w.totalWages)} • {w.status}
                </span>
              </div>
            ))}
            {currentReportData.rekapUpah.length === 0 && (
              <p className="text-[11px] text-slate-500 italic py-2">Tidak ada data upah tukang di periode ini.</p>
            )}
          </div>
        </div>

        {/* Ringkasan Material Mini Card */}
        <div className="bg-slate-50 border-2 border-[#0F172A] rounded-2xl p-4 shadow-neo">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-chunky text-xs text-[#0F172A] uppercase">Ringkasan Material</h4>
            <span className="text-[10px] font-extrabold text-slate-700 bg-slate-200 px-2 py-0.5 rounded border border-slate-300">
              {currentReportData.ringkasanMaterial.length} Item
            </span>
          </div>
          <div className="space-y-1.5">
            {currentReportData.ringkasanMaterial.slice(0, 3).map((m, i) => (
              <div key={i} className="flex justify-between items-center text-xs font-bold bg-white p-2 rounded-lg border border-[#0F172A]/20">
                <span className="uppercase">{m.materialName}</span>
                <span className="text-slate-900 font-extrabold">Stok: {m.sisaStok} {m.unit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Laporan Harian Mini Card */}
        <div className="bg-blue-50/70 border-2 border-[#0F172A] rounded-2xl p-4 shadow-neo">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-chunky text-xs text-[#0F172A] uppercase">Laporan Harian Proyek</h4>
            <span className="text-[10px] font-extrabold text-blue-800 bg-blue-100 px-2 py-0.5 rounded border border-blue-300">
              {currentReportData.laporanHarian.length} Hari
            </span>
          </div>
          <div className="space-y-1.5">
            {currentReportData.laporanHarian.slice(0, 2).map((r, i) => (
              <div key={i} className="text-xs bg-white p-2 rounded-lg border border-[#0F172A]/20">
                <div className="flex justify-between font-bold text-[#0F172A]">
                  <span>{formatTanggal(r.date)}</span>
                  <span>{r.workerCount} Tukang • {r.weather}</span>
                </div>
                <p className="text-[11px] text-slate-600 truncate mt-0.5">{r.todayWork}</p>
              </div>
            ))}
            {currentReportData.laporanHarian.length === 0 && (
              <p className="text-[11px] text-slate-500 italic py-2">Belum ada laporan harian di periode ini.</p>
            )}
          </div>
        </div>
      </div>

      {/* 5. Tabel / Pohon Mutasi Dana Transaksi */}
      <Card className="overflow-hidden p-0 border-2 border-[#0F172A]">
        <div className="p-4 bg-[#FAF8FF] border-b-2 border-[#0F172A] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 select-none">
          <div>
            <h3 className="font-chunky text-sm text-[#0F172A] uppercase">
              MUTASI DANA ({filteredTxs.length} Transaksi)
            </h3>
            <span className="text-[10px] font-extrabold text-[#64748B] uppercase block mt-0.5">
              {currentReportData.period.label}
            </span>
          </div>

          {/* View Toggle Mode Selector */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewType('pohon')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                viewType === 'pohon'
                  ? 'bg-[#0F172A] text-white shadow-sm'
                  : 'text-slate-500 hover:text-[#0F172A]'
              }`}
            >
              🪵 Pohon Kelompok
            </button>
            <button
              type="button"
              onClick={() => setViewType('tabel')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                viewType === 'tabel'
                  ? 'bg-[#0F172A] text-white shadow-sm'
                  : 'text-slate-500 hover:text-[#0F172A]'
              }`}
            >
              📋 Daftar Tabel
            </button>
          </div>
        </div>

        {viewType === 'pohon' ? (
          /* Hierarchical Group Tree Presentation (Year -> Month -> Week -> Date -> Time) */
          <div className="p-5 space-y-6 select-text bg-[#FAF8FF]/40">
            {Object.keys(groupedTransactions).map(year => (
              <div key={year} className="space-y-4">
                <div className="text-sm font-chunky text-[#0F172A] uppercase border-b border-[#0F172A]/10 pb-1 flex items-center gap-2">
                  <span>📅 TAHUN {year}</span>
                </div>
                {Object.keys(groupedTransactions[year]).map(month => (
                  <div key={month} className="ml-2 sm:ml-4 pl-3 sm:pl-4 border-l-2 border-sky-100 space-y-4">
                    <div className="text-xs font-black text-[#0284C7] uppercase tracking-wide flex items-center gap-1.5">
                      <span>🌙 BULAN:</span>
                      <span className="bg-sky-50 px-2 py-0.5 rounded border border-sky-200">{month}</span>
                    </div>
                    {Object.keys(groupedTransactions[year][month]).map(week => (
                      <div key={week} className="ml-2 sm:ml-4 space-y-3">
                        <div className="text-[10px] font-black text-amber-700 uppercase bg-amber-50 inline-flex items-center gap-1 px-2.5 py-1 rounded border border-amber-200">
                          <span>👷</span>
                          <span>{week}</span>
                        </div>
                        {Object.keys(groupedTransactions[year][month][week]).map(dateLabel => (
                          <div key={dateLabel} className="ml-2 sm:ml-4 space-y-2">
                            <div className="text-[10px] font-extrabold text-slate-500 flex items-center gap-1">
                              <span>🗓️</span>
                              <span>{dateLabel.toUpperCase()}</span>
                            </div>
                            <div className="space-y-2 ml-1 sm:ml-3">
                              {groupedTransactions[year][month][week][dateLabel].map((tx: any) => (
                                <div key={tx.id} className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center bg-white p-3 rounded-xl border border-slate-200 hover:border-[#0F172A] hover:bg-slate-50/50 transition-all gap-2 shadow-sm">
                                  <div className="flex items-start sm:items-center gap-2.5">
                                    <span className="text-[9px] font-black font-mono text-[#0284C7] bg-[#E0F2FE] border border-[#0284C7]/25 px-1.5 py-0.5 rounded shrink-0 self-start sm:self-center">
                                      {tx.timeLabel.replace(' WIB', '')}
                                    </span>
                                    <span className={`px-1.5 py-0.5 rounded font-black text-[8px] border border-[#0f172a]/15 shrink-0 uppercase self-start sm:self-center ${
                                      tx.type === 'DANA_MASUK' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
                                    }`}>
                                      {tx.type === 'DANA_MASUK' ? 'DANA MASUK' : 'PENGELUARAN'}
                                    </span>
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                                        <span className="text-xs font-extrabold text-[#0F172A] uppercase truncate">{tx.sourceOrRecipient}</span>
                                        <span className="text-slate-400 text-[10px] hidden sm:inline">•</span>
                                        <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded">{tx.category}</span>
                                      </div>
                                      {tx.notes && <p className="text-[11px] text-[#64748B] italic font-semibold mt-1">"{tx.notes}"</p>}
                                    </div>
                                  </div>
                                  <span className={`font-chunky text-xs text-right whitespace-nowrap self-end sm:self-center ${
                                    tx.type === 'DANA_MASUK' ? 'text-emerald-700' : 'text-red-600'
                                  }`}>
                                    {tx.type === 'DANA_MASUK' ? '+' : '-'} {formatRupiah(tx.amount)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}

            {filteredTxs.length === 0 && (
              <div className="p-12 text-center text-slate-400 font-bold uppercase select-none">
                Tidak ada data transaksi di periode ini.
              </div>
            )}
          </div>
        ) : (
          /* Traditional Table Presentation */
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto select-text">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b-2 border-[#0F172A]/10 text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider">
                    <th className="p-3">Tanggal</th>
                    <th className="p-3">Jenis</th>
                    <th className="p-3">Kategori</th>
                    <th className="p-3">Keterangan</th>
                    <th className="p-3">Sumber / Penerima</th>
                    <th className="p-3 text-right">Nominal</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0F172A]/10 text-xs font-semibold">
                  {filteredTxs.map((tx) => (
                    <tr key={tx.id} className="hover:bg-[#FAF8FF] transition-colors">
                      <td className="p-3 text-slate-600 whitespace-nowrap">{formatTanggal(tx.date)}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded font-extrabold text-[9px] border border-[#0f172a]/15 ${
                          tx.type === 'DANA_MASUK' ? 'bg-[#D1FAE5] text-emerald-800' : 'bg-[#FEE2E2] text-red-800'
                        }`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-[#0F172A]">{tx.category}</td>
                      <td className="p-3 text-[#475569] max-w-xs truncate italic">"{tx.notes || '-'}"</td>
                      <td className="p-3 font-extrabold text-[#0F172A] uppercase">{tx.sourceOrRecipient}</td>
                      <td className={`p-3 font-chunky text-right whitespace-nowrap ${
                        tx.type === 'DANA_MASUK' ? 'text-emerald-600' : 'text-red-500'
                      }`}>
                        {tx.type === 'DANA_MASUK' ? '+' : '-'} {formatRupiah(tx.amount)}
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-extrabold text-[9px] rounded border border-emerald-300">
                          {tx.status || 'Berhasil'}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {filteredTxs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-400 font-bold uppercase select-none">
                        Tidak ada transaksi yang cocok dengan filter Anda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards (Responsive Layout) */}
            <div className="block md:hidden divide-y divide-[#0F172A]/10 select-text">
              {filteredTxs.map((tx) => (
                <div key={tx.id} className="p-4 space-y-2 hover:bg-[#FAF8FF] transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-bold text-[#64748B]">{formatTanggal(tx.date)}</p>
                      <p className="text-sm font-extrabold text-[#0F172A] uppercase mt-0.5">{tx.sourceOrRecipient}</p>
                    </div>
                    <span className={`font-chunky text-sm ${tx.type === 'DANA_MASUK' ? 'text-emerald-600' : 'text-red-500'}`}>
                      {tx.type === 'DANA_MASUK' ? '+' : '-'} {formatRupiah(tx.amount)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className={`px-1.5 py-0.5 rounded font-extrabold text-[9px] border border-[#0f172a]/15 ${
                      tx.type === 'DANA_MASUK' ? 'bg-[#D1FAE5] text-emerald-800' : 'bg-[#FEE2E2] text-red-800'
                    }`}>
                      {tx.type}
                    </span>
                    <span className="text-xs font-bold text-[#475569]">{tx.category}</span>
                  </div>

                  <p className="text-xs font-medium text-[#475569] italic">"{tx.notes || 'Tidak ada keterangan.'}"</p>
                </div>
              ))}

              {filteredTxs.length === 0 && (
                <div className="p-12 text-center text-slate-400 font-bold uppercase select-none">
                  Tidak ada log transaksi pada filter ini.
                </div>
              )}
            </div>
          </>
        )}
      </Card>

      {/* 6. Unified Print & PDF Preview Modal (Uses exact same currentReportData) */}
      {showPreviewModal && (
        <PrintPreviewModal
          reportData={currentReportData}
          onClose={() => setShowPreviewModal(false)}
        />
      )}
    </div>
  );
};
