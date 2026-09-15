/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Card, Button, Badge } from '../components/Common';
import { formatRupiah, formatTanggal, formatTanggalWaktu } from '../utils/format';
import {
  TrendingUp,
  TrendingDown,
  FileDown,
  FileSpreadsheet,
  Printer,
  Calendar,
  Search,
  ChevronDown,
  Info,
  Layers,
  Users,
  Wallet
} from 'lucide-react';
import { Transaction } from '../types';

export const RekapView: React.FC = () => {
  const { state } = useApp();
  const activeProj = state.projects.find(p => p.id === state.activeProjectId);

  // Filters State
  const [periode, setPeriode] = useState<'hari' | 'minggu' | 'bulan' | '3bulan' | 'custom'>('bulan');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [kategoriFilter, setKategoriFilter] = useState<string>('Semua');
  const [searchTerm, setSearchTerm] = useState('');

  // PDF / Document Preview State
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // 1. Filter transactions by Project
  const projectTxs = useMemo(() => {
    if (!activeProj) return [];
    return state.transactions.filter(t => t.projectId === activeProj.id);
  }, [state.transactions, activeProj]);

  // 2. Filter transactions by Period
  const periodicTxs = useMemo(() => {
    if (projectTxs.length === 0) return [];
    
    const now = new Date();
    const todayStr = now.toISOString().substring(0, 10);
    
    return projectTxs.filter(tx => {
      const txDate = new Date(tx.date);
      if (isNaN(txDate.getTime())) return true; // Keep if unparseable
      
      const txDateStr = tx.date.substring(0, 10);

      switch (periode) {
        case 'hari':
          return txDateStr === todayStr;
        case 'minggu': {
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(now.getDate() - 7);
          return txDate >= oneWeekAgo && txDate <= now;
        }
        case 'bulan': {
          const oneMonthAgo = new Date();
          oneMonthAgo.setMonth(now.getMonth() - 1);
          return txDate >= oneMonthAgo && txDate <= now;
        }
        case '3bulan': {
          const threeMonthsAgo = new Date();
          threeMonthsAgo.setMonth(now.getMonth() - 3);
          return txDate >= threeMonthsAgo && txDate <= now;
        }
        case 'custom': {
          if (!startDate && !endDate) return true;
          let match = true;
          if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            match = match && txDate >= start;
          }
          if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            match = match && txDate <= end;
          }
          return match;
        }
        default:
          return true;
      }
    });
  }, [projectTxs, periode, startDate, endDate]);

  // 3. Filter transactions by Search Term & Category Filter
  const filteredTxs = useMemo(() => {
    return periodicTxs.filter(tx => {
      // Category match
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

      // Search term match
      let matchSearch = true;
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        matchSearch =
          tx.sourceOrRecipient.toLowerCase().includes(query) ||
          tx.notes.toLowerCase().includes(query) ||
          tx.category.toLowerCase().includes(query);
      }

      return matchCat && matchSearch;
    });
  }, [periodicTxs, kategoriFilter, searchTerm]);

  // --- Calculations based on filtered periodic transactions ---
  const ringkasan = useMemo(() => {
    let danaMasuk = 0;
    let pengeluaran = 0;
    let upahTukang = 0;
    let pembelianMaterial = 0;

    periodicTxs.forEach(t => {
      if (t.type === 'DANA_MASUK') {
        danaMasuk += t.amount;
      } else {
        pengeluaran += t.amount;
        if (t.type === 'UPAH_TUKANG' || t.category === 'Upah Tukang') {
          upahTukang += t.amount;
        } else if (t.category === 'Material') {
          pembelianMaterial += t.amount;
        }
      }
    });

    const saldo = danaMasuk - pengeluaran;

    return {
      danaMasuk,
      pengeluaran,
      upahTukang,
      pembelianMaterial,
      saldo
    };
  }, [periodicTxs]);

  // Handle printing using browser dialog
  const handlePrint = () => {
    window.print();
  };

  // CSV Exporter
  const handleDownloadCSV = () => {
    if (!activeProj) return;

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'REKAP KEUANGAN PROYEK DATAKU\n';
    csvContent += `Nama Proyek,${activeProj.name}\n`;
    csvContent += `Periode,${periode === 'custom' ? `${startDate} s/d ${endDate}` : periode.toUpperCase()}\n\n`;
    csvContent += 'RINGKASAN\n';
    csvContent += `Total Dana Masuk,Rp ${ringkasan.danaMasuk}\n`;
    csvContent += `Total Pengeluaran,Rp ${ringkasan.pengeluaran}\n`;
    csvContent += `Total Upah Tukang,Rp ${ringkasan.upahTukang}\n`;
    csvContent += `Total Material,Rp ${ringkasan.pembelianMaterial}\n`;
    csvContent += `Saldo Kas,Rp ${ringkasan.saldo}\n\n`;
    csvContent += 'DAFTAR TRANSAKSI\n';
    csvContent += 'Tanggal,Jenis,Kategori,Keterangan,Sumber/Penerima,Nominal,Status\n';

    filteredTxs.forEach(t => {
      const formattedDate = t.date.substring(0, 10);
      const sign = t.type === 'DANA_MASUK' ? '+' : '-';
      csvContent += `"${formattedDate}","${t.type}","${t.category}","${t.notes.replace(/"/g, '""')}","${t.sourceOrRecipient.replace(/"/g, '""')}","${sign}${t.amount}","${t.status || 'Berhasil'}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    const pLabel = activeProj.name.replace(/\s+/g, '_');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DATAKU_Rekap_Keuangan_${pLabel}_${periode}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Excel multi-sheet XML exporter
  const handleDownloadExcel = () => {
    if (!activeProj) return;

    const pLabel = activeProj.name.replace(/\s+/g, '_');
    const filename = `DATAKU_Rekap_Keuangan_${pLabel}_${periode}.xls`;

    // Multi-sheet XML string
    let xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Bottom"/>
   <Borders/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="Header">
   <Font ss:FontName="Calibri" ss:Size="12" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0F172A" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="BoldText">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Ringkasan">
  <Table>
   <Row><Cell ss:StyleID="BoldText"><Data ss:Type="String">REKAP GLOBAL PROYEK: ${activeProj.name}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Periode: ${periode === 'custom' ? `${startDate} - ${endDate}` : periode.toUpperCase()}</Data></Cell></Row>
   <Row></Row>
   <Row ss:StyleID="Header">
    <Cell><Data ss:Type="String">Sektor Keuangan</Data></Cell>
    <Cell><Data ss:Type="String">Jumlah Nominal</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">TOTAL DANA MASUK</Data></Cell>
    <Cell><Data ss:Type="Number">${ringkasan.danaMasuk}</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">TOTAL PENGELUARAN (OPERASIONAL + UPAH)</Data></Cell>
    <Cell><Data ss:Type="Number">${ringkasan.pengeluaran}</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">TOTAL UPAH TUKANG</Data></Cell>
    <Cell><Data ss:Type="Number">${ringkasan.upahTukang}</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">TOTAL PEMBELIAN MATERIAL</Data></Cell>
    <Cell><Data ss:Type="Number">${ringkasan.pembelianMaterial}</Data></Cell>
   </Row>
   <Row ss:StyleID="BoldText">
    <Cell><Data ss:Type="String">SALDO SISA KAS</Data></Cell>
    <Cell><Data ss:Type="Number">${ringkasan.saldo}</Data></Cell>
   </Row>
  </Table>
 </Worksheet>
 <Worksheet ss:Name="Riwayat Transaksi">
  <Table>
   <Row ss:StyleID="Header">
    <Cell><Data ss:Type="String">Tanggal</Data></Cell>
    <Cell><Data ss:Type="String">Jenis</Data></Cell>
    <Cell><Data ss:Type="String">Kategori</Data></Cell>
    <Cell><Data ss:Type="String">Keterangan</Data></Cell>
    <Cell><Data ss:Type="String">Sumber/Penerima</Data></Cell>
    <Cell><Data ss:Type="String">Nominal</Data></Cell>
    <Cell><Data ss:Type="String">Status</Data></Cell>
   </Row>
`;

    filteredTxs.forEach(t => {
      const formattedDate = t.date.substring(0, 10);
      const signNum = t.type === 'DANA_MASUK' ? t.amount : -t.amount;
      xml += `   <Row>
    <Cell><Data ss:Type="String">${formattedDate}</Data></Cell>
    <Cell><Data ss:Type="String">${t.type}</Data></Cell>
    <Cell><Data ss:Type="String">${t.category}</Data></Cell>
    <Cell><Data ss:Type="String">${t.notes}</Data></Cell>
    <Cell><Data ss:Type="String">${t.sourceOrRecipient}</Data></Cell>
    <Cell><Data ss:Type="Number">${signNum}</Data></Cell>
    <Cell><Data ss:Type="String">${t.status || 'Berhasil'}</Data></Cell>
   </Row>
`;
    });

    xml += `  </Table>
 </Worksheet>
</Workbook>`;

    const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!activeProj) {
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

  return (
    <div className="space-y-6">
      {/* 1. Header & Proyek Aktif Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-2 border-[#0F172A] pb-4 select-none">
        <div>
          <span className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider bg-slate-100 border border-[#0f172a]/20 px-2 py-1 rounded-lg">
            PROYEK: {activeProj.name}
          </span>
          <h2 className="text-xl font-chunky text-[#0F172A] uppercase mt-2">REKAP KEUANGAN PROYEK</h2>
        </div>

        {/* Export and Print actions */}
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowPreviewModal(true)}>
            <Printer className="w-4 h-4 mr-1.5" /> Preview Cetak
          </Button>
          <Button variant="secondary" size="sm" onClick={handleDownloadExcel}>
            <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-500" /> Ekspor Excel
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDownloadCSV}>
            <FileDown className="w-4 h-4 mr-1.5 text-[#0284C7]" /> Ekspor CSV
          </Button>
        </div>
      </div>

      {/* 2. Ringkasan Finansial Card Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 select-none">
        <div className="bg-[#E0F2FE] border-2 border-[#0F172A] rounded-2xl p-4 shadow-neo">
          <span className="text-[9px] font-extrabold text-[#0369A1] uppercase block mb-1">Penerimaan</span>
          <p className="text-lg font-chunky text-[#0F172A] truncate">{formatRupiah(ringkasan.danaMasuk)}</p>
          <TrendingUp className="w-4 h-4 text-emerald-600 mt-2" />
        </div>

        <div className="bg-[#FAF8FF] border-2 border-[#0F172A] rounded-2xl p-4 shadow-neo">
          <span className="text-[9px] font-extrabold text-[#64748B] uppercase block mb-1">Total Keluar</span>
          <p className="text-lg font-chunky text-[#0F172A] truncate">{formatRupiah(ringkasan.pengeluaran)}</p>
          <TrendingDown className="w-4 h-4 text-red-500 mt-2" />
        </div>

        <div className="bg-[#FEF3C7] border-2 border-[#0F172A] rounded-2xl p-4 shadow-neo">
          <span className="text-[9px] font-extrabold text-[#92400E] uppercase block mb-1">Upah Tukang</span>
          <p className="text-lg font-chunky text-[#0F172A] truncate">{formatRupiah(ringkasan.upahTukang)}</p>
          <Users className="w-4 h-4 text-amber-600 mt-2" />
        </div>

        <div className="bg-[#FFF7ED] border-2 border-[#0F172A] rounded-2xl p-4 shadow-neo">
          <span className="text-[9px] font-extrabold text-[#C2410C] uppercase block mb-1">Material</span>
          <p className="text-lg font-chunky text-[#0F172A] truncate">{formatRupiah(ringkasan.pembelianMaterial)}</p>
          <Layers className="w-4 h-4 text-orange-500 mt-2" />
        </div>

        <div className="col-span-2 lg:col-span-1 bg-[#D1FAE5] border-2 border-[#0F172A] rounded-2xl p-4 shadow-neo">
          <span className="text-[9px] font-extrabold text-[#065F46] uppercase block mb-1">Sisa Kas</span>
          <p className="text-lg font-chunky text-emerald-700 truncate">{formatRupiah(ringkasan.saldo)}</p>
          <Wallet className="w-4 h-4 text-emerald-600 mt-2" />
        </div>
      </div>

      {/* 3. Filters & Search Controls */}
      <Card className="p-4 select-none">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {/* Period Selection */}
          <div>
            <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wide block mb-1.5">Periode Laporan</label>
            <div className="relative">
              <select
                value={periode}
                onChange={(e) => setPeriode(e.target.value as any)}
                className="w-full bg-white border-2 border-[#0F172A] rounded-xl px-3.5 py-2 text-xs font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0284C7] shadow-neo-sm appearance-none cursor-pointer"
              >
                <option value="hari">Hari Ini</option>
                <option value="minggu">Minggu Ini</option>
                <option value="bulan">Bulan Ini</option>
                <option value="3bulan">3 Bulan Terakhir</option>
                <option value="custom">Custom Tanggal</option>
              </select>
              <ChevronDown className="w-4 h-4 text-[#0F172A] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Custom Dates (Conditional) */}
          {periode === 'custom' && (
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
          <div className={periode === 'custom' ? 'md:col-span-4' : 'md:col-span-2'}>
            <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wide block mb-1.5">Pencarian Kata Kunci</label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari transaksi (e.g. semen, dana, Toko)..."
                className="w-full bg-white border-2 border-[#0F172A] rounded-xl pl-10 pr-4 py-2 text-xs font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0284C7] shadow-neo-sm"
              />
              <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>
      </Card>

      {/* 4. Transactions Ledger Table / Mobile cards */}
      <Card className="overflow-hidden p-0">
        <div className="px-5 py-4 border-b-2 border-[#0F172A] bg-white flex justify-between items-center select-none">
          <span className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider flex items-center gap-1.5">
            <Info className="w-4 h-4 text-[#0284C7]" /> BUKU LOG TRANSAKSI ({filteredTxs.length})
          </span>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto select-text">
          <table className="w-full border-collapse text-left text-xs font-semibold">
            <thead>
              <tr className="bg-[#FAF8FF] border-b-2 border-[#0F172A] text-[10px] font-extrabold uppercase tracking-wider text-[#64748B] select-none">
                <th className="p-4">Tanggal</th>
                <th className="p-4">Jenis</th>
                <th className="p-4">Kategori</th>
                <th className="p-4">Keterangan</th>
                <th className="p-4">Sumber/Penerima</th>
                <th className="p-4 text-right">Nominal</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Bukti</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0F172A]/10">
              {filteredTxs.map((tx) => (
                <tr key={tx.id} className="hover:bg-[#FAF8FF]/60 transition-colors">
                  <td className="p-4 whitespace-nowrap font-bold text-[#0F172A]">{formatTanggal(tx.date)}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-lg font-extrabold text-[9px] border border-[#0f172a]/15 ${
                      tx.type === 'DANA_MASUK' ? 'bg-[#D1FAE5] text-emerald-800' : 'bg-[#FEE2E2] text-red-800'
                    }`}>
                      {tx.type === 'DANA_MASUK' ? 'DANA MASUK' : 'PENGELUARAN'}
                    </span>
                  </td>
                  <td className="p-4 whitespace-nowrap font-extrabold text-[#475569]">{tx.category}</td>
                  <td className="p-4 font-medium text-[#475569] max-w-[200px] truncate" title={tx.notes}>
                    {tx.notes || '-'}
                  </td>
                  <td className="p-4 font-bold text-[#0F172A] uppercase">{tx.sourceOrRecipient}</td>
                  <td className={`p-4 font-chunky text-right text-sm ${
                    tx.type === 'DANA_MASUK' ? 'text-emerald-600' : 'text-red-500'
                  }`}>
                    {tx.type === 'DANA_MASUK' ? '+' : '-'} {formatRupiah(tx.amount)}
                  </td>
                  <td className="p-4 text-center select-none">
                    <span className="inline-block px-1.5 py-0.5 rounded-md bg-emerald-50 text-[10px] font-bold text-emerald-600 border border-emerald-300">
                      {tx.status || 'Berhasil'}
                    </span>
                  </td>
                  <td className="p-4 text-center select-none">
                    {tx.photos && tx.photos.length > 0 ? (
                      <button
                        onClick={() => alert(`Membuka lampiran gambar: ${tx.photos[0]}`)}
                        className="text-[10px] font-bold text-[#0284C7] hover:underline cursor-pointer"
                      >
                        Lihat ({tx.photos.length})
                      </button>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                </tr>
              ))}

              {filteredTxs.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400 font-bold uppercase select-none">
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

              {tx.photos && tx.photos.length > 0 && (
                <div className="flex gap-2.5 pt-1">
                  {tx.photos.map((p, i) => (
                    <div key={i} className="w-10 h-10 rounded border border-[#0F172A] overflow-hidden">
                      <img src={p} alt="Bukti Lampiran" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {filteredTxs.length === 0 && (
            <div className="p-12 text-center text-slate-400 font-bold uppercase select-none">
              Tidak ada log transaksi.
            </div>
          )}
        </div>
      </Card>

      {/* 5. Printable A4 Laporan Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-[#0F172A]/80 flex items-center justify-center z-50 p-4 select-none animate-fade-in overflow-y-auto">
          <div className="bg-white border-3 border-[#0F172A] rounded-2xl w-full max-w-4xl shadow-neo-lg overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-[#FAF8FF] border-b-2 border-[#0F172A] p-4 flex justify-between items-center">
              <h3 className="font-chunky text-base text-[#0F172A] uppercase">PREVIEW DOKUMEN REKAP KEUANGAN</h3>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={handlePrint}>
                  <Printer className="w-4 h-4 mr-1.5" /> Cetak Laporan (A4)
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowPreviewModal(false)}>
                  Tutup
                </Button>
              </div>
            </div>

            {/* A4 Paper Container for scrolling print view */}
            <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-slate-100 flex justify-center">
              {/* Paper styled document */}
              <div id="printable-area" className="bg-white w-full max-w-[210mm] border-2 border-dashed border-slate-400 p-8 text-black font-sans leading-relaxed shadow-lg">
                
                {/* Print Layout Header */}
                <div className="text-center space-y-1.5 border-b-4 border-double border-black pb-5">
                  <h1 className="text-3xl font-black tracking-tight">DATAKU</h1>
                  <h2 className="text-base font-extrabold uppercase tracking-widest text-slate-800">REKAP KEUANGAN PROYEK</h2>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">
                    Sistem Manajemen Keuangan Mandor Lapangan Terintegrasi
                  </p>
                </div>

                {/* Meta details */}
                <div className="grid grid-cols-2 gap-4 py-5 text-xs font-semibold border-b border-slate-300">
                  <div className="space-y-1">
                    <p><span className="text-slate-500 uppercase font-bold">Proyek:</span> {activeProj.name}</p>
                    <p><span className="text-slate-500 uppercase font-bold">Lokasi:</span> {activeProj.location}</p>
                    <p><span className="text-slate-500 uppercase font-bold">Pemilik:</span> {activeProj.owner}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p><span className="text-slate-500 uppercase font-bold">Periode:</span> {periode === 'custom' ? `${formatTanggal(startDate)} s/d ${formatTanggal(endDate)}` : periode.toUpperCase()}</p>
                    <p><span className="text-slate-500 uppercase font-bold">Tanggal Cetak:</span> {formatTanggal(new Date().toISOString())}</p>
                    <p><span className="text-slate-500 uppercase font-bold">Oleh Mandor:</span> {state.currentUser?.name || 'PAUJI'}</p>
                  </div>
                </div>

                {/* Ringkasan Box */}
                <div className="my-6">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider mb-3">I. RINGKASAN REKAPITULASI</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-slate-50 border border-slate-300 rounded-lg p-4 font-bold text-xs">
                    <div>
                      <p className="text-slate-500 text-[10px] uppercase">Dana Masuk</p>
                      <p className="text-emerald-700 font-extrabold mt-1">{formatRupiah(ringkasan.danaMasuk)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-[10px] uppercase">Pengeluaran</p>
                      <p className="text-red-600 font-extrabold mt-1">{formatRupiah(ringkasan.pengeluaran)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-[10px] uppercase">Upah Tukang</p>
                      <p className="text-[#92400E] font-extrabold mt-1">{formatRupiah(ringkasan.upahTukang)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-[10px] uppercase">Bahan/Material</p>
                      <p className="text-slate-700 font-extrabold mt-1">{formatRupiah(ringkasan.pembelianMaterial)}</p>
                    </div>
                    <div className="col-span-2 md:col-span-1 border-t md:border-t-0 md:border-l border-slate-300 pt-2.5 md:pt-0 md:pl-3">
                      <p className="text-slate-500 text-[10px] uppercase">Sisa Kas</p>
                      <p className="text-emerald-700 text-sm font-black mt-1">{formatRupiah(ringkasan.saldo)}</p>
                    </div>
                  </div>
                </div>

                {/* Table Data */}
                <div className="my-6">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider mb-3">II. DAFTAR MUTASI DANA</h3>
                  <table className="w-full text-left text-[10px] font-medium border-collapse border border-slate-300">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300 text-[10px] font-bold uppercase text-slate-700">
                        <th className="p-2 border border-slate-300">Tanggal</th>
                        <th className="p-2 border border-slate-300">Jenis</th>
                        <th className="p-2 border border-slate-300">Kategori</th>
                        <th className="p-2 border border-slate-300">Keterangan</th>
                        <th className="p-2 border border-slate-300">Sumber / Penerima</th>
                        <th className="p-2 border border-slate-300 text-right">Nominal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTxs.map((t, index) => {
                        const formattedDate = t.date.substring(0, 10);
                        return (
                          <tr key={index} className="border-b border-slate-200">
                            <td className="p-2 border border-slate-300 whitespace-nowrap">{formattedDate}</td>
                            <td className="p-2 border border-slate-300 uppercase font-semibold text-[9px]">{t.type}</td>
                            <td className="p-2 border border-slate-300 uppercase">{t.category}</td>
                            <td className="p-2 border border-slate-300 italic text-slate-600">{t.notes || '-'}</td>
                            <td className="p-2 border border-slate-300 font-bold">{t.sourceOrRecipient}</td>
                            <td className={`p-2 border border-slate-300 font-bold text-right ${t.type === 'DANA_MASUK' ? 'text-emerald-700' : 'text-red-600'}`}>
                              {t.type === 'DANA_MASUK' ? '+' : '-'} {formatRupiah(t.amount)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Signatures */}
                <div className="mt-16 grid grid-cols-2 gap-12 text-center text-xs font-bold select-none">
                  <div>
                    <p className="mb-20">Mandor Proyek,</p>
                    <p className="underline uppercase">{state.currentUser?.name || 'PAUJI'}</p>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase mt-0.5">DATAKU MANDOR SYSTEM</p>
                  </div>
                  <div>
                    <p className="mb-20">Pengawas Lapangan,</p>
                    <p className="underline">(.................................)</p>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase mt-0.5">PERWAKILAN PEMILIK</p>
                  </div>
                </div>

                {/* Print Layout Footer */}
                <div className="mt-12 pt-4 border-t border-slate-200 text-center text-[9px] text-slate-400 uppercase tracking-widest select-none">
                  Dicetak melalui aplikasi DATAKU Mandor • Halaman 1 dari 1
                </div>

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
          aside, header, nav, button, .lg\\:pl-64 {
            display: none !important;
          }
        }
      `}</style>

    </div>
  );
};
