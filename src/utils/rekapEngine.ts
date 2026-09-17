import { formatTanggalWaktu } from './format';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppState, CurrentReportData, Worker, Transaction, DailyReport } from '../types';
import { getJakartaDateString, getJakartaFullDateTime, getProjectWeeks, ProjectWeek } from './datetime';
import { formatRupiah, formatTanggal } from './format';

export interface ReportFilterOptions {
  periode: 'hari' | 'minggu' | 'bulan' | 'custom' | 'project_week';
  weekNumber?: number;
  startDate?: string;
  endDate?: string;
}

/**
 * SINGLE SOURCE OF TRUTH: REKAP ENGINE
 * Menghasilkan currentReportData yang dipakai bersama oleh:
 * - UI Rekap Keuangan
 * - Print Preview Modal
 * - Cetak (window.print())
 * - Simpan / Cetak PDF
 * - Ekspor Excel (5 Sheet)
 * - Ekspor CSV
 * - Google Sheets Sync
 */
export function buildCurrentReportData(
  state: AppState,
  projectId: string,
  options: ReportFilterOptions
): CurrentReportData | null {
  const project = state.projects.find(p => p.id === projectId);
  if (!project) return null;

  const todayStr = getJakartaDateString();
  const weeks = getProjectWeeks(project.startDate || '2026-09-01', 8);

  let dateStart = '';
  let dateEnd = '';
  let periodLabel = '';
  let weekNum: number | undefined = undefined;

  switch (options.periode) {
    case 'hari': {
      dateStart = todayStr;
      dateEnd = todayStr;
      periodLabel = `HARI INI (${formatTanggal(todayStr)})`;
      break;
    }
    case 'minggu': {
      // Kalender 7 hari terakhir
      const d = new Date();
      d.setDate(d.getDate() - 7);
      dateStart = getJakartaDateString(d);
      dateEnd = todayStr;
      periodLabel = `7 HARI TERAKHIR (${formatTanggal(dateStart)} s/d ${formatTanggal(dateEnd)})`;
      break;
    }
    case 'bulan': {
      // Bulan berjalan
      const y = todayStr.substring(0, 4);
      const m = todayStr.substring(5, 7);
      dateStart = `${y}-${m}-01`;
      dateEnd = todayStr;
      const monthName = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date());
      periodLabel = `BULAN ${monthName.toUpperCase()}`;
      break;
    }
    case 'project_week': {
      weekNum = options.weekNumber || 1;
      const selectedWeek = weeks.find(w => w.weekNumber === weekNum) || weeks[0];
      dateStart = selectedWeek.startDate;
      dateEnd = selectedWeek.endDate;
      periodLabel = selectedWeek.label.toUpperCase();
      break;
    }
    case 'custom': {
      dateStart = options.startDate || '2020-01-01';
      dateEnd = options.endDate || todayStr;
      periodLabel = `PERIODE ${formatTanggal(dateStart)} s/d ${formatTanggal(dateEnd)}`;
      break;
    }
    default: {
      dateStart = '2020-01-01';
      dateEnd = '2099-12-31';
      periodLabel = 'SEMUA PERIODE PROYEK';
    }
  }

  // 1. Filter Mutasi Dana
  const projectTxs = state.transactions.filter(t => t.projectId === project.id);
  const mutasiDana = projectTxs.filter(tx => {
    const txDateStr = tx.date.substring(0, 10);
    return txDateStr >= dateStart && txDateStr <= dateEnd;
  }).sort((a, b) => {
    const orderA = a.displayOrder || 0;
    const orderB = b.displayOrder || 0;
    if (orderA !== orderB) return orderA - orderB;
    // Fallback to date ASC
    // Fallback to transaction_at/date ASC
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    if (dateA !== dateB) return dateA - dateB;
    return (a.id || '').localeCompare(b.id || '');
  });

  // Hitung Ringkasan
  let danaMasuk = 0;
  let pengeluaran = 0;
  let upahTukang = 0;
  let pembelianMaterial = 0;

  mutasiDana.forEach(tx => {
    if (tx.type === 'DANA_MASUK') {
      danaMasuk += tx.amount;
    } else {
      pengeluaran += tx.amount;
      if (tx.type === 'UPAH_TUKANG' || tx.category === 'Upah Tukang') {
        upahTukang += tx.amount;
      } else if (tx.category === 'Material') {
        pembelianMaterial += tx.amount;
      }
    }
  });

  const saldoKas = danaMasuk - pengeluaran;

  // 2. Filter Rekap Upah Mingguan
  const projectWorkers = state.workers.filter(w => w.projectId === project.id);
  const rekapUpah = projectWorkers.filter(w => {
    if (options.periode === 'project_week' && weekNum) {
      // Saring pekerja berdasarkan minggu proyek
      return (w.weekNumber || 1) === weekNum;
    }
    // Jika filter tanggal, periksa paymentDate atau tanggal minggu pekerja
    if (w.weekStartDate && w.weekEndDate) {
      return (w.weekStartDate >= dateStart && w.weekStartDate <= dateEnd) ||
             (w.weekEndDate >= dateStart && w.weekEndDate <= dateEnd);
    }
    if (w.paymentDate) {
      const pDate = w.paymentDate.substring(0, 10);
      return pDate >= dateStart && pDate <= dateEnd;
    }
    return true;
  });

  // 3. Ringkasan Material (Gudang vs Log Aktivitas)
  const projectMaterials = state.materials.filter(m => m.projectId === project.id);
  const projectMatLogs = state.materialLogs.filter(l => l.projectId === project.id);

  const ringkasanMaterial = projectMaterials.map(m => {
    const logsInPeriod = projectMatLogs.filter(l => {
      if (l.materialId !== m.id) return false;
      const lDate = l.date.substring(0, 10);
      return lDate >= dateStart && lDate <= dateEnd;
    });

    const masuk = logsInPeriod.filter(l => l.type === 'MASUK').reduce((acc, l) => acc + l.amount, 0);
    const keluar = logsInPeriod.filter(l => l.type === 'KELUAR').reduce((acc, l) => acc + l.amount, 0);
    const terpakai = logsInPeriod.filter(l => l.type === 'TERPAKAI').reduce((acc, l) => acc + l.amount, 0);

    return {
      materialName: m.name,
      unit: m.unit,
      masuk,
      keluar,
      terpakai,
      sisaStok: m.stock
    };
  });

  // 4. Laporan Harian
  const projectReports = state.dailyReports.filter(r => r.projectId === project.id);
  const laporanHarian = projectReports.filter(r => {
    const rDate = r.date.substring(0, 10);
    return rDate >= dateStart && rDate <= dateEnd;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    project: {
      id: project.id,
      name: project.name,
      location: project.location,
      owner: project.owner,
      mandorName: state.currentUser?.name || 'PAUJI',
      budget: project.budget,
      startDate: project.startDate
    },
    period: {
      type: options.periode,
      weekNumber: weekNum,
      startDate: dateStart,
      endDate: dateEnd,
      label: periodLabel
    },
    printDate: getJakartaFullDateTime(new Date()),
    ringkasan: {
      danaMasuk,
      pengeluaran,
      upahTukang,
      pembelianMaterial,
      saldoKas
    },
    mutasiDana,
    rekapUpah,
    ringkasanMaterial,
    laporanHarian
  };
}

/**
 * EKSPOR EXCEL (Multi-sheet XML Spreadsheet)
 * Mencakup 5 Sheet Lengkap:
 * - Sheet 1: Ringkasan Rekapitulasi
 * - Sheet 2: Mutasi Dana
 * - Sheet 3: Upah Mingguan
 * - Sheet 4: Ringkasan Material
 * - Sheet 5: Laporan Harian
 */
export function exportReportToExcel(data: CurrentReportData): void {
  const pLabel = data.project.name.replace(/\s+/g, '_');
  const filename = `DATAKU_Rekap_${pLabel}_${data.period.label.replace(/\s+/g, '_')}.xls`;

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
   <Alignment ss:Horizontal="Center"/>
  </Style>
  <Style ss:ID="Title">
   <Font ss:FontName="Calibri" ss:Size="14" ss:Bold="1" ss:Color="#0F172A"/>
  </Style>
  <Style ss:ID="BoldText">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/>
  </Style>
  <Style ss:ID="Currency">
   <NumberFormat ss:Format="#,##0"/>
  </Style>
  <Style ss:ID="CurrencyBold">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/>
   <NumberFormat ss:Format="#,##0"/>
  </Style>
 </Styles>

 <!-- SHEET 1: RINGKASAN REKAPITULASI -->
 <Worksheet ss:Name="I. Ringkasan">
  <Table>
   <Column ss:Width="200"/>
   <Column ss:Width="160"/>
   <Row><Cell ss:StyleID="Title"><Data ss:Type="String">DATAKU - REKAP KEUANGAN PROYEK</Data></Cell></Row>
   <Row><Cell ss:StyleID="BoldText"><Data ss:Type="String">Proyek: ${data.project.name}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Lokasi: ${data.project.location}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Mandor: ${data.project.mandorName}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Periode: ${data.period.label}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Tanggal Cetak: ${data.printDate}</Data></Cell></Row>
   <Row></Row>
   <Row ss:StyleID="Header">
    <Cell><Data ss:Type="String">Pos Anggaran / Aliran Dana</Data></Cell>
    <Cell><Data ss:Type="String">Nominal (Rp)</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">TOTAL DANA MASUK</Data></Cell>
    <Cell ss:StyleID="CurrencyBold"><Data ss:Type="Number">${data.ringkasan.danaMasuk}</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">TOTAL PENGELUARAN (OPERASIONAL + UPAH)</Data></Cell>
    <Cell ss:StyleID="Currency"><Data ss:Type="Number">${data.ringkasan.pengeluaran}</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">  - Total Pembayaran Upah Tukang</Data></Cell>
    <Cell ss:StyleID="Currency"><Data ss:Type="Number">${data.ringkasan.upahTukang}</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">  - Total Pembelian Bahan / Material</Data></Cell>
    <Cell ss:StyleID="Currency"><Data ss:Type="Number">${data.ringkasan.pembelianMaterial}</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="BoldText"><Data ss:Type="String">SISA KAS PROYEK</Data></Cell>
    <Cell ss:StyleID="CurrencyBold"><Data ss:Type="Number">${data.ringkasan.saldoKas}</Data></Cell>
   </Row>
  </Table>
 </Worksheet>

 <!-- SHEET 2: DAFTAR MUTASI DANA -->
 <Worksheet ss:Name="II. Mutasi Dana">
  <Table>
   <Column ss:Width="90"/>
   <Column ss:Width="100"/>
   <Column ss:Width="120"/>
   <Column ss:Width="220"/>
   <Column ss:Width="150"/>
   <Column ss:Width="120"/>
   <Column ss:Width="80"/>
   <Row ss:StyleID="Header">
    <Cell><Data ss:Type="String">Tanggal</Data></Cell>
    <Cell><Data ss:Type="String">Jenis</Data></Cell>
    <Cell><Data ss:Type="String">Kategori</Data></Cell>
    <Cell><Data ss:Type="String">Keterangan</Data></Cell>
    <Cell><Data ss:Type="String">Sumber / Penerima</Data></Cell>
    <Cell><Data ss:Type="String">Nominal (Rp)</Data></Cell>
    <Cell><Data ss:Type="String">Status</Data></Cell>
   </Row>
`;

  data.mutasiDana.forEach(tx => {
    const d = tx.date.substring(0, 10);
    const sign = tx.type === 'DANA_MASUK' ? tx.amount : -tx.amount;
    xml += `   <Row>
    <Cell><Data ss:Type="String">${d}</Data></Cell>
    <Cell><Data ss:Type="String">${tx.type}</Data></Cell>
    <Cell><Data ss:Type="String">${tx.category}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(tx.notes || '-')}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(tx.sourceOrRecipient)}</Data></Cell>
    <Cell ss:StyleID="Currency"><Data ss:Type="Number">${sign}</Data></Cell>
    <Cell><Data ss:Type="String">${tx.status || 'Berhasil'}</Data></Cell>
   </Row>
`;
  });

  xml += `  </Table>
 </Worksheet>

 <!-- SHEET 3: REKAP UPAH MINGGUAN -->
 <Worksheet ss:Name="III. Upah Mingguan">
  <Table>
   <Column ss:Width="80"/>
   <Column ss:Width="140"/>
   <Column ss:Width="130"/>
   <Column ss:Width="70"/>
   <Column ss:Width="100"/>
   <Column ss:Width="110"/>
   <Column ss:Width="90"/>
   <Column ss:Width="90"/>
   <Row ss:StyleID="Header">
    <Cell><Data ss:Type="String">Minggu</Data></Cell>
    <Cell><Data ss:Type="String">Nama Pekerja</Data></Cell>
    <Cell><Data ss:Type="String">Posisi / Keahlian</Data></Cell>
    <Cell><Data ss:Type="String">Hari Kerja</Data></Cell>
    <Cell><Data ss:Type="String">Tarif Harian</Data></Cell>
    <Cell><Data ss:Type="String">Total Upah</Data></Cell>
    <Cell><Data ss:Type="String">Status</Data></Cell>
    <Cell><Data ss:Type="String">Metode</Data></Cell>
   </Row>
`;

  data.rekapUpah.forEach(w => {
    const weekLabel = `Minggu ${w.weekNumber || 1}`;
    xml += `   <Row>
    <Cell><Data ss:Type="String">${weekLabel}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(w.name)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(w.position)}</Data></Cell>
    <Cell><Data ss:Type="Number">${w.daysWorked}</Data></Cell>
    <Cell ss:StyleID="Currency"><Data ss:Type="Number">${w.dailyRate}</Data></Cell>
    <Cell ss:StyleID="CurrencyBold"><Data ss:Type="Number">${w.totalWages}</Data></Cell>
    <Cell><Data ss:Type="String">${w.status}</Data></Cell>
    <Cell><Data ss:Type="String">${w.paymentMethod || 'Kas Tunai'}</Data></Cell>
   </Row>
`;
  });

  xml += `  </Table>
 </Worksheet>

 <!-- SHEET 4: RINGKASAN MATERIAL -->
 <Worksheet ss:Name="IV. Ringkasan Material">
  <Table>
   <Column ss:Width="180"/>
   <Column ss:Width="80"/>
   <Column ss:Width="100"/>
   <Column ss:Width="100"/>
   <Column ss:Width="100"/>
   <Column ss:Width="100"/>
   <Row ss:StyleID="Header">
    <Cell><Data ss:Type="String">Nama Material</Data></Cell>
    <Cell><Data ss:Type="String">Satuan</Data></Cell>
    <Cell><Data ss:Type="String">Barang Masuk</Data></Cell>
    <Cell><Data ss:Type="String">Barang Keluar</Data></Cell>
    <Cell><Data ss:Type="String">Barang Terpakai</Data></Cell>
    <Cell><Data ss:Type="String">Sisa Stok Gudang</Data></Cell>
   </Row>
`;

  data.ringkasanMaterial.forEach(m => {
    xml += `   <Row>
    <Cell><Data ss:Type="String">${escapeXml(m.materialName)}</Data></Cell>
    <Cell><Data ss:Type="String">${m.unit}</Data></Cell>
    <Cell><Data ss:Type="Number">${m.masuk}</Data></Cell>
    <Cell><Data ss:Type="Number">${m.keluar}</Data></Cell>
    <Cell><Data ss:Type="Number">${m.terpakai}</Data></Cell>
    <Cell ss:StyleID="BoldText"><Data ss:Type="Number">${m.sisaStok}</Data></Cell>
   </Row>
`;
  });

  xml += `  </Table>
 </Worksheet>

 <!-- SHEET 5: LAPORAN HARIAN -->
 <Worksheet ss:Name="V. Laporan Harian">
  <Table>
   <Column ss:Width="90"/>
   <Column ss:Width="80"/>
   <Column ss:Width="80"/>
   <Column ss:Width="200"/>
   <Column ss:Width="140"/>
   <Column ss:Width="140"/>
   <Column ss:Width="160"/>
   <Row ss:StyleID="Header">
    <Cell><Data ss:Type="String">Tanggal</Data></Cell>
    <Cell><Data ss:Type="String">Cuaca</Data></Cell>
    <Cell><Data ss:Type="String">Jumlah Tukang</Data></Cell>
    <Cell><Data ss:Type="String">Pekerjaan Lapangan</Data></Cell>
    <Cell><Data ss:Type="String">Material Masuk</Data></Cell>
    <Cell><Data ss:Type="String">Material Terpakai</Data></Cell>
    <Cell><Data ss:Type="String">Kendala / Masalah</Data></Cell>
   </Row>
`;

  data.laporanHarian.forEach(r => {
    xml += `   <Row>
    <Cell><Data ss:Type="String">${r.date}</Data></Cell>
    <Cell><Data ss:Type="String">${r.weather}</Data></Cell>
    <Cell><Data ss:Type="Number">${r.workerCount}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(r.todayWork)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(r.materialsIn || '-')}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(r.materialsUsed || '-')}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(r.challenges || '-')}</Data></Cell>
   </Row>
`;
  });

  xml += `  </Table>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * EKSPOR CSV DARI CURRENT REPORT DATA
 */
export function exportReportToCSV(data: CurrentReportData): void {
  let csv = 'data:text/csv;charset=utf-8,';
  csv += 'DATAKU - REKAP KEUANGAN PROYEK\n';
  csv += `Nama Proyek,${escapeCsv(data.project.name)}\n`;
  csv += `Lokasi,${escapeCsv(data.project.location)}\n`;
  csv += `Mandor,${escapeCsv(data.project.mandorName)}\n`;
  csv += `Periode,${escapeCsv(data.period.label)}\n`;
  csv += `Tanggal Cetak,${escapeCsv(data.printDate)}\n\n`;

  csv += 'I. RINGKASAN REKAPITULASI\n';
  csv += `Total Dana Masuk,${data.ringkasan.danaMasuk}\n`;
  csv += `Total Pengeluaran,${data.ringkasan.pengeluaran}\n`;
  csv += `Total Upah Tukang,${data.ringkasan.upahTukang}\n`;
  csv += `Total Pembelian Material,${data.ringkasan.pembelianMaterial}\n`;
  csv += `Sisa Saldo Kas,${data.ringkasan.saldoKas}\n\n`;

  csv += 'II. DAFTAR MUTASI DANA\n';
  csv += 'Tanggal,Jenis,Kategori,Keterangan,Sumber/Penerima,Nominal,Status\n';
  data.mutasiDana.forEach(t => {
    const sign = t.type === 'DANA_MASUK' ? '+' : '-';
    csv += `"${formatTanggalWaktu(t.date)}","${t.type}","${t.category}","${escapeCsv(t.notes)}","${escapeCsv(t.sourceOrRecipient)}","${sign}${t.amount}","${t.status || 'Berhasil'}"\n`;
  });
  csv += '\n';

  csv += 'III. REKAP UPAH MINGGUAN\n';
  csv += 'Minggu,Nama Pekerja,Posisi,Hari Kerja,Tarif Harian,Total Upah,Status,Metode\n';
  data.rekapUpah.forEach(w => {
    csv += `"Minggu ${w.weekNumber || 1}","${escapeCsv(w.name)}","${escapeCsv(w.position)}",${w.daysWorked},${w.dailyRate},${w.totalWages},"${w.status}","${w.paymentMethod || 'Tunai'}"\n`;
  });
  csv += '\n';

  csv += 'IV. RINGKASAN MATERIAL\n';
  csv += 'Material,Satuan,Masuk,Keluar,Terpakai,Sisa Stok\n';
  data.ringkasanMaterial.forEach(m => {
    csv += `"${escapeCsv(m.materialName)}","${m.unit}",${m.masuk},${m.keluar},${m.terpakai},${m.sisaStok}\n`;
  });
  csv += '\n';

  csv += 'V. LAPORAN HARIAN\n';
  csv += 'Tanggal,Cuaca,Tukang,Pekerjaan,Material Masuk,Material Terpakai,Kendala\n';
  data.laporanHarian.forEach(r => {
    csv += `"${r.date}","${r.weather}",${r.workerCount},"${escapeCsv(r.todayWork)}","${escapeCsv(r.materialsIn)}","${escapeCsv(r.materialsUsed)}","${escapeCsv(r.challenges)}"\n`;
  });

  const encodedUri = encodeURI(csv);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `DATAKU_Rekap_${data.project.name.replace(/\s+/g, '_')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function escapeXml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeCsv(str: string): string {
  if (!str) return '';
  return str.replace(/"/g, '""');
}
