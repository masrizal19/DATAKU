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

  // Dynamic Pagination Engine
  const pagesData = useMemo(() => {
    const isLandscape = effectiveOrientation === 'Landscape';
    const isF4 = paperSize === 'F4';

    // Weight capacity budget per page (units)
    let maxPageCapacity = 62; // A4 Portrait default
    if (isF4 && !isLandscape) maxPageCapacity = 70;
    if (!isF4 && isLandscape) maxPageCapacity = 40;
    if (isF4 && isLandscape) maxPageCapacity = 44;

    const mutasi = reportData.mutasiDana || [];
    const workers = reportData.rekapUpah || [];
    const materials = reportData.ringkasanMaterial || [];
    const daily = reportData.laporanHarian || [];

    const pages: Array<{
      pageNumber: number;
      showKop: boolean;
      showRingkasan: boolean;
      mutasiSlice: typeof mutasi;
      showMutasiHeader: boolean;
      upahSlice: typeof workers;
      showUpahHeader: boolean;
      materialSlice: typeof materials;
      showMaterialHeader: boolean;
      laporanSlice: typeof daily;
      showLaporanHeader: boolean;
      showSignature: boolean;
    }> = [];

    let currentMutasiIdx = 0;
    let currentWorkerIdx = 0;
    let currentMaterialIdx = 0;
    let currentDailyIdx = 0;
    let signaturePlaced = false;

    let pageNum = 1;

    while (
      currentMutasiIdx < mutasi.length ||
      currentWorkerIdx < workers.length ||
      currentMaterialIdx < materials.length ||
      currentDailyIdx < daily.length ||
      !signaturePlaced
    ) {
      const isPage1 = pageNum === 1;
      let remainingCapacity = maxPageCapacity;

      const showKop = isPage1;
      const showRingkasan = isPage1;

      if (showKop) {
        remainingCapacity -= 18; // Full Kop Header
        remainingCapacity -= 8;  // Metadata grid
      } else {
        remainingCapacity -= 2.5; // Compact header
      }

      if (showRingkasan) {
        remainingCapacity -= 6.5; // Ringkasan Rekapitulasi
        remainingCapacity -= 6.5; // Category percentage breakdown
      }

      remainingCapacity -= 2.0; // Footer space

      // 1. Mutasi Dana
      let pageMutasi: typeof mutasi = [];
      let showMutasiHeader = false;

      if (currentMutasiIdx < mutasi.length) {
        showMutasiHeader = true;
        remainingCapacity -= 3.5; // Table header

        const maxRowsOnThisPage = Math.max(1, Math.floor(remainingCapacity / 1.5));
        const endIdx = Math.min(mutasi.length, currentMutasiIdx + maxRowsOnThisPage);
        pageMutasi = mutasi.slice(currentMutasiIdx, endIdx);
        currentMutasiIdx = endIdx;
        remainingCapacity -= (pageMutasi.length * 1.5);
      }

      // 2. Rekap Upah
      let pageUpah: typeof workers = [];
      let showUpahHeader = false;

      if (currentMutasiIdx >= mutasi.length && currentWorkerIdx < workers.length && remainingCapacity >= 5.0) {
        showUpahHeader = true;
        remainingCapacity -= 3.5;

        const maxRowsOnThisPage = Math.max(1, Math.floor(remainingCapacity / 1.5));
        const endIdx = Math.min(workers.length, currentWorkerIdx + maxRowsOnThisPage);
        pageUpah = workers.slice(currentWorkerIdx, endIdx);
        currentWorkerIdx = endIdx;
        remainingCapacity -= (pageUpah.length * 1.5);
      }

      // 3. Ringkasan Material
      let pageMaterial: typeof materials = [];
      let showMaterialHeader = false;

      if (
        currentMutasiIdx >= mutasi.length &&
        currentWorkerIdx >= workers.length &&
        currentMaterialIdx < materials.length &&
        remainingCapacity >= 5.0
      ) {
        showMaterialHeader = true;
        remainingCapacity -= 3.5;

        const maxRowsOnThisPage = Math.max(1, Math.floor(remainingCapacity / 1.5));
        const endIdx = Math.min(materials.length, currentMaterialIdx + maxRowsOnThisPage);
        pageMaterial = materials.slice(currentMaterialIdx, endIdx);
        currentMaterialIdx = endIdx;
        remainingCapacity -= (pageMaterial.length * 1.5);
      }

      // 4. Laporan Harian
      let pageDaily: typeof daily = [];
      let showLaporanHeader = false;

      if (
        currentMutasiIdx >= mutasi.length &&
        currentWorkerIdx >= workers.length &&
        currentMaterialIdx >= materials.length &&
        currentDailyIdx < daily.length &&
        remainingCapacity >= 5.5
      ) {
        showLaporanHeader = true;
        remainingCapacity -= 3.5;

        const maxRowsOnThisPage = Math.max(1, Math.floor(remainingCapacity / 2.0));
        const endIdx = Math.min(daily.length, currentDailyIdx + maxRowsOnThisPage);
        pageDaily = daily.slice(currentDailyIdx, endIdx);
        currentDailyIdx = endIdx;
        remainingCapacity -= (pageDaily.length * 2.0);
      }

      // 5. Signature Block
      let showSignature = false;
      if (
        currentMutasiIdx >= mutasi.length &&
        currentWorkerIdx >= workers.length &&
        currentMaterialIdx >= materials.length &&
        currentDailyIdx >= daily.length &&
        !signaturePlaced
      ) {
        if (remainingCapacity >= 9.5 || isPage1) {
          showSignature = true;
          signaturePlaced = true;
        }
      }

      pages.push({
        pageNumber: pageNum,
        showKop,
        showRingkasan,
        mutasiSlice: pageMutasi,
        showMutasiHeader,
        upahSlice: pageUpah,
        showUpahHeader,
        materialSlice: pageMaterial,
        showMaterialHeader,
        laporanSlice: pageDaily,
        showLaporanHeader,
        showSignature
      });

      pageNum++;
      if (pageNum > 100) break; // Guard against infinite loop
    }

    return pages;
  }, [reportData, effectiveOrientation, paperSize]);

  const totalPageCount = pagesData.length;

  // Multi-Page Image Export Handler (JPEG / PNG)
  const handleExportImage = async () => {
    if (!pagesContainerRef.current) return;
    setIsExportingImage(true);
    setDownloadSuccessInfo(null);
    const ext = imageFormat === 'PNG' ? 'png' : 'jpg';
    const mimeType = imageFormat === 'PNG' ? 'image/png' : 'image/jpeg';
    const cleanProject = reportData.project.name.replace(/[^a-zA-Z0-9]/g, '_').replace(/__+/g, '_');

    try {
      const pageElements = Array.from(
        pagesContainerRef.current.querySelectorAll<HTMLElement>('.dataku-print-page')
      );

      if (pageElements.length === 0) {
        throw new Error('Tidak ada halaman yang ditemukan.');
      }

      const generatedImages: { fileName: string; blob: Blob; dataUrl: string }[] = [];

      for (let i = 0; i < pageElements.length; i++) {
        const pageEl = pageElements[i];
        const pageNum = i + 1;
        setExportProgressText(`Merender Halaman ${pageNum} dari ${pageElements.length}...`);

        const exportClone = pageEl.cloneNode(true) as HTMLElement;
        exportClone.style.position = 'absolute';
        exportClone.style.left = '-9999px';
        exportClone.style.top = '0';
        pageEl.parentNode?.insertBefore(exportClone, pageEl.nextSibling);
        normalizeColorsOnClone(pageEl, exportClone);

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
        const fileName = `DATAKU_${cleanProject}_Rekap_${paperSize}_Halaman_${pageNum}.${ext}`;

        generatedImages.push({ fileName, blob, dataUrl });
      }

      if (generatedImages.length === 1) {
        const item = generatedImages[0];
        const a = document.createElement('a');
        a.href = item.dataUrl;
        a.download = item.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        setExportProgressText('Mengemas ke file ZIP...');
        const zip = new JSZip();
        generatedImages.forEach(img => zip.file(img.fileName, img.blob));
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipUrl = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = zipUrl;
        a.download = `DATAKU_${cleanProject}_Rekap_${paperSize}_Semua_Halaman.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(zipUrl);
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
              <span className="text-emerald-700 font-mono font-black">{totalPageCount} Halaman</span>
              <span className="text-slate-400 font-mono">({reportData.mutasiDana.length} tx)</span>
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
              {isExportingImage ? (                <>
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
          className="dataku-print-container flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200/90 flex flex-col items-center gap-8 print:p-0 print:bg-white print:overflow-visible print:gap-0"
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
                <div
                  className="print:hidden absolute -top-3 left-4 bg-[#0F172A] text-white text-[9px] font-extrabold uppercase px-2 py-0.5 rounded shadow-neo-sm tracking-wider"
                  data-html2canvas-ignore="true"
                >
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
                          <span className="font-extrabold text-amber-700 text-sm block mt-0.5">
                            {formatRupiah(reportData.ringkasan.upahTukang)}
                          </span>
                        </div>
                        <div className="border-r border-slate-200 pr-2">
                          <span className="text-slate-500 text-[9px] font-bold uppercase block">Bahan/Material</span>
                          <span className="font-extrabold text-blue-700 text-sm block mt-0.5">
                            {formatRupiah(reportData.ringkasan.material)}
                          </span>
                        </div>
                        <div className="pl-1">
                          <span className="text-slate-500 text-[9px] font-bold uppercase block">Sisa Kas</span>
                          <span
                            className={`font-black text-sm block mt-0.5 ${
                              reportData.ringkasan.sisaKas >= 0 ? 'text-emerald-800' : 'text-red-700'
                            }`}
                          >
                            {formatRupiah(reportData.ringkasan.sisaKas)}
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
                  )}

                  {/* SECTION II: DAFTAR MUTASI DANA */}
                  {page.showMutasiHeader && (
                    <div className="my-3">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b-2 border-slate-900 pb-1 mb-2">
                        II. DAFTAR MUTASI DANA {pageNum > 1 ? '(Lanjutan)' : ''}
                      </h3>
                      <table className="w-full text-left text-[10px] border-collapse border border-slate-300">
                        <thead>
                          <tr className="bg-slate-100 text-slate-800 font-bold uppercase">
                            <th className="p-1.5 border border-slate-300 w-8 text-center">No</th>
                            <th className="p-1.5 border border-slate-300">Tanggal &amp; Waktu</th>
                            <th className="p-1.5 border border-slate-300">Tipe / Kategori</th>
                            <th className="p-1.5 border border-slate-300">Keterangan / Deskripsi</th>
                            <th className="p-1.5 border border-slate-300 text-right">Jumlah (Rp)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {page.mutasiSlice.map((tx, idx) => (
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

                  {/* SECTION III: REKAP UPAH */}
                  {page.showUpahHeader && page.upahSlice.length > 0 && (
                    <div className="my-3">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b-2 border-slate-900 pb-1 mb-2">
                        III. REKAP UPAH TUKANG &amp; PEKERJA ({page.upahSlice.length} Orang)
                      </h3>
                      <table className="w-full text-left text-[10px] border-collapse border border-slate-300">
                        <thead>
                          <tr className="bg-slate-100 text-slate-800 font-bold uppercase">
                            <th className="p-1.5 border border-slate-300">Nama Pekerja</th>
                            <th className="p-1.5 border border-slate-300 text-center">Jabatan</th>
                            <th className="p-1.5 border border-slate-300 text-right">Hari Kerja</th>
                            <th className="p-1.5 border border-slate-300 text-right">Upah / Hari</th>
                            <th className="p-1.5 border border-slate-300 text-right font-black">Total Upah</th>
                          </tr>
                        </thead>
                        <tbody>
                          {page.upahSlice.map((w, idx) => (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                              <td className="p-1.5 border border-slate-300 font-bold uppercase">{w.workerName}</td>
                              <td className="p-1.5 border border-slate-300 text-center">{w.role}</td>
                              <td className="p-1.5 border border-slate-300 text-right">{w.daysWorked} Hari</td>
                              <td className="p-1.5 border border-slate-300 text-right">{formatRupiah(w.dailyRate)}</td>
                              <td className="p-1.5 border border-slate-300 text-right font-black text-slate-900">
                                {formatRupiah(w.totalWage)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* SECTION IV: RINGKASAN MATERIAL */}
                  {page.showMaterialHeader && page.materialSlice.length > 0 && (
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
                  {page.showLaporanHeader && page.laporanSlice.length > 0 && (
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

                  {/* Tanda Tangan Mandor & Pengawas */}
                  {page.showSignature && (
                    <div className="mt-8 pt-4 grid grid-cols-2 gap-8 text-center text-xs font-bold break-inside-avoid">
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

                {/* Page Footer */}
                <div className="mt-auto pt-3 border-t border-slate-300 flex justify-between items-center text-[9px] text-slate-400 uppercase tracking-wider dataku-print-footer">
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
          margin: 8mm;
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
          #printable-rekap-area *,
          .dataku-print-page,
          .dataku-print-page * {
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
            z-index: 999999 !important;
          }
          .dataku-print-page {
            position: relative !important;
            top: auto !important;
            left: auto !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 6mm 8mm !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #000000 !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            box-sizing: border-box !important;
          }
          .dataku-print-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          thead {
            display: table-header-group !important;
          }
          nav, aside, header, button, .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
