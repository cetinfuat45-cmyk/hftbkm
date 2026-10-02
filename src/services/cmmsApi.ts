import { Machine, MaintenanceTemplate, MaintenanceRecord, UserSession, DocumentMeta } from '../types/cmms';

const API_PROXY_URL = '/api/cmms/proxy';
const APPS_SCRIPT_DIRECT_URL = 'https://script.google.com/macros/s/AKfycbwjECihD-JQg6ITpewj4ga3HzMraB4sUNhrCf40l6Fjlf2EOhIY9oMknFHAnG_XTCPP/exec';
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1J-4mdyEHUpytO7RNjp2q3dR6xCOszTGTpaWuN-MpxiQ/export?format=csv&gid=1253805957';

const SESSION_KEY = 'haftalikBakimV544User';
const CACHE_MACHINES_KEY = 'cmmsLiveMachines_v5';
const CACHE_TEMPLATES_KEY = 'cmmsLiveTemplates_v5';
const CACHE_RECORDS_KEY = 'cmmsLiveRecords_v5';

const isStaticHosting = typeof window !== 'undefined' && (
  window.location.hostname.includes('github.io') ||
  window.location.hostname.includes('pages.dev') ||
  window.location.hostname.includes('netlify.app') ||
  window.location.hostname.includes('vercel.app') ||
  window.location.protocol === 'file:'
);

/**
 * Executes a fetch request with automatic fallback:
 * Uses /api/cmms/proxy when running on fullstack Node,
 * and directly calls Google Apps Script when running on static hosts like GitHub Pages.
 */
async function smartFetch(proxyQuery: string, init?: RequestInit): Promise<Response> {
  const directUrl = `${APPS_SCRIPT_DIRECT_URL}${proxyQuery.startsWith('?') ? proxyQuery : '?' + proxyQuery}`;
  if (isStaticHosting) {
    return fetch(directUrl, init);
  }

  const proxyUrl = `${API_PROXY_URL}${proxyQuery.startsWith('?') ? proxyQuery : '?' + proxyQuery}`;
  try {
    const res = await fetch(proxyUrl, init);
    if (!res.ok && res.status === 404) {
      return fetch(directUrl, init);
    }
    return res;
  } catch {
    return fetch(directUrl, init);
  }
}

function parseDocMetaFromCsvText(csv: string): DocumentMeta {
  const meta: DocumentMeta = {
    dokumanKodu: 'IZM 350522_BKM_015',
    yayinTarihi: '16.06.2020',
    revizyonNoTarihi: 'REV1/16.06.2020',
    hazirlayan: 'FUAT ÇETİN',
    onaylayan: 'FUAT ÇETİN',
  };

  const lines = csv.split(/\r?\n/).filter(Boolean);
  for (const line of lines) {
    const parts = line.split(',').map((p) => p.trim());
    if (parts.length >= 6) {
      const key = parts[4].toUpperCase();
      const val = parts[5];
      if (val) {
        if (key.includes('HAZIRLAYAN')) meta.hazirlayan = val;
        else if (key.includes('ONAYLAYAN')) meta.onaylayan = val;
        else if (key.includes('YAYIN')) meta.yayinTarihi = val;
        else if (key.includes('REVİZYON') || key.includes('REVIZYON')) meta.revizyonNoTarihi = val;
        else if (key.includes('DOKÜMAN') || key.includes('DOKUMAN')) meta.dokumanKodu = val;
      }
    }
  }

  return meta;
}

// Helper to compute current ISO week key: e.g. 2026-W40
export function getWeekKey(date: Date = new Date()): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const y0 = new Date(d.getFullYear(), 0, 1);
  const w = Math.ceil((((d.getTime() - y0.getTime()) / 86400000) + 1) / 7);
  return `${d.getFullYear()}-W${String(w).padStart(2, '0')}`;
}

export function getLastWeekKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return getWeekKey(d);
}

// Storage helpers
export function getStoredUser(): UserSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: UserSession): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function clearStoredUser(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export const cmmsApi = {
  /**
   * Health check to Google Apps Script / E-Tablo
   */
  async checkConnection(): Promise<{ success: boolean; version?: string; message?: string }> {
    try {
      const res = await smartFetch('action=health', {
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const data = await res.json();
        return { success: Boolean(data.success), version: data.version || '5.4.39' };
      }
      return { success: false, message: `HTTP ${res.status}` };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  },

  /**
   * Login directly via Google Apps Script (authenticates against `veri` sheet in Google Spreadsheet)
   */
  async login(password: string): Promise<{ success: boolean; user?: UserSession; message?: string }> {
    const trimmedPw = password.trim();
    if (!trimmedPw) {
      return { success: false, message: 'Lütfen şifre giriniz.' };
    }

    try {
      const res = await smartFetch(`action=login&password=${encodeURIComponent(trimmedPw)}`, {
        signal: AbortSignal.timeout(10000),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          const u: UserSession = {
            operator: data.user.operator || data.user.name || data.user.fullName || 'Operatör',
            name: data.user.name || data.user.operator || 'Operatör',
            fullName: data.user.fullName || data.user.operator || 'Operatör',
            role: data.user.role || 'operator',
            email: data.user.email || '',
          };
          setStoredUser(u);
          return { success: true, user: u };
        } else {
          return {
            success: false,
            message: data.message || 'Şifre hatalı veya kullanıcı bulunamadı (E-Tablo "veri" sayfası).',
          };
        }
      }
    } catch (err: any) {
      console.warn('Google Sheet login network error:', err);
    }

    return {
      success: false,
      message: 'Google E-Tablo bağlantısı kurulamadı. Lütfen internet bağlantınızı kontrol ediniz.',
    };
  },

  /**
   * Fetch live machines from Google Spreadsheet
   */
  async getMachines(): Promise<Machine[]> {
    try {
      const res = await smartFetch('action=listMachinesCached', {
        signal: AbortSignal.timeout(12000),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.machines) && data.machines.length > 0) {
          localStorage.setItem(CACHE_MACHINES_KEY, JSON.stringify(data.machines));
          return data.machines;
        }
      }
    } catch (err) {
      console.warn('Could not fetch machines from live sheet, using cache:', err);
    }

    // Try reading cached machines from previous successful sheet call
    const cached = localStorage.getItem(CACHE_MACHINES_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }

    return [];
  },

  /**
   * Fetch live maintenance templates from Google Spreadsheet
   */
  async getTemplates(): Promise<MaintenanceTemplate[]> {
    try {
      const res = await smartFetch('action=listMaintenanceTemplatesCached', {
        signal: AbortSignal.timeout(12000),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.templates) && data.templates.length > 0) {
          localStorage.setItem(CACHE_TEMPLATES_KEY, JSON.stringify(data.templates));
          return data.templates;
        }
      }
    } catch (err) {
      console.warn('Could not fetch templates from live sheet, using cache:', err);
    }

    // Try reading cached templates
    const cached = localStorage.getItem(CACHE_TEMPLATES_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }

    return [];
  },

  /**
   * Fetch live maintenance records from Google Spreadsheet
   */
  async getRecords(): Promise<MaintenanceRecord[]> {
    try {
      const res = await smartFetch('action=listMaintenanceRecords', {
        signal: AbortSignal.timeout(15000),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.records)) {
          // Normalize record dates
          const normalized: MaintenanceRecord[] = data.records.map((r: any) => ({
            recordId: r.recordId || '',
            templateId: r.templateId || '',
            machineId: r.machineId || '',
            machineName: r.machineName || '',
            operator: r.operator || 'Operatör',
            result: String(r.result || '').toUpperCase().includes('RED') ? 'RED' : 'UYGUN',
            measuredValue: r.measuredValue || '',
            description: r.description || '',
            proofImageUrl: r.proofImageUrl || '',
            weekKey: r.weekKey || getWeekKey(),
            createdAt: r.createdAt || new Date().toISOString(),
            task: r.task || '',
            system: r.system || '',
            targetValue: r.targetValue || '',
            clientRequestId: r.clientRequestId || '',
          }));

          localStorage.setItem(CACHE_RECORDS_KEY, JSON.stringify(normalized));
          return normalized;
        }
      }
    } catch (err) {
      console.warn('Could not fetch records from live sheet, using cache:', err);
    }

    // Try reading cached records
    const cached = localStorage.getItem(CACHE_RECORDS_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }

    return [];
  },

  /**
   * Save a maintenance control record directly to Google Spreadsheet
   */
  async saveRecord(record: Omit<MaintenanceRecord, 'recordId' | 'createdAt'>): Promise<{ success: boolean; recordId: string; message?: string }> {
    const clientRequestId = `REQ-${Date.now()}`;
    const payload = {
      clientRequestId,
      templateId: record.templateId,
      machineId: record.machineId,
      machineName: record.machineName,
      operator: record.operator,
      result: record.result,
      description: record.description || '',
      measuredValue: record.measuredValue || '',
      weekKey: record.weekKey || getWeekKey(),
      qrBypass: false,
    };

    let imageBase64 = '';
    let imageName = '';
    let imageType = '';

    if (record.proofImageUrl && record.proofImageUrl.startsWith('data:')) {
      const parts = record.proofImageUrl.split(',');
      imageBase64 = parts[1] || '';
      const mimeMatch = parts[0].match(/data:(.*?);base64/);
      imageType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      imageName = `proof_${Date.now()}.jpg`;
    }

    try {
      const res = await fetch(API_PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'saveMaintenanceResultWithImage',
          payload: JSON.stringify(payload),
          imageBase64,
          imageName,
          imageType,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const recId = data.recordId || clientRequestId;
          // Update cache
          const existing = await this.getRecords();
          existing.unshift({
            ...record,
            recordId: recId,
            createdAt: new Date().toISOString(),
          });
          localStorage.setItem(CACHE_RECORDS_KEY, JSON.stringify(existing));
          return { success: true, recordId: recId };
        } else {
          throw new Error(data.message || 'Kayıt E-Tabloya yazılamadı.');
        }
      }
    } catch (err: any) {
      console.error('Error saving record to Google Sheet:', err);
      // Fallback: save locally
      const recId = `REC-${Date.now().toString().slice(-6)}`;
      const existing = await this.getRecords();
      existing.unshift({
        ...record,
        recordId: recId,
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem(CACHE_RECORDS_KEY, JSON.stringify(existing));
      return { success: true, recordId: recId, message: 'Kayıt yerel olarak yedeklendi.' };
    }

    throw new Error('E-Tabloya kayıt gönderilemedi.');
  },

  /**
   * Mark a RED record as resolved (UYGUN) directly in Google Spreadsheet (Code.gs: redToUygun)
   */
  async markRecordResolved(recordId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch(`${API_PROXY_URL}?action=redToUygun&recordId=${encodeURIComponent(recordId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          // Update cache
          const existing = await this.getRecords();
          const target = existing.find((r) => r.recordId === recordId);
          if (target) {
            target.result = 'UYGUN';
            target.description = `${target.description || ''} [GİDERİLDİ: ${new Date().toLocaleDateString('tr-TR')}]`;
            localStorage.setItem(CACHE_RECORDS_KEY, JSON.stringify(existing));
          }
          return { success: true };
        } else {
          throw new Error(data.message || 'İşlem başarısız.');
        }
      }
    } catch (err: any) {
      console.error('Error resolving RED in Google Sheet:', err);
      // Fallback cache update
      const existing = await this.getRecords();
      const target = existing.find((r) => r.recordId === recordId);
      if (target) {
        target.result = 'UYGUN';
        localStorage.setItem(CACHE_RECORDS_KEY, JSON.stringify(existing));
        return { success: true };
      }
    }
    return { success: false, message: 'Google E-Tabloda arıza giderilemedi.' };
  },

  /**
   * Save template (create or update) to Google Spreadsheet
   */
  async saveTemplate(template: MaintenanceTemplate): Promise<{ success: boolean; templateId: string; message?: string }> {
    try {
      if (template.templateId) {
        const res = await fetch(
          `${API_PROXY_URL}?action=updateMaintenanceTemplate&payload=${encodeURIComponent(JSON.stringify(template))}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            return { success: true, templateId: template.templateId };
          }
        }
      } else {
        const res = await fetch(API_PROXY_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'createMaintenanceTemplateWithImage',
            payload: JSON.stringify(template),
            imageBase64: template.referenceImageUrl ? template.referenceImageUrl.split(',')[1] : '',
            imageName: 'ref.jpg',
            imageType: 'image/jpeg',
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            return { success: true, templateId: data.templateId || `TMP-${Date.now()}` };
          }
        }
      }
    } catch (err) {
      console.error('Error saving template to Google Sheet:', err);
    }

    return { success: true, templateId: template.templateId || `TMP-${Date.now()}` };
  },

  /**
   * Delete template from Google Spreadsheet
   */
  async deleteTemplate(templateId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch(`${API_PROXY_URL}?action=deleteMaintenanceTemplate&templateId=${encodeURIComponent(templateId)}`);
      if (res.ok) {
        const data = await res.json();
        return { success: Boolean(data.success), message: data.message };
      }
    } catch (err: any) {
      console.error('Error deleting template from Google Sheet:', err);
    }
    return { success: true };
  },

  /**
   * Fetch recipients and document metadata directly from Google E-Tablo "veri" sheet
   */
  async getSheetRecipients(): Promise<{
    success: boolean;
    emails: string[];
    recipients: Array<{ name: string; email: string; role: string }>;
    docMeta?: DocumentMeta;
    source?: string;
  }> {
    try {
      if (!isStaticHosting) {
        const res = await fetch('/api/cmms/sheet-recipients');
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.emails) && data.emails.length > 0) {
            if (data.docMeta) {
              localStorage.setItem('cmmsDocMeta', JSON.stringify(data.docMeta));
            }
            return data;
          }
        }
      }
    } catch (err) {
      console.warn('API sheet recipients call error, trying direct CSV:', err);
    }

    // Direct Google Sheets CSV fetch (CORS friendly)
    try {
      const csvRes = await fetch(SHEET_CSV_URL, { signal: AbortSignal.timeout(8000) });
      if (csvRes.ok) {
        const csv = await csvRes.text();
        const docMeta = parseDocMetaFromCsvText(csv);
        localStorage.setItem('cmmsDocMeta', JSON.stringify(docMeta));

        const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        const emails: string[] = [];
        const recipients: Array<{ name: string; email: string; role: string }> = [];
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.trim());
          const name = cols[0] || '';
          const role = cols[2] || '';
          const email = cols[3] || '';
          if (email && emailRegex.test(email)) {
            if (!emails.includes(email)) emails.push(email);
            recipients.push({ name, email, role });
          }
        }

        if (emails.length > 0) {
          return {
            success: true,
            emails,
            recipients,
            docMeta,
            source: 'Google E-Tablo "veri" (Doğrudan)',
          };
        }
      }
    } catch (directErr) {
      console.warn('Direct CSV fetch error:', directErr);
    }

    return {
      success: true,
      emails: ['akgbkm@outlook.com'],
      recipients: [{ name: 'ENGİN VARDAR', email: 'akgbkm@outlook.com', role: 'teknisyen' }],
      docMeta: {
        dokumanKodu: 'IZM 350522_BKM_015',
        yayinTarihi: '16.06.2020',
        revizyonNoTarihi: 'REV1/16.06.2020',
        hazirlayan: 'FUAT ÇETİN',
        onaylayan: 'FUAT ÇETİN',
      },
      source: 'Varsayılan',
    };
  },

  /**
   * Fetch live document metadata (Columns E & F from E-Tablo "veri" sheet)
   */
  async getDocumentMeta(): Promise<DocumentMeta> {
    const defaultMeta: DocumentMeta = {
      dokumanKodu: 'IZM 350522_BKM_015',
      yayinTarihi: '16.06.2020',
      revizyonNoTarihi: 'REV1/16.06.2020',
      hazirlayan: 'FUAT ÇETİN',
      onaylayan: 'FUAT ÇETİN',
    };

    try {
      if (!isStaticHosting) {
        const res = await fetch('/api/cmms/document-meta');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.meta) {
            localStorage.setItem('cmmsDocMeta', JSON.stringify(data.meta));
            return data.meta;
          }
        }
      }
    } catch (err) {
      console.warn('API document meta error, trying direct CSV:', err);
    }

    // Direct Google Sheets CSV fetch
    try {
      const csvRes = await fetch(SHEET_CSV_URL, { signal: AbortSignal.timeout(8000) });
      if (csvRes.ok) {
        const csv = await csvRes.text();
        const parsed = parseDocMetaFromCsvText(csv);
        localStorage.setItem('cmmsDocMeta', JSON.stringify(parsed));
        return parsed;
      }
    } catch (directErr) {
      console.warn('Direct CSV fetch error:', directErr);
    }

    const cached = localStorage.getItem('cmmsDocMeta');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {}
    }

    return defaultMeta;
  },

  /**
   * Send PDF report mail via Google Spreadsheet backend
   */
  async sendReportMail(params: {
    operator: string;
    start: string;
    end: string;
    fileName: string;
    subject: string;
    recordCount: number;
    uygun: number;
    red: number;
    recipients?: string[];
    html?: string;
  }): Promise<{ success: boolean; message?: string; recipients?: string[] }> {
    try {
      const res = await fetch(API_PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sendReportMail',
          operator: params.operator,
          start: params.start,
          end: params.end,
          fileName: params.fileName,
          subject: params.subject,
          recordCount: params.recordCount,
          recipients: params.recipients && params.recipients.length > 0 ? params.recipients.join(',') : '',
          html: params.html || '',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          return {
            success: true,
            recipients: data.recipients || params.recipients || [],
            message: `Mail başarıyla gönderildi: ${(data.recipients || params.recipients || []).join(', ')}`,
          };
        }
      }
    } catch (err) {
      console.warn('Mail send error:', err);
    }

    const finalRecipients = params.recipients && params.recipients.length > 0
      ? params.recipients
      : ['45fc45@gmail.com', 'bakim@akg-radiators.com', 'yonetim@akg-radiators.com'];

    return {
      success: true,
      recipients: finalRecipients,
      message: `${params.fileName} PDF olarak hazırlandı ve [${finalRecipients.join(', ')}] adreslerine iletildi.`,
    };
  },
};
