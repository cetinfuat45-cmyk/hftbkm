import React from 'react';
import { UserSession, Machine, MaintenanceTemplate, MaintenanceRecord } from '../types/cmms';
import { getWeekKey } from '../services/cmmsApi';
import { AudioPlayerButton } from '../components/AudioPlayerButton';
import {
  Wrench,
  AlertTriangle,
  BarChart3,
  Sparkles,
  Settings,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

interface HomeViewProps {
  user: UserSession;
  machines: Machine[];
  templates: MaintenanceTemplate[];
  records: MaintenanceRecord[];
  onNavigate: (screen: 'operator' | 'redList' | 'reports' | 'admin' | 'aiSearch') => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  user,
  machines,
  templates,
  records,
  onNavigate,
}) => {
  const currentWeek = getWeekKey();
  const isAdmin = String(user.role || '').toLowerCase().includes('admin');
  const operatorName = user.operator || user.name || user.fullName || 'Operatör';

  // Calculate current week statistics
  const currentWeekRecords = records.filter((r) => r.weekKey === currentWeek);
  const activeTemplates = templates.filter((t) => t.active);
  const machinesWithTasksCount = machines.filter((m) =>
    activeTemplates.some((t) => t.machineId === m.id || t.machineName === m.machineName)
  ).length;
  const totalPlanned = activeTemplates.length;
  const completed = currentWeekRecords.length;
  const redCount = currentWeekRecords.filter((r) => r.result === 'RED').length;
  const uygunCount = currentWeekRecords.filter((r) => r.result === 'UYGUN').length;
  const pendingCount = Math.max(0, totalPlanned - completed);
  const completionRate = totalPlanned > 0 ? Math.round((completed / totalPlanned) * 100) : 0;

  // Spoken summary for TTS
  const spokenBriefing = `Merhaba ${operatorName}. AKG Haftalık Bakım Sistemi'ne hoş geldiniz. Bu hafta (${currentWeek}) toplam ${totalPlanned} bakım planlandı. Şu ana kadar ${completed} bakım tamamlandı, başarı oranı yüzde ${completionRate}. Sistemde ${redCount} adet açık kırmızı arıza kaydı bulunmaktadır. Lütfen öncelikle açık arızaları ve bekleyen bakımları kontrol ediniz.`;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#0f4c81] to-[#1565a0] text-white rounded-2xl p-6 sm:p-8 shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 rounded-full text-xs font-bold text-sky-200 mb-3 backdrop-blur-xs">
            <span>Dönem: {currentWeek}</span>
            <span>•</span>
            <span>Sürüm V5.4.42</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">
            Hoş Geldiniz, {operatorName}
          </h2>
          <p className="text-sky-100 text-sm sm:text-base leading-relaxed mb-4">
            AKG Endüstriyel Soğutma Sistemleri haftalık koruyucu bakım kontrollerinizi tamamlayabilir,
            arızaları fotoğraflarla raporlayabilir ve yapay zeka destekli teknik kılavuzdan yararlanabilirsiniz.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <AudioPlayerButton
              text={spokenBriefing}
              label="Haftalık Bakım Özetini Dinle (TTS)"
              className="bg-white/20 hover:bg-white/30 text-white border-white/30 shadow-md"
            />
          </div>
        </div>

        {/* Decorative background circle */}
        <div className="absolute -right-16 -bottom-16 w-80 h-80 bg-white/5 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Planlanan</span>
            <Clock className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#0f2d4d]">{totalPlanned}</div>
          <div className="text-[11px] text-slate-500 font-semibold mt-1">Aktif bakım maddesi</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Tamamlanan</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700">{completed}</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">Bu hafta yapılan</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Bekleyen</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600">{pendingCount}</div>
          <div className="text-[11px] text-amber-700 font-semibold mt-1">Kalan kontrol</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">UYGUN</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-800">{uygunCount}</div>
          <div className="text-[11px] text-slate-500 font-semibold mt-1">Sorunsuz kayıt</div>
        </div>

        <div className="bg-red-50/70 p-4 rounded-xl border border-red-200 shadow-xs">
          <div className="flex items-center justify-between text-red-500 mb-1">
            <span className="text-xs font-black uppercase tracking-wider">RED Arıza</span>
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#b11f2e]">{redCount}</div>
          <div className="text-[11px] text-red-700 font-semibold mt-1">Kritik müdahale</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">İlerleme</span>
            <BarChart3 className="w-4 h-4 text-sky-700" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#0f4c81]">%{completionRate}</div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                completionRate >= 90 ? 'bg-emerald-600' : completionRate >= 50 ? 'bg-amber-500' : 'bg-red-600'
              }`}
              style={{ width: `${Math.min(100, completionRate)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Navigation Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Tile 1: Operator Panel */}
        <div
          onClick={() => onNavigate('operator')}
          className="group bg-white rounded-2xl p-6 border border-slate-200 hover:border-[#0f4c81] shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-sky-100 text-[#0f4c81] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Wrench className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-[#0f2d4d] mb-1">Operatör Bakım Paneli</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Makineleri seçin, QR kodlarını okutun ve birimlere göre renklendirilmiş haftalık kontrol adımlarını gerçekleştirin.
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[#0f4c81] font-bold text-sm">
            <span>Kontrole Başla ({machinesWithTasksCount} Bakımlı Makine)</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Tile 2: RED List */}
        <div
          onClick={() => onNavigate('redList')}
          className="group bg-white rounded-2xl p-6 border border-slate-200 hover:border-red-400 shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-red-100 text-red-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform relative">
              <AlertTriangle className="w-6 h-6" />
              {redCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#b11f2e] text-white rounded-full text-[10px] font-black flex items-center justify-center">
                  {redCount}
                </span>
              )}
            </div>
            <h3 className="text-lg font-black text-[#0f2d4d] mb-1">RED Verilen Bakımlar</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Operatörlerin uygun bulmadığı kritik arıza kayıtları, fotoğraflı kanıtlar ve "Giderildi" aksiyon takibi.
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-red-700 font-bold text-sm">
            <span>{redCount > 0 ? `${redCount} Açık Arıza Mevcut` : 'Arızaları İncele'}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Tile 3: Reports */}
        <div
          onClick={() => onNavigate('reports')}
          className="group bg-white rounded-2xl p-6 border border-slate-200 hover:border-emerald-500 shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-[#0f2d4d] mb-1">Bakım Raporları</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Makine ve birim bazında detaylı istatistikler, Excel (CSV) dışa aktarımı, yazdırma ve tek tıkla PDF e-posta gönderimi.
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-emerald-800 font-bold text-sm">
            <span>Raporları Görüntüle</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Tile 4: AI Technical Assistant (Google Search Grounded) */}
        <div
          onClick={() => onNavigate('aiSearch')}
          className="group bg-gradient-to-br from-indigo-50/70 to-sky-50 rounded-2xl p-6 border border-indigo-200 hover:border-indigo-400 shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-xs">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-black text-indigo-950">AI Teknik Danışman</h3>
              <span className="text-[10px] bg-indigo-200 text-indigo-900 font-extrabold px-1.5 py-0.5 rounded-full uppercase">
                Google Search
              </span>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Gemini 3.5 Flash ve canlı Google Arama ile radyatör montajı, arıza kodları, hidrolik değerler ve ISO standartlarını sorun.
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-indigo-100 flex items-center justify-between text-indigo-700 font-bold text-sm">
            <span>Teknik Soru Sor</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Tile 5: Admin Panel (if admin) */}
        {isAdmin && (
          <div
            onClick={() => onNavigate('admin')}
            className="group bg-white rounded-2xl p-6 border border-amber-200 hover:border-amber-400 shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Settings className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-[#0f2d4d] mb-1">Admin Bakım Tanımı</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Makinelere yeni kontrol maddeleri ekleyin, birim renklerini düzenleyin, fotoğraf zorunluluğu koyun ve referans resim yükleyin.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-amber-800 font-bold text-sm">
              <span>Tanımları Yönet ({templates.length} Madde)</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
