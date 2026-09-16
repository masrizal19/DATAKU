/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CurrentReportData } from '../types';
import { formatRupiah, formatTanggal } from '../utils/format';
import { Printer, FileSpreadsheet, FileDown, X } from 'lucide-react';
import { exportReportToExcel, exportReportToCSV } from '../utils/rekapEngine';

interface PrintPreviewModalProps {
  reportData: CurrentReportData;
  onClose: () => void;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({ reportData, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-[#0F172A]/85 flex items-center justify-center z-50 p-2 sm:p-4 select-none animate-fade-in overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible">
      <div className="bg-white border-3 border-[#0F172A] rounded-2xl w-full max-w-4xl shadow-neo-lg overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:border-none print:shadow-none print:w-full print:rounded-none">
        
        {/* Modal Top Actions Header (Hidden when printing) */}
        <div className="bg-[#FAF8FF] border-b-2 border-[#0F172A] p-3 sm:p-4 flex flex-wrap justify-between items-center gap-2 print:hidden">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 border border-[#0F172A]" />
            <h3 className="font-chunky text-xs sm:text-sm text-[#0F172A] uppercase">
              PREVIEW CETAK & DOKUMEN REKAP (A4)
            </h3>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold text-xs rounded-xl border-2 border-[#0F172A] shadow-neo-sm flex items-center gap-1.5 cursor-pointer transition-all active:translate-y-0.5"
            >
              <Printer className="w-4 h-4" /> Cetak / Save PDF
            </button>
            <button
              onClick={() => exportReportToExcel(reportData)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl border-2 border-[#0F172A] shadow-neo-sm flex items-center gap-1.5 cursor-pointer transition-all active:translate-y-0.5"
            >
              <FileSpreadsheet className="w-4 h-4" /> Excel (5 Sheet)
            </button>
            <button
              onClick={() => exportReportToCSV(reportData)}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-[#0F172A] font-bold text-xs rounded-xl border-2 border-[#0F172A] shadow-neo-sm flex items-center gap-1.5 cursor-pointer transition-all active:translate-y-0.5"
            >
              <FileDown className="w-4 h-4" /> CSV
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center bg-white hover:bg-slate-100 text-[#0F172A] font-extrabold text-sm rounded-xl border-2 border-[#0F172A] cursor-pointer"
              title="Tutup Preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Paper Container for Scrolling / Print Target */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-8 bg-slate-200/80 flex justify-center print:p-0 print:bg-white print:overflow-visible">
          {/* Exact A4 Printable Sheet */}
          <div
            id="printable-area"
            className="bg-white w-full max-w-[210mm] border border-slate-300 sm:border-2 sm:border-dashed sm:border-slate-400 p-6 sm:p-10 text-slate-900 font-sans text-xs leading-relaxed shadow-lg print:shadow-none print:border-none print:p-6 print:w-full print:max-w-none"
          >
            {/* Header Kop Laporan */}
            <div className="text-center space-y-1 border-b-4 border-double border-slate-900 pb-4">
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl">🔨</span>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">DATAKU</h1>
              </div>
              <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-widest text-slate-800">
                REKAP KEUANGAN &amp; LAPORAN PROYEK
              </h2>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">
                Sistem Manajemen Mandor Lapangan Terpadu
              </p>
            </div>

            {/* Metadata Ringkasan */}
            <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-300 text-[11px] font-medium">
              <div className="space-y-1">
                <p><span className="text-slate-500 font-bold uppercase">Proyek:</span> <strong className="text-slate-900 uppercase">{reportData.project.name}</strong></p>
                <p><span className="text-slate-500 font-bold uppercase">Lokasi:</span> {reportData.project.location}</p>
                <p><span className="text-slate-500 font-bold uppercase">Pemilik Proyek:</span> {reportData.project.owner}</p>
                <p><span className="text-slate-500 font-bold uppercase">Anggaran Proyek:</span> {formatRupiah(reportData.project.budget)}</p>
              </div>
              <div className="space-y-1 text-right">
                <p><span className="text-slate-500 font-bold uppercase">Periode:</span> <strong className="text-slate-900 uppercase">{reportData.period.label}</strong></p>
                <p><span className="text-slate-500 font-bold uppercase">Mandor Lapangan:</span> {reportData.project.mandorName}</p>
                <p><span className="text-slate-500 font-bold uppercase">Waktu Cetak:</span> {reportData.printDate}</p>
              </div>
            </div>

            {/* SECTION I: RINGKASAN REKAPITULASI */}
            <div className="my-5 page-break-avoid">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b-2 border-slate-900 pb-1 mb-2.5">
                I. RINGKASAN REKAPITULASI
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 bg-slate-50 border border-slate-300 rounded p-3 text-[11px]">
                <div className="border-r border-slate-200 pr-2">
                  <span className="text-slate-500 text-[9px] font-bold uppercase block">Dana Masuk</span>
                  <span className="font-extrabold text-emerald-700 text-sm block mt-0.5">{formatRupiah(reportData.ringkasan.danaMasuk)}</span>
                </div>
                <div className="border-r border-slate-200 pr-2">
                  <span className="text-slate-500 text-[9px] font-bold uppercase block">Pengeluaran</span>
                  <span className="font-extrabold text-red-600 text-sm block mt-0.5">{formatRupiah(reportData.ringkasan.pengeluaran)}</span>
                </div>
                <div className="border-r border-slate-200 pr-2">
                  <span className="text-slate-500 text-[9px] font-bold uppercase block">Upah Tukang</span>
                  <span className="font-extrabold text-amber-800 text-sm block mt-0.5">{formatRupiah(reportData.ringkasan.upahTukang)}</span>
                </div>
                <div className="border-r border-slate-200 pr-2">
                  <span className="text-slate-500 text-[9px] font-bold uppercase block">Bahan / Material</span>
                  <span className="font-extrabold text-slate-800 text-sm block mt-0.5">{formatRupiah(reportData.ringkasan.pembelianMaterial)}</span>
                </div>
                <div className="col-span-2 sm:col-span-1 bg-emerald-50/60 p-1.5 rounded">
                  <span className="text-slate-600 text-[9px] font-bold uppercase block">Sisa Kas</span>
                  <span className="font-black text-emerald-800 text-sm block mt-0.5">{formatRupiah(reportData.ringkasan.saldoKas)}</span>
                </div>
              </div>

              {/* Rincian Persentase Pengeluaran Berdasarkan Kategori */}
              {(() => {
                const totalOut = reportData.ringkasan.pengeluaran;
                const categoriesMap: { [key: string]: number } = {};
                reportData.mutasiDana.filter(t => t.type !== 'DANA_MASUK').forEach(t => {
                  categoriesMap[t.category] = (categoriesMap[t.category] || 0) + t.amount;
                });
                const categoriesList = Object.keys(categoriesMap).map(k => ({
                  name: k,
                  amount: categoriesMap[k],
                  percentage: totalOut > 0 ? Math.round((categoriesMap[k] / totalOut) * 100) : 0
                })).sort((a, b) => b.amount - a.amount);

                return (
                  <div className="mt-3.5 border-t border-slate-200 pt-3">
                    <span className="text-slate-500 text-[9px] font-extrabold uppercase block mb-1.5">Rincian Persentase Pengeluaran Berdasarkan Kategori</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10px]">
                      {categoriesList.map((c, idx) => (
                        <div key={idx} className="bg-slate-50 p-1.5 rounded border border-slate-200">
                          <span className="text-slate-600 font-extrabold uppercase block truncate">{c.name}</span>
                          <span className="font-extrabold text-slate-950 block mt-0.5">
                            {formatRupiah(c.amount)} <span className="text-slate-500 font-normal">({c.percentage}%)</span>
                          </span>
                        </div>
                      ))}
                      {categoriesList.length === 0 && (
                        <div className="col-span-full text-slate-400 font-medium italic">Belum ada pengeluaran tercatat.</div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* SECTION II: DAFTAR MUTASI DANA */}
            <div className="my-5 page-break-avoid">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b-2 border-slate-900 pb-1 mb-2.5">
                II. DAFTAR MUTASI DANA ({reportData.mutasiDana.length} Transaksi)
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
                  {reportData.mutasiDana.map((tx, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                      <td className="p-1.5 border border-slate-300 whitespace-nowrap">{formatTanggal(tx.date)}</td>
                      <td className="p-1.5 border border-slate-300 font-bold text-[9px] uppercase">
                        {tx.type === 'DANA_MASUK' ? 'DANA MASUK' : 'PENGELUARAN'}
                      </td>
                      <td className="p-1.5 border border-slate-300 font-semibold">{tx.category}</td>
                      <td className="p-1.5 border border-slate-300 text-slate-600 italic max-w-[160px] truncate">{tx.notes || '-'}</td>
                      <td className="p-1.5 border border-slate-300 font-bold uppercase">{tx.sourceOrRecipient}</td>
                      <td className={`p-1.5 border border-slate-300 font-bold text-right whitespace-nowrap ${tx.type === 'DANA_MASUK' ? 'text-emerald-700' : 'text-red-600'}`}>
                        {tx.type === 'DANA_MASUK' ? '+' : '-'} {formatRupiah(tx.amount)}
                      </td>
                    </tr>
                  ))}
                  {reportData.mutasiDana.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-3 text-center text-slate-400 font-bold">
                        Tidak ada transaksi pada periode ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* SECTION III: REKAP UPAH MINGGUAN */}
            <div className="my-5 page-break-avoid">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b-2 border-slate-900 pb-1 mb-2.5">
                III. REKAP UPAH MINGGUAN ({reportData.rekapUpah.length} Pekerja)
              </h3>
              <table className="w-full text-left text-[10px] border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold uppercase">
                    <th className="p-1.5 border border-slate-300">Minggu</th>
                    <th className="p-1.5 border border-slate-300">Nama Tukang</th>
                    <th className="p-1.5 border border-slate-300">Pekerjaan / Posisi</th>
                    <th className="p-1.5 border border-slate-300 text-center">Hari Kerja</th>
                    <th className="p-1.5 border border-slate-300 text-right">Tarif Harian</th>
                    <th className="p-1.5 border border-slate-300 text-right">Total Upah</th>
                    <th className="p-1.5 border border-slate-300 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.rekapUpah.map((w, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                      <td className="p-1.5 border border-slate-300 font-bold text-slate-700 whitespace-nowrap">
                        Minggu {w.weekNumber || 1}
                      </td>
                      <td className="p-1.5 border border-slate-300 font-bold uppercase">{w.name}</td>
                      <td className="p-1.5 border border-slate-300">{w.position}</td>
                      <td className="p-1.5 border border-slate-300 text-center">{w.daysWorked} hari</td>
                      <td className="p-1.5 border border-slate-300 text-right">{formatRupiah(w.dailyRate)}</td>
                      <td className="p-1.5 border border-slate-300 font-bold text-right text-slate-900">{formatRupiah(w.totalWages)}</td>
                      <td className="p-1.5 border border-slate-300 text-center font-bold">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase ${
                          w.status === 'LUNAS' ? 'bg-emerald-100 text-emerald-800' :
                          w.status === 'SEBAGIAN' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {w.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {reportData.rekapUpah.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-3 text-center text-slate-400 font-bold">
                        Belum ada data upah tenaga kerja pada periode ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* SECTION IV: RINGKASAN MATERIAL */}
            <div className="my-5 page-break-avoid">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b-2 border-slate-900 pb-1 mb-2.5">
                IV. RINGKASAN MATERIAL ({reportData.ringkasanMaterial.length} Item)
              </h3>
              <table className="w-full text-left text-[10px] border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold uppercase">
                    <th className="p-1.5 border border-slate-300">Nama Material</th>
                    <th className="p-1.5 border border-slate-300 text-center">Satuan</th>
                    <th className="p-1.5 border border-slate-300 text-right">Barang Masuk</th>
                    <th className="p-1.5 border border-slate-300 text-right">Barang Keluar</th>
                    <th className="p-1.5 border border-slate-300 text-right">Barang Terpakai</th>
                    <th className="p-1.5 border border-slate-300 text-right font-black">Sisa Stok</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.ringkasanMaterial.map((m, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                      <td className="p-1.5 border border-slate-300 font-bold uppercase">{m.materialName}</td>
                      <td className="p-1.5 border border-slate-300 text-center">{m.unit}</td>
                      <td className="p-1.5 border border-slate-300 text-right text-emerald-700 font-semibold">{m.masuk > 0 ? `+${m.masuk}` : '0'}</td>
                      <td className="p-1.5 border border-slate-300 text-right text-amber-700 font-semibold">{m.keluar > 0 ? `-${m.keluar}` : '0'}</td>
                      <td className="p-1.5 border border-slate-300 text-right text-red-600 font-semibold">{m.terpakai > 0 ? `-${m.terpakai}` : '0'}</td>
                      <td className="p-1.5 border border-slate-300 text-right font-black text-slate-900">{m.sisaStok}</td>
                    </tr>
                  ))}
                  {reportData.ringkasanMaterial.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-3 text-center text-slate-400 font-bold">
                        Belum ada item material yang terdaftar pada proyek ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* SECTION V: LAPORAN HARIAN */}
            <div className="my-5 page-break-avoid">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b-2 border-slate-900 pb-1 mb-2.5">
                V. LAPORAN HARIAN ({reportData.laporanHarian.length} Hari)
              </h3>
              <table className="w-full text-left text-[10px] border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold uppercase">
                    <th className="p-1.5 border border-slate-300">Tanggal</th>
                    <th className="p-1.5 border border-slate-300">Cuaca</th>
                    <th className="p-1.5 border border-slate-300 text-center">Tukang</th>
                    <th className="p-1.5 border border-slate-300">Pekerjaan Lapangan</th>
                    <th className="p-1.5 border border-slate-300">Material Terpakai</th>
                    <th className="p-1.5 border border-slate-300">Kendala</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.laporanHarian.map((r, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                      <td className="p-1.5 border border-slate-300 whitespace-nowrap font-bold">{formatTanggal(r.date)}</td>
                      <td className="p-1.5 border border-slate-300">{r.weather}</td>
                      <td className="p-1.5 border border-slate-300 text-center font-bold">{r.workerCount} Org</td>
                      <td className="p-1.5 border border-slate-300 font-medium">{r.todayWork}</td>
                      <td className="p-1.5 border border-slate-300 text-slate-600">{r.materialsUsed || '-'}</td>
                      <td className="p-1.5 border border-slate-300 italic text-slate-600">{r.challenges || '-'}</td>
                    </tr>
                  ))}
                  {reportData.laporanHarian.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-3 text-center text-slate-400 font-bold">
                        Tidak ada log laporan harian pada periode ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Tanda Tangan Mandor & Pengawas */}
            <div className="mt-12 pt-6 grid grid-cols-2 gap-12 text-center text-xs font-bold page-break-avoid">
              <div>
                <p className="mb-20 text-slate-700">Mandor Proyek,</p>
                <p className="underline uppercase tracking-wide text-slate-900 font-black">
                  {reportData.project.mandorName}
                </p>
                <p className="text-[10px] text-slate-500 uppercase mt-0.5">DATAKU MANDOR SYSTEM</p>
              </div>
              <div>
                <p className="mb-20 text-slate-700">Pengawas / Pemilik,</p>
                <p className="underline uppercase tracking-wide text-slate-900 font-black">
                  ( {reportData.project.owner} )
                </p>
                <p className="text-[10px] text-slate-500 uppercase mt-0.5">PERWAKILAN OWNER</p>
              </div>
            </div>

            {/* Footer Cetak */}
            <div className="mt-8 pt-3 border-t border-slate-300 text-center text-[9px] text-slate-400 uppercase tracking-widest">
              Dicetak melalui aplikasi DATAKU Mandor • {reportData.printDate}
            </div>

          </div>
        </div>

      </div>

      {/* Global Print Media Query Isolation CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-area, #printable-area * {
            visibility: visible !important;
          }
          #printable-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 15mm 10mm !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          .page-break-avoid {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          nav, aside, header, button, .no-print {
            display: none !important;
          }
        }
      `}</style>

    </div>
  );
};
