/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { DEFAULT_NAVIGATION_CONFIG } from '../services/identityService';
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
import { AppBrand } from './AppBrand';

interface NavigationProps {
  currentTab: string;
  setTab: (tab: string) => void;
  onQuickActionClick: () => void;
  onProfileClick: () => void;
  onSearchChange?: (val: string) => void;
  searchValue?: string;
  onOpenNotifications?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const DesktopSidebar: React.FC<NavigationProps> = ({
  currentTab,
  setTab,
  onProfileClick,
  isOpen = false,
  onClose
}) => {
  const { state, identityConfig, logoutUser } = useApp();
  const unreadNotifs = state.notifications.filter(n => !n.isRead).length;
  const navCfg = identityConfig?.navigationSettings || DEFAULT_NAVIGATION_CONFIG;

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

  const handleTabSelect = (tabId: string) => {
    setTab(tabId);
    if (onClose) {
      onClose();
    }
  };

  const weightClass = 
    navCfg.textWeight === 'regular' ? 'font-normal' :
    navCfg.textWeight === 'medium' ? 'font-medium' :
    navCfg.textWeight === 'semibold' ? 'font-semibold' : 'font-bold';

  return (
    <>
      {/* Semi-transparent dark overlay backdrop behind the mobile drawer */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="lg:hidden fixed inset-0 bg-[#0F172A]/70 z-45 animate-fade-in transition-opacity"
        />
      )}

      <aside 
        className={`fixed top-0 bottom-0 left-0 w-[280px] sm:w-[320px] lg:w-64 h-screen bg-white border-r-3 lg:border-r-2.5 border-[#0F172A] z-50 p-5 select-none justify-between flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:flex ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="space-y-6">
          {/* Logo & Close button row */}
          <div className="flex items-center justify-between px-1 py-2">
            <AppBrand variant="sidebar" />

            {/* Mobile close button (✕) with touch target >= 44x44px */}
            <button
              onClick={onClose}
              className="lg:hidden w-11 h-11 rounded-xl border-2 border-[#0F172A] bg-white hover:bg-slate-100 flex items-center justify-center font-extrabold text-sm cursor-pointer select-none"
              aria-label="Tutup Menu"
            >
              ✕
            </button>
          </div>

          {/* Sidebar Menu */}
          <nav className="overflow-y-auto max-h-[60vh] no-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: `${navCfg.menuGap}px` }}>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabSelect(item.id)}
                  style={{
                    boxSizing: 'border-box',
                    display: 'flex',
                    alignItems: 'center',
                    gap: `${navCfg.iconTextGap}px`,
                    padding: `${navCfg.activePaddingY}px ${navCfg.activePaddingX}px`,
                    borderRadius: `${navCfg.activeRadius}px`,
                    fontSize: `${navCfg.textSize}px`,
                    backgroundColor: isActive ? navCfg.activeBackgroundColor : 'transparent',
                    color: isActive ? navCfg.activeTextColor : '#475569',
                    borderWidth: `${isActive && navCfg.activeOutlineEnabled ? navCfg.activeOutlineWidth : 2}px`,
                    borderColor: isActive && navCfg.activeOutlineEnabled ? navCfg.activeOutlineColor : 'transparent',
                    borderStyle: 'solid',
                  }}
                  className={`w-full transition-all cursor-pointer ${weightClass} ${
                    isActive
                      ? 'shadow-neo-sm'
                      : 'hover:bg-slate-50 hover:text-[#0F172A]'
                  }`}
                >
                  <div className="relative flex items-center justify-center" style={{ transform: `translateY(${navCfg.iconOffsetY}px)` }}>
                    <Icon style={{ width: `${navCfg.iconSize}px`, height: `${navCfg.iconSize}px` }} />
                    {item.badge && item.badge > 0 ? (
                      <span className="absolute -top-1.5 -right-2 bg-red-500 text-white font-black text-[9px] rounded-full w-4 h-4 flex items-center justify-center border border-[#0F172A]">
                        {item.badge}
                      </span>
                    ) : null}
                  </div>
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Profile summary & logout at bottom */}
        <div className="border-t-2 border-[#F1F5F9] pt-4 space-y-3">
          {state.currentUser ? (
            <div
              onClick={() => {
                handleTabSelect('pengaturan');
                onProfileClick();
              }}
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
            onClick={() => {
              logoutUser();
              if (onClose) onClose();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-500 transition-all font-bold text-xs cursor-pointer select-none"
          >
            <LogOut className="w-4 h-4" />
            Keluar Sistem
          </button>
        </div>
      </aside>
    </>
  );
};

// Global top header with Search, Active Project Selector & Hamburger Drawer Button
interface HeaderBannerProps {
  currentTab: string;
  setTab: (tab: string) => void;
  onSearchChange: (val: string) => void;
  searchValue: string;
  onOpenSidebar?: () => void;
}

export const HeaderBanner: React.FC<HeaderBannerProps> = ({
  currentTab,
  setTab,
  onSearchChange,
  searchValue,
  onOpenSidebar
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
    <header className="bg-white border-b-2 border-[#0F172A] p-4 flex flex-col gap-3.5 sticky top-0 z-30 select-none">
      {/* MOBILE-ONLY HEADER ROW (Logo left, [ ☰ ] right) */}
      <div className="flex lg:hidden justify-between items-center w-full">
        {/* Logo Left */}
        <AppBrand variant="mobile" />

        {/* Hamburger Right [ ☰ ] with Touch Target >= 44x44px */}
        <button
          onClick={onOpenSidebar}
          aria-label="Buka Menu"
          className="w-11 h-11 rounded-xl border-2 border-[#0F172A] bg-[#FAF8FF] hover:bg-slate-100 flex items-center justify-center font-extrabold text-lg shadow-neo-sm cursor-pointer select-none transition-all active:translate-y-0.5 active:shadow-none"
        >
          ☰
        </button>
      </div>

      {/* RESPONSIVE BANNER WORKSPACE ROW */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3.5">
        {/* Welcome & Project Selector */}
        <div className="flex flex-row items-center justify-between md:justify-start gap-3 flex-wrap">
          <div className="hidden lg:block">
            <span className="text-[10px] text-[#64748B] font-extrabold uppercase tracking-widest leading-none">DATAKU MANDOR</span>
            <h2 className="text-lg font-chunky text-[#0F172A] uppercase tracking-wide leading-tight mt-0.5">
              {currentTab === 'beranda' ? `Selamat Datang, ${state.currentUser?.name || 'PAUJI'}!` : currentTab.toUpperCase()}
            </h2>
          </div>

          <div className="lg:hidden text-xs font-black uppercase text-[#475569] tracking-wider">
            Menu: {currentTab === 'beranda' ? 'Beranda' : currentTab === 'proyek' ? 'Proyek Saya' : currentTab === 'barang' ? 'Stok Barang' : currentTab === 'keuangan' ? 'Alur Keuangan' : currentTab === 'rekap' ? 'Rekap Keuangan' : currentTab === 'upah' ? 'Upah Tukang' : currentTab === 'laporan' ? 'Laporan Harian' : currentTab === 'kalkulator' ? 'Kalkulator' : currentTab === 'notifikasi' ? 'Notifikasi' : 'Pengaturan'}
          </div>

          {state.projects.length > 0 && activeProj ? (
            <div className="relative">
              <button
                onClick={() => setShowProjDrop(!showProjDrop)}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#FAF8FF] border-2 border-[#0F172A] rounded-xl text-xs font-bold text-[#0f172a] shadow-neo-sm hover:bg-[#F1F5F9] active:translate-y-0.5 transition-all cursor-pointer select-none"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-[#0F172A]" />
                <span className="max-w-[120px] sm:max-w-[200px] truncate">{activeProj.name}</span>
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
        <div className="flex items-center gap-3 w-full md:w-auto">
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
            className="relative p-2 rounded-xl bg-white border-2 border-[#0F172A] shadow-neo-sm hover:bg-[#FAF8FF] active:translate-y-0.5 transition-all cursor-pointer flex items-center justify-center focus:outline-none shrink-0"
          >
            <Bell className="w-4 h-4 text-[#0F172A]" />
            {unreadNotifs > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white font-black text-[9px] rounded-full w-4.5 h-4.5 flex items-center justify-center border border-[#0F172A] animate-bounce">
                {unreadNotifs}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export const MobileBottomNav: React.FC<NavigationProps> = ({
  currentTab,
  setTab,
  onQuickActionClick
}) => {
  const items = [
    { id: 'beranda', label: 'Beranda', icon: Home, matchTabs: ['beranda'], type: 'tab' },
    { id: 'proyek', label: 'Proyek', icon: Briefcase, matchTabs: ['proyek'], type: 'tab' },
    { id: 'quick_action', label: '', icon: Plus, matchTabs: [], type: 'action' },
    { id: 'keuangan', label: 'Keuangan', icon: DollarSign, matchTabs: ['keuangan', 'rekap'], type: 'tab' },
    { id: 'upah', label: 'Upah', icon: Users, matchTabs: ['upah'], type: 'tab' }
  ];

  return (
    <div 
      className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2.5 border-[#0F172A] z-45 px-2 pt-2 shadow-[0_-3px_10px_rgba(15,23,42,0.06)] select-none" 
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)' }}
    >
      <div className="flex justify-around items-center max-w-lg mx-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.type === 'tab' && item.matchTabs.includes(currentTab);

          if (item.type === 'action') {
            return (
              <button
                key={item.id}
                onClick={onQuickActionClick}
                className="flex-1 flex flex-col items-center justify-center py-1 cursor-pointer focus:outline-none"
                aria-label="Aktivitas Cepat"
              >
                <div className="w-11 h-11 rounded-full bg-[#FAF8FF] border-2.5 border-[#0F172A] flex items-center justify-center text-[#0F172A] shadow-neo-sm hover:bg-white active:scale-95 transition-all">
                  <Icon className="w-6 h-6 stroke-[3]" />
                </div>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className="flex-1 flex flex-col items-center justify-center py-1 cursor-pointer focus:outline-none"
            >
              <div className={`p-1.5 px-3 rounded-xl border-1.5 flex items-center justify-center transition-all ${
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
    </div>
  );
};

