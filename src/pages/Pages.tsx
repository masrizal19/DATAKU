/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card, Button, Badge, Modal, Input, TextArea } from '../components/Common';
import { formatRupiah, formatTanggal, formatTanggalWaktu } from '../utils/format';
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
  FileDown
} from 'lucide-react';
import { Transaction, Material, MaterialLog, Worker, DailyReport, Project } from '../types';

// --- VIEW 1: DASHBOARD VIEW ---
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

  // Notifications summary
  const alertNotifs = state.notifications.filter(n => n.projectId === activeProj.id && !n.isRead);

  // Quick Action triggers mapping
  const quickActions = [
    { label: '+ Dana Masuk', action: 'dana_masuk', color: 'bg-[#E0F2FE]' },
    { label: '+ Barang Masuk', action: 'barang_masuk', color: 'bg-[#FEF3C7]' },
    { label: '+ Barang Keluar', action: 'barang_keluar', color: 'bg-[#FAF8FF]' },
    { label: '+ Barang Terpakai', action: 'barang_terpakai', color: 'bg-[#FEE2E2]' },
    { label: '+ Pengeluaran', action: 'pengeluaran', color: 'bg-[#FFF7ED]' },
    { label: '+ Upah Tukang', action: 'upah_tukang', color: 'bg-[#D1FAE5]' },
    { label: '+ Laporan Harian', action: 'laporan_harian', color: 'bg-[#E0F2FE]' }
  ];

  return (
    <div className="space-y-6">
      {/* Saldo Proyek Summary */}
      <Card variant="cyan" className="p-6 relative overflow-hidden">
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
                  <div className="flex items-center gap-2 text-[#065F46] font-bold text-sm">
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                    <span>✓ Laporan hari ini sudah dibuat</span>
                  </div>
                  <div className="text-[11px] font-semibold text-[#065F46]/80 pl-7">
                    Cuaca: <span className="font-extrabold">{todayReport.weather}</span> <br />
                    Tukang: <span className="font-extrabold">{todayReport.workerCount} orang</span> <br />
                    Pekerjaan: <span className="font-bold">{todayReport.todayWork.substring(0, 70)}...</span>
                  </div>
                </div>
              ) : (
                <div className="bg-[#FEE2E2] border-1.5 border-[#EF4444] rounded-xl p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-[#B91C1C] font-bold text-sm">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <span>Belum ada laporan hari ini</span>
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
                  Buat Laporan Sekarang
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

      {/* Stock warning banner if any item is menipis/habis */}
      {alertNotifs.length > 0 && (
        <div className="p-4 bg-[#FFEDD5] border-2 border-[#F97316] rounded-2xl flex items-start gap-3 shadow-neo-sm select-none">
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
  const { state, addBarangKeluar, addBarangTerpakai } = useApp();
  const activeProj = state.projects.find(p => p.id === state.activeProjectId);
  const [activeSubTab, setActiveSubTab] = useState<'stok' | 'riwayat'>('stok');

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
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse select-none">
              <thead>
                <tr className="bg-[#FAF8FF] border-b-2 border-[#0F172A] text-xs font-extrabold uppercase text-[#475569] tracking-wider">
                  <th className="p-4">Material / Barang</th>
                  <th className="p-4">Kategori</th>
                  <th className="p-4">Stok Saat Ini</th>
                  <th className="p-4">Status Stok</th>
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
                    </tr>
                  );
                })}

                {projMaterials.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-xs font-bold text-[#64748B] uppercase">
                      ⚠️ Belum ada material terdaftar di gudang proyek ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
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
                <span className="text-[10px] font-semibold text-[#64748B] flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {formatTanggalWaktu(log.date)}
                </span>
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
                        <img src={p} alt="Dokumen Lapangan" className="w-full h-full object-cover" />
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
    </div>
  );
};


// --- VIEW 3: KEUANGAN VIEW & LEDGER ---
export const FinanceView: React.FC = () => {
  const { state, deleteTransaction } = useApp();
  const activeProj = state.projects.find(p => p.id === state.activeProjectId);
  const [activeFilter, setActiveFilter] = useState<'SEMUA' | 'DANA_MASUK' | 'PENGELUARAN' | 'UPAH_TUKANG'>('SEMUA');
  
  // States for confirmation delete
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  if (!activeProj) {
    return <div className="text-center py-8">Pilih proyek aktif terlebih dahulu.</div>;
  }

  const projectTxs = state.transactions.filter(t => t.projectId === activeProj.id);
  const totalDana = projectTxs.filter(t => t.type === 'DANA_MASUK').reduce((acc, c) => acc + c.amount, 0);
  const totalPengeluaran = projectTxs.filter(t => t.type === 'PENGELUARAN' || t.type === 'UPAH_TUKANG').reduce((acc, c) => acc + c.amount, 0);
  const totalWages = projectTxs.filter(t => t.type === 'UPAH_TUKANG').reduce((acc, c) => acc + c.amount, 0);
  const totalExpensesOnly = projectTxs.filter(t => t.type === 'PENGELUARAN').reduce((acc, c) => acc + c.amount, 0);
  const saldoProyek = totalDana - totalPengeluaran;

  const filteredTxs = projectTxs.filter(tx => {
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

              {/* PDF/Excel Export Sim buttons */}
              <div className="flex gap-2 pt-2.5 select-none">
                <button
                  onClick={() => alert('Fitur Ekspor PDF sedang disiapkan untuk integrasi REST API!')}
                  className="flex-1 py-2 rounded-lg border-1.5 border-[#0F172A] bg-white hover:bg-[#F1F5F9] font-bold text-[10px] text-[#0F172A] flex items-center justify-center gap-1 cursor-pointer shadow-neo-sm transition-all"
                >
                  <FileDown className="w-3.5 h-3.5 text-red-600" /> Ekspor PDF
                </button>
                <button
                  onClick={() => alert('Fitur Ekspor Excel sedang disiapkan untuk integrasi REST API!')}
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
          {filteredTxs.map((tx) => (
            <Card key={tx.id} className="p-4 select-none hover:bg-[#FAF8FF] transition-all">
              <div className="flex justify-between items-start gap-2.5">
                <div className="flex items-start gap-3">
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
          ))}

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
    </div>
  );
};


// --- VIEW 4: UPAH TUKANG VIEW ---
interface WorkersViewProps {
  onAddWorkerClick: () => void;
  onPayWorkerClick: () => void;
}

export const WorkersView: React.FC<WorkersViewProps> = ({ onAddWorkerClick, onPayWorkerClick }) => {
  const { state, updateWorker } = useApp();
  const activeProj = state.projects.find(p => p.id === state.activeProjectId);

  // States for Payroll / Receipt Modal Details
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [printSingleWorker, setPrintSingleWorker] = useState<Worker | null>(null);
  const [printAllWorkers, setPrintAllWorkers] = useState<boolean>(false);

  if (!activeProj) {
    return <div className="text-center py-8">Pilih proyek aktif terlebih dahulu.</div>;
  }

  const projWorkers = state.workers.filter(w => w.projectId === activeProj.id);

  // Derive granular stats for payroll
  const totalTukang = projWorkers.length;
  const totalHariKerja = projWorkers.reduce((acc, w) => acc + w.daysWorked, 0);
  
  // Custom helper to calculate net wages
  const getNetWages = (w: Worker) => {
    return w.totalWages + (w.bonus || 0) - (w.potongan || 0);
  };

  const getPaidAmount = (w: Worker) => {
    if (w.status === 'LUNAS') return getNetWages(w);
    if (w.status === 'SEBAGIAN') return Math.round(getNetWages(w) * 0.4); // Kasbon/sebagian (simulated)
    return 0;
  };

  const totalKewajiban = projWorkers.reduce((acc, w) => acc + getNetWages(w), 0);
  const sudahDibayar = projWorkers.reduce((acc, w) => acc + getPaidAmount(w), 0);
  const belumDibayar = totalKewajiban - sudahDibayar;

  // Handle Edit Save
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingWorker) {
      updateWorker({
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
    }
  };

  // Export payroll summary to CSV
  const handleExportPayrollCSV = () => {
    let csv = 'data:text/csv;charset=utf-8,';
    csv += 'REKAP UPAH TUKANG DATAKU\n';
    csv += `Proyek,${activeProj.name}\n`;
    csv += `Total Tukang,${totalTukang}\n`;
    csv += `Total Hari Kerja,${totalHariKerja}\n`;
    csv += `Total Kewajiban,Rp ${totalKewajiban}\n`;
    csv += `Sudah Dibayar,Rp ${sudahDibayar}\n`;
    csv += `Belum Dibayar,Rp ${belumDibayar}\n\n`;
    csv += 'Daftar Tukang,Posisi,Hari Kerja,Tarif Harian,Bonus,Potongan,Total Bersih,Status,Metode\n';

    projWorkers.forEach(w => {
      csv += `"${w.name}","${w.position}",${w.daysWorked},${w.dailyRate},${w.bonus || 0},${w.potongan || 0},${getNetWages(w)},"${w.status}","${w.paymentMethod || 'Tunai'}"\n`;
    });

    const link = document.createElement('a');
    link.href = encodeURI(csv);
    link.download = `DATAKU_Rekap_Upah_${activeProj.name.replace(/\s+/g, '_')}.csv`;
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
   <Row><Cell><Data ss:Type="String">Total Tukang: ${totalTukang}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Total Hari Kerja: ${totalHariKerja}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Total Kewajiban: ${totalKewajiban}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Sudah Dibayar: ${sudahDibayar}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Belum Dibayar: ${belumDibayar}</Data></Cell></Row>
   <Row></Row>
   <Row>
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

    projWorkers.forEach(w => {
      xml += `   <Row>
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
    link.download = `DATAKU_Rekap_Upah_${activeProj.name.replace(/\s+/g, '_')}.xls`;
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
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-[#0f172a]/10 pb-4 mb-4">
          <div>
            <span className="text-[9px] font-extrabold text-[#64748B] uppercase tracking-wider block">Pusat Informasi</span>
            <h3 className="text-base font-chunky text-[#0F172A] uppercase mt-1">REKAP GAJI & UPAH TUKANG</h3>
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
      <div className="flex justify-between items-center select-none">
        <h4 className="text-sm font-chunky text-[#0F172A] uppercase">DAFTAR TENAGA KERJA ({totalTukang})</h4>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={onAddWorkerClick}>
            + Tambah Pekerja
          </Button>
          <Button variant="ghost" size="sm" onClick={onPayWorkerClick}>
            💰 Catat Bayar
          </Button>
        </div>
      </div>

      {/* Roster Cards List */}
      <div className="space-y-3.5">
        {projWorkers.map((w) => {
          let badgeType: 'success' | 'warning' | 'danger' = 'success';
          if (w.status === 'BELUM_DIBAYAR') badgeType = 'danger';
          else if (w.status === 'SEBAGIAN') badgeType = 'warning';

          return (
            <Card key={w.id} className="p-4 hover:translate-y-[-1.5px] transition-all">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="flex gap-3.5 items-start">
                  <div className="w-11 h-11 rounded-xl border-2 border-[#0F172A] shadow-neo-sm bg-amber-50 flex items-center justify-center text-xl shrink-0 select-none">
                    👷
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-[#0F172A] uppercase">{w.name}</h4>
                    <p className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wide mt-0.5">
                      {w.position} • {w.daysWorked} Hari Kerja
                    </p>
                    <p className="text-xs text-slate-500 font-bold mt-1.5 flex gap-3">
                      <span>Tarif: {formatRupiah(w.dailyRate)}/hari</span>
                      {w.bonus && <span className="text-emerald-600 font-extrabold">Bonus: +{formatRupiah(w.bonus)}</span>}
                      {w.potongan && <span className="text-red-500 font-extrabold">Pot: -{formatRupiah(w.potongan)}</span>}
                    </p>
                  </div>
                </div>

                <div className="flex sm:flex-col justify-between items-end gap-2 shrink-0 select-none">
                  <div className="text-right">
                    <span className="text-[10px] text-[#64748B] font-bold block">Total Bersih</span>
                    <span className="font-chunky text-sm text-[#0F172A] block mt-0.5">{formatRupiah(getNetWages(w))}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge type={badgeType}>
                      {w.status === 'BELUM_DIBAYAR' ? 'BELUM BAYAR' : w.status === 'SEBAGIAN' ? 'KASBON / SEBAGIAN' : '✓ LUNAS'}
                    </Badge>
                    <button
                      onClick={() => setSelectedWorker(w)}
                      className="px-2.5 py-1 rounded-lg border border-[#0F172A] bg-white hover:bg-slate-100 font-extrabold text-[10px] transition-all cursor-pointer"
                    >
                      Lihat Detail
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}

        {projWorkers.length === 0 && (
          <div className="text-center py-10 bg-white border-2 border-dashed border-[#0F172A]/20 rounded-2xl p-6 select-none animate-pulse">
            <p className="text-xs font-bold text-[#64748B] uppercase">Belum ada data pekerja tukang terdaftar.</p>
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
                className="text-xs font-bold border border-slate-300 p-1 rounded hover:bg-slate-100 transition-all"
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
                    <span className="text-[9px] text-[#64748B] font-extrabold uppercase block">Status Pembayaran</span>
                    <Badge type={selectedWorker.status === 'BELUM_DIBAYAR' ? 'danger' : selectedWorker.status === 'SEBAGIAN' ? 'warning' : 'success'} className="mt-1">
                      {selectedWorker.status}
                    </Badge>
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

              {/* Action Buttons inside detail */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <button
                  onClick={() => { setEditingWorker(selectedWorker); }}
                  className="py-2.5 bg-white hover:bg-slate-50 border-2 border-[#0F172A] rounded-xl font-bold text-xs text-[#0F172A] transition-all cursor-pointer shadow-neo-sm flex items-center justify-center gap-1"
                >
                  ⚙ Edit Slip
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
        <div className="fixed inset-0 bg-[#0F172A]/70 flex items-center justify-center z-50 p-4 select-none animate-fade-in">
          <div className="bg-white border-3 border-[#0F172A] rounded-2xl w-full max-w-md shadow-neo-lg overflow-hidden">
            <div className="bg-[#FAF8FF] border-b-2 border-[#0F172A] p-4 flex justify-between items-center">
              <h4 className="font-chunky text-sm text-[#0F172A] uppercase">EDIT DETIL GAJI: {editingWorker.name}</h4>
              <button onClick={() => setEditingWorker(null)} className="text-xs font-bold p-1 border border-slate-300 rounded">Batal</button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
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

      {/* 4. PRINT PREVIEW BUKTI PEMBAYARAN WORKER (A4 Slip) */}
      {(printSingleWorker || printAllWorkers) && (
        <div className="fixed inset-0 bg-[#0F172A]/80 flex items-center justify-center z-50 p-4 select-none animate-fade-in overflow-y-auto">
          <div className="bg-white border-3 border-[#0F172A] rounded-2xl w-full max-w-3xl shadow-neo-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-[#FAF8FF] border-b-2 border-[#0F172A] p-4 flex justify-between items-center">
              <h3 className="font-chunky text-base text-[#0F172A] uppercase">
                {printAllWorkers ? 'PREVIEW CETAK SEMUA BUKTI UPAH' : `PREVIEW CETAK BUKTI UPAH: ${printSingleWorker?.name}`}
              </h3>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={triggerPrintReceipt}>
                  <Printer className="w-4 h-4 mr-1.5" /> Cetak (A4)
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setPrintSingleWorker(null); setPrintAllWorkers(false); }}>
                  Tutup
                </Button>
              </div>
            </div>

            {/* Document display area */}
            <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-slate-100 flex justify-center">
              <div id="printable-area" className="w-full max-w-[210mm] space-y-8 select-text">
                
                {/* Resolve which workers are rendered */}
                {(printAllWorkers ? projWorkers : [printSingleWorker]).map((w, idx) => {
                  if (!w) return null;
                  const uNum = `UPH-2026-000${idx + 101}`;
                  return (
                    <div
                      key={w.id}
                      className="bg-white border-2 border-dashed border-slate-400 p-8 text-black font-sans leading-relaxed shadow-md relative break-after-page page-break-container"
                      style={{ pageBreakAfter: 'always', marginBottom: '24px' }}
                    >
                      {/* Logo / Header banner */}
                      <div className="flex justify-between items-center border-b-2 border-black pb-4 mb-4 select-none">
                        <div>
                          <h1 className="text-xl font-black tracking-tight">DATAKU</h1>
                          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">SISTEM KEUANGAN MANDOR LAPANGAN</p>
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
        </div>
      )}

      {/* Print Specific CSS to support exact layout printing */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-area, #printable-area * {
            visibility: visible;
          }
          #printable-area {
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
  const { state, setActiveProject, archiveProject } = useApp();

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
              <div className="flex justify-between items-start gap-4">
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

                <div className="flex flex-col gap-2 select-none">
                  {!isActive && !p.isArchived && (
                    <Button variant="ghost" size="sm" onClick={() => setActiveProject(p.id)}>
                      Buka Proyek
                    </Button>
                  )}
                  {isActive && (
                    <span className="text-[10px] font-black text-emerald-600 border border-emerald-500 bg-emerald-50 rounded-lg px-2 py-1 uppercase text-center">
                      ✓ Sedang Dibuka
                    </span>
                  )}
                  <button
                    onClick={() => archiveProject(p.id)}
                    className="p-2 border border-[#0F172A]/15 hover:border-red-500 rounded-xl hover:bg-red-50 text-[#475569] hover:text-red-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    {p.isArchived ? 'Aktifkan Kembali' : 'Arsipkan Proyek'}
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
  const [googleSheetsConnected, setGoogleSheetsConnected] = useState(false);
  const [syncingSheets, setSyncingSheets] = useState(false);

  // Profile Form States
  const [profileName, setProfileName] = useState(state.currentUser?.name || 'PAUJI');
  const [profilePhone, setProfilePhone] = useState(state.currentUser?.phone || '0812-3456-7890');
  const [profileEmail, setProfileEmail] = useState(state.currentUser?.email || 'pauji.mandor@dataku.com');
  const [profileAddress, setProfileAddress] = useState(state.currentUser?.address || 'Jl. Raya Konstruksi No. 45, Jakarta');
  const [profileCompany, setProfileCompany] = useState(state.currentUser?.company || 'PT Mandor Bangunan Sejahtera');
  const [profileJobTitle, setProfileJobTitle] = useState(state.currentUser?.jobTitle || 'Mandor Utama Proyek');
  const [profilePhoto, setProfilePhoto] = useState(state.currentUser?.photo || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80');

  // Security Update States
  const [pinCurrent, setPinCurrent] = useState('');
  const [pinNew, setPinNew] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');

  // Notification Configuration States
  const [notifDaily, setNotifDaily] = useState(true);
  const [notifBalance, setNotifBalance] = useState(true);
  const [notifMaterial, setNotifMaterial] = useState(true);

  // File restore helper reference
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleSheetsConnect = () => {
    setSyncingSheets(true);
    setTimeout(() => {
      setGoogleSheetsConnected(!googleSheetsConnected);
      setSyncingSheets(false);
    }, 1500);
  };

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateCurrentUser({
      name: profileName,
      phone: profilePhone,
      email: profileEmail,
      address: profileAddress,
      company: profileCompany,
      jobTitle: profileJobTitle,
      photo: profilePhoto
    });
    alert('Sukses menyimpan perubahan profil Mandor!');
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

  // Simulating Camera capture
  const handleTriggerCamera = () => {
    const urls = [
      'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
    ];
    const randomUrl = urls[Math.floor(Math.random() * urls.length)];
    setProfilePhoto(randomUrl);
    alert('Simulasi: Foto profil baru berhasil ditangkap menggunakan Kamera HP Mandor!');
  };

  // Trigger File Input simulation
  const handleTriggerFile = () => {
    const fileUrl = 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80';
    setProfilePhoto(fileUrl);
    alert('Simulasi: Foto profil baru berhasil diupload dari Galeri HP Mandor!');
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
      {/* 1. EDIT PROFIL MANDOR & FOTO */}
      <Card className="p-5 select-none">
        <span className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider block mb-3">
          📝 DOKUMEN PROFIL MANDOR
        </span>

        <form onSubmit={handleProfileSave} className="space-y-5">
          {/* Foto Upload & Camera Block */}
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#FAF8FF] border-2 border-[#0F172A] rounded-xl p-4">
            <div className="w-20 h-20 rounded-xl border-3 border-[#0F172A] overflow-hidden bg-amber-50 shadow-neo shrink-0 relative">
              <img src={profilePhoto} alt="Foto Profil" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              {profilePhoto && (
                <button
                  type="button"
                  onClick={() => setProfilePhoto('')}
                  className="absolute bottom-0 left-0 right-0 py-0.5 bg-red-600 border-t border-[#0F172A] text-[9px] text-white font-extrabold text-center hover:bg-red-700 cursor-pointer"
                >
                  Hapus Foto
                </button>
              )}
            </div>
            
            <div className="space-y-1.5 text-center sm:text-left">
              <p className="text-xs font-extrabold text-[#0F172A] uppercase leading-none">Foto Profil Mandor</p>
              <p className="text-[10px] text-[#64748B] font-bold uppercase tracking-wide">
                Gunakan kamera HP atau upload file JPG / PNG
              </p>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleTriggerCamera}
                  className="px-2.5 py-1.5 bg-white border border-[#0F172A] hover:bg-slate-50 text-[10px] font-extrabold text-[#0F172A] rounded-lg transition-all cursor-pointer shadow-neo-sm"
                >
                  📷 Ambil Foto HP
                </button>
                <button
                  type="button"
                  onClick={handleTriggerFile}
                  className="px-2.5 py-1.5 bg-white border border-[#0F172A] hover:bg-slate-50 text-[10px] font-extrabold text-[#0F172A] rounded-lg transition-all cursor-pointer shadow-neo-sm"
                >
                  📁 Unggah Galeri
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
          <div className="flex items-center justify-between gap-3 select-none">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-[#0F172A] flex items-center justify-center text-lg shadow-neo-sm">
                📊
              </div>
              <div>
                <p className="text-xs font-extrabold text-[#0F172A] uppercase leading-none">Google Sheets Connector</p>
                <p className="text-[9px] text-[#64748B] font-bold uppercase mt-1">
                  Status: {googleSheetsConnected ? '🟢 Tersambung & Aktif' : '⚪ Belum Terhubung'}
                </p>
              </div>
            </div>

            <Button
              variant={googleSheetsConnected ? 'ghost' : 'secondary'}
              size="sm"
              onClick={handleSheetsConnect}
              disabled={syncingSheets}
            >
              {syncingSheets ? 'Menghubungkan...' : googleSheetsConnected ? 'Putuskan' : 'Hubungkan'}
            </Button>
          </div>

          {googleSheetsConnected && (
            <div className="text-xs font-semibold text-[#065F46] bg-[#D1FAE5] border border-[#059669] p-3 rounded-xl flex items-center gap-2 select-all">
              <span>🚀 <b>Sukses Tersambung:</b> Backup lembar kerja 'DATAKU_MANDOR_BACKUP.xlsx' berhasil dijadwalkan setiap pukul 18:00 WIB.</span>
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
