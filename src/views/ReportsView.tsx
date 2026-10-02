import React, { useState, useEffect } from 'react';
import { MaintenanceRecord, Machine, MaintenanceTemplate, UserSession, DEPARTMENTS, DocumentMeta } from '../types/cmms';
import { getWeekKey, getLastWeekKey, cmmsApi } from '../services/cmmsApi';
import { generateA3LandscapeReportHtml } from '../utils/generateA3ReportHtml';
import { AudioPlayerButton } from '../components/AudioPlayerButton';
import {
  BarChart3,
  Download,
  Printer,
  Mail,
  Filter,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RotateCcw,
  Loader2,
  X,
  Send,
  Database,
} from 'lucide-react';

interface ReportsViewProps {
  user: UserSession;
  records: MaintenanceRecord[];
  machines: Machine[];
  templates: MaintenanceTemplate[];
  onNavigateHome: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  user,
  records,
  machines,
  templates,
  onNavigateHome,
}) => {
  const [periodType, setPeriodType] = useState<'bu' | 'gecen' | 'son4' | 'ay' | 'ozel'>('bu');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMachine, setSelectedMachine] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [tableSearch, setTableSearch] = useState('');

  // Email PDF Modal state
  // Email PDF Modal state
  const [mailModalOpen, setMailModalOpen] = useState(false);
  const [mailSending, setMailSending] = useState(false);
  const [mailResult, setMailResult] = useState<{ success: boolean; message: string } | null>(null);
  const [fetchingRecipients, setFetchingRecipients] = useState(false);
  const [recipientList, setRecipientList] = useState<string[]>(['akgbkm@outlook.com']);
  const [docMeta, setDocMeta] = useState<DocumentMeta>({
    dokumanKodu: 'IZM 350522_BKM_015',
    yayinTarihi: '16.06.2020',
    revizyonNoTarihi: 'REV1/16.06.2020',
    hazirlayan: 'FUAT ÇETİN',
    onaylayan: 'FUAT ÇETİN',
  });

  // Fetch live recipients and document metadata directly from Google E-Tablo "veri" sheet
  const fetchLiveSheetRecipients = async () => {
    setFetchingRecipients(true);
    try {
      const res = await cmmsApi.getSheetRecipients();
      if (res.success && Array.isArray(res.emails) && res.emails.length > 0) {
        setRecipientList(res.emails);
      }
      if (res.docMeta) {
        setDocMeta(res.docMeta);
      }
    } catch (err) {
      console.warn('Could not fetch sheet recipients/meta:', err);
    } finally {
      setFetchingRecipients(false);
    }
  };

  useEffect(() => {
    fetchLiveSheetRecipients();
  }, []);

  const thisWeek = getWeekKey();
  const lastWeek = getLastWeekKey();
  const operatorName = user.operator || user.name || 'Tüm Kişiler';

  // Filter records by period, machine, department, operator
  const filteredRecords = records.filter((r) => {
    // Period check
    if (periodType === 'bu' && r.weekKey !== thisWeek) return false;
    if (periodType === 'gecen' && r.weekKey !== lastWeek) return false;
    if (periodType === 'ozel' && startDate && endDate) {
      const recDate = new Date(r.createdAt).toISOString().split('T')[0];
      if (recDate < startDate || recDate > endDate) return false;
    }

    // Machine check
    if (selectedMachine && r.machineName !== selectedMachine) return false;

    // Dept check
    if (selectedDept && r.system !== selectedDept) return false;

    return true;
  });

  // Calculate KPIs
  const activeTemplates = templates.filter((t) => {
    if (!t.active) return false;
    if (selectedMachine && t.machineName !== selectedMachine) return false;
    if (selectedDept && t.system !== selectedDept) return false;
    return true;
  });

  const totalPlanned = activeTemplates.length;
  const totalCompleted = filteredRecords.length;
  const uygunCount = filteredRecords.filter((r) => r.result === 'UYGUN').length;
  const redCount = filteredRecords.filter((r) => r.result === 'RED').length;
  const pendingCount = Math.max(0, totalPlanned - totalCompleted);
  const completionRate = totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) : 0;

  // Machines that have active maintenance templates or maintenance records
  const machinesWithMaintenance = machines.filter((m) => {
    const hasTemplates = templates.some(
      (t) => (t.machineId === m.id || t.machineName === m.machineName) && t.active
    );
    const hasRecords = records.some(
      (r) => r.machineId === m.id || r.machineName === m.machineName
    );
    return hasTemplates || hasRecords;
  });

  // Machine breakdown - ONLY machines that have defined maintenance tasks or records
  const machineBreakdown = machines
    .map((m) => {
      const mTemplates = templates.filter(
        (t) => (t.machineId === m.id || t.machineName === m.machineName) && t.active
      );
      const mRecords = filteredRecords.filter(
        (r) => r.machineId === m.id || r.machineName === m.machineName
      );
      const mRed = mRecords.filter((r) => r.result === 'RED').length;
      const mPlan = mTemplates.length;
      const mDone = mRecords.length;
      const mRate = mPlan > 0 ? Math.round((mDone / mPlan) * 100) : 0;
      return {
        name: m.machineName,
        plan: mPlan,
        done: mDone,
        pending: Math.max(0, mPlan - mDone),
        red: mRed,
        rate: mRate,
      };
    })
    .filter((m) => (!selectedMachine || m.name === selectedMachine) && (m.plan > 0 || m.done > 0));

  // Department breakdown
  const deptBreakdown = DEPARTMENTS.map((d) => {
    const dTemplates = templates.filter((t) => t.system === d.deger && t.active);
    const dRecords = filteredRecords.filter((r) => r.system === d.deger);
    const dRed = dRecords.filter((r) => r.result === 'RED').length;
    const dPlan = dTemplates.length;
    const dDone = dRecords.length;
    const dRate = dPlan > 0 ? Math.round((dDone / dPlan) * 100) : 0;
    return {
      name: d.ad,
      code: d.kod,
      deger: d.deger,
      color: d.renk,
      plan: dPlan,
      done: dDone,
      pending: Math.max(0, dPlan - dDone),
      red: dRed,
      rate: dRate,
    };
  });

  // Table search
  const detailedList = filteredRecords.filter((r) => {
    if (!tableSearch) return true;
    const pool = `${r.machineName} ${r.task} ${r.operator} ${r.description || ''} ${r.result}`.toLowerCase();
    return pool.includes(tableSearch.toLowerCase());
  });

  // CSV Excel Export
  const handleExportCsv = () => {
    const headers = ['Tarih', 'Hafta', 'Makine', 'Bakım', 'Birim', 'Bakımı Yapan', 'Sonuç', 'İstenen', 'Ölçülen', 'Açıklama', 'Kayıt No'];
    const rows = detailedList.map((r) => [
      new Date(r.createdAt).toLocaleString('tr-TR'),
      r.weekKey,
      r.machineName,
      r.task || '',
      r.system || '',
      r.operator,
      r.result,
      r.targetValue || '',
      r.measuredValue || '',
      (r.description || '').replace(/\r?\n/g, ' '),
      r.recordId,
    ]);

    const csvContent = '\uFEFF' + [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AKG_Haftalik_Bakim_Raporu_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Send Email PDF (sendReportMailJsonp) in Landscape A3 Full-Color format
  const handleSendEmailPdf = async () => {
    setMailSending(true);
    setMailResult(null);

    const fileName = `HAFTALIK_BAKIM_KONTROL_FORMU_${operatorName.toUpperCase().replace(/\s+/g, '_')}_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '_')}_A3.pdf`;

    const periodLabel = periodType === 'bu'
      ? `Bu Hafta (${thisWeek})`
      : periodType === 'gecen'
      ? `Geçen Hafta (${lastWeek})`
      : periodType === 'son4'
      ? 'Son 4 Hafta'
      : periodType === 'ay'
      ? 'Bu Ay'
      : `${startDate || thisWeek} - ${endDate || thisWeek}`;

    // Generate comprehensive, executive, full-color A3 Landscape HTML containing ALL records
    const reportHtml = generateA3LandscapeReportHtml({
      operatorName,
      periodText: periodLabel,
      reportDateStr: new Date().toLocaleString('tr-TR'),
      kpis: {
        totalPlanned,
        totalCompleted,
        pendingCount,
        uygunCount,
        redCount,
        completionRate,
      },
      machineBreakdown,
      deptBreakdown,
      records: detailedList, // Raporun tümünü eksiksiz içerir
      docMeta, // Canlı E-Tablo döküman ve revizyon kodları
    });

    try {
      await cmmsApi.sendReportMail({
        operator: operatorName,
        start: startDate || thisWeek,
        end: endDate || thisWeek,
        fileName,
        subject: `Haftalık Bakım Kontrol Formu (Yatay A3) - ${operatorName}`,
        recordCount: detailedList.length,
        uygun: uygunCount,
        red: redCount,
        recipients: recipientList,
        html: reportHtml,
      });

      setMailResult({
        success: true,
        message: 'Mailiniz başarı ile gönderilmiştir.',
      });

      // Automatically close modal after 1.8 seconds
      setTimeout(() => {
        setMailModalOpen(false);
        setMailResult(null);
      }, 1800);
    } catch (err: any) {
      setMailResult({
        success: false,
        message: err.message || 'Mail gönderilirken hata oluştu.',
      });
    } finally {
      setMailSending(false);
    }
  };

  // Spoken summary text
  const reportSpokenSummary = `Haftalık bakım raporu özeti: Bakımı yapan ${operatorName}. Dönem: ${periodType === 'bu' ? 'Bu hafta' : periodType}. Toplam planlanan bakım ${totalPlanned}, tamamlanan ${totalCompleted}, başarı oranı yüzde ${completionRate}. Uygun bulunan ${uygunCount}, arıza olarak işaretlenen ${redCount} kayıt bulunmaktadır.`;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5 print:p-0 print:space-y-4">
      {/* Top Action Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f2d4d]">
            Bakım Raporları & Analitik
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Makinelerin haftalık tamamlanma oranları, arızalar ve resmi bakım formu.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <AudioPlayerButton
            text={reportSpokenSummary}
            label="Raporu Seslendir"
            size="sm"
          />

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs sm:text-sm transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Download className="w-4 h-4 text-emerald-700" />
            <span>Excel'e İndir</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs sm:text-sm transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Printer className="w-4 h-4 text-sky-700" />
            <span>Yazdır</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMailModalOpen(true);
              setMailResult(null);
            }}
            className="px-4 py-2 bg-[#b11f2e] hover:bg-[#8f1824] text-white rounded-xl font-extrabold text-xs sm:text-sm transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Mail className="w-4 h-4" />
            <span>PDF Mail Gönder</span>
          </button>
        </div>
      </div>

      {/* Filter Controls Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 print:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Dönem</label>
            <select
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0f4c81]"
            >
              <option value="bu">Bu Hafta ({thisWeek})</option>
              <option value="gecen">Geçen Hafta ({lastWeek})</option>
              <option value="son4">Son 4 Hafta</option>
              <option value="ay">Bu Ay</option>
              <option value="ozel">Tarih Aralığı Seç</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Bakımı Yapan</label>
            <input
              type="text"
              readOnly
              value={operatorName}
              className="w-full px-3 py-2 bg-sky-50 border border-sky-200 rounded-lg text-sm font-black text-[#0f2d4d] cursor-default"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Makine</label>
            <select
              value={selectedMachine}
              onChange={(e) => setSelectedMachine(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0f4c81]"
            >
              <option value="">Tüm Bakımlı Makineler ({machinesWithMaintenance.length})</option>
              {machinesWithMaintenance.map((m) => (
                <option key={m.id} value={m.machineName}>
                  {m.machineName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Birim</label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0f4c81]"
            >
              <option value="">Tüm Birimler</option>
              {DEPARTMENTS.map((d) => (
                <option key={d.kod} value={d.deger}>
                  {d.ad}
                </option>
              ))}
            </select>
          </div>
        </div>

        {periodType === 'ozel' && (
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Başlangıç Tarihi</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Bitiş Tarihi</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold"
              />
            </div>
          </div>
        )}
      </div>

      {/* Official Form Header (Print friendly) */}
      <div className="bg-[#0f4c81] text-white p-5 rounded-2xl shadow-sm space-y-2 print:rounded-none">
        <h2 className="text-xl sm:text-2xl font-black tracking-tight">
          HAFTALIK BAKIM KONTROL FORMU
        </h2>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs sm:text-sm text-sky-100 font-medium">
          <span>
            Bakımı Yapan: <b className="text-white">{operatorName}</b>
          </span>
          <span>
            Dönem: <b className="text-white">{periodType === 'bu' ? thisWeek : periodType}</b>
          </span>
          <span>
            Rapor Tarihi: <b className="text-white">{new Date().toLocaleDateString('tr-TR')}</b>
          </span>
        </div>
      </div>

      {/* KPI Box Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-2xl sm:text-3xl font-black text-[#0f2d4d]">{totalPlanned}</div>
          <div className="text-xs text-slate-500 font-bold mt-1">Planlanan Bakım</div>
        </div>

        <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 shadow-xs">
          <div className="text-2xl sm:text-3xl font-black text-emerald-800">{totalCompleted}</div>
          <div className="text-xs text-emerald-700 font-bold mt-1">Yapılan Kontrol</div>
        </div>

        <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 shadow-xs">
          <div className="text-2xl sm:text-3xl font-black text-amber-700">{pendingCount}</div>
          <div className="text-xs text-amber-800 font-bold mt-1">Bekleyen</div>
        </div>

        <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 shadow-xs">
          <div className="text-2xl sm:text-3xl font-black text-emerald-700">{uygunCount}</div>
          <div className="text-xs text-emerald-700 font-bold mt-1">UYGUN</div>
        </div>

        <div className="bg-red-50/60 p-4 rounded-xl border border-red-200 shadow-xs">
          <div className="text-2xl sm:text-3xl font-black text-red-700">{redCount}</div>
          <div className="text-xs text-red-700 font-bold mt-1">RED (Arıza)</div>
        </div>

        <div className="bg-sky-50/60 p-4 rounded-xl border border-sky-200 shadow-xs">
          <div className="text-2xl sm:text-3xl font-black text-[#0f4c81]">%{completionRate}</div>
          <div className="text-xs text-sky-800 font-bold mt-1">Tamamlanma Oranı</div>
        </div>
      </div>

      {/* Machine Breakdown Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-black text-base text-[#0f2d4d]">
            Makine Bazında Durum ({machineBreakdown.length} Bakımlı Makine)
          </h3>
          <span className="text-xs text-slate-500 font-semibold">
            Yalnızca bakımı tanımlı veya kaydı olan makineler listelenir
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#0f4c81] text-white font-bold text-xs uppercase">
              <tr>
                <th className="py-2.5 px-4">Makine</th>
                <th className="py-2.5 px-3 text-right">Plan</th>
                <th className="py-2.5 px-3 text-right">Yapılan</th>
                <th className="py-2.5 px-3 text-right">Bekleyen</th>
                <th className="py-2.5 px-3 text-right">RED</th>
                <th className="py-2.5 px-4">Tamamlanma Oranı</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {machineBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-bold">
                    Seçili dönemde tanımlı veya yapılan bakımı olan makine bulunamadı.
                  </td>
                </tr>
              ) : (
                machineBreakdown.map((m, idx) => (
                  <tr
                    key={idx}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      m.done === 0 ? 'bg-red-50/70 text-red-950 font-bold' : ''
                    }`}
                  >
                    <td className="py-2.5 px-4 font-bold">{m.name}</td>
                    <td className="py-2.5 px-3 text-right font-semibold">{m.plan}</td>
                    <td className="py-2.5 px-3 text-right font-semibold">{m.done}</td>
                    <td className="py-2.5 px-3 text-right font-semibold">{m.pending}</td>
                    <td className="py-2.5 px-3 text-right font-black text-red-600">{m.red}</td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              m.rate >= 90 ? 'bg-emerald-600' : m.rate >= 50 ? 'bg-amber-500' : 'bg-red-600'
                            }`}
                            style={{ width: `${Math.min(100, m.rate)}%` }}
                          />
                        </div>
                        <span className="w-10 text-right font-bold text-xs">%{m.rate}</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Department Breakdown Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <h3 className="font-black text-base text-[#0f2d4d]">Birim Bazında Durum</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#0f4c81] text-white font-bold text-xs uppercase">
              <tr>
                <th className="py-2.5 px-4">Birim</th>
                <th className="py-2.5 px-3 text-right">Plan</th>
                <th className="py-2.5 px-3 text-right">Yapılan</th>
                <th className="py-2.5 px-3 text-right">Bekleyen</th>
                <th className="py-2.5 px-3 text-right">RED</th>
                <th className="py-2.5 px-4">Tamamlanma Oranı</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deptBreakdown.map((d, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80">
                  <td className="py-2.5 px-4 font-bold flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-md inline-block border border-black/20"
                      style={{ backgroundColor: d.color }}
                    />
                    <span>{d.name}</span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold">{d.plan}</td>
                  <td className="py-2.5 px-3 text-right font-semibold">{d.done}</td>
                  <td className="py-2.5 px-3 text-right font-semibold">{d.pending}</td>
                  <td className="py-2.5 px-3 text-right font-black text-red-600">{d.red}</td>
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            d.rate >= 90 ? 'bg-emerald-600' : d.rate >= 50 ? 'bg-amber-500' : 'bg-red-600'
                          }`}
                          style={{ width: `${Math.min(100, d.rate)}%` }}
                        />
                      </div>
                      <span className="w-10 text-right font-bold text-xs">%{d.rate}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-black text-base text-[#0f2d4d]">Yapılan Kontroller Listesi</h3>
            <span className="text-xs text-slate-500 font-semibold">{detailedList.length} kayıt listelendi</span>
          </div>

          <div className="relative w-full sm:w-64 print:hidden">
            <input
              type="text"
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              placeholder="Listede filtrele..."
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0f4c81] text-white font-bold uppercase">
              <tr>
                <th className="py-2 px-3">Tarih</th>
                <th className="py-2 px-3">Makine</th>
                <th className="py-2 px-3">Bakım</th>
                <th className="py-2 px-2">Birim</th>
                <th className="py-2 px-2">Sonuç</th>
                <th className="py-2 px-3">Ölçülen</th>
                <th className="py-2 px-4">Açıklama</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {detailedList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400 font-medium">
                    Bu filtreye uygun kayıt bulunamadı.
                  </td>
                </tr>
              ) : (
                detailedList.map((r) => {
                  const dateStr = new Date(r.createdAt).toLocaleString('tr-TR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <tr key={r.recordId} className="hover:bg-slate-50">
                      <td className="py-2 px-3 whitespace-nowrap text-slate-600 font-medium">{dateStr}</td>
                      <td className="py-2 px-3 font-bold text-slate-900">{r.machineName}</td>
                      <td className="py-2 px-3 font-medium text-slate-700">{r.task || '-'}</td>
                      <td className="py-2 px-2 font-semibold text-slate-600">{r.system || '-'}</td>
                      <td className="py-2 px-2">
                        <span
                          className={`px-2 py-0.5 rounded-full font-black text-[10px] ${
                            r.result === 'RED'
                              ? 'bg-[#FF9999] text-[#7a1414]'
                              : 'bg-[#99FF99] text-[#0d5c2c]'
                          }`}
                        >
                          {r.result}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-700">{r.measuredValue || '-'}</td>
                      <td className="py-2 px-4 text-slate-600 max-w-xs truncate">{r.description || '-'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RAPOR SONU: RESMİ DÖKÜMAN KODU, REVİZYON VE ONAY ALANI (Google E-Tablodan Canlı) */}
      <div className="bg-sky-50/70 rounded-2xl shadow-sm border-2 border-[#0f4c81] p-4 sm:p-5 mt-6 print:mt-4 print:page-break-inside-avoid">
        <div className="flex flex-wrap items-center justify-between gap-y-3.5 gap-x-5 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-[#0f4c81]">HAZIRLAYAN / İMZA:</span>
            <span className="font-black text-[#0f2d4d] bg-white px-3 py-1 rounded-lg border border-sky-300 shadow-2xs">
              {docMeta.hazirlayan}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-extrabold text-[#0f4c81]">ONAYLAYAN / İMZA:</span>
            <span className="font-black text-[#0f2d4d] bg-white px-3 py-1 rounded-lg border border-sky-300 shadow-2xs">
              {docMeta.onaylayan}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-extrabold text-[#0f4c81]">YAYIN TARİHİ:</span>
            <span className="font-black text-[#0f2d4d] bg-white px-3 py-1 rounded-lg border border-sky-300 shadow-2xs">
              {docMeta.yayinTarihi}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-extrabold text-[#0f4c81]">REVİZYON NO / TARİHİ:</span>
            <span className="font-black text-[#0f2d4d] bg-white px-3 py-1 rounded-lg border border-sky-300 shadow-2xs">
              {docMeta.revizyonNoTarihi}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-extrabold text-[#0f4c81]">DÖKÜMAN KODU:</span>
            <span className="font-black text-[#0f2d4d] bg-white px-3 py-1 rounded-lg border border-sky-300 font-mono shadow-2xs">
              {docMeta.dokumanKodu}
            </span>
          </div>
        </div>
      </div>

      {/* PDF Mail Modal */}
      {mailModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-[#0f2d4d] flex items-center gap-2">
                  <Mail className="w-5 h-5 text-red-600" />
                  <span>PDF Raporu E-Posta ile Gönder</span>
                </h3>
                <p className="text-[11px] text-emerald-700 font-bold ml-7">
                  Yatay A3 (Landscape) • Full Renkli • Raporun Tümü
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMailModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5 text-slate-700">
              <div>
                <b>Döküman Kodu:</b> <span className="font-mono font-bold text-[#0f4c81]">{docMeta.dokumanKodu}</span> (Rev: {docMeta.revizyonNoTarihi})
              </div>
              <div>
                <b>Hazırlayan / Onaylayan:</b> {docMeta.hazirlayan} / {docMeta.onaylayan}
              </div>
              <div>
                <b>Bakımı Yapan:</b> {operatorName}
              </div>
              <div>
                <b>Dönem:</b> {periodType === 'bu' ? thisWeek : periodType}
              </div>
              <div>
                <b>Kayıt Sayısı:</b> <span className="font-extrabold text-[#059669]">{detailedList.length} adet (Raporun Tümü)</span>
              </div>
              <div>
                <b>Format & Düzen:</b> <span className="font-extrabold text-[#0f4c81]">Yatay A3 (Landscape), Renkli</span>
              </div>
              <div>
                <b>Ek Dosya:</b> HAFTALIK_BAKIM_KONTROL_FORMU_{operatorName.toUpperCase().replace(/\s+/g, '_')}_A3.pdf
              </div>
              <div className="pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-red-600" />
                    <span>Alıcı E-Posta Adresleri ({recipientList.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={fetchLiveSheetRecipients}
                    disabled={fetchingRecipients}
                    title="E-Tablo 'veri' sayfasından adresleri yeniden oku"
                    className="text-[11px] text-[#0f4c81] hover:underline font-bold flex items-center gap-1"
                  >
                    <RotateCcw className={`w-3 h-3 ${fetchingRecipients ? 'animate-spin' : ''}`} />
                    <span>{fetchingRecipients ? 'Yenileniyor...' : 'E-Tablodan Oku'}</span>
                  </button>
                </div>

                <div className="text-[11px] text-emerald-800 font-semibold mb-2 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Google E-Tablo <b>veri</b> sayfası (D sütunu: <b>MAİL ADRESİ</b>) canlı bağlantısı</span>
                </div>

                {/* Email address badges - ONLY email address from E-Tablo, NO name */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {recipientList.map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-2xs border bg-sky-50 border-sky-300 text-[#0f4c81]"
                    >
                      <span className="bg-[#0f4c81] text-white text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider">
                        E-Tablo
                      </span>
                      <span>{email}</span>
                    </span>
                  ))}
                </div>

                <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                  * PDF raporu E-Tablo <b>veri</b> sayfasındaki kayıtlı alıcı adreslerine eşzamanlı olarak iletilir.
                </p>
              </div>
            </div>

            {mailResult && (
              <div
                className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200 ${
                  mailResult.success
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {mailResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>{mailResult.message}</span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleSendEmailPdf}
                disabled={mailSending || (mailResult?.success ?? false)}
                className="flex-1 py-3 bg-[#b11f2e] hover:bg-[#8f1824] text-white font-extrabold rounded-xl text-sm shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {mailSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>PDF Hazırlanıyor & Gönderiliyor...</span>
                  </>
                ) : mailResult?.success ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Gönderildi ✓</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Gönder</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setMailModalOpen(false)}
                disabled={mailSending}
                className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
