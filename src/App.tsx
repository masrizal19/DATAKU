/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { isSupabaseConfigured } from './lib/supabase';
import { AppProvider, useApp } from './context/AppContext';
import { AuthScreen } from './pages/Auth';
import { DesktopSidebar, HeaderBanner, MobileBottomNav } from './components/Navigation';
import { BottomSheet, Card, Toast } from './components/Common';
import { ProjectCalculator } from './components/Calculator';
import {
  DashboardView,
  InventoryView,
  FinanceView,
  WorkersView,
  ReportsView,
  ProjectListView,
  NotificationsView,
  SettingsView
} from './pages/Pages';
import { RekapView } from './pages/Rekap';
import {
  ProyekForm,
  DanaMasukForm,
  BarangMasukForm,
  BarangKeluarForm,
  BarangTerpakaiForm,
  PengeluaranForm,
  UpahForm,
  LaporanForm,
  TambahPekerjaForm
} from './components/Forms';
import { formatRupiah, formatTanggal } from './utils/format';
import { Search, Briefcase, FileText, DollarSign, Layers, Users, Plus } from 'lucide-react';

const VALID_TABS = [
  'beranda',
  'proyek',
  'barang',
  'stok',
  'keuangan',
  'rekap',
  'upah',
  'laporan',
  'kalkulator',
  'notifikasi',
  'pengaturan'
];

function resolveTabFromUrl(): string {
  try {
    const hash = window.location.hash.replace(/^#[/]?/, '').trim().toLowerCase();
    if (hash) {
      if (hash === 'stok') return 'barang';
      if (VALID_TABS.includes(hash)) return hash;
    }

    const segments = window.location.pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1]?.toLowerCase();
    if (last) {
      if (last === 'stok') return 'barang';
      if (VALID_TABS.includes(last)) return last;
    }
  } catch (e) {
    // ignore
  }
  return 'beranda';
}

const MainAppContent: React.FC = () => {
  const {
    state,
    addProject,
    addDanaMasuk,
    addPengeluaran,
    addBarangMasuk,
    addBarangKeluar,
    addBarangTerpakai,
    payWorker,
    addWorker,
    addDailyReport
  } = useApp();

  const [bypassSupabase, setBypassSupabase] = useState(() => {
    return localStorage.getItem("dataku_bypass_supabase") === "true";
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem("dataku_auth") === "true";
  });
  const [currentTab, setCurrentTabState] = useState(() => resolveTabFromUrl());

  const setTab = React.useCallback((newTab: string) => {
    setCurrentTabState(newTab);
    setSearchValue('');
    try {
      const segments = window.location.pathname.split('/').filter(Boolean);
      const last = segments[segments.length - 1]?.toLowerCase();
      let updatedPath: string;
      if (last && (VALID_TABS.includes(last) || last === 'login')) {
        segments[segments.length - 1] = newTab === 'beranda' ? '' : newTab;
        updatedPath = '/' + segments.filter(Boolean).join('/');
      } else {
        const base = window.location.pathname.replace(/\/+$/, '');
        updatedPath = (base === '' || base === '/' ? '' : base) + (newTab === 'beranda' ? '/' : `/${newTab}`);
      }
      if (!updatedPath.startsWith('/')) updatedPath = '/' + updatedPath;
      window.history.pushState(null, '', updatedPath + window.location.search + window.location.hash);
    } catch (e) {
      // safe fallback
    }
  }, []);

  React.useEffect(() => {
    const onPopState = () => {
      setCurrentTabState(resolveTabFromUrl());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  const [searchValue, setSearchValue] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeSheet, setActiveSheet] = useState<
    | 'dana_masuk'
    | 'barang_masuk'
    | 'barang_keluar'
    | 'barang_terpakai'
    | 'pengeluaran'
    | 'upah_tukang'
    | 'laporan_harian'
    | 'tambah_tukang'
    | 'buat_proyek'
    | 'aktivitas_cepat'
    | null
  >(null);

  if (!isAuthenticated) {
    return <AuthScreen onAuthSuccess={() => setIsAuthenticated(true)} />;
  }

  // Handle Quick Action sheet openings
  const handleQuickAction = (actionType: string) => {
    setActiveSheet(actionType as any);
  };

  // Live filter Search engine
  const activeProj = state.projects.find(p => p.id === state.activeProjectId);
  const projectTxs = activeProj ? state.transactions.filter(t => t.projectId === activeProj.id) : [];
  const projectMaterials = activeProj ? state.materials.filter(m => m.projectId === activeProj.id) : [];
  const projectWorkers = activeProj ? state.workers.filter(w => w.projectId === activeProj.id) : [];
  const projectReports = activeProj ? state.dailyReports.filter(r => r.projectId === activeProj.id) : [];

  const searchResults = {
    transactions: searchValue
      ? projectTxs.filter(
          t =>
            t.sourceOrRecipient.toLowerCase().includes(searchValue.toLowerCase()) ||
            t.notes.toLowerCase().includes(searchValue.toLowerCase()) ||
            t.category.toLowerCase().includes(searchValue.toLowerCase())
        )
      : [],
    materials: searchValue
      ? projectMaterials.filter(
          m =>
            m.name.toLowerCase().includes(searchValue.toLowerCase()) ||
            m.category.toLowerCase().includes(searchValue.toLowerCase())
        )
      : [],
    workers: searchValue
      ? projectWorkers.filter(
          w =>
            w.name.toLowerCase().includes(searchValue.toLowerCase()) ||
            w.position.toLowerCase().includes(searchValue.toLowerCase())
        )
      : [],
    reports: searchValue
      ? projectReports.filter(
          r =>
            r.todayWork.toLowerCase().includes(searchValue.toLowerCase()) ||
            r.notes.toLowerCase().includes(searchValue.toLowerCase())
        )
      : []
  };

  const hasSearchResults =
    searchResults.transactions.length > 0 ||
    searchResults.materials.length > 0 ||
    searchResults.workers.length > 0 ||
    searchResults.reports.length > 0;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-[#0F172A] pb-24 lg:pb-0">
      {/* Desktop Sidebar / Mobile Drawer Navigation */}
      <DesktopSidebar
        currentTab={currentTab}
        setTab={(t) => {
          setTab(t);
          setSearchValue('');
        }}
        onQuickActionClick={() => setActiveSheet('dana_masuk')}
        onProfileClick={() => setTab('pengaturan')}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <HeaderBanner
          currentTab={currentTab}
          setTab={(t) => {
            setTab(t);
            setSearchValue('');
          }}
          onSearchChange={(v) => setSearchValue(v)}
          searchValue={searchValue}
          onOpenSidebar={() => setIsSidebarOpen(true)}
        />

        <main className="p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6">
          {searchValue ? (
            /* GLOBAL SEARCH RESULTS PANEL */
            <div className="space-y-6 select-none animate-fade-in">
              <div className="flex items-center gap-2 text-xs font-bold text-[#64748B] uppercase">
                <Search className="w-4 h-4" /> Hasil Pencarian untuk: <span className="text-[#0284C7] font-black">"{searchValue}"</span>
              </div>

              {!hasSearchResults && (
                <div className="text-center py-16 bg-white border-2 border-dashed border-[#0F172A]/20 rounded-2xl p-6">
                  <p className="text-xs font-bold text-[#64748B] uppercase">Tidak ada transaksi, barang, atau tukang yang cocok.</p>
                </div>
              )}

              {/* Transactions matches */}
              {searchResults.transactions.length > 0 && (
                <Card>
                  <h4 className="text-xs font-extrabold text-[#64748B] uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-[#F1F5F9] pb-2">
                    <DollarSign className="w-4 h-4 text-emerald-600" /> Transaksi Cocok ({searchResults.transactions.length})
                  </h4>
                  <div className="divide-y divide-[#F1F5F9]">
                    {searchResults.transactions.map((tx) => (
                      <div key={tx.id} className="py-2.5 flex justify-between items-center text-xs font-semibold">
                        <div>
                          <p className="font-extrabold text-[#0F172A] uppercase">{tx.sourceOrRecipient}</p>
                          <p className="text-[10px] text-[#64748B] uppercase mt-0.5">{tx.category} • {formatTanggal(tx.date)}</p>
                        </div>
                        <span className={`font-chunky ${tx.type === 'DANA_MASUK' ? 'text-emerald-600' : 'text-red-500'}`}>
                          {tx.type === 'DANA_MASUK' ? '+' : '-'} {formatRupiah(tx.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Inventory matches */}
              {searchResults.materials.length > 0 && (
                <Card>
                  <h4 className="text-xs font-extrabold text-[#64748B] uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-[#F1F5F9] pb-2">
                    <Layers className="w-4 h-4 text-[#0284C7]" /> Material Gudang ({searchResults.materials.length})
                  </h4>
                  <div className="divide-y divide-[#F1F5F9]">
                    {searchResults.materials.map((m) => (
                      <div key={m.id} className="py-2.5 flex justify-between items-center text-xs font-semibold">
                        <div>
                          <p className="font-extrabold text-[#0F172A] uppercase">{m.name}</p>
                          <p className="text-[10px] text-[#64748B] uppercase mt-0.5">{m.category}</p>
                        </div>
                        <span className="font-chunky text-[#0F172A]">{m.stock} {m.unit}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Workers matches */}
              {searchResults.workers.length > 0 && (
                <Card>
                  <h4 className="text-xs font-extrabold text-[#64748B] uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-[#F1F5F9] pb-2">
                    <Users className="w-4 h-4 text-[#F59E0B]" /> Roster Pekerja ({searchResults.workers.length})
                  </h4>
                  <div className="divide-y divide-[#F1F5F9]">
                    {searchResults.workers.map((w) => (
                      <div key={w.id} className="py-2.5 flex justify-between items-center text-xs font-semibold">
                        <div>
                          <p className="font-extrabold text-[#0F172A] uppercase">{w.name}</p>
                          <p className="text-[10px] text-[#64748B] uppercase mt-0.5">{w.position}</p>
                        </div>
                        <span className="font-chunky text-[#64748B]">{w.daysWorked} hari kerja</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Daily Reports matches */}
              {searchResults.reports.length > 0 && (
                <Card>
                  <h4 className="text-xs font-extrabold text-[#64748B] uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-[#F1F5F9] pb-2">
                    <FileText className="w-4 h-4 text-purple-600" /> Laporan Harian ({searchResults.reports.length})
                  </h4>
                  <div className="divide-y divide-[#F1F5F9]">
                    {searchResults.reports.map((r) => (
                      <div key={r.id} className="py-2.5 space-y-1 text-xs font-semibold">
                        <p className="font-extrabold text-[#0F172A] uppercase">Laporan {formatTanggal(r.date)}</p>
                        <p className="text-[#475569] leading-relaxed italic">"{r.todayWork}"</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          ) : (
            /* TABBED VIEWS */
            <div className="animate-fade-in">
              {currentTab === 'beranda' && (
                <DashboardView
                  onQuickAction={handleQuickAction}
                  setTab={setTab}
                  onEditProject={(p) => setActiveSheet('buat_proyek')}
                />
              )}
              {currentTab === 'proyek' && (
                <ProjectListView onCreateProjectClick={() => setActiveSheet('buat_proyek')} />
              )}
              {currentTab === 'barang' && <InventoryView />}
              {currentTab === 'keuangan' && <FinanceView />}
              {currentTab === 'rekap' && <RekapView />}
              {currentTab === 'upah' && (
                <WorkersView
                  onAddWorkerClick={() => setActiveSheet('tambah_tukang')}
                  onPayWorkerClick={() => setActiveSheet('upah_tukang')}
                />
              )}
              {currentTab === 'laporan' && <ReportsView />}
              {currentTab === 'kalkulator' && <ProjectCalculator />}
              {currentTab === 'notifikasi' && <NotificationsView />}
              {currentTab === 'pengaturan' && <SettingsView />}
            </div>
          )}
        </main>
      </div>

      {/* Floating Action Button (FAB) for Mobile Quick Actions */}
      <div className="lg:hidden fixed bottom-24 right-6 z-40 select-none">
        <button
          onClick={() => setActiveSheet('aktivitas_cepat')}
          className="w-14 h-14 rounded-full bg-[#FAF8FF] border-3 border-[#0F172A] flex items-center justify-center font-extrabold text-[#0F172A] shadow-neo cursor-pointer transition-all active:scale-95 hover:bg-white"
          aria-label="Aktivitas Cepat"
        >
          <Plus className="w-8 h-8" />
        </button>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        currentTab={currentTab}
        setTab={(t) => {
          setTab(t);
          setSearchValue('');
        }}
        onQuickActionClick={() => setActiveSheet('aktivitas_cepat')}
        onProfileClick={() => setTab('pengaturan')}
      />

      {/* GLOBAL DRAWER BOTTOM SHEETS */}
      <BottomSheet
        isOpen={activeSheet !== null}
        onClose={() => setActiveSheet(null)}
        title={
          activeSheet === 'buat_proyek'
            ? 'Buat Proyek Baru'
            : activeSheet === 'dana_masuk'
            ? 'Catat Dana Masuk'
            : activeSheet === 'barang_masuk'
            ? 'Catat Barang Masuk'
            : activeSheet === 'barang_keluar'
            ? 'Catat Barang Keluar'
            : activeSheet === 'barang_terpakai'
            ? 'Catat Barang Terpakai'
            : activeSheet === 'pengeluaran'
            ? 'Catat Seluruh Pengeluaran'
            : activeSheet === 'upah_tukang'
            ? 'Bayar Upah Tukang'
            : activeSheet === 'laporan_harian'
            ? 'Kirim Laporan Harian'
            : activeSheet === 'tambah_tukang'
            ? 'Tambah Tukang Baru'
            : activeSheet === 'aktivitas_cepat'
            ? 'AKTIVITAS CEPAT LAPANGAN'
            : ''
        }
      >
        {activeSheet === 'aktivitas_cepat' && (
          <div className="p-1 space-y-4 select-none">
            <p className="text-xs text-[#64748B] font-bold uppercase tracking-wider mb-2">
              Catat aktivitas lapangan sekarang
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setActiveSheet('dana_masuk')}
                className="py-4 px-3 rounded-2xl border-2 border-[#0F172A] bg-[#E0F2FE] text-[#0F172A] font-extrabold text-xs shadow-neo-sm hover:translate-y-[2px] transition-all cursor-pointer flex flex-col items-center justify-center gap-2 text-center"
              >
                <span className="text-2xl">💰</span>
                <span>DANA MASUK</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSheet('pengeluaran')}
                className="py-4 px-3 rounded-2xl border-2 border-[#0F172A] bg-[#FFF7ED] text-[#0F172A] font-extrabold text-xs shadow-neo-sm hover:translate-y-[2px] transition-all cursor-pointer flex flex-col items-center justify-center gap-2 text-center"
              >
                <span className="text-2xl">💸</span>
                <span>PENGELUARAN</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSheet('barang_masuk')}
                className="py-4 px-3 rounded-2xl border-2 border-[#0F172A] bg-[#FEF3C7] text-[#0F172A] font-extrabold text-xs shadow-neo-sm hover:translate-y-[2px] transition-all cursor-pointer flex flex-col items-center justify-center gap-2 text-center"
              >
                <span className="text-2xl">📦</span>
                <span>BARANG MASUK</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSheet('barang_keluar')}
                className="py-4 px-3 rounded-2xl border-2 border-[#0F172A] bg-[#FAF8FF] text-[#0F172A] font-extrabold text-xs shadow-neo-sm hover:translate-y-[2px] transition-all cursor-pointer flex flex-col items-center justify-center gap-2 text-center"
              >
                <span className="text-2xl">📤</span>
                <span>BARANG KELUAR</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSheet('barang_terpakai')}
                className="py-4 px-3 rounded-2xl border-2 border-[#0F172A] bg-[#FEE2E2] text-[#0F172A] font-extrabold text-xs shadow-neo-sm hover:translate-y-[2px] transition-all cursor-pointer flex flex-col items-center justify-center gap-2 text-center"
              >
                <span className="text-2xl">🛠️</span>
                <span>BARANG TERPAKAI</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSheet('upah_tukang')}
                className="py-4 px-3 rounded-2xl border-2 border-[#0F172A] bg-[#D1FAE5] text-[#0F172A] font-extrabold text-xs shadow-neo-sm hover:translate-y-[2px] transition-all cursor-pointer flex flex-col items-center justify-center gap-2 text-center"
              >
                <span className="text-2xl">👷</span>
                <span>BAYAR UPAH</span>
              </button>
            </div>
            
            <button
              type="button"
              onClick={() => setActiveSheet('laporan_harian')}
              className="w-full py-4 px-3 rounded-2xl border-2 border-[#0F172A] bg-[#FAF8FF] text-[#0F172A] font-extrabold text-sm shadow-neo-sm hover:translate-y-[2px] transition-all cursor-pointer flex items-center justify-center gap-2 text-center"
            >
              <span className="text-xl">📝</span>
              <span>KIRIM LAPORAN HARIAN PROYEK</span>
            </button>

            <div className="flex gap-2 pt-1 select-none">
              <button
                type="button"
                onClick={() => setActiveSheet('tambah_tukang')}
                className="flex-1 py-2 px-3 rounded-xl border border-[#0F172A] bg-white text-[#0F172A] font-bold text-xs shadow-neo-sm hover:bg-slate-50 cursor-pointer"
              >
                ＋ Tambah Pekerja
              </button>
              <button
                type="button"
                onClick={() => setActiveSheet('buat_proyek')}
                className="flex-1 py-2 px-3 rounded-xl border border-[#0F172A] bg-white text-[#0F172A] font-bold text-xs shadow-neo-sm hover:bg-slate-50 cursor-pointer"
              >
                🚧 Buat Proyek Baru
              </button>
            </div>
          </div>
        )}

        {activeSheet === 'buat_proyek' && (
          <ProyekForm
            onSubmit={async (data) => {
              try {
                await addProject(data);
                setActiveSheet(null);
              } catch {
                // error is notified through toast
              }
            }}
            onCancel={() => setActiveSheet(null)}
          />
        )}
        {activeSheet === 'dana_masuk' && (
          <DanaMasukForm
            onSubmit={(data) => {
              addDanaMasuk(data);
              setActiveSheet(null);
            }}
            onCancel={() => setActiveSheet(null)}
          />
        )}
        {activeSheet === 'barang_masuk' && (
          <BarangMasukForm
            onSubmit={(data) => {
              addBarangMasuk(data);
              setActiveSheet(null);
            }}
            onCancel={() => setActiveSheet(null)}
          />
        )}
        {activeSheet === 'barang_keluar' && (
          <BarangKeluarForm
            materials={state.materials.filter(m => m.projectId === state.activeProjectId)}
            onSubmit={(data) => {
              addBarangKeluar(data);
              setActiveSheet(null);
            }}
            onCancel={() => setActiveSheet(null)}
          />
        )}
        {activeSheet === 'barang_terpakai' && (
          <BarangTerpakaiForm
            materials={state.materials.filter(m => m.projectId === state.activeProjectId)}
            onSubmit={(data) => {
              addBarangTerpakai(data);
              setActiveSheet(null);
            }}
            onCancel={() => setActiveSheet(null)}
          />
        )}
        {activeSheet === 'pengeluaran' && (
          <PengeluaranForm
            onSubmit={(data) => {
              addPengeluaran(data);
              setActiveSheet(null);
            }}
            onCancel={() => setActiveSheet(null)}
          />
        )}
        {activeSheet === 'upah_tukang' && (
          <UpahForm
            workers={state.workers.filter(w => w.projectId === state.activeProjectId)}
            onSubmit={(workerId, amount, method) => {
              payWorker(workerId, amount, method);
              setActiveSheet(null);
            }}
            onCancel={() => setActiveSheet(null)}
          />
        )}
        {activeSheet === 'laporan_harian' && (
          <LaporanForm
            onSubmit={(data) => {
              addDailyReport(data);
              setActiveSheet(null);
            }}
            onCancel={() => setActiveSheet(null)}
          />
        )}
        {activeSheet === 'tambah_tukang' && (
          <TambahPekerjaForm
            onSubmit={(data) => {
              addWorker(data);
              setActiveSheet(null);
            }}
            onCancel={() => setActiveSheet(null)}
          />
        )}
      </BottomSheet>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}
