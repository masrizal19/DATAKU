/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Home,
  Briefcase,
  Layers,
  DollarSign,
  Users,
  FileText,
  Calculator,
  Bell,
  Settings,
  LogOut,
  Plus,
  Search,
  User,
  ChevronDown,
  BarChart2
} from 'lucide-react';
import { Card } from './Common';

interface NavigationProps {
  currentTab: string;
  setTab: (tab: string) => void;
  onQuickActionClick: () => void;
  onProfileClick: () => void;
  onSearchChange?: (val: string) => void;
  searchValue?: string;
  onOpenNotifications?: () => void;
}

export const DesktopSidebar: React.FC<NavigationProps> = ({
  currentTab,
  setTab,
  onProfileClick
}) => {
  const { state, logoutUser } = useApp();
  const unreadNotifs = state.notifications.filter(n => !n.isRead).length;

  const menuItems = [
    { id: 'beranda', label: 'Beranda', icon: Home },
    { id: 'proyek', label: 'Proyek Saya', icon: Briefcase },
    { id: 'barang', label: 'Stok Barang', icon: Layers },
    { id: 'keuangan', label: 'Alur Keuangan', icon: DollarSign },
    { id: 'rekap', label: 'Rekap Keuangan', icon: BarChart2 },
    { id: 'upah', label: 'Upah Tukang', icon: Users },
    { id: 'laporan', label: 'Laporan Harian', icon: FileText },
    { id: 'kalkulator', label: 'Kalkulator', icon: Calculator },
    { id: 'notifikasi', label: 'Notifikasi', icon: Bell, badge: unreadNotifs },
    { id: 'pengaturan', label: 'Pengaturan', icon: Settings }
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen fixed left-0 top-0 bg-white border-r-2.5 border-[#0F172A] z-40 p-5 select-none justify-between">
      <div className="space-y-6">
        {/* Wordmark logo */}
        <div className="flex items-center gap-2.5 px-1 py-2">
          <div className="w-10 h-10 rounded-xl bg-[#FBBF24] border-2 border-[#0F172A] shadow-neo-sm flex items-center justify-center font-chunky text-lg text-[#0F172A]">
            🔨
          </div>
          <div>
            <h1 className="text-2xl font-chunky text-[#0F172A] leading-none tracking-tight">DATAKU</h1>
            <span className="text-[9px] font-extrabold uppercase bg-[#38BDF8] text-[#0F172A] px-1.5 py-0.5 rounded border border-[#0F172A] mt-1 inline-block shadow-neo-sm">
              SISTEM MANDOR
            </span>
          </div>
        </div>

        {/* Sidebar Menu */}
        <nav className="space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl border-2 transition-all font-bold text-sm cursor-pointer ${
                  isActive
                    ? 'bg-[#E0F2FE] text-[#0F172A] border-[#0F172A] shadow-neo-sm translate-x-[2px]'
                    : 'bg-transparent text-[#475569] border-transparent hover:text-[#0F172A] hover:bg-[#F8FAFC]'
                }`}
              >
                <div className="relative">
                  <Icon className="w-4.5 h-4.5" />
                  {item.badge && item.badge > 0 ? (
                    <span className="absolute -top-1.5 -right-2 bg-red-500 text-white font-black text-[9px] rounded-full w-4 h-4 flex items-center justify-center border border-[#0F172A]">
                      {item.badge}
                    </span>
                  ) : null}
                </div>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Profile summary & logout at bottom */}
      <div className="border-t-2 border-[#F1F5F9] pt-4 space-y-3">
        {state.currentUser ? (
          <div
            onClick={onProfileClick}
            className="flex items-center gap-3 p-2 rounded-xl border-1.5 border-[#0F172A]/15 hover:border-[#0F172A] hover:bg-[#FAF8FF] cursor-pointer transition-all active:scale-98 select-none"
          >
            <div className="w-10 h-10 rounded-lg border border-[#0F172A] overflow-hidden bg-amber-100 flex items-center justify-center">
              {state.currentUser.photo ? (
                <img src={state.currentUser.photo} alt={state.currentUser.name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-[#0F172A]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-extrabold text-[#0F172A] truncate uppercase tracking-wider">{state.currentUser.name}</p>
              <p className="text-[10px] text-[#64748B] font-semibold truncate">{state.currentUser.phone}</p>
            </div>
          </div>
        ) : null}

        <button
          onClick={logoutUser}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-500 transition-all font-bold text-xs cursor-pointer select-none"
        >
          <LogOut className="w-4 h-4" />
          Keluar Sistem
        </button>
      </div>
    </aside>
  );
};

export const MobileBottomNav: React.FC<NavigationProps> = ({
  currentTab,
  setTab,
  onQuickActionClick
}) => {
  const items = [
    { id: 'beranda', label: 'Beranda', icon: Home },
    { id: 'barang', label: 'Barang', icon: Layers },
    { id: 'quick', label: 'Tambah', icon: Plus, isFab: true },
    { id: 'keuangan', label: 'Keuangan', icon: DollarSign },
    { id: 'lainnya', label: 'Lainnya', icon: Settings }
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2.5 border-[#0F172A] z-40 shadow-[0_-3px_10px_rgba(15,23,42,0.06)] px-2.5 py-1.5 flex justify-between items-center select-none">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = currentTab === item.id || (item.id === 'lainnya' && ['proyek', 'rekap', 'upah', 'laporan', 'kalkulator', 'notifikasi', 'pengaturan', 'profil'].includes(currentTab));
        
        if (item.isFab) {
          return (
            <button
              key={item.id}
              onClick={onQuickActionClick}
              className="relative -top-5 bg-[#F59E0B] hover:bg-[#d97706] text-[#0F172A] border-2.5 border-[#0F172A] p-3.5 rounded-full shadow-neo active:translate-y-1 active:shadow-none cursor-pointer transition-all flex items-center justify-center focus:outline-none"
            >
              <Icon className="w-6 h-6 stroke-[3px]" />
            </button>
          );
        }

        return (
          <button
            key={item.id}
            onClick={() => setTab(item.id === 'lainnya' ? 'pengaturan' : item.id)}
            className="flex-1 flex flex-col items-center justify-center py-1.5 cursor-pointer focus:outline-none"
          >
            <div className={`p-1.5 rounded-xl border-1.5 flex items-center justify-center transition-all ${
              isActive 
                ? 'bg-[#E0F2FE] border-[#0F172A] text-[#0F172A] scale-105 shadow-neo-sm' 
                : 'bg-transparent border-transparent text-[#64748B]'
            }`}>
              <Icon className="w-5 h-5" />
            </div>
            <span className={`text-[10px] font-bold mt-1 tracking-wide ${isActive ? 'text-[#0F172A]' : 'text-[#64748B]'}`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

// Global top header with Search & Active Project Selector
interface HeaderBannerProps {
  currentTab: string;
  setTab: (tab: string) => void;
  onSearchChange: (val: string) => void;
  searchValue: string;
}

export const HeaderBanner: React.FC<HeaderBannerProps> = ({
  currentTab,
  setTab,
  onSearchChange,
  searchValue
}) => {
  const { state, setActiveProject } = useApp();
  const [showProjDrop, setShowProjDrop] = useState(false);
  const activeProj = state.projects.find(p => p.id === state.activeProjectId);
  const unreadNotifs = state.notifications.filter(n => !n.isRead).length;

  const handleProjectSelect = (id: string) => {
    setActiveProject(id);
    setShowProjDrop(false);
  };

  return (
    <header className="bg-white border-b-2 border-[#0F172A] p-4 flex flex-col md:flex-row gap-3.5 justify-between items-stretch md:items-center sticky top-0 z-30 select-none">
      {/* Welcome & Project Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <span className="text-[10px] text-[#64748B] font-extrabold uppercase tracking-widest leading-none">DATAKU MANDOR</span>
          <h2 className="text-lg font-chunky text-[#0F172A] uppercase tracking-wide leading-tight">
            {currentTab === 'beranda' ? `Selamat Datang, ${state.currentUser?.name || 'PAUJI'}!` : currentTab.toUpperCase()}
          </h2>
        </div>

        {state.projects.length > 0 && activeProj ? (
          <div className="relative">
            <button
              onClick={() => setShowProjDrop(!showProjDrop)}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#FAF8FF] border-2 border-[#0F172A] rounded-xl text-xs font-bold text-[#0f172a] shadow-neo-sm hover:bg-[#F1F5F9] active:translate-y-0.5 transition-all cursor-pointer select-none"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-[#0F172A]" />
              <span className="max-w-[150px] sm:max-w-[200px] truncate">{activeProj.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#64748B]" />
            </button>

            {showProjDrop && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowProjDrop(false)} />
                <div className="absolute top-full left-0 mt-1.5 bg-white border-2 border-[#0F172A] rounded-xl shadow-neo-lg z-20 w-64 overflow-hidden py-1.5 select-none">
                  <div className="px-3 py-1.5 border-b border-[#F1F5F9] text-[9px] font-bold text-[#64748B] uppercase tracking-wider">
                    PILIH PROYEK AKTIF
                  </div>
                  {state.projects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleProjectSelect(p.id)}
                      className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center gap-2 hover:bg-[#FAF8FF] transition-colors cursor-pointer ${
                        p.id === state.activeProjectId ? 'bg-[#E0F2FE] text-[#0284C7] font-bold' : 'text-[#0F172A]'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${p.isArchived ? 'bg-slate-400' : 'bg-emerald-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-bold leading-none">{p.name}</p>
                        <p className="text-[9px] text-[#64748B] mt-1">{p.location}</p>
                      </div>
                    </button>
                  ))}
                  <div className="border-t border-[#F1F5F9] mt-1 px-1.5 pt-1.5">
                    <button
                      onClick={() => {
                        setTab('proyek');
                        setShowProjDrop(false);
                      }}
                      className="w-full text-center py-2 bg-[#F1F5F9] border border-[#0F172A] hover:bg-white text-[10px] font-bold rounded-lg cursor-pointer"
                    >
                      + Kelola Semua Proyek
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>

      {/* Global Search & Notifications */}
      <div className="flex items-center gap-3">
        {/* Search Input bar */}
        <div className="relative flex-1 md:w-64">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none select-none">
            <Search className="w-4 h-4 text-[#64748B]" />
          </span>
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari barang, tukang, nota..."
            className="w-full bg-[#FAF8FF] border-2 border-[#0F172A] rounded-xl pl-9.5 pr-3.5 py-1.5 text-xs font-bold text-[#0F172A] placeholder-[#64748B] focus:outline-none focus:border-[#0284C7] transition-all shadow-inner"
          />
          {searchValue && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs font-extrabold text-[#64748B] hover:text-[#0F172A]"
            >
              ×
            </button>
          )}
        </div>

        {/* Notifications Icon with Badge counts */}
        <button
          onClick={() => setTab('notifikasi')}
          className="relative p-2 rounded-xl bg-white border-2 border-[#0F172A] shadow-neo-sm hover:bg-[#FAF8FF] active:translate-y-0.5 transition-all cursor-pointer flex items-center justify-center focus:outline-none"
        >
          <Bell className="w-4 h-4 text-[#0F172A]" />
          {unreadNotifs > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white font-black text-[9px] rounded-full w-4.5 h-4.5 flex items-center justify-center border border-[#0F172A] animate-bounce">
              {unreadNotifs}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
