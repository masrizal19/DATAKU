/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CurrentReportData } from '../types';
import { formatRupiah, formatTanggal, formatTanggalWaktu } from '../utils/format';
import {
  Printer,
  FileSpreadsheet,
  FileDown,
  Image as ImageIcon,
  X,
  Sliders,
  Check,
  ChevronDown,
  Loader2,
  Download,
  FileText
} from 'lucide-react';
import { exportReportToExcel, exportReportToCSV } from '../utils/rekapEngine';
import {
  printSettingsService,
  PaperSize,
  PageOrientation,
  ImageExportFormat,
  DocumentPrintConfig
} from '../services/printSettingsService';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import { useApp } from '../context/AppContext';

interface PrintPreviewModalProps {
  reportData: CurrentReportData;
  onClose: () => void;
  documentType?: 'rekapKeuangan' | 'rekapUpah' | 'laporanProyek' | 'slipGaji';
}

const colorCache = new Map<string, string>();
const getRgbaColor = (cssColor: string): string => {
  if (!cssColor || cssColor === 'transparent' || cssColor === 'none') return cssColor;
  if (cssColor.startsWith('rgb') || cssColor.startsWith('#')) return cssColor;
  if (colorCache.has(cssColor)) return colorCache.get(cssColor)!;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return cssColor;
    ctx.fillStyle = cssColor;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    const rgbaStr = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
    colorCache.set(cssColor, rgbaStr);
    return rgbaStr;
  } catch (e) {
    return cssColor;
  }
};

const normalizeColorsOnClone = (originalNode: HTMLElement, cloneNode: HTMLElement) => {
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
    const compStyle = window.getComputedStyle(orig);
    colorProps.forEach((prop) => {
      const val = compStyle[prop as any];
      if (val && (val.includes('oklab') || val.includes('color-mix') || val.includes('lab') || val.includes('lch'))) {
        (clone.style as any)[prop] = getRgbaColor(val);
      }
    });
    const boxShadow = compStyle.boxShadow;
    if (boxShadow && (boxShadow.includes('oklab') || boxShadow.includes('color-mix') || boxShadow.includes('lab') || boxShadow.includes('lch'))) {
      clone.style.boxShadow = 'none';
    }
    const bgImage = compStyle.backgroundImage;
    if (bgImage && (bgImage.includes('oklab') || bgImage.includes('color-mix') || bgImage.includes('lab') || bgImage.includes('lch'))) {
      clone.style.backgroundImage = 'none';
    }
  }
};

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  reportData,
  onClose,
  documentType = 'rekapKeuangan'
}) => {
  const { identityConfig, printSettings, savePrintSettings } = useApp();

  // Load initial settings
  const [globalSettings, setGlobalSettings] = useState(printSettings);
  const [paperSize, setPaperSize] = useState<PaperSize>(
    globalSettings.perDocumentSettings[documentType]?.paperSize || globalSettings.defaultPaperSize || 'A4'
  );
  const [orientationMode, setOrientationMode] = useState<PageOrientation>(
    globalSettings.perDocumentSettings[documentType]?.orientation || globalSettings.defaultOrientation || 'Otomatis'
  );
  const [autoFit, setAutoFit] = useState<boolean>(
    globalSettings.perDocumentSettings[documentType]?.autoFitContent ?? globalSettings.autoFitContent ?? true
  );
  const [imageFormat, setImageFormat] = useState<ImageExportFormat>(
    globalSettings.perDocumentSettings[documentType]?.imageFormat || globalSettings.defaultImageFormat || 'JPEG'
  );

  // Settings drawer toggle
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [exportProgressText, setExportProgressText] = useState<string>('');
  const [downloadSuccessInfo, setDownloadSuccessInfo] = useState<string | null>(null);

  // Container refs for multi-page rendering
  const pagesContainerRef = useRef<HTMLDivElement>(null);

  // Determine Effective Orientation (Otomatis Analysis)
  const effectiveOrientation = useMemo((): 'Portrait' | 'Landscape' => {
    if (orientationMode === 'Portrait') return 'Portrait';
    if (orientationMode === 'Landscape') return 'Landscape';

    // OTOMATIS: Analyzes content structure
    const hasWideMutasi = reportData.mutasiDana.length > 8;
    const hasWideMaterial = reportData.ringkasanMaterial.length > 5;
    const hasManyWorkers = reportData.rekapUpah.length > 6;

    if (hasWideMutasi || (hasWideMaterial && hasManyWorkers)) {
      return 'Landscape';
    }
    return 'Portrait';
  }, [orientationMode, reportData]);

  // Persist settings whenever changed
  const handleSaveConfig = async (
    newPaper: PaperSize,
    newOrient: PageOrientation,
    newFit: boolean,
    newImgFmt: ImageExportFormat
  ) => {
    setPaperSize(newPaper);
    setOrientationMode(newOrient);
    setAutoFit(newFit);
    setImageFormat(newImgFmt);

    const updated = {
      ...globalSettings,
      perDocumentSettings: {
        ...globalSettings.perDocumentSettings,
        [documentType]: {
          ...globalSettings.perDocumentSettings[documentType],
          paperSize: newPaper,
          orientation: newOrient,
          autoFitContent: newFit,
          imageFormat: newImgFmt
        }
      }
    };
    setGlobalSettings(updated);
    if (savePrintSettings) await savePrintSettings(updated);
  };

  // Physical Paper Dimensions (CSS values in mm)
  // A4: 210 x 297 mm
  // F4 (Folio): 215 x 330 mm
  const paperDimensions = useMemo(() => {
    if (paperSize === 'A4') {
      return effectiveOrientation === 'Portrait'
        ? { widthMm: 210, heightMm: 297, widthClass: 'w-[210mm]', minHeightClass: 'min-h-[297mm]' }
        : { widthMm: 297, heightMm: 210, widthClass: 'w-[297mm]', minHeightClass: 'min-h-[210mm]' };
    } else {
      // F4 / Folio
      return effectiveOrientation === 'Portrait'
        ? { widthMm: 215, heightMm: 330, widthClass: 'w-[215mm]', minHeightClass: 'min-h-[330mm]' }
        : { widthMm: 330, heightMm: 215, widthClass: 'w-[330mm]', minHeightClass: 'min-h-[215mm]' };
    }
  }, [paperSize, effectiveOrientation]);

  // Browser Print trigger
  const handlePrint = () => {
    window.print();
  };

  // Categorized expenses percentage helper
  const categoriesList = useMemo(() => {
    const totalOut = reportData.ringkasan.pengeluaran;
    const categoriesMap: { [key: string]: number } = {};

    (reportData.mutasiDana || [])
      .filter((t) => t.type !== 'DANA_MASUK')
      .forEach((t) => {
        const cat = t.category || 'Lain-lain';
        categoriesMap[cat] = (categoriesMap[cat] || 0) + t.amount;
      });

    return Object.keys(categoriesMap)
      .map((k) => ({
        name: k,
        amount: categoriesMap[k],
        percentage: totalOut > 0 ? Math.round((categoriesMap[k] / totalOut) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [reportData]);

  // Multi-Page Image Export Handler (JPEG / PNG)
  const handleExportImage = async () => {
    if (!pagesContainerRef.current) return;
    setIsExportingImage(true);
    setDownloadSuccessInfo(null);
    const ext = imageFormat === 'PNG' ? 'png' : 'jpg';
    const mimeType = imageFormat === 'PNG' ? 'image/png' : 'image/jpeg';
    const cleanProject = reportData.project.name.replace(/[^a-zA-Z0-9]/g, '_').replace(/__+/g, '_');

    try {
      const printElement = pagesContainerRef.current.querySelector<HTMLElement>('.dataku-print-sheet') || pagesContainerRef.current;
      setExportProgressText(`Merender gambar ${imageFormat}...`);

      const exportClone = printElement.cloneNode(true) as HTMLElement;
      exportClone.style.position = 'absolute';
      exportClone.style.left = '-9999px';
      exportClone.style.top = '0';
      exportClone.style.backgroundColor = '#ffffff';
      document.body.appendChild(exportClone);
      normalizeColorsOnClone(printElement, exportClone);

      const canvas = await html2canvas(exportClone, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc) => {
          const styleTags = clonedDoc.querySelectorAll('style');
          styleTags.forEach(tag => {
            if (tag.textContent) {
              tag.textContent = tag.textContent
                .replace(/oklab/g, 'rgba')
                .replace(/color-mix/g, 'rgba')
                .replace(/lab\(/g, 'rgba(')
                .replace(/lch\(/g, 'rgba(');
            }
          });
        }
      });
      exportClone.remove();

      const dataUrl = canvas.toDataURL(mimeType, 0.95);
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const fileName = `DATAKU_${cleanProject}_Rekap_${paperSize}.${ext}`;

      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setDownloadSuccessInfo(`✓ Berhasil mengunduh gambar ${imageFormat}.`);
    } catch (err: any) {
      console.error('Export image failed:', err);
      alert('Gagal mengekspor gambar. Silakan coba lagi.');
    } finally {
      setIsExportingImage(false);
      setExportProgressText('');
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0F172A]/85 flex items-center justify-center z-50 p-2 sm:p-4 select-none animate-fade-in overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible">
      <div className="bg-white border-3 border-[#0F172A] rounded-2xl w-full max-w-5xl shadow-neo-lg overflow-hidden flex flex-col max-h-[95vh] print:max-h-none print:border-none print:shadow-none print:w-full print:rounded-none">
        
        {/* Modal Top Actions Header (Hidden when printing) */}
        <div className="bg-[#FAF8FF] border-b-2 border-[#0F172A] p-3 sm:p-4 flex flex-wrap justify-between items-center gap-2.5 print:hidden">
          {/* Left: Title and Spec Indicator Badge */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 border border-[#0F172A]" />
              <h3 className="font-chunky text-xs sm:text-sm text-[#0F172A] uppercase">
                PREVIEW CETAK &amp; DOKUMEN REKAP
              </h3>
            </div>
            {/* Spec Indicator Badge */}
            <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-700 bg-white border border-[#0F172A] px-2.5 py-1 rounded-lg shadow-neo-sm">
              <span className="text-[#0284C7] uppercase">{paperSize}</span>
              <span>•</span>
              <span className="text-slate-900 uppercase">
                {effectiveOrientation}
                {orientationMode === 'Otomatis' && <span className="text-slate-500 font-normal"> (Auto)</span>}
              </span>
              <span>•</span>
              <span className="text-emerald-700 font-mono font-black">
                {reportData.mutasiDana ? reportData.mutasiDana.length : 0} Transaksi
              </span>
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Format Settings Toggle */}
            <button
              onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
              className={`px-2.5 py-1.5 font-bold text-xs rounded-xl border-2 border-[#0F172A] shadow-neo-sm flex items-center gap-1 cursor-pointer transition-all ${
                showSettingsDrawer ? 'bg-amber-300 text-slate-950' : 'bg-white hover:bg-slate-100 text-slate-800'
              }`}
              title="Pengaturan Format Cetak & Ukuran Kertas"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Format</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {/* Cetak / Save PDF */}
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-[#0284C7] hover:bg-[#0369A1] text-white font-extrabold text-xs rounded-xl border-2 border-[#0F172A] shadow-neo-sm flex items-center gap-1.5 cursor-pointer transition-all active:translate-y-0.5"
            >
              <Printer className="w-4 h-4" /> Cetak / Save PDF
            </button>

            {/* Export JPEG / PNG */}
            <button
              onClick={handleExportImage}
              disabled={isExportingImage}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl border-2 border-[#0F172A] shadow-neo-sm flex items-center gap-1.5 cursor-pointer transition-all active:translate-y-0.5 disabled:opacity-50"
            >
              {isExportingImage ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> {exportProgressText || 'Mengunduh...'}
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4" /> Export {imageFormat}
                </>
              )}
            </button>

            {/* Excel */}
            <button
              onClick={() => exportReportToExcel(reportData)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl border-2 border-[#0F172A] shadow-neo-sm flex items-center gap-1.5 cursor-pointer transition-all active:translate-y-0.5"
            >
              <FileSpreadsheet className="w-4 h-4" /> Excel
            </button>

            {/* CSV */}
            <button
              onClick={() => exportReportToCSV(reportData)}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-[#0F172A] font-bold text-xs rounded-xl border-2 border-[#0F172A] shadow-neo-sm flex items-center gap-1 cursor-pointer transition-all active:translate-y-0.5"
            >
              <FileDown className="w-4 h-4" /> CSV
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center bg-white hover:bg-red-50 hover:text-red-600 text-[#0F172A] font-extrabold text-sm rounded-xl border-2 border-[#0F172A] cursor-pointer shadow-neo-sm"
              title="Tutup Preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Format Settings Drawer */}
        {showSettingsDrawer && (
          <div className="bg-amber-50 border-b-2 border-[#0F172A] p-3 text-xs font-bold text-slate-900 grid grid-cols-1 sm:grid-cols-3 gap-3 print:hidden animate-fade-in">
            <div>
              <label className="text-[10px] uppercase font-extrabold text-slate-500 block mb-1">Ukuran Kertas:</label>
              <div className="flex gap-1.5">
                {(['A4', 'F4'] as PaperSize[]).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => handleSaveConfig(sz, orientationMode, autoFit, imageFormat)}
                    className={`flex-1 py-1.5 px-2 rounded-lg border-2 text-xs font-extrabold cursor-pointer transition-all ${
                      paperSize === sz ? 'bg-[#0284C7] text-white border-[#0F172A]' : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    {sz} {sz === 'F4' ? '(Folio)' : ''}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-extrabold text-slate-500 block mb-1">Orientasi Halaman:</label>
              <div className="flex gap-1.5">
                {(['Otomatis', 'Portrait', 'Landscape'] as PageOrientation[]).map((ori) => (
                  <button
                    key={ori}
                    type="button"
                    onClick={() => handleSaveConfig(paperSize, ori, autoFit, imageFormat)}
                    className={`flex-1 py-1.5 px-2 rounded-lg border-2 text-xs font-extrabold cursor-pointer transition-all ${
                      orientationMode === ori ? 'bg-[#0284C7] text-white border-[#0F172A]' : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    {ori}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-extrabold text-slate-500 block mb-1">Format Gambar Export:</label>
              <div className="flex gap-1.5">
                {(['JPEG', 'PNG'] as ImageExportFormat[]).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => handleSaveConfig(paperSize, orientationMode, autoFit, fmt)}
                    className={`flex-1 py-1.5 px-2 rounded-lg border-2 text-xs font-extrabold cursor-pointer transition-all ${
                      imageFormat === fmt ? 'bg-purple-600 text-white border-[#0F172A]' : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Success Alert Banner */}
        {downloadSuccessInfo && (
          <div className="bg-emerald-100 border-b-2 border-emerald-500 px-4 py-2 text-xs font-bold text-emerald-900 flex justify-between items-center print:hidden">
            <span>{downloadSuccessInfo}</span>
            <button
              onClick={() => setDownloadSuccessInfo(null)}
              className="text-emerald-700 hover:text-emerald-900 font-extrabold text-sm"
            >
              ✕
            </button>
          </div>
        )}

        {/* Paper Container for Scrolling / Print Target */}
        <div
          ref={pagesContainerRef}
          id="printable-rekap-area"
          className="dataku-print-container flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200/90 flex flex-col items-center print:p-0 print:bg-white print:overflow-visible"
        >
          <div
            className={`dataku-print-sheet bg-white border border-slate-300 sm:border-2 sm:border-[#0F172A]/40 p-6 sm:p-10 text-slate-900 font-sans text-xs leading-relaxed shadow-xl print:shadow-none print:border-none print:p-0 print:w-full print:max-w-none ${paperDimensions.widthClass} relative flex flex-col justify-between`}
            style={{ boxSizing: 'border-box' }}
          >
            <div className="space-y-4">
              {/* Full Kop Surat */}
              <div className="text-center space-y-1 border-b-4 border-double border-slate-900 pb-3 section-kop">
                <div className="flex items-center justify-center gap-3">
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
                  <div className="text-left">
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 leading-none">
                      {identityConfig?.appName || 'DATAKU'}
                    </h1>
                    <p className="text-[9px] font-extrabold text-slate-700 tracking-wider uppercase mt-0.5">
                      {identityConfig?.tagline || 'SISTEM MANDOR'}
                    </p>
                  </div>
                </div>
                <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-widest text-slate-800 mt-2">
                  REKAP KEUANGAN &amp; LAPORAN PROYEK
                </h2>
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">
                  Sistem Manajemen Mandor Lapangan Terpadu
                </p>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-4 py-2.5 border-b border-slate-300 text-[11px] font-medium keep-together">
                <div className="space-y-1">
                  <p>
                    <span className="text-slate-500 font-bold uppercase">Proyek:</span>{' '}
                    <strong className="text-slate-900 uppercase">{reportData.project.name}</strong>
                  </p>
                  <p>
                    <span className="text-slate-500 font-bold uppercase">Lokasi:</span>{' '}
                    {reportData.project.location || '-'}
                  </p>
                  <p>
                    <span className="text-slate-500 font-bold uppercase">Pemilik Proyek:</span>{' '}
                    {reportData.project.owner || '-'}
                  </p>
                  <p>
                    <span className="text-slate-500 font-bold uppercase">Anggaran Proyek:</span>{' '}
                    {formatRupiah(reportData.project.budget)}
                  </p>
                </div>
                <div className="space-y-1 text-right">
                  <p>
                    <span className="text-slate-500 font-bold uppercase">Periode:</span>{' '}
                    <strong className="text-slate-900 uppercase">{reportData.period.label}</strong>
                  </p>
                  <p>
                    <span className="text-slate-500 font-bold uppercase">Mandor Lapangan:</span>{' '}
                    {reportData.project.mandorName || '-'}
                  </p>
                  <p>
                    <span className="text-slate-500 font-bold uppercase">Waktu Cetak:</span>{' '}
                    {reportData.printDate}
                  </p>
                </div>
              </div>

              {/* SECTION I: RINGKASAN REKAPITULASI */}
              <div className="my-3 keep-together">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b-2 border-slate-900 pb-1 mb-2">
                  I. RINGKASAN REKAPITULASI
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-slate-50 border border-slate-300 rounded p-2.5 text-[11px]">
                  <div className="border-r border-slate-200 pr-2">
                    <span className="text-slate-500 text-[9px] font-bold uppercase block">Dana Masuk</span>
                    <span className="font-extrabold text-emerald-700 text-sm block mt-0.5">
                      {formatRupiah(reportData.ringkasan.danaMasuk)}
                    </span>
                  </div>
                  <div className="border-r border-slate-200 pr-2">
                    <span className="text-slate-500 text-[9px] font-bold uppercase block">Pengeluaran</span>
                    <span className="font-extrabold text-red-600 text-sm block mt-0.5">
                      {formatRupiah(reportData.ringkasan.pengeluaran)}
                    </span>
                  </div>
                  <div className="border-r border-slate-200 pr-2">
                    <span className="text-slate-500 text-[9px] font-bold uppercase block">Upah Tukang</span>
                    <span className="font-extrabold text-amber-700 text-sm block mt-0.5">
                      {formatRupiah(reportData.ringkasan.upahTukang)}
                    </span>
                  </div>
                  <div className="border-r border-slate-200 pr-2">
                    <span className="text-slate-500 text-[9px] font-bold uppercase block">Bahan/Material</span>
                    <span className="font-extrabold text-blue-700 text-sm block mt-0.5">
                      {formatRupiah(reportData.ringkasan.pembelianMaterial)}
                    </span>
                  </div>
                  <div className="pl-1">
                    <span className="text-slate-500 text-[9px] font-bold uppercase block">Sisa Kas</span>
                    <span
                      className={`font-black text-sm block mt-0.5 ${
                        reportData.ringkasan.saldoKas >= 0 ? 'text-emerald-800' : 'text-red-700'
                      }`}
                    >
                      {formatRupiah(reportData.ringkasan.saldoKas)}
                    </span>
                  </div>
                </div>

                {/* Expense Categories Breakdown */}
                {categoriesList.length > 0 && (
                  <div className="mt-2 p-2 bg-white border border-slate-200 rounded">
                    <p className="text-[10px] font-black uppercase text-slate-700 mb-1.5">
                      RINCIAN PERSENTASE PENGELUARAN BERDASARKAN KATEGORI:
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                      {categoriesList.map((cat, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-slate-50 p-1 px-2 rounded border border-slate-200">
                          <span className="font-bold text-slate-800 truncate">{cat.name}</span>
                          <span className="font-black text-slate-900 ml-1">{cat.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION II: DAFTAR MUTASI DANA */}
              {reportData.mutasiDana && reportData.mutasiDana.length > 0 && (
                <div className="my-3 section-block">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b-2 border-slate-900 pb-1 mb-2">
                    II. DAFTAR MUTASI DANA ({reportData.mutasiDana.length} Transaksi)
                  </h3>
                  <table className="w-full text-left text-[10px] border-collapse border border-slate-300">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-bold uppercase print-header-row">
                        <th className="p-1.5 border border-slate-300 w-8 text-center">No</th>
                        <th className="p-1.5 border border-slate-300 w-32">Tanggal &amp; Waktu</th>
                        <th className="p-1.5 border border-slate-300 w-28">Tipe / Kategori</th>
                        <th className="p-1.5 border border-slate-300">Keterangan / Deskripsi</th>
                        <th className="p-1.5 border border-slate-300 text-right w-28">Jumlah (Rp)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.mutasiDana.map((tx, idx) => (
                        <tr key={tx.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                          <td className="p-1.5 border border-slate-300 text-center text-slate-500 font-medium">{idx + 1}</td>
                          <td className="p-1.5 border border-slate-300 whitespace-nowrap font-medium">
                            {formatTanggalWaktu(tx.date)}
                          </td>
                          <td className="p-1.5 border border-slate-300">
                            <span
                              className={`inline-block px-1.5 py-0.5 text-[9px] font-extrabold rounded uppercase ${
                                tx.type === 'DANA_MASUK' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {tx.category}
                            </span>
                          </td>
                          <td className="p-1.5 border border-slate-300 text-slate-700">
                            {tx.notes || '-'}
                          </td>
                          <td
                            className={`p-1.5 border border-slate-300 text-right font-bold whitespace-nowrap ${
                              tx.type === 'DANA_MASUK' ? 'text-emerald-700' : 'text-red-600'
                            }`}
                          >
                            {tx.type === 'DANA_MASUK' ? '+' : '-'}{formatRupiah(tx.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* SECTION III: REKAP UPAH TUKANG */}
              {reportData.rekapUpah && reportData.rekapUpah.length > 0 && (
                <div className="my-3 section-block">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b-2 border-slate-900 pb-1 mb-2">
                    III. REKAP UPAH TUKANG &amp; PEKERJA ({reportData.rekapUpah.length} Orang)
                  </h3>
                  <table className="w-full text-left text-[10px] border-collapse border border-slate-300">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-bold uppercase print-header-row">
                        <th className="p-1.5 border border-slate-300">Nama Pekerja</th>
                        <th className="p-1.5 border border-slate-300 text-center">Jabatan</th>
                        <th className="p-1.5 border border-slate-300 text-right">Hari Kerja</th>
                        <th className="p-1.5 border border-slate-300 text-right">Upah / Hari</th>
                        <th className="p-1.5 border border-slate-300 text-right font-black">Total Upah</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.rekapUpah.map((w, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                          <td className="p-1.5 border border-slate-300 font-bold uppercase">{w.name}</td>
                          <td className="p-1.5 border border-slate-300 text-center">{w.position}</td>
                          <td className="p-1.5 border border-slate-300 text-right">{w.daysWorked} Hari</td>
                          <td className="p-1.5 border border-slate-300 text-right">{formatRupiah(w.dailyRate)}</td>
                          <td className="p-1.5 border border-slate-300 text-right font-black text-slate-900">
                            {formatRupiah(w.totalWages)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* SECTION IV: RINGKASAN MATERIAL */}
              {reportData.ringkasanMaterial && reportData.ringkasanMaterial.length > 0 && (
                <div className="my-3 section-block">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b-2 border-slate-900 pb-1 mb-2">
                    IV. RINGKASAN MATERIAL ({reportData.ringkasanMaterial.length} Item)
                  </h3>
                  <table className="w-full text-left text-[10px] border-collapse border border-slate-300">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-bold uppercase print-header-row">
                        <th className="p-1.5 border border-slate-300">Nama Material</th>
                        <th className="p-1.5 border border-slate-300 text-center">Satuan</th>
                        <th className="p-1.5 border border-slate-300 text-right">Masuk</th>
                        <th className="p-1.5 border border-slate-300 text-right">Keluar</th>
                        <th className="p-1.5 border border-slate-300 text-right">Terpakai</th>
                        <th className="p-1.5 border border-slate-300 text-right font-black">Sisa Stok</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.ringkasanMaterial.map((m, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                          <td className="p-1.5 border border-slate-300 font-bold uppercase">{m.materialName}</td>
                          <td className="p-1.5 border border-slate-300 text-center">{m.unit}</td>
                          <td className="p-1.5 border border-slate-300 text-right text-emerald-700 font-semibold">
                            {m.masuk > 0 ? `+${m.masuk}` : '0'}
                          </td>
                          <td className="p-1.5 border border-slate-300 text-right text-amber-700 font-semibold">
                            {m.keluar > 0 ? `-${m.keluar}` : '0'}
                          </td>
                          <td className="p-1.5 border border-slate-300 text-right text-red-600 font-semibold">
                            {m.terpakai > 0 ? `-${m.terpakai}` : '0'}
                          </td>
                          <td className="p-1.5 border border-slate-300 text-right font-black text-slate-900">
                            {m.sisaStok}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* SECTION V: LAPORAN HARIAN */}
              {reportData.laporanHarian && reportData.laporanHarian.length > 0 && (
                <div className="my-3 section-block">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b-2 border-slate-900 pb-1 mb-2">
                    V. LAPORAN HARIAN ({reportData.laporanHarian.length} Hari)
                  </h3>
                  <table className="w-full text-left text-[10px] border-collapse border border-slate-300">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-bold uppercase print-header-row">
                        <th className="p-1.5 border border-slate-300">Tanggal</th>
                        <th className="p-1.5 border border-slate-300">Cuaca</th>
                        <th className="p-1.5 border border-slate-300 text-center">Pekerja</th>
                        <th className="p-1.5 border border-slate-300">Pekerjaan Lapangan</th>
                        <th className="p-1.5 border border-slate-300">Kendala</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.laporanHarian.map((r, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                          <td className="p-1.5 border border-slate-300 whitespace-nowrap font-bold">
                            {formatTanggal(r.date)}
                          </td>
                          <td className="p-1.5 border border-slate-300">{r.weather}</td>
                          <td className="p-1.5 border border-slate-300 text-center font-bold">
                            {r.workerCount} Org
                          </td>
                          <td className="p-1.5 border border-slate-300 font-medium">{r.todayWork}</td>
                          <td className="p-1.5 border border-slate-300 italic text-slate-600">
                            {r.challenges || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tanda Tangan Mandor & Pengawas */}
              <div className="mt-8 pt-4 grid grid-cols-2 gap-8 text-center text-xs font-bold keep-together">
                <div>
                  <p className="mb-14 text-slate-700">Mandor Proyek,</p>
                  <p className="underline uppercase tracking-wide text-slate-900 font-black">
                    {reportData.project.mandorName || 'Mandor'}
                  </p>
                  <p className="text-[10px] text-slate-500 uppercase mt-0.5">DATAKU MANDOR SYSTEM</p>
                </div>
                <div>
                  <p className="mb-14 text-slate-700">Pengawas / Pemilik,</p>
                  <p className="underline uppercase tracking-wide text-slate-900 font-black">
                    ( {reportData.project.owner || 'Owner'} )
                  </p>
                  <p className="text-[10px] text-slate-500 uppercase mt-0.5">PERWAKILAN OWNER</p>
                </div>
              </div>
            </div>

            {/* Page Footer */}
            <div className="mt-8 pt-3 border-t border-slate-300 flex justify-between items-center text-[9px] text-slate-400 uppercase tracking-wider dataku-print-footer keep-together">
              <span>Dicetak melalui aplikasi DATAKU Mandor • {reportData.printDate}</span>
              <span className="font-black text-slate-600">
                Dokumen Laporan Resmi DATAKU
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Global Print Media Query Isolation CSS */}
      <style>{`
        @page {
          size: ${
            paperSize === 'A4'
              ? effectiveOrientation === 'Portrait'
                ? 'A4 portrait'
                : 'A4 landscape'
              : effectiveOrientation === 'Portrait'
              ? '215mm 330mm portrait'
              : '330mm 215mm landscape'
          };
          margin: 10mm;
        }
        @media print {
          html, body {
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            overflow: visible !important;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-rekap-area,
          #printable-rekap-area * {
            visibility: visible !important;
          }
          #printable-rekap-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            background: #ffffff !important;
            box-shadow: none !important;
            z-index: 999999 !important;
          }
          .dataku-print-sheet {
            position: relative !important;
            top: auto !important;
            left: auto !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #000000 !important;
            min-height: auto !important;
            height: auto !important;
            box-sizing: border-box !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: auto !important;
            break-inside: auto !important;
          }
          thead {
            display: table-header-group !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .keep-together {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .section-block {
            page-break-inside: auto !important;
            break-inside: auto !important;
          }
          nav, aside, header, button, .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
