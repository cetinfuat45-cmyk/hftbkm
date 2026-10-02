export interface A3ReportRecord {
  createdAt: string;
  machineName: string;
  task?: string;
  system?: string;
  operator: string;
  result: string;
  targetValue?: string;
  measuredValue?: string;
  description?: string;
  recordId?: string;
}

export interface A3ReportMachine {
  name: string;
  plan: number;
  done: number;
  pending: number;
  red: number;
  rate: number;
}

export interface A3ReportDept {
  name: string;
  plan: number;
  done: number;
  pending: number;
  red: number;
  rate: number;
}

export interface A3ReportData {
  operatorName: string;
  periodText: string;
  reportDateStr: string;
  kpis: {
    totalPlanned: number;
    totalCompleted: number;
    pendingCount: number;
    uygunCount: number;
    redCount: number;
    completionRate: number;
  };
  machineBreakdown: A3ReportMachine[];
  deptBreakdown: A3ReportDept[];
  records: A3ReportRecord[];
}

/**
 * Generates an executive, full-color, Landscape A3 HTML report for PDF conversion.
 */
export function generateA3LandscapeReportHtml(data: A3ReportData): string {
  const {
    operatorName,
    periodText,
    reportDateStr,
    kpis,
    machineBreakdown,
    deptBreakdown,
    records,
  } = data;

  // Filter to only machines that have maintenance (plan > 0 or done > 0)
  const activeMachines = machineBreakdown.filter((m) => m.plan > 0 || m.done > 0);

  // Machine rows HTML
  const machineRowsHtml = activeMachines.length === 0
    ? `<tr><td colspan="6" style="padding:10px;text-align:center;color:#64748b;font-style:italic;">Seçili dönemde tanımlı veya yapılan bakımı olan makine bulunamadı.</td></tr>`
    : activeMachines
        .map((m, idx) => {
          const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
          const redBadge = m.red > 0
            ? `<span style="background-color:#fee2e2;color:#b91c1c;padding:3px 8px;border-radius:6px;font-weight:900;border:1px solid #fca5a5;">${m.red} RED</span>`
            : `<span style="color:#64748b;font-weight:600;">0</span>`;
          const rateColor = m.rate >= 90 ? '#059669' : m.rate >= 50 ? '#d97706' : '#dc2626';

          return `
            <tr style="background-color:${bg};border-bottom:1px solid #e2e8f0;">
              <td style="padding:7px 10px;font-weight:bold;color:#0f2d4d;text-align:left;">${escapeHtml(m.name)}</td>
              <td style="padding:7px 8px;text-align:center;font-weight:700;color:#0284c7;">${m.plan}</td>
              <td style="padding:7px 8px;text-align:center;font-weight:700;color:#059669;">${m.done}</td>
              <td style="padding:7px 8px;text-align:center;font-weight:700;color:#d97706;">${m.pending}</td>
              <td style="padding:7px 8px;text-align:center;">${redBadge}</td>
              <td style="padding:7px 10px;text-align:right;">
                <div style="display:inline-flex;align-items:center;gap:6px;width:100%;justify-content:flex-end;">
                  <div style="flex:1;max-width:90px;background:#e2e8f0;height:7px;border-radius:4px;overflow:hidden;">
                    <div style="background:${rateColor};height:100%;width:${Math.min(100, m.rate)}%;"></div>
                  </div>
                  <span style="font-weight:800;color:${rateColor};min-width:38px;">%${m.rate}</span>
                </div>
              </td>
            </tr>
          `;
        })
        .join('');

  // Department rows HTML
  const deptRowsHtml = deptBreakdown
    .map((d, idx) => {
      const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      const redBadge = d.red > 0
        ? `<span style="background-color:#fee2e2;color:#b91c1c;padding:2px 6px;border-radius:4px;font-weight:800;">${d.red}</span>`
        : `<span style="color:#64748b;">0</span>`;
      return `
        <tr style="background-color:${bg};border-bottom:1px solid #e2e8f0;">
          <td style="padding:6px 10px;font-weight:bold;color:#1e293b;">${escapeHtml(d.name)}</td>
          <td style="padding:6px 8px;text-align:center;font-weight:700;color:#0284c7;">${d.plan}</td>
          <td style="padding:6px 8px;text-align:center;font-weight:700;color:#059669;">${d.done}</td>
          <td style="padding:6px 8px;text-align:center;font-weight:700;color:#d97706;">${d.pending}</td>
          <td style="padding:6px 8px;text-align:center;">${redBadge}</td>
          <td style="padding:6px 8px;text-align:right;font-weight:800;color:#0f4c81;">%${d.rate}</td>
        </tr>
      `;
    })
    .join('');

  // ALL Records rows HTML (Raporun Tümü)
  const allRecordsHtml = records.length === 0
    ? `<tr><td colspan="9" style="padding:16px;text-align:center;color:#64748b;font-style:italic;">Bu dönemde kaydedilmiş periyodik bakım kontrolü bulunamadı.</td></tr>`
    : records
        .map((r, idx) => {
          const bg = r.result === 'RED'
            ? '#fef2f2'
            : idx % 2 === 0
            ? '#ffffff'
            : '#f8fafc';

          const resultBadge = r.result === 'RED'
            ? `<span style="background-color:#dc2626;color:#ffffff;padding:4px 10px;border-radius:6px;font-weight:900;font-size:11px;letter-spacing:0.5px;display:inline-block;box-shadow:0 1px 2px rgba(0,0,0,0.1);">RED (ARIZA)</span>`
            : `<span style="background-color:#059669;color:#ffffff;padding:4px 10px;border-radius:6px;font-weight:900;font-size:11px;letter-spacing:0.5px;display:inline-block;box-shadow:0 1px 2px rgba(0,0,0,0.1);">UYGUN</span>`;

          const dateStr = formatDateTime(r.createdAt);

          return `
            <tr style="background-color:${bg};border-bottom:1px solid #e2e8f0;">
              <td style="padding:6px 8px;text-align:center;color:#64748b;font-weight:700;font-size:10px;">${idx + 1}</td>
              <td style="padding:6px 8px;color:#334155;white-space:nowrap;font-size:10px;font-weight:600;">${dateStr}</td>
              <td style="padding:6px 10px;font-weight:800;color:#0f2d4d;font-size:11px;">${escapeHtml(r.machineName)}</td>
              <td style="padding:6px 10px;color:#1e293b;font-size:11px;font-weight:600;">${escapeHtml(r.task || '-')}</td>
              <td style="padding:6px 8px;text-align:center;color:#475569;font-size:10px;font-weight:600;">${escapeHtml(r.system || '-')}</td>
              <td style="padding:6px 8px;text-align:center;color:#64748b;font-size:10px;">${escapeHtml(r.targetValue || '-')}</td>
              <td style="padding:6px 8px;text-align:center;font-weight:700;color:#0f4c81;font-size:10px;">${escapeHtml(r.measuredValue || '-')}</td>
              <td style="padding:6px 8px;text-align:center;">${resultBadge}</td>
              <td style="padding:6px 10px;color:${r.result === 'RED' ? '#991b1b' : '#475569'};font-size:10px;font-weight:${r.result === 'RED' ? '700' : 'normal'};">
                ${escapeHtml(r.description || '-')}
              </td>
            </tr>
          `;
        })
        .join('');

  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8">
<title>AKG Haftalık Bakım Kontrol Formu (Yatay A3)</title>
<style>
  @page {
    size: A3 landscape;
    margin: 8mm 10mm 10mm 10mm;
  }
  @media print {
    @page {
      size: A3 landscape;
      margin: 8mm 10mm 10mm 10mm;
    }
    body {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  }
  * {
    box-sizing: border-box;
    -webkit-font-smoothing: antialiased;
  }
  body {
    font-family: Arial, Helvetica, "Segoe UI", sans-serif;
    color: #1e293b;
    background-color: #ffffff;
    margin: 0;
    padding: 0;
    width: 100%;
    font-size: 11px;
    line-height: 1.35;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  .card {
    background: #ffffff;
    border-radius: 8px;
    border: 1px solid #cbd5e1;
    overflow: hidden;
    margin-bottom: 12px;
  }
  .table-header {
    background: #0f4c81;
    color: #ffffff;
    font-weight: 800;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .table-header th {
    padding: 7px 8px;
    border: none;
  }
</style>
</head>
<body>

  <!-- TOP HEADER BANNER (YATAY A3) -->
  <div style="background: linear-gradient(135deg, #0a2540 0%, #0f4c81 60%, #1e6091 100%); color:#ffffff; padding:12px 18px; border-radius:10px; margin-bottom:12px; box-shadow:0 3px 6px rgba(15,76,129,0.25);">
    <table style="width:100%; border-collapse:collapse;">
      <tr>
        <td style="vertical-align:middle; width:220px;">
          <div style="display:inline-block; background:#ffffff; color:#0f4c81; padding:6px 14px; border-radius:8px; font-weight:900; font-size:22px; letter-spacing:1px; box-shadow:0 2px 4px rgba(0,0,0,0.15);">
            AKG
          </div>
          <div style="font-size:9px; color:#cbd5e1; margin-top:4px; font-weight:600; letter-spacing:0.5px;">
            TERMAL SİSTEMLER CMMS
          </div>
        </td>
        <td style="vertical-align:middle; text-align:center;">
          <h1 style="margin:0; font-size:22px; font-weight:900; letter-spacing:1px; text-transform:uppercase;">
            HAFTALIK PERİYODİK BAKIM KONTROL FORMU
          </h1>
          <div style="font-size:11px; color:#e2e8f0; font-weight:600; margin-top:3px;">
            Endüstriyel Tesis & Ekipman Bakım Güvencesi • Yatay A3 Formatı
          </div>
        </td>
        <td style="vertical-align:middle; text-align:right; width:240px;">
          <div style="display:inline-block; background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.3); padding:6px 12px; border-radius:8px; text-align:right;">
            <div style="font-size:10px; color:#e2e8f0; font-weight:700;">DOKÜMAN TİPİ:</div>
            <div style="font-size:12px; font-weight:900; color:#38bdf8;">RESMİ BAKIM RAPORU</div>
          </div>
        </td>
      </tr>
    </table>
  </div>

  <!-- META INFO BAR -->
  <div style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:8px; padding:8px 14px; margin-bottom:12px;">
    <table style="width:100%;">
      <tr>
        <td style="font-size:11px; color:#334155;">
          <b style="color:#0f4c81;">Bakımı Yapan:</b> <span style="font-weight:800; color:#0f2d4d; background:#e0f2fe; padding:2px 8px; border-radius:4px;">${escapeHtml(operatorName)}</span>
        </td>
        <td style="font-size:11px; color:#334155; text-align:center;">
          <b style="color:#0f4c81;">Rapor Dönemi:</b> <span style="font-weight:800; color:#0f2d4d;">${escapeHtml(periodText)}</span>
        </td>
        <td style="font-size:11px; color:#334155; text-align:center;">
          <b style="color:#0f4c81;">Toplam Kontrol:</b> <span style="font-weight:800; color:#059669;">${records.length} Kayıt</span>
        </td>
        <td style="font-size:11px; color:#334155; text-align:right;">
          <b style="color:#0f4c81;">Rapor Tarihi:</b> <span style="font-weight:700;">${escapeHtml(reportDateStr)}</span>
        </td>
      </tr>
    </table>
  </div>

  <!-- 6 RENKLİ KPI ÖZET KARTLARI (6 KOLON) -->
  <table style="width:100%; border-collapse:separate; border-spacing:8px 0; margin-bottom:12px; table-layout:fixed;">
    <tr>
      <!-- 1. Planlanan -->
      <td style="background:#f0f9ff; border:2px solid #bae6fd; border-radius:8px; padding:10px 8px; text-align:center;">
        <div style="font-size:24px; font-weight:900; color:#0284c7; line-height:1;">${kpis.totalPlanned}</div>
        <div style="font-size:10px; font-weight:800; color:#0369a1; text-transform:uppercase; margin-top:4px;">Planlanan Bakım</div>
      </td>
      <!-- 2. Yapılan -->
      <td style="background:#ecfdf5; border:2px solid #a7f3d0; border-radius:8px; padding:10px 8px; text-align:center;">
        <div style="font-size:24px; font-weight:900; color:#059669; line-height:1;">${kpis.totalCompleted}</div>
        <div style="font-size:10px; font-weight:800; color:#047857; text-transform:uppercase; margin-top:4px;">Yapılan Kontrol</div>
      </td>
      <!-- 3. Bekleyen -->
      <td style="background:#fffbeb; border:2px solid #fde68a; border-radius:8px; padding:10px 8px; text-align:center;">
        <div style="font-size:24px; font-weight:900; color:#d97706; line-height:1;">${kpis.pendingCount}</div>
        <div style="font-size:10px; font-weight:800; color:#b45309; text-transform:uppercase; margin-top:4px;">Bekleyen</div>
      </td>
      <!-- 4. UYGUN -->
      <td style="background:#f0fdf4; border:2px solid #bbf7d0; border-radius:8px; padding:10px 8px; text-align:center;">
        <div style="font-size:24px; font-weight:900; color:#16a34a; line-height:1;">${kpis.uygunCount}</div>
        <div style="font-size:10px; font-weight:800; color:#15803d; text-transform:uppercase; margin-top:4px;">UYGUN</div>
      </td>
      <!-- 5. RED (Arıza) -->
      <td style="background:#fef2f2; border:2px solid #fecaca; border-radius:8px; padding:10px 8px; text-align:center;">
        <div style="font-size:24px; font-weight:900; color:#dc2626; line-height:1;">${kpis.redCount}</div>
        <div style="font-size:10px; font-weight:800; color:#b91c1c; text-transform:uppercase; margin-top:4px;">RED (Arıza)</div>
      </td>
      <!-- 6. Tamamlanma Oranı -->
      <td style="background:#f0f7ff; border:2px solid #bfdbfe; border-radius:8px; padding:10px 8px; text-align:center;">
        <div style="font-size:24px; font-weight:900; color:#0f4c81; line-height:1;">%${kpis.completionRate}</div>
        <div style="font-size:10px; font-weight:800; color:#0f4c81; text-transform:uppercase; margin-top:4px;">Tamamlanma Oranı</div>
      </td>
    </tr>
  </table>

  <!-- SIDE-BY-SIDE TABLES (Makine Bazında Durum + Birim Bazında Durum) -->
  <table style="width:100%; border-collapse:separate; border-spacing:10px 0; margin-bottom:12px; table-layout:fixed;">
    <tr>
      <!-- SOL TABLO: Makine Bazında Durum (Yalnızca Bakımı Olanlar) -->
      <td style="vertical-align:top; width:65%; padding:0;">
        <div class="card">
          <div style="background:#0f4c81; color:#ffffff; padding:7px 12px; font-weight:900; font-size:11px; display:flex; justify-content:space-between; align-items:center;">
            <span>MAKİNE BAZINDA DURUM (${activeMachines.length} Bakımlı Makine)</span>
            <span style="font-size:9px; font-weight:normal; opacity:0.9;">Yalnızca bakımı tanımlı veya kaydı olan makineler</span>
          </div>
          <table style="width:100%;">
            <thead>
              <tr class="table-header">
                <th style="text-align:left;">Makine Adı</th>
                <th style="text-align:center; width:65px;">Plan</th>
                <th style="text-align:center; width:65px;">Yapılan</th>
                <th style="text-align:center; width:65px;">Bekleyen</th>
                <th style="text-align:center; width:75px;">RED</th>
                <th style="text-align:right; width:130px;">Tamamlanma</th>
              </tr>
            </thead>
            <tbody>
              ${machineRowsHtml}
            </tbody>
          </table>
        </div>
      </td>

      <!-- SAĞ TABLO: Birim / Departman Bazında Durum -->
      <td style="vertical-align:top; width:35%; padding:0;">
        <div class="card">
          <div style="background:#0f4c81; color:#ffffff; padding:7px 12px; font-weight:900; font-size:11px;">
            BİRİM BAZINDA DURUM
          </div>
          <table style="width:100%;">
            <thead>
              <tr class="table-header">
                <th style="text-align:left;">Birim</th>
                <th style="text-align:center; width:45px;">Plan</th>
                <th style="text-align:center; width:45px;">Yapılan</th>
                <th style="text-align:center; width:45px;">Bekle</th>
                <th style="text-align:center; width:45px;">RED</th>
                <th style="text-align:right; width:55px;">Oran</th>
              </tr>
            </thead>
            <tbody>
              ${deptRowsHtml}
            </tbody>
          </table>
        </div>
      </td>
    </tr>
  </table>

  <!-- ALT TABLO: TÜM YAPILAN KONTROLLER (RAPORUN TÜMÜ - TAM LİSTE) -->
  <div class="card">
    <div style="background:#0f4c81; color:#ffffff; padding:8px 12px; font-weight:900; font-size:12px; display:flex; justify-content:space-between; align-items:center;">
      <span>YAPILAN PERİYODİK KONTROLLER & BAKIM DETAYLARI (RAPORUN TÜMÜ - ${records.length} KAYIT)</span>
      <span style="font-size:10px; font-weight:600; background:rgba(255,255,255,0.2); padding:2px 8px; border-radius:4px;">
        Tam Liste
      </span>
    </div>
    <table style="width:100%;">
      <thead>
        <tr class="table-header">
          <th style="text-align:center; width:35px;">#</th>
          <th style="text-align:left; width:95px;">Tarih & Saat</th>
          <th style="text-align:left; width:170px;">Makine</th>
          <th style="text-align:left;">Bakım Kontrol Maddesi</th>
          <th style="text-align:center; width:65px;">Birim</th>
          <th style="text-align:center; width:70px;">İstenen</th>
          <th style="text-align:center; width:70px;">Ölçülen</th>
          <th style="text-align:center; width:100px;">Sonuç</th>
          <th style="text-align:left; width:220px;">Açıklama & Arıza Notu</th>
        </tr>
      </thead>
      <tbody>
        ${allRecordsHtml}
      </tbody>
    </table>
  </div>

  <!-- ONAY & İMZA ALANI (A3 LANDSCAPE BOTTOM) -->
  <div style="margin-top:14px; page-break-inside:avoid;">
    <table style="width:100%; border:1px solid #cbd5e1; border-radius:8px; background:#f8fafc; padding:8px; border-collapse:separate; border-spacing:8px 0;">
      <tr>
        <td style="width:33.3%; background:#ffffff; border:1px solid #cbd5e1; border-radius:6px; padding:10px; text-align:center;">
          <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase;">Kontrolü Yapan Operatör / Teknisyen</div>
          <div style="font-size:12px; font-weight:900; color:#0f2d4d; margin-top:4px;">${escapeHtml(operatorName)}</div>
          <div style="height:35px; border-bottom:1px dashed #94a3b8; margin:8px 20px 4px 20px;"></div>
          <div style="font-size:9px; color:#94a3b8;">İmza / Tarih</div>
        </td>
        <td style="width:33.3%; background:#ffffff; border:1px solid #cbd5e1; border-radius:6px; padding:10px; text-align:center;">
          <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase;">Bakım Kısım Sorumlusu / Şefi</div>
          <div style="font-size:12px; font-weight:900; color:#0f2d4d; margin-top:4px;">ENGİN VARDAR</div>
          <div style="height:35px; border-bottom:1px dashed #94a3b8; margin:8px 20px 4px 20px;"></div>
          <div style="font-size:9px; color:#94a3b8;">İmza / Tarih</div>
        </td>
        <td style="width:33.3%; background:#ffffff; border:1px solid #cbd5e1; border-radius:6px; padding:10px; text-align:center;">
          <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase;">Bakım Müdürü / Yönetim Onayı</div>
          <div style="font-size:12px; font-weight:900; color:#0f2d4d; margin-top:4px;">AKG Fabrika Yönetimi</div>
          <div style="height:35px; border-bottom:1px dashed #94a3b8; margin:8px 20px 4px 20px;"></div>
          <div style="font-size:9px; color:#94a3b8;">Kaşe / İmza</div>
        </td>
      </tr>
    </table>
  </div>

  <!-- FOOTER -->
  <div style="margin-top:10px; font-size:9px; color:#64748b; text-align:center; border-top:1px solid #e2e8f0; padding-top:6px;">
    AKG Termoteknik Sistemler San. ve Tic. Ltd. Şti. • Haftalık Bakım CMMS V5.4.42 • Bu doküman dijital CMMS sistemi tarafından otomatik oluşturulmuştur. (Format: Yatay A3 / Renkli)
  </div>

</body>
</html>`;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDateTime(dateInput: string): string {
  if (!dateInput) return '-';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return dateInput;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  } catch {
    return dateInput;
  }
}
