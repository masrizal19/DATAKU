/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, ChangeEvent } from 'react';
import { useApp } from '../context/AppContext';
import { AppIdentityConfig, NavigationConfig } from '../types';
import { Card, Button, Badge } from './Common';
import { AppBrand } from './AppBrand';
import { DEFAULT_IDENTITY_CONFIG, DEFAULT_NAVIGATION_CONFIG } from '../services/identityService';
import {
  Upload,
  Camera,
  Image as ImageIcon,
  RotateCcw,
  Save,
  Check,
  Smartphone,
  Monitor,
  Sparkles,
  Sliders,
  Type,
  Palette,
  Move,
  Maximize2,
  Square,
  Layers,
  Navigation as NavIcon,
  Home,
  Briefcase,
  DollarSign,
  Users,
  FileText,
  Calculator,
  Bell,
  Settings,
  BarChart2
} from 'lucide-react';

export const IdentitySettingsSection: React.FC = () => {
  const { identityConfig, updateIdentityConfig, resetIdentityConfig, saveIdentityConfig } = useApp();

  // Local working copy for live editing
  const [formData, setFormData] = useState<AppIdentityConfig>({ ...identityConfig });
  const [previewTab, setPreviewTab] = useState<'desktop' | 'mobile'>('desktop');
  const [activeSubTab, setActiveSubTab] = useState<'identity' | 'navigation'>('identity');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // File input refs for desktop file / gallery / camera
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Handle immediate change & propagate to preview
  const handleChange = <K extends keyof AppIdentityConfig>(key: K, value: AppIdentityConfig[K]) => {
    const updated = { ...formData, [key]: value };
    setFormData(updated);
    updateIdentityConfig(updated);
    if (saveSuccess) setSaveSuccess(false);
  };

  const navCfg = formData.navigationSettings || DEFAULT_NAVIGATION_CONFIG;

  const handleNavChange = <K extends keyof NavigationConfig>(key: K, value: NavigationConfig[K]) => {
    const updatedNav = { ...navCfg, [key]: value };
    const updated = { ...formData, navigationSettings: updatedNav };
    setFormData(updated);
    updateIdentityConfig(updated);
    if (saveSuccess) setSaveSuccess(false);
  };

  // Image Upload handler (supports PNG, JPG, JPEG, WEBP)
  const handleImageFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check valid mime
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Format gambar harus berupa PNG, JPG, JPEG, atau WEBP.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        handleChange('logoUrl', base64);
      }
    };
    reader.readAsDataURL(file);
    // Reset file input value so same file can be selected again
    e.target.value = '';
  };

  // Reset to default
  const handleReset = () => {
    if (window.confirm('Kembalikan pengaturan identitas dan logo ke konfigurasi default DATAKU?')) {
      resetIdentityConfig();
      setFormData({ ...DEFAULT_IDENTITY_CONFIG });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  // Save changes
  const handleSave = () => {
    saveIdentityConfig(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Adjust logo scale with +/- buttons
  const stepLogoScale = (delta: number) => {
    const current = formData.logoScale || 100;
    const next = Math.max(25, Math.min(300, current + delta));
    handleChange('logoScale', next);
  };

  return (
    <div className="space-y-8 select-none">
      {/* SECTION TITLE BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-[#0F172A]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-[#FBBF24] rounded-lg border border-[#0F172A] text-sm">🎨</span>
            <h2 className="text-xl sm:text-2xl font-chunky text-[#0F172A] uppercase">
              Identitas Aplikasi & Logo
            </h2>
          </div>
          <p className="text-xs text-[#64748B] font-bold mt-1">
            Sesuaikan nama aplikasi, tagline, ukuran logo, posisi, dan warna dengan preview realtime.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="flex items-center gap-1.5 border-2 text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Kembalikan</span> Default
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            className="flex items-center gap-1.5 border-2 text-xs font-black shadow-neo-sm"
          >
            {saveSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300 stroke-[3]" />
                Tersimpan!
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                Simpan Pengaturan
              </>
            )}
          </Button>
        </div>
      </div>

      {/* SUB-TAB SWITCHER */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl border-2 border-[#0F172A] w-fit">
        <button
          onClick={() => setActiveSubTab('identity')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'identity'
              ? 'bg-[#0F172A] text-white shadow-neo-sm'
              : 'text-slate-600 hover:text-[#0F172A]'
          }`}
        >
          <Sparkles className="w-4 h-4 text-[#FBBF24]" />
          1. Identitas & Logo Aplikasi
        </button>
        <button
          onClick={() => setActiveSubTab('navigation')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'navigation'
              ? 'bg-[#0F172A] text-white shadow-neo-sm'
              : 'text-slate-600 hover:text-[#0F172A]'
          }`}
        >
          <NavIcon className="w-4 h-4 text-[#38BDF8]" />
          2. Style Navigasi & Active Menu
        </button>
      </div>

      {activeSubTab === 'navigation' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
          {/* LEFT COLUMN: CONTROLS */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. OUTLINE ACTIVE MENU */}
            <Card className="p-5 border-2 border-[#0F172A] shadow-neo-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                <Square className="w-4 h-4 text-[#38BDF8]" />
                <h3 className="text-sm font-chunky uppercase text-[#0F172A]">
                  1. Outline Active Menu
                </h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-xs font-bold text-[#0F172A] block">Tampilkan Outline Active</span>
                    <span className="text-[10px] text-slate-500 font-semibold">Garis pinggir pada menu yang sedang aktif</span>
                  </div>
                  <button
                    onClick={() => handleNavChange('activeOutlineEnabled', !navCfg.activeOutlineEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full border-2 border-[#0F172A] transition-colors ${
                      navCfg.activeOutlineEnabled ? 'bg-[#38BDF8]' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white border border-[#0F172A] transition-transform ${
                        navCfg.activeOutlineEnabled ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {navCfg.activeOutlineEnabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-bold text-[#0F172A]">
                        <span>Ketebalan Outline</span>
                        <span className="font-mono font-black text-xs text-slate-700">{navCfg.activeOutlineWidth} px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="6"
                        step="1"
                        value={navCfg.activeOutlineWidth}
                        onChange={(e) => handleNavChange('activeOutlineWidth', Number(e.target.value))}
                        className="w-full accent-[#0F172A] cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-[#0F172A]">Warna Outline Active</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={navCfg.activeOutlineColor}
                          onChange={(e) => handleNavChange('activeOutlineColor', e.target.value)}
                          className="w-9 h-9 rounded-lg border-2 border-[#0F172A] cursor-pointer p-0 bg-white shadow-neo-sm"
                        />
                        <span className="text-xs font-mono font-bold text-slate-700 uppercase">{navCfg.activeOutlineColor}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* 2. RADIUS & SPACING */}
            <Card className="p-5 border-2 border-[#0F172A] shadow-neo-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                <Maximize2 className="w-4 h-4 text-[#F97316]" />
                <h3 className="text-sm font-chunky uppercase text-[#0F172A]">
                  2. Radius, Padding & Spacing
                </h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold text-[#0F172A]">
                    <span>Radius Active Menu</span>
                    <span className="font-mono font-black text-xs text-slate-700">{navCfg.activeRadius} px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="1"
                    value={navCfg.activeRadius}
                    onChange={(e) => handleNavChange('activeRadius', Number(e.target.value))}
                    className="w-full accent-[#0F172A] cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-bold text-[#0F172A]">
                      <span>Padding Horizontal (X)</span>
                      <span className="font-mono font-black text-xs text-slate-700">{navCfg.activePaddingX} px</span>
                    </div>
                    <input
                      type="range"
                      min="4"
                      max="32"
                      step="1"
                      value={navCfg.activePaddingX}
                      onChange={(e) => handleNavChange('activePaddingX', Number(e.target.value))}
                      className="w-full accent-[#0F172A] cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-bold text-[#0F172A]">
                      <span>Padding Vertical (Y)</span>
                      <span className="font-mono font-black text-xs text-slate-700">{navCfg.activePaddingY} px</span>
                    </div>
                    <input
                      type="range"
                      min="4"
                      max="24"
                      step="1"
                      value={navCfg.activePaddingY}
                      onChange={(e) => handleNavChange('activePaddingY', Number(e.target.value))}
                      className="w-full accent-[#0F172A] cursor-pointer"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold text-[#0F172A]">
                    <span>Jarak Antar Menu (Gap)</span>
                    <span className="font-mono font-black text-xs text-slate-700">{navCfg.menuGap} px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="1"
                    value={navCfg.menuGap}
                    onChange={(e) => handleNavChange('menuGap', Number(e.target.value))}
                    className="w-full accent-[#0F172A] cursor-pointer"
                  />
                </div>
              </div>
            </Card>

            {/* 3. ICON & TYPOGRAPHY */}
            <Card className="p-5 border-2 border-[#0F172A] shadow-neo-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                <Type className="w-4 h-4 text-[#EC4899]" />
                <h3 className="text-sm font-chunky uppercase text-[#0F172A]">
                  3. Ukuran Icon & Teks Menu
                </h3>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-bold text-[#0F172A]">
                      <span>Jarak Icon ↔ Teks</span>
                      <span className="font-mono font-black text-xs text-slate-700">{navCfg.iconTextGap} px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="30"
                      step="1"
                      value={navCfg.iconTextGap}
                      onChange={(e) => handleNavChange('iconTextGap', Number(e.target.value))}
                      className="w-full accent-[#0F172A] cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-bold text-[#0F172A]">
                      <span>Ukuran Icon</span>
                      <span className="font-mono font-black text-xs text-slate-700">{navCfg.iconSize} px</span>
                    </div>
                    <input
                      type="range"
                      min="14"
                      max="32"
                      step="1"
                      value={navCfg.iconSize}
                      onChange={(e) => handleNavChange('iconSize', Number(e.target.value))}
                      className="w-full accent-[#0F172A] cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-bold text-[#0F172A]">
                      <span>Posisi Vertikal Icon</span>
                      <span className="font-mono font-black text-xs text-slate-700">{navCfg.iconOffsetY > 0 ? `+${navCfg.iconOffsetY}` : navCfg.iconOffsetY} px</span>
                    </div>
                    <input
                      type="range"
                      min="-5"
                      max="5"
                      step="1"
                      value={navCfg.iconOffsetY}
                      onChange={(e) => handleNavChange('iconOffsetY', Number(e.target.value))}
                      className="w-full accent-[#0F172A] cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-bold text-[#0F172A]">
                      <span>Ukuran Teks Menu</span>
                      <span className="font-mono font-black text-xs text-slate-700">{navCfg.textSize} px</span>
                    </div>
                    <input
                      type="range"
                      min="12"
                      max="20"
                      step="1"
                      value={navCfg.textSize}
                      onChange={(e) => handleNavChange('textSize', Number(e.target.value))}
                      className="w-full accent-[#0F172A] cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-[#0F172A]">Ketebalan Teks</label>
                    <select
                      value={navCfg.textWeight}
                      onChange={(e) => handleNavChange('textWeight', e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border-2 border-[#0F172A] bg-white text-xs font-bold text-[#0F172A]"
                    >
                      <option value="regular">Regular</option>
                      <option value="medium">Medium</option>
                      <option value="semibold">Semibold</option>
                      <option value="bold">Bold</option>
                    </select>
                  </div>
                </div>
              </div>
            </Card>

            {/* 4. WARNA ACTIVE */}
            <Card className="p-5 border-2 border-[#0F172A] shadow-neo-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                <Palette className="w-4 h-4 text-[#8B5CF6]" />
                <h3 className="text-sm font-chunky uppercase text-[#0F172A]">
                  4. Skema Warna Active Menu
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <label className="block text-[11px] font-extrabold text-[#0F172A] uppercase">Background Active Menu</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={navCfg.activeBackgroundColor}
                      onChange={(e) => handleNavChange('activeBackgroundColor', e.target.value)}
                      className="w-9 h-9 rounded-lg border-2 border-[#0F172A] cursor-pointer p-0 bg-white shadow-neo-sm"
                    />
                    <span className="text-xs font-mono font-bold text-slate-700 uppercase">{navCfg.activeBackgroundColor}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <label className="block text-[11px] font-extrabold text-[#0F172A] uppercase">Warna Teks Active</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={navCfg.activeTextColor}
                      onChange={(e) => handleNavChange('activeTextColor', e.target.value)}
                      className="w-9 h-9 rounded-lg border-2 border-[#0F172A] cursor-pointer p-0 bg-white shadow-neo-sm"
                    />
                    <span className="text-xs font-mono font-bold text-slate-700 uppercase">{navCfg.activeTextColor}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* RIGHT COLUMN: LIVE SIDEBAR PREVIEW */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-6">
            <Card className="p-5 sm:p-6 bg-[#FAF8FF] border-2.5 border-[#0F172A] shadow-neo space-y-4">
              <div className="flex items-center justify-between pb-3 border-b-2 border-slate-200">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#F59E0B]" />
                  <h3 className="text-sm font-chunky uppercase text-[#0F172A]">
                    Preview Sidebar Live
                  </h3>
                </div>
                <span className="text-[10px] font-extrabold px-2 py-0.5 bg-[#E0E7FF] text-[#4338CA] rounded-md border border-[#4338CA]/30">
                  Realtime Active Menu
                </span>
              </div>

              {/* Sidebar Mockup Container */}
              <div className="bg-white border-2 border-[#0F172A] rounded-2xl p-4 shadow-neo-sm space-y-4">
                <AppBrand variant="sidebar" />

                <nav style={{ display: 'flex', flexDirection: 'column', gap: `${navCfg.menuGap}px` }} className="overflow-y-auto max-h-[420px] no-scrollbar">
                  {[
                    { id: 'beranda', label: 'Beranda', icon: Home },
                    { id: 'proyek', label: 'Proyek Saya', icon: Briefcase },
                    { id: 'barang', label: 'Stok Barang', icon: Layers },
                    { id: 'keuangan', label: 'Alur Keuangan', icon: DollarSign },
                    { id: 'rekap', label: 'Rekap Keuangan', icon: BarChart2 },
                    { id: 'upah', label: 'Upah Tukang', icon: Users },
                    { id: 'laporan', label: 'Laporan Harian', icon: FileText },
                    { id: 'kalkulator', label: 'Kalkulator', icon: Calculator },
                    { id: 'notifikasi', label: 'Notifikasi', icon: Bell, badge: 3 },
                    { id: 'pengaturan', label: 'Pengaturan', icon: Settings }
                  ].map((item) => {
                    const Icon = item.icon;
                    const isActive = item.id === 'kalkulator';
                    const weightCls = navCfg.textWeight === 'regular' ? 'font-normal' : navCfg.textWeight === 'medium' ? 'font-medium' : navCfg.textWeight === 'semibold' ? 'font-semibold' : 'font-bold';
                    return (
                      <div
                        key={item.id}
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
                        className={`w-full transition-all cursor-pointer ${weightCls} ${
                          isActive ? 'shadow-neo-sm' : 'hover:bg-slate-50 hover:text-[#0F172A]'
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
                      </div>
                    );
                  })}
                </nav>
              </div>

              <div className="text-[11px] font-bold text-slate-500 text-center">
                💡 Menu <span className="text-[#0F172A] font-black underline">Kalkulator</span> dicontohkan sebagai status Active untuk memvalidasi seluruh custom style outline & padding.
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeSubTab === 'identity' && (
        <div className="space-y-8 animate-fade-in">
          <Card className="p-5 sm:p-6 bg-[#FAF8FF] border-2.5 border-[#0F172A] shadow-neo">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#F59E0B]" />
            <h3 className="text-sm font-chunky uppercase text-[#0F172A]">
              Preview Realtime Identitas
            </h3>
            <span className="text-[10px] font-extrabold px-2 py-0.5 bg-[#E0E7FF] text-[#4338CA] rounded-md border border-[#4338CA]/30">
              Live Interaktif
            </span>
          </div>

          {/* Mode Switcher Desktop / Mobile */}
          <div className="flex items-center bg-white p-1 rounded-xl border-2 border-[#0F172A] shadow-neo-sm">
            <button
              onClick={() => setPreviewTab('desktop')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                previewTab === 'desktop'
                  ? 'bg-[#0F172A] text-white shadow-sm'
                  : 'text-[#475569] hover:bg-slate-100'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              Desktop (Sidebar)
            </button>
            <button
              onClick={() => setPreviewTab('mobile')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                previewTab === 'mobile'
                  ? 'bg-[#0F172A] text-white shadow-sm'
                  : 'text-[#475569] hover:bg-slate-100'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              Mobile (Header)
            </button>
          </div>
        </div>

        {/* PREVIEW STAGE */}
        <div className="bg-slate-100 border-2 border-dashed border-slate-300 rounded-2xl p-4 sm:p-6 flex items-center justify-center overflow-hidden min-h-[160px]">
          {previewTab === 'desktop' ? (
            /* DESKTOP SIDEBAR PREVIEW CONTAINER */
            <div className="w-full max-w-sm bg-white rounded-2xl border-2.5 border-[#0F172A] shadow-neo p-4 space-y-4">
              <div className="flex items-center justify-between border-b-2 border-slate-100 pb-3">
                <AppBrand config={formData} variant="sidebar" />
                <div className="w-8 h-8 rounded-lg border border-slate-300 bg-slate-50 flex items-center justify-center text-xs text-slate-400">
                  ✕
                </div>
              </div>
              <div className="space-y-1.5 opacity-60 pointer-events-none">
                <div className="h-8 bg-[#FAF8FF] border border-slate-200 rounded-lg flex items-center px-3 text-[11px] font-bold text-slate-500">
                  📊 Beranda Dasbor
                </div>
                <div className="h-8 bg-[#FAF8FF] border border-slate-200 rounded-lg flex items-center px-3 text-[11px] font-bold text-slate-500">
                  🏗️ Proyek Lapangan
                </div>
              </div>
            </div>
          ) : (
            /* MOBILE HEADER PREVIEW CONTAINER */
            <div className="w-full max-w-xs sm:max-w-sm bg-white rounded-2xl border-2.5 border-[#0F172A] shadow-neo p-3 space-y-2">
              <div className="flex items-center justify-between">
                <AppBrand config={formData} variant="mobile" />
                <div className="w-9 h-9 rounded-xl border-2 border-[#0F172A] bg-[#FAF8FF] flex items-center justify-center font-extrabold text-sm shadow-neo-sm">
                  ☰
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-bold">
                <span>📍 Proyek: Renovasi Ruko</span>
                <span className="text-emerald-600">● Aktif</span>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* ======================================================== */}
      {/* 2-COLUMN CONTROLS GRID                                    */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* ======================================================== */}
        {/* PANEL 1: IDENTITAS APLIKASI & LOGO                        */}
        {/* ======================================================== */}
        <div className="space-y-6">
          {/* A & B: NAMA & TAGLINE */}
          <Card className="p-5 border-2 border-[#0F172A] shadow-neo-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
              <Type className="w-4 h-4 text-[#3B82F6]" />
              <h3 className="text-sm font-chunky uppercase text-[#0F172A]">
                1. Identitas Teks Aplikasi
              </h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-black uppercase text-[#0F172A] mb-1">
                  Nama Aplikasi
                </label>
                <input
                  type="text"
                  value={formData.appName}
                  onChange={(e) => handleChange('appName', e.target.value)}
                  placeholder="Contoh: DATAKU"
                  className="w-full px-3.5 py-2 rounded-xl border-2 border-[#0F172A] text-sm font-black bg-white focus:outline-none focus:ring-2 focus:ring-[#38BDF8] shadow-neo-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-[#0F172A] mb-1">
                  Tagline / Label
                </label>
                <input
                  type="text"
                  value={formData.tagline}
                  onChange={(e) => handleChange('tagline', e.target.value)}
                  placeholder="Contoh: SISTEM MANDOR"
                  className="w-full px-3.5 py-2 rounded-xl border-2 border-[#0F172A] text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-[#38BDF8] shadow-neo-sm"
                />
              </div>
            </div>
          </Card>

          {/* 2: LOGO APLIKASI & UPLOAD */}
          <Card className="p-5 border-2 border-[#0F172A] shadow-neo-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
              <ImageIcon className="w-4 h-4 text-[#10B981]" />
              <h3 className="text-sm font-chunky uppercase text-[#0F172A]">
                2. File & Sumber Logo
              </h3>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
              {/* CURRENT LOGO PREVIEW */}
              <div
                className="w-20 h-20 flex items-center justify-center flex-shrink-0 transition-all duration-100"
                style={{
                  borderWidth: formData.logoOutlineEnabled !== false ? `${formData.logoOutlineWidth ?? 2}px` : '0px',
                  borderStyle: formData.logoOutlineEnabled !== false && (formData.logoOutlineWidth ?? 2) > 0 ? 'solid' : 'none',
                  borderColor: formData.logoOutlineEnabled !== false ? (formData.logoOutlineColor || '#0F172A') : 'transparent',
                  borderRadius: formData.logoOutlineEnabled !== false ? `${formData.logoOutlineRadius ?? 12}px` : '0px',
                  padding: formData.logoOutlineEnabled !== false ? `${formData.logoOutlinePadding ?? 4}px` : '0px',
                  backgroundColor: formData.logoOutlineEnabled !== false ? '#FFFFFF' : 'transparent',
                  boxShadow: formData.logoOutlineEnabled !== false && (formData.logoOutlineWidth ?? 2) > 0 ? `2px 2px 0px ${formData.logoOutlineColor || '#0F172A'}` : 'none',
                }}
              >
                <img
                  src={formData.logoUrl}
                  alt="Logo Saat Ini"
                  className="w-full h-full object-contain pointer-events-none"
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* UPLOAD ACTIONS */}
              <div className="flex-1 w-full space-y-2">
                <p className="text-[11px] font-bold text-slate-600 leading-tight">
                  Format gambar: <b>PNG, JPG, JPEG, WEBP</b>. Rasio gambar akan dipertahankan rapi.
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  {/* Upload File / Galeri */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs flex items-center gap-1.5 border-2 bg-white"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload File / Galeri
                  </Button>

                  {/* Kamera */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => cameraInputRef.current?.click()}
                    className="text-xs flex items-center gap-1.5 border-2 bg-white"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Kamera
                  </Button>

                  {/* Reset to Original /LOGO.png */}
                  {formData.logoUrl !== '/LOGO.png' && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleChange('logoUrl', '/LOGO.png')}
                      className="text-xs text-red-600 hover:bg-red-50"
                    >
                      Reset Logo Asli
                    </Button>
                  )}
                </div>

                {/* Hidden Native File Inputs */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleImageFile}
                  className="hidden"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageFile}
                  className="hidden"
                />
              </div>
            </div>
          </Card>

          {/* 3: OUTLINE / BINGKAI LOGO */}
          <Card className="p-5 border-2 border-[#0F172A] shadow-neo-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Square className="w-4 h-4 text-[#0EA5E9]" />
                <h3 className="text-sm font-chunky uppercase text-[#0F172A]">
                  3. Outline / Bingkai Logo
                </h3>
              </div>
              <span
                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                  formData.logoOutlineEnabled !== false
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-400'
                    : 'bg-slate-200 text-slate-700 border-slate-400'
                }`}
              >
                {formData.logoOutlineEnabled !== false ? 'Outline ON' : 'Outline OFF'}
              </span>
            </div>

            {/* 1. TOGGLE OUTLINE LOGO */}
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase text-[#0F172A]">
                Status Outline Logo
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleChange('logoOutlineEnabled', true)}
                  className={`py-2 px-3 rounded-xl border-2 border-[#0F172A] font-black text-xs transition-all flex items-center justify-center gap-1.5 ${
                    formData.logoOutlineEnabled !== false
                      ? 'bg-emerald-400 text-[#0F172A] shadow-neo-sm ring-2 ring-emerald-500'
                      : 'bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  [ ON ] Tampilkan Outline
                </button>
                <button
                  type="button"
                  onClick={() => handleChange('logoOutlineEnabled', false)}
                  className={`py-2 px-3 rounded-xl border-2 border-[#0F172A] font-black text-xs transition-all flex items-center justify-center gap-1.5 ${
                    formData.logoOutlineEnabled === false
                      ? 'bg-[#0F172A] text-white shadow-neo-sm ring-2 ring-slate-800'
                      : 'bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  [ OFF ] Tanpa Outline
                </button>
              </div>
            </div>

            {/* 2 - 5: PARAMETER JIKA OUTLINE = ON */}
            {formData.logoOutlineEnabled !== false ? (
              <div className="space-y-4 pt-2 border-t border-slate-100">
                {/* Ketebalan Outline (Width) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold text-[#0F172A]">
                    <span>Ketebalan Outline</span>
                    <span className="font-mono font-black text-xs text-slate-700 px-2 py-0.5 bg-slate-100 rounded border border-[#0F172A]">
                      {formData.logoOutlineWidth ?? 2} px
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-extrabold text-slate-400">0 px</span>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="1"
                      value={formData.logoOutlineWidth ?? 2}
                      onChange={(e) => handleChange('logoOutlineWidth', Number(e.target.value))}
                      className="flex-1 accent-[#0F172A] cursor-pointer"
                    />
                    <span className="text-[10px] font-extrabold text-slate-400">10 px</span>
                  </div>
                </div>

                {/* Warna Outline (Color Picker) */}
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-black uppercase text-[#0F172A]">
                      Warna Outline
                    </label>
                    <span className="text-[10px] text-slate-500 font-bold">
                      Warna garis bingkai logo
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.logoOutlineColor || '#0F172A'}
                      onChange={(e) => handleChange('logoOutlineColor', e.target.value)}
                      className="w-8 h-8 rounded-lg border-2 border-[#0F172A] cursor-pointer p-0 bg-white shadow-neo-sm"
                    />
                    <span className="text-xs font-mono font-bold text-slate-700 uppercase">
                      {formData.logoOutlineColor || '#0F172A'}
                    </span>
                  </div>
                </div>

                {/* Radius / Sudut Outline */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold text-[#0F172A]">
                    <span>Sudut Outline (Radius)</span>
                    <span className="font-mono font-black text-xs text-slate-700 px-2 py-0.5 bg-slate-100 rounded border border-[#0F172A]">
                      {formData.logoOutlineRadius ?? 12} px
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-extrabold text-slate-400">0 px</span>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      step="1"
                      value={formData.logoOutlineRadius ?? 12}
                      onChange={(e) => handleChange('logoOutlineRadius', Number(e.target.value))}
                      className="flex-1 accent-[#0F172A] cursor-pointer"
                    />
                    <span className="text-[10px] font-extrabold text-slate-400">50 px</span>
                  </div>
                </div>

                {/* Jarak Logo dengan Outline (Padding Logo) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold text-[#0F172A]">
                    <span>Jarak Logo dengan Outline (Padding)</span>
                    <span className="font-mono font-black text-xs text-slate-700 px-2 py-0.5 bg-slate-100 rounded border border-[#0F172A]">
                      {formData.logoOutlinePadding ?? 4} px
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-extrabold text-slate-400">0 px</span>
                    <input
                      type="range"
                      min="0"
                      max="30"
                      step="1"
                      value={formData.logoOutlinePadding ?? 4}
                      onChange={(e) => handleChange('logoOutlinePadding', Number(e.target.value))}
                      className="flex-1 accent-[#0F172A] cursor-pointer"
                    />
                    <span className="text-[10px] font-extrabold text-slate-400">30 px</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Notice for OFF mode */
              <div className="p-3 bg-slate-100 rounded-xl border border-dashed border-slate-300 text-xs text-slate-600 font-bold space-y-1">
                <div className="flex items-center gap-1.5 text-[#0F172A] font-black">
                  <span>✨ Mode Tanpa Outline Aktif</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Logo ditampilkan polos mandiri tanpa garis border, box, background putih, maupun shadow.
                </p>
              </div>
            )}
          </Card>

          {/* 4: SKALA & POSISI LOGO */}
          <Card className="p-5 border-2 border-[#0F172A] shadow-neo-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
              <Maximize2 className="w-4 h-4 text-[#8B5CF6]" />
              <h3 className="text-sm font-chunky uppercase text-[#0F172A]">
                4. Skala & Posisi Logo
              </h3>
            </div>

            <div className="space-y-4">
              {/* Logo Scale Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold text-[#0F172A]">
                  <span>Ukuran / Skala Logo</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => stepLogoScale(-5)}
                      className="w-6 h-6 rounded-md border border-[#0F172A] bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-black text-xs"
                    >
                      -
                    </button>
                    <span className="w-14 text-center font-black px-1.5 py-0.5 bg-white border border-[#0F172A] rounded-md text-xs">
                      {formData.logoScale}%
                    </span>
                    <button
                      type="button"
                      onClick={() => stepLogoScale(5)}
                      className="w-6 h-6 rounded-md border border-[#0F172A] bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-black text-xs"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-extrabold text-slate-400">25%</span>
                  <input
                    type="range"
                    min="25"
                    max="300"
                    step="5"
                    value={formData.logoScale}
                    onChange={(e) => handleChange('logoScale', Number(e.target.value))}
                    className="flex-1 accent-[#0F172A] cursor-pointer"
                  />
                  <span className="text-[10px] font-extrabold text-slate-400">300%</span>
                </div>
              </div>

              {/* Logo Horizontal Position (X) */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold text-[#0F172A]">
                  <span>Posisi Horizontal Logo (X)</span>
                  <span className="font-mono font-black text-xs text-slate-700">
                    {formData.logoX > 0 ? `+${formData.logoX}` : formData.logoX} px
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-extrabold text-slate-400">Kiri</span>
                  <input
                    type="range"
                    min="-40"
                    max="40"
                    step="1"
                    value={formData.logoX}
                    onChange={(e) => handleChange('logoX', Number(e.target.value))}
                    className="flex-1 accent-[#0F172A] cursor-pointer"
                  />
                  <span className="text-[10px] font-extrabold text-slate-400">Kanan</span>
                </div>
              </div>

              {/* Logo Vertical Position (Y) */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold text-[#0F172A]">
                  <span>Posisi Vertikal Logo (Y)</span>
                  <span className="font-mono font-black text-xs text-slate-700">
                    {formData.logoY > 0 ? `+${formData.logoY}` : formData.logoY} px
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-extrabold text-slate-400">Atas</span>
                  <input
                    type="range"
                    min="-30"
                    max="30"
                    step="1"
                    value={formData.logoY}
                    onChange={(e) => handleChange('logoY', Number(e.target.value))}
                    className="flex-1 accent-[#0F172A] cursor-pointer"
                  />
                  <span className="text-[10px] font-extrabold text-slate-400">Bawah</span>
                </div>
              </div>

              {/* Gap between Logo & Name */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold text-[#0F172A]">
                  <span>Jarak Logo & Nama Aplikasi (Gap)</span>
                  <span className="font-mono font-black text-xs text-slate-700">
                    {formData.logoNameGap} px
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-extrabold text-slate-400">0 px</span>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    step="1"
                    value={formData.logoNameGap}
                    onChange={(e) => handleChange('logoNameGap', Number(e.target.value))}
                    className="flex-1 accent-[#0F172A] cursor-pointer"
                  />
                  <span className="text-[10px] font-extrabold text-slate-400">40 px</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* ======================================================== */}
        {/* PANEL 2: TYPOGRAPHY, POSISI NAMA & WARNA                  */}
        {/* ======================================================== */}
        <div className="space-y-6">
          {/* 5: UKURAN & POSISI NAMA APLIKASI */}
          <Card className="p-5 border-2 border-[#0F172A] shadow-neo-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
              <Move className="w-4 h-4 text-[#F97316]" />
              <h3 className="text-sm font-chunky uppercase text-[#0F172A]">
                5. Ukuran & Posisi Nama Aplikasi
              </h3>
            </div>

            <div className="space-y-4">
              {/* App Name Font Size */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold text-[#0F172A]">
                  <span>Ukuran Nama Aplikasi</span>
                  <span className="font-mono font-black text-xs text-slate-700">
                    {formData.appNameSize} px
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-extrabold text-slate-400">12 px</span>
                  <input
                    type="range"
                    min="12"
                    max="40"
                    step="1"
                    value={formData.appNameSize}
                    onChange={(e) => handleChange('appNameSize', Number(e.target.value))}
                    className="flex-1 accent-[#0F172A] cursor-pointer"
                  />
                  <span className="text-[10px] font-extrabold text-slate-400">40 px</span>
                </div>
              </div>

              {/* App Name Horizontal Position (X) */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold text-[#0F172A]">
                  <span>Posisi Horizontal Teks (X)</span>
                  <span className="font-mono font-black text-xs text-slate-700">
                    {formData.appNameX > 0 ? `+${formData.appNameX}` : formData.appNameX} px
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-extrabold text-slate-400">Kiri</span>
                  <input
                    type="range"
                    min="-40"
                    max="40"
                    step="1"
                    value={formData.appNameX}
                    onChange={(e) => handleChange('appNameX', Number(e.target.value))}
                    className="flex-1 accent-[#0F172A] cursor-pointer"
                  />
                  <span className="text-[10px] font-extrabold text-slate-400">Kanan</span>
                </div>
              </div>

              {/* App Name Vertical Position (Y) */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold text-[#0F172A]">
                  <span>Posisi Vertikal Teks (Y)</span>
                  <span className="font-mono font-black text-xs text-slate-700">
                    {formData.appNameY > 0 ? `+${formData.appNameY}` : formData.appNameY} px
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-extrabold text-slate-400">Atas</span>
                  <input
                    type="range"
                    min="-30"
                    max="30"
                    step="1"
                    value={formData.appNameY}
                    onChange={(e) => handleChange('appNameY', Number(e.target.value))}
                    className="flex-1 accent-[#0F172A] cursor-pointer"
                  />
                  <span className="text-[10px] font-extrabold text-slate-400">Bawah</span>
                </div>
              </div>
            </div>
          </Card>

          {/* 6: UKURAN & JARAK TAGLINE */}
          <Card className="p-5 border-2 border-[#0F172A] shadow-neo-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
              <Sliders className="w-4 h-4 text-[#06B6D4]" />
              <h3 className="text-sm font-chunky uppercase text-[#0F172A]">
                6. Ukuran & Jarak Tagline
              </h3>
            </div>

            <div className="space-y-4">
              {/* Tagline Font Size */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold text-[#0F172A]">
                  <span>Ukuran Tagline</span>
                  <span className="font-mono font-black text-xs text-slate-700">
                    {formData.taglineSize} px
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-extrabold text-slate-400">8 px</span>
                  <input
                    type="range"
                    min="8"
                    max="24"
                    step="1"
                    value={formData.taglineSize}
                    onChange={(e) => handleChange('taglineSize', Number(e.target.value))}
                    className="flex-1 accent-[#0F172A] cursor-pointer"
                  />
                  <span className="text-[10px] font-extrabold text-slate-400">24 px</span>
                </div>
              </div>

              {/* Gap between Name & Tagline */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold text-[#0F172A]">
                  <span>Jarak Nama ke Tagline (Gap)</span>
                  <span className="font-mono font-black text-xs text-slate-700">
                    {formData.taglineGap} px
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-extrabold text-slate-400">0 px</span>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="1"
                    value={formData.taglineGap}
                    onChange={(e) => handleChange('taglineGap', Number(e.target.value))}
                    className="flex-1 accent-[#0F172A] cursor-pointer"
                  />
                  <span className="text-[10px] font-extrabold text-slate-400">20 px</span>
                </div>
              </div>
            </div>
          </Card>

          {/* 7: WARNA IDENTITAS */}
          <Card className="p-5 border-2 border-[#0F172A] shadow-neo-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
              <Palette className="w-4 h-4 text-[#EC4899]" />
              <h3 className="text-sm font-chunky uppercase text-[#0F172A]">
                7. Skema Warna Identitas
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Color: App Name */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <label className="block text-[11px] font-extrabold text-[#0F172A] uppercase">
                  Warna Nama
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.appNameColor}
                    onChange={(e) => handleChange('appNameColor', e.target.value)}
                    className="w-9 h-9 rounded-lg border-2 border-[#0F172A] cursor-pointer p-0 bg-white shadow-neo-sm"
                  />
                  <span className="text-xs font-mono font-bold text-slate-700 uppercase">
                    {formData.appNameColor}
                  </span>
                </div>
              </div>

              {/* Color: Tagline Text */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <label className="block text-[11px] font-extrabold text-[#0F172A] uppercase">
                  Teks Tagline
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.taglineColor}
                    onChange={(e) => handleChange('taglineColor', e.target.value)}
                    className="w-9 h-9 rounded-lg border-2 border-[#0F172A] cursor-pointer p-0 bg-white shadow-neo-sm"
                  />
                  <span className="text-xs font-mono font-bold text-slate-700 uppercase">
                    {formData.taglineColor}
                  </span>
                </div>
              </div>

              {/* Color: Tagline Background */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <label className="block text-[11px] font-extrabold text-[#0F172A] uppercase">
                  Badge Tagline
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.taglineBgColor}
                    onChange={(e) => handleChange('taglineBgColor', e.target.value)}
                    className="w-9 h-9 rounded-lg border-2 border-[#0F172A] cursor-pointer p-0 bg-white shadow-neo-sm"
                  />
                  <span className="text-xs font-mono font-bold text-slate-700 uppercase">
                    {formData.taglineBgColor}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
      )}

      {/* BOTTOM ACTION BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white rounded-2xl border-2.5 border-[#0F172A] shadow-neo">
        <div className="text-xs font-bold text-slate-600">
          💡 Pengaturan tersimpan secara instan di preview lokal. Tidak ada perubahan database/SQL.
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            variant="ghost"
            onClick={handleReset}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-xs font-bold border-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Kembalikan Default
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-xs font-black border-2 shadow-neo-sm"
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-300 stroke-[3]" />
                Pengaturan Tersimpan!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Simpan Pengaturan
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
