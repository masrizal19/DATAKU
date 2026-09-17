/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CurrentReportData } from '../types';
import { formatRupiah, formatTanggal } from '../utils/format';
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

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  reportData,
  onClose,
  documentType = 'rekapKeuangan'
}) => {
  const { identityConfig } = useApp();

  // Load initial settings
  const [globalSettings, setGlobalSettings] = useState(() => printSettingsService.loadSettings());
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

  // Settings dropdown toggle
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
    // If mutasi transaction table has many columns or large count, or if data is wide, pick Landscape
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
    await printSettingsService.saveSettings(updated);
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

  // Clean filename generator
  const getCleanBaseFilename = () => {
    const cleanProject = reportData.project.name.replace(/[^a-zA-Z0-9]/g, '_').replace(/__+/g, '_');
    const dateStr = reportData.period.endDate.replace(/-/g, '');
    return `DATAKU_${cleanProject}_Rekap_${dateStr}`;
  };

  // Browser Print trigger
  const handlePrint = () => {
    window.print();
  };

  // Categorized expenses percentage helper
  const categoriesList = useMemo(() => {
    const totalOut = reportData.ringkasan.pengeluaran;
    const categoriesMap: { [key: string]: number } = {};
    reportData.mutasiDana
      .filter((t) => t.type !== 'DANA_MASUK')
      .forEach((t) => {
        categoriesMap[t.category] = (categoriesMap[t.category] || 0) + t.amount;
      });
    return Object.keys(categoriesMap)
      .map((k) => ({
        name: k,
        amount: categoriesMap[k],
        percentage: totalOut > 0 ? Math.round((categoriesMap[k] / totalOut) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [reportData]);

  // Intelligent Pagination Data Split
  // Page 1: Kop Surat, Metadata, Ringkasan I + Rincian Kategori, Awal Mutasi (first 8 rows or all if few)
  // Page 2: Sisa Mutasi & Rekap Upah
  // Page 3 (if needed): Ringkasan Material & Laporan Harian + Tanda Tangan
  const pagesData = useMemo(() => {
    const txs = reportData.mutasiDana;
    const workers = reportData.rekapUpah;
    const materials = reportData.ringkasanMaterial;
    const daily = reportData.laporanHarian;

    // Thresholds per page depending on orientation
    const isLandscape = effectiveOrientation === 'Landscape';
    const page1TxLimit = isLandscape ? 12 : 7;
    const page2TxLimit = isLandscape ? 18 : 14;

    const page1Txs = txs.slice(0, page1TxLimit);
    const remainingTxs = txs.slice(page1TxLimit);

    const page2Txs = remainingTxs.slice(0, page2TxLimit);
    const page3Txs = remainingTxs.slice(page2TxLimit);

    // If data is very small, 1 or 2 pages is sufficient
    const totalTxs = txs.length;
    const needsPage3 =
      page3Txs.length > 0 ||
      (remainingTxs.length > 0 && (workers.length > 5 || materials.length > 4 || daily.length > 4)) ||
      (workers.length > 8 || materials.length > 8 || daily.length > 6);

    const needsPage2 =
      remainingTxs.length > 0 ||
      workers.length > 0 ||
      materials.length > 0 ||
      daily.length > 0 ||
      totalTxs > page1TxLimit;

    const pages = [
      {
        pageNumber: 1,
        showKop: true,
        showRingkasan: true,
        mutasiSlice: page1Txs,
        isMutasiPartial: totalTxs > page1TxLimit,
        showUpah: !needsPage2 && workers.length > 0,
        upahSlice: !needsPage2 ? workers : [],
        showMaterial: !needsPage2 && materials.length > 0,
        materialSlice: !needsPage2 ? materials : [],
        showLaporan: !needsPage2 && daily.length > 0,
        laporanSlice: !needsPage2 ? daily : [],
        showSignature: !needsPage2
      }
    ];

    if (needsPage2) {
      pages.push({
        pageNumber: 2,
        showKop: false,
        showRingkasan: false,
        mutasiSlice: page2Txs,
        isMutasiPartial: page3Txs.length > 0,
        showUpah: true,
        upahSlice: needsPage3 ? workers.slice(0, isLandscape ? 10 : 6) : workers,
        showMaterial: !needsPage3,
        materialSlice: !needsPage3 ? materials : [],
        showLaporan: !needsPage3,
        laporanSlice: !needsPage3 ? daily : [],
        showSignature: !needsPage3
      });
    }

    if (needsPage3) {
      pages.push({
        pageNumber: 3,
        showKop: false,
        showRingkasan: false,
        mutasiSlice: page3Txs,
        isMutasiPartial: false,
        showUpah: workers.length > (isLandscape ? 10 : 6),
        upahSlice: workers.slice(isLandscape ? 10 : 6),
        showMaterial: true,
        materialSlice: materials,
        showLaporan: true,
        laporanSlice: daily,
        showSignature: true
      });
    }

    return pages;
  }, [reportData, effectiveOrientation]);

  const totalPageCount = pagesData.length;

  // Multi-Page Image Export Handler (JPEG / PNG)
  const handleExportImage = async () => {
    if (!pagesContainerRef.current) return;
    setIsExportingImage(true);
    setDownloadSuccessInfo(null);

    const ext = imageFormat === 'PNG' ? 'png' : 'jpg';
    const mimeType = imageFormat === 'PNG' ? 'image/png' : 'image/jpeg';
    const cleanProject = reportData.project.name.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-');

    try {
      const pageElements = Array.from(
        pagesContainerRef.current.querySelectorAll<HTMLElement>('.dataku-print-page')
      );

      if (pageElements.length === 0) {
        throw new Error('Tidak ada halaman yang ditemukan.');
      }

      for (let i = 0; i < pageElements.length; i++) {
        const pageEl = pageElements[i];
        const pageNum = i + 1;
        setExportProgressText(`Merender Halaman ${pageNum} dari ${pageElements.length}...`);

        // High Quality Render with html2canvas
        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          backgroundColor: '#ffffff',
          logging: false
        });

        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((b) => {
            if (b) resolve(b);
            else reject(new Error('Canvas toBlob failed'));
          }, mimeType, 0.95);
        });

        const url = URL.createObjectURL(blob);
        const fileName = `DATAKU-Rekap-${cleanProject}-Halaman-${pageNum}.${ext}`;

        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (pageElements.length > 1 && i < pageElements.length - 1) {
          await new Promise((r) => setTimeout(r, 400));
        }
      }

      setDownloadSuccessInfo(`✓ Berhasil mengunduh ${pageElements.length} halaman gambar ${imageFormat}.`);
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
          {/* Left: Title and Format Status Indicator Badge */}
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
              <span className="text-emerald-700 font-mono font-black">{totalPageCount} Halaman</span>
            </div>
          </div>

          {/* Right: Action Buttons (Cetak/PDF, Export JPEG/PNG, Excel, CSV, Config, Close) */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Settings Dropdown Toggle */}
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
                  <Loader2 className="w-4 h-4 animate-spin" /> Mengunduh...
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4" /> Export {imageFormat}
                </>
              )}
            </button>

            {/* Excel 5 Sheet */}
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

        {/* Expandable Format Settings Bar (Clean & Responsive) */}
        {showSettingsDrawer && (
          <div className="bg-amber-50/90 border-b-2 border-[#0F172A] p-3 sm:px-5 sm:py-3 text-xs font-bold text-slate-900 grid grid-cols-1 sm:grid-cols-4 gap-3 select-none animate-fade-in print:hidden">
            {/* 1. UKURAN KERTAS */}
            <div>
              <label className="text-[10px] uppercase font-extrabold text-slate-500 block mb-1">
                Ukuran Kertas:
              </label>
              <div className="flex gap-1.5">
                {(['A4', 'F4'] as PaperSize[]).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => handleSaveConfig(sz, orientationMode, autoFit, imageFormat)}
                    className={`flex-1 py-1 px-2 rounded-lg border-2 text-center text-xs font-extrabold cursor-pointer transition-all ${
                      paperSize === sz
                        ? 'bg-[#0284C7] text-white border-[#0F172A] shadow-neo-sm'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {sz} {sz === 'A4' ? '(210×297)' : '(215×330)'}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. ORIENTASI */}
            <div>
              <label className="text-[10px] uppercase font-extrabold text-slate-500 block mb-1">
                Orientasi:
              </label>
              <div className="flex gap-1">
                {(['Otomatis', 'Portrait', 'Landscape'] as PageOrientation[]).map((ori) => (
                  <button
                    key={ori}
                    type="button"
                    onClick={() => handleSaveConfig(paperSize, ori, autoFit, imageFormat)}
                    className={`flex-1 py-1 px-1.5 rounded-lg border-2 text-center text-[10px] font-extrabold cursor-pointer transition-all ${
                      orientationMode === ori
                        ? 'bg-[#0284C7] text-white border-[#0F172A] shadow-neo-sm'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {ori === 'Otomatis' ? 'Auto' : ori}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. AUTO FIT CONTENT */}
            <div>
              <label className="text-[10px] uppercase font-extrabold text-slate-500 block mb-1">
                Tata Letak &amp; Isi:
              </label>
              <label className="flex items-center gap-2 p-1.5 bg-white border-2 border-slate-300 rounded-lg cursor-pointer hover:border-slate-400">
                <input
                  type="checkbox"
                  checked={autoFit}
                  onChange={(e) => handleSaveConfig(paperSize, orientationMode, e.target.checked, imageFormat)}
                  className="w-4 h-4 rounded text-[#0284C7] focus:ring-[#0284C7] cursor-pointer"
                />
                <span className="text-[11px] font-bold text-slate-800">Sesuaikan otomatis dengan isi</span>
              </label>
            </div>

            {/* 4. FORMAT GAMBAR */}
            <div>
              <label className="text-[10px] uppercase font-extrabold text-slate-500 block mb-1">
                Format Gambar:
              </label>
              <div className="flex gap-1.5">
                {(['JPEG', 'PNG'] as ImageExportFormat[]).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => handleSaveConfig(paperSize, orientationMode, autoFit, fmt)}
                    className={`flex-1 py-1 px-2 rounded-lg border-2 text-center text-xs font-extrabold cursor-pointer transition-all ${
                      imageFormat === fmt
                        ? 'bg-purple-600 text-white border-[#0F172A] shadow-neo-sm'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Progress or Success Toast Banner */}
        {isExportingImage && (
          <div className="bg-purple-100 border-b border-purple-300 px-4 py-2 text-xs font-bold text-purple-900 flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-purple-700" />
              <span>{exportProgressText || 'Memproses export gambar berkualitas tinggi...'}</span>
            </div>
            <span className="text-[10px] text-purple-700 uppercase font-mono">150–200 DPI Rendering</span>
          </div>
        )}

        {downloadSuccessInfo && (
          <div className="bg-emerald-100 border-b border-emerald-300 px-4 py-2 text-xs font-bold text-emerald-900 flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-700" />
              <span>{downloadSuccessInfo}</span>
            </div>
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
          className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200/90 flex flex-col items-center gap-8 print:p-0 print:bg-white print:overflow-visible print:gap-0"
        >
          {pagesData.map((page, index) => {
            const pageNum = index + 1;
            return (
              <div
                key={pageNum}
                data-page-index={pageNum}
                className={`dataku-print-page bg-white border border-slate-300 sm:border-2 sm:border-[#0F172A]/40 p-6 sm:p-10 text-slate-900 font-sans text-xs leading-relaxed shadow-xl print:shadow-none print:border-none print:p-6 print:w-full print:max-w-none ${
                  paperDimensions.widthClass
                } ${paperDimensions.minHeightClass} flex flex-col justify-between relative`}
                style={{
                  boxSizing: 'border-box'
                }}
              >
                {/* On-Screen Subtle Page Header Indicator (Hidden when printing/exporting) */}
                <div className="no-print absolute -top-3 left-4 bg-[#0F172A] text-white text-[9px] font-extrabold uppercase px-2 py-0.5 rounded shadow-neo-sm tracking-wider">
                  Halaman {pageNum} dari {totalPageCount} ({paperSize} {effectiveOrientation})
                </div>

                {/* Content Block of Page */}
                <div className="space-y-4">
                  {/* Page 1: Full Kop Surat */}
                  {page.showKop && (
                    <div className="text-center space-y-1 border-b-4 border-double border-slate-900 pb-3">
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
                      <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-widest text-slate-800">
                        REKAP KEUANGAN &amp; LAPORAN PROYEK
                      </h2>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide">
                        Sistem Manajemen Mandor Lapangan Terpadu
                      </p>
                    </div>
                  )}

                  {/* Page 2+: Compact Header for continuation */}
                  {!page.showKop && (
                    <div className="flex justify-between items-center border-b-2 border-slate-800 pb-2 text-[10px] text-slate-600 font-bold uppercase">
                      <span>{identityConfig?.appName || 'DATAKU'} • {reportData.project.name}</span>
                      <span>
                        Lanjutan Rekap ({pageNum}/{totalPageCount})
                      </span>
                    </div>
                  )}

                  {/* Metadata Block (Page 1 only) */}
                  {page.showKop && (
                    <div className="grid grid-cols-2 gap-4 py-3 border-b border-slate-300 text-[11px] font-medium">
                      <div className="space-y-1">
                        <p>
                          <span className="text-slate-500 font-bold uppercase">Proyek:</span>{' '}
                          <strong className="text-slate-900 uppercase">{reportData.project.name}</strong>
                        </p>
                        <p>
                          <span className="text-slate-500 font-bold uppercase">Lokasi:</span>{' '}
                          {reportData.project.location}
                        </p>
                        <p>
                          <span className="text-slate-500 font-bold uppercase">Pemilik Proyek:</span>{' '}
                          {reportData.project.owner}
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
                          {reportData.project.mandorName}
                        </p>
                        <p>
                          <span className="text-slate-500 font-bold uppercase">Waktu Cetak:</span>{' '}
                          {reportData.printDate}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* SECTION I: RINGKASAN REKAPITULASI (Page 1) */}
                  {page.showRingkasan && (
                    <div className="my-3">
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
                          <span className="font-extrabold text-amber-800 text-sm block mt-0.5">
                            {formatRupiah(reportData.ringkasan.upahTukang)}
                          </span>
                        </div>
                        <div className="border-r border-slate-200 pr-2">
                          <span className="text-slate-500 text-[9px] font-bold uppercase block">Bahan / Material</span>
                          <span className="font-extrabold text-slate-800 text-sm block mt-0.5">
                            {formatRupiah(reportData.ringkasan.pembelianMaterial)}
                          </span>
                        </div>
                        <div className="col-span-2 sm:col-span-1 bg-emerald-50/60 p-1.5 rounded">
                          <span className="text-slate-600 text-[9px] font-bold uppercase block">Sisa Kas</span>
                          <span className="font-black text-emerald-800 text-sm block mt-0.5">
                            {formatRupiah(reportData.ringkasan.saldoKas)}
                          </span>
                        </div>
                      </div>

                      {/* Rincian Persentase Pengeluaran Berdasarkan Kategori */}
                      <div className="mt-3 border-t border-slate-200 pt-2.5">
                        <span className="text-slate-500 text-[9px] font-extrabold uppercase block mb-1">
                          Rincian Persentase Pengeluaran Berdasarkan Kategori
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                          {categoriesList.map((c, idx) => (
                            <div key={idx} className="bg-slate-50 p-1.5 rounded border border-slate-200">
                              <span className="text-slate-600 font-extrabold uppercase block truncate">{c.name}</span>
                              <span className="font-extrabold text-slate-950 block mt-0.5">
                                {formatRupiah(c.amount)}{' '}
                                <span className="text-slate-500 font-normal">({c.percentage}%)</span>
                              </span>
                            </div>
                          ))}
                          {categoriesList.length === 0 && (
                            <div className="col-span-full text-slate-400 font-medium italic">
                              Belum ada pengeluaran tercatat.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SECTION II: MUTASI DANA SLICE */}
                  {page.mutasiSlice.length > 0 && (
                    <div className="my-3">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b-2 border-slate-900 pb-1 mb-2">
                        II. DAFTAR MUTASI DANA {page.isMutasiPartial ? `(Lanjutan Halaman ${pageNum})` : `(${reportData.mutasiDana.length} Transaksi)`}
                      </h3>
                      <table className="w-full text-left text-[10px] border-collapse border border-slate-300">
                        <thead>
                          <tr className="bg-slate-100 text-slate-800 font-bold uppercase">
                            <th className="p-1.5 border border-slate-300">Tanggal</th>
                            <th className="p-1.5 border border-slate-300">Jenis</th>
                            <th className="p-1.5 border border-slate-300">Kategori</th>
                            <th className="p-1.5 border border-slate-300">Keterangan</th>
                            <th className="p-1.5 border border-slate-300">Sumber / Penerima</th>
                            <th className="p-1.5 border border-slate-300 text-right">Nominal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {page.mutasiSlice.map((tx, idx) => (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                              <td className="p-1.5 border border-slate-300 whitespace-nowrap">
                                {formatTanggal(tx.date)}
                              </td>
                              <td className="p-1.5 border border-slate-300 font-bold text-[9px] uppercase">
                                {tx.type === 'DANA_MASUK' ? 'DANA MASUK' : 'PENGELUARAN'}
                              </td>
                              <td className="p-1.5 border border-slate-300 font-semibold">{tx.category}</td>
                              <td className="p-1.5 border border-slate-300 text-slate-600 italic max-w-[160px] truncate">
                                {tx.notes || '-'}
                              </td>
                              <td className="p-1.5 border border-slate-300 font-bold uppercase">
                                {tx.sourceOrRecipient}
                              </td>
                              <td
                                className={`p-1.5 border border-slate-300 font-bold text-right whitespace-nowrap ${
                                  tx.type === 'DANA_MASUK' ? 'text-emerald-700' : 'text-red-600'
                                }`}
                              >
                                {tx.type === 'DANA_MASUK' ? '+' : '-'} {formatRupiah(tx.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* SECTION III: REKAP UPAH MINGGUAN */}
                  {page.showUpah && page.upahSlice.length > 0 && (
                    <div className="my-3">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b-2 border-slate-900 pb-1 mb-2">
                        III. REKAP UPAH MINGGUAN ({page.upahSlice.length} Pekerja)
                      </h3>
                      <table className="w-full text-left text-[10px] border-collapse border border-slate-300">
                        <thead>
                          <tr className="bg-slate-100 text-slate-800 font-bold uppercase">
                            <th className="p-1.5 border border-slate-300">Minggu</th>
                            <th className="p-1.5 border border-slate-300">Nama Tukang</th>
                            <th className="p-1.5 border border-slate-300">Pekerjaan / Posisi</th>
                            <th className="p-1.5 border border-slate-300 text-center">Hari</th>
                            <th className="p-1.5 border border-slate-300 text-right">Tarif</th>
                            <th className="p-1.5 border border-slate-300 text-right">Total Upah</th>
                            <th className="p-1.5 border border-slate-300 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {page.upahSlice.map((w, idx) => (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                              <td className="p-1.5 border border-slate-300 font-bold text-slate-700 whitespace-nowrap">
                                M-{w.weekNumber || 1}
                              </td>
                              <td className="p-1.5 border border-slate-300 font-bold uppercase">{w.name}</td>
                              <td className="p-1.5 border border-slate-300">{w.position}</td>
                              <td className="p-1.5 border border-slate-300 text-center">{w.daysWorked} hr</td>
                              <td className="p-1.5 border border-slate-300 text-right">{formatRupiah(w.dailyRate)}</td>
                              <td className="p-1.5 border border-slate-300 font-bold text-right text-slate-900">
                                {formatRupiah(w.totalWages)}
                              </td>
                              <td className="p-1.5 border border-slate-300 text-center font-bold">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[8px] uppercase ${
                                    w.status === 'LUNAS'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : w.status === 'SEBAGIAN'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {w.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* SECTION IV: RINGKASAN MATERIAL */}
                  {page.showMaterial && page.materialSlice.length > 0 && (
                    <div className="my-3">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b-2 border-slate-900 pb-1 mb-2">
                        IV. RINGKASAN MATERIAL ({page.materialSlice.length} Item)
                      </h3>
                      <table className="w-full text-left text-[10px] border-collapse border border-slate-300">
                        <thead>
                          <tr className="bg-slate-100 text-slate-800 font-bold uppercase">
                            <th className="p-1.5 border border-slate-300">Nama Material</th>
                            <th className="p-1.5 border border-slate-300 text-center">Satuan</th>
                            <th className="p-1.5 border border-slate-300 text-right">Masuk</th>
                            <th className="p-1.5 border border-slate-300 text-right">Keluar</th>
                            <th className="p-1.5 border border-slate-300 text-right">Terpakai</th>
                            <th className="p-1.5 border border-slate-300 text-right font-black">Sisa Stok</th>
                          </tr>
                        </thead>
                        <tbody>
                          {page.materialSlice.map((m, idx) => (
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
                  {page.showLaporan && page.laporanSlice.length > 0 && (
                    <div className="my-3">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b-2 border-slate-900 pb-1 mb-2">
                        V. LAPORAN HARIAN ({page.laporanSlice.length} Hari)
                      </h3>
                      <table className="w-full text-left text-[10px] border-collapse border border-slate-300">
                        <thead>
                          <tr className="bg-slate-100 text-slate-800 font-bold uppercase">
                            <th className="p-1.5 border border-slate-300">Tanggal</th>
                            <th className="p-1.5 border border-slate-300">Cuaca</th>
                            <th className="p-1.5 border border-slate-300 text-center">Pekerja</th>
                            <th className="p-1.5 border border-slate-300">Pekerjaan Lapangan</th>
                            <th className="p-1.5 border border-slate-300">Kendala</th>
                          </tr>
                        </thead>
                        <tbody>
                          {page.laporanSlice.map((r, idx) => (
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

                  {/* Tanda Tangan Mandor & Pengawas (Last Page only) */}
                  {page.showSignature && (
                    <div className="mt-8 pt-4 grid grid-cols-2 gap-8 text-center text-xs font-bold">
                      <div>
                        <p className="mb-14 text-slate-700">Mandor Proyek,</p>
                        <p className="underline uppercase tracking-wide text-slate-900 font-black">
                          {reportData.project.mandorName}
                        </p>
                        <p className="text-[10px] text-slate-500 uppercase mt-0.5">DATAKU MANDOR SYSTEM</p>
                      </div>
                      <div>
                        <p className="mb-14 text-slate-700">Pengawas / Pemilik,</p>
                        <p className="underline uppercase tracking-wide text-slate-900 font-black">
                          ( {reportData.project.owner} )
                        </p>
                        <p className="text-[10px] text-slate-500 uppercase mt-0.5">PERWAKILAN OWNER</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Page Footer (Numbering & Timestamp) */}
                <div className="mt-6 pt-2 border-t border-slate-300 flex justify-between items-center text-[9px] text-slate-400 uppercase tracking-wider">
                  <span>Dicetak melalui aplikasi DATAKU Mandor • {reportData.printDate}</span>
                  <span className="font-black text-slate-600">
                    Halaman {pageNum} dari {totalPageCount}
                  </span>
                </div>
              </div>
            );
          })}
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
          body * {
            visibility: hidden !important;
          }
          .dataku-print-page, .dataku-print-page * {
            visibility: visible !important;
          }
          .dataku-print-page {
            position: relative !important;
            page-break-after: always !important;
            break-after: page !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          .no-print {
            display: none !important;
          }
          nav, aside, header, button {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
