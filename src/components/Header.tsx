import React, { useState, useRef, useEffect } from 'react';
import { AkgLogo } from './AkgLogo';
import { UserSession } from '../types/cmms';
import {
  Menu,
  X,
  ChevronDown,
  Home,
  Wrench,
  BarChart3,
  AlertTriangle,
  Sparkles,
  Settings,
  LogOut,
  RefreshCw,
  User,
  Shield,
  Check,
  Download,
} from 'lucide-react';

interface HeaderProps {
  currentScreen: 'home' | 'operator' | 'redList' | 'reports' | 'admin' | 'aiSearch';
  onNavigate: (screen: 'home' | 'operator' | 'redList' | 'reports' | 'admin' | 'aiSearch') => void;
  user: UserSession | null;
  redCount: number;
  onRequestLogout: () => void;
  onSync?: () => void;
  syncing?: boolean;
  lastSyncTime?: string;
  machinesCount?: number;
  recordsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  onNavigate,
  user,
  redCount,
  onRequestLogout,
  onSync,
  syncing = false,
  lastSyncTime,
  machinesCount = 0,
  recordsCount = 0,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const isAdmin = String(user?.role || '').toLowerCase().includes('admin');
  const operatorName = user?.operator || user?.name || user?.fullName || 'Kullanıcı';

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  const handleSelectNav = (screen: 'home' | 'operator' | 'redList' | 'reports' | 'admin' | 'aiSearch') => {
    onNavigate(screen);
    setDropdownOpen(false);
  };

  const navItems = [
    {
      id: 'home' as const,
      label: 'Ana Menü (Özet)',
      desc: 'Haftalık bakım özeti ve gösterge paneli',
      icon: Home,
      color: 'text-sky-600 bg-sky-50',
    },
    {
      id: 'operator' as const,
      label: 'Operatör Bakım Paneli',
      desc: 'Makine seçimi, QR doğrulama ve kontrol adımları',
      icon: Wrench,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      id: 'redList' as const,
      label: 'RED Verilen Bakımlar',
      desc: 'Kritik arıza kayıtları ve "Giderildi" aksiyonu',
      icon: AlertTriangle,
      color: 'text-red-600 bg-red-50',
      badge: redCount > 0 ? `${redCount} Arıza` : undefined,
    },
    {
      id: 'reports' as const,
      label: 'Bakım Raporları & Analitik',
      desc: 'Tamamlanma oranları, Excel indir ve PDF mail',
      icon: BarChart3,
      color: 'text-emerald-700 bg-emerald-50',
    },
    {
      id: 'aiSearch' as const,
      label: 'AKG AI Teknik Danışman',
      desc: 'Google Search ile canlı arıza kodu ve standartlar',
      icon: Sparkles,
      color: 'text-indigo-600 bg-indigo-50',
    },
    ...(isAdmin
      ? [
          {
            id: 'admin' as const,
            label: 'Admin Bakım Tanımı',
            desc: 'Kontrol maddeleri, birimler ve şema yönetimi',
            icon: Settings,
            color: 'text-amber-700 bg-amber-50',
          },
        ]
      : []),
  ];

  const getScreenTitle = () => {
    switch (currentScreen) {
      case 'home':
        return 'Ana Sayfa';
      case 'operator':
        return 'Bakım Paneli';
      case 'redList':
        return 'RED Listesi';
      case 'reports':
        return 'Raporlar';
      case 'aiSearch':
        return 'AI Danışman';
      case 'admin':
        return 'Admin Paneli';
      default:
        return 'Menü';
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-[#0f4c81] text-white shadow-md border-b border-sky-900/40">
      <div className="max-w-7xl mx-auto px-3 sm:px-5 py-2.5 flex items-center justify-between gap-3">
        {/* Left: Brand Identity */}
        <div
          onClick={() => handleSelectNav('home')}
          className="flex items-center gap-3 cursor-pointer group select-none min-w-0"
        >
          <div className="bg-white rounded-lg p-1 sm:p-1.5 shadow-sm group-hover:scale-105 transition-transform shrink-0">
            <AkgLogo size="sm" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-black tracking-tight leading-tight truncate">
              Haftalık Bakım CMMS
            </h1>
            <div className="flex items-center gap-2 text-xs text-sky-200">
              <span className="font-semibold truncate max-w-[140px] sm:max-w-xs">{operatorName}</span>
              {isAdmin && (
                <span className="bg-amber-400 text-slate-900 font-black text-[10px] px-1.5 py-0.2 rounded-full uppercase tracking-wider shrink-0">
                  Admin
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Clean Action Bar with Dropdown & Direct Shortcuts */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Direct Red Warning Quick Button if any active defects */}
          {redCount > 0 && (
            <button
              type="button"
              onClick={() => handleSelectNav('redList')}
              title={`${redCount} açık arıza kaydı var`}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/25 hover:bg-red-500/35 border border-red-300/40 text-red-100 text-xs font-black transition-all"
            >
              <AlertTriangle className="w-4 h-4 text-red-300" />
              <span>{redCount} RED</span>
            </button>
          )}

          {/* Quick Sync Button */}
          {onSync && (
            <button
              type="button"
              onClick={onSync}
              disabled={syncing}
              title={`E-Tablodan yenile (${machinesCount} makine, ${recordsCount} kayıt)`}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-sky-100 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-300 ${syncing ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">{syncing ? 'Yenileniyor...' : 'E-Tablo'}</span>
            </button>
          )}

          {/* DIRECT ZIP DOWNLOAD BUTTON ON HEADER */}
          <a
            href="/api/export-project-zip"
            download="AKG_CMMS_V5.4.42_Source.zip"
            title="Tüm proje kaynak kodlarını ZIP olarak indir"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 border border-emerald-400 text-white text-xs font-black shadow-md transition-all active:scale-95 shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-white" />
            <span>ZIP İndir</span>
          </a>

          {/* MAIN DROPDOWN MENU BUTTON (Aşağı Doğru Açılan Menü) */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-extrabold transition-all shadow-sm ${
                dropdownOpen
                  ? 'bg-white text-[#0f4c81] border-white shadow-md'
                  : 'bg-white/15 hover:bg-white/25 border-white/30 text-white'
              }`}
            >
              <Menu className="w-4 h-4" />
              <span className="hidden sm:inline">{getScreenTitle()}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              {redCount > 0 && (
                <span className="sm:hidden w-2 h-2 rounded-full bg-red-400 animate-ping" />
              )}
            </button>

            {/* DROPDOWN MENU PANEL (Aşağı doğru açılan modern kart) */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* User info banner inside dropdown */}
                <div className="bg-slate-50 p-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#0f4c81] text-white flex items-center justify-center font-black text-sm shrink-0">
                      {operatorName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-black text-sm text-[#0f2d4d] truncate">
                        {operatorName}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                        <span>{isAdmin ? 'Yetkili Yönetici' : 'Saha Operatörü'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Nav Links */}
                <div className="p-2 space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentScreen === item.id;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectNav(item.id)}
                        className={`w-full p-2.5 rounded-xl text-left flex items-start gap-3 transition-colors ${
                          isActive
                            ? 'bg-sky-50 text-[#0f4c81] font-bold border border-sky-200'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className={`p-2 rounded-lg shrink-0 ${item.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-sm font-extrabold">{item.label}</span>
                            {item.badge && (
                              <span className="text-[10px] font-black bg-red-600 text-white px-2 py-0.5 rounded-full">
                                {item.badge}
                              </span>
                            )}
                            {isActive && <Check className="w-4 h-4 text-[#0f4c81]" />}
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium truncate">
                            {item.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Bottom Actions: Sync, ZIP Download & Logout */}
                <div className="p-2 border-t border-slate-100 bg-slate-50/60 space-y-1">
                  {onSync && (
                    <button
                      type="button"
                      onClick={() => {
                        onSync();
                        setDropdownOpen(false);
                      }}
                      className="w-full p-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                      <span>E-Tablo Verilerini Yenile {lastSyncTime ? `(${lastSyncTime})` : ''}</span>
                    </button>
                  )}

                  <a
                    href="/api/export-github-pages-zip"
                    download="AKG_CMMS_GITHUB_PAGES_YUKLEME_PAKETI.zip"
                    onClick={() => setDropdownOpen(false)}
                    className="w-full p-2.5 text-xs font-black text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 rounded-lg flex items-center gap-2 transition-all shadow-xs"
                  >
                    <Download className="w-4 h-4 text-white" />
                    <div className="text-left">
                      <div>GitHub Pages Yükleme Paketi (ZIP)</div>
                      <div className="text-[10px] text-emerald-100 font-normal">Sadece bu dosyaları GitHub'a atın, anında çalışır</div>
                    </div>
                  </a>

                  <a
                    href="/api/export-project-zip"
                    download="AKG_CMMS_V5.4.42_Source.zip"
                    onClick={() => setDropdownOpen(false)}
                    className="w-full p-2 text-xs font-bold text-[#0f4c81] hover:text-[#0b3860] hover:bg-sky-50 rounded-lg flex items-center gap-2 transition-colors border border-sky-200 bg-sky-50/50"
                  >
                    <Download className="w-3.5 h-3.5 text-[#0f4c81]" />
                    <span>Tüm Kaynak Kodları (Geliştirici Paketi)</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      onRequestLogout();
                    }}
                    className="w-full p-2.5 text-sm font-extrabold text-red-700 hover:bg-red-50 rounded-xl flex items-center gap-2 transition-colors border border-transparent hover:border-red-200"
                  >
                    <LogOut className="w-4 h-4 text-red-600" />
                    <span>Sistemden Çıkış Yap</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Direct Logout Button in Header Bar (Guaranteed In-App Action) */}
          <button
            type="button"
            onClick={onRequestLogout}
            title="Sistemden Çıkış Yap"
            className="p-2 rounded-xl bg-red-600/30 hover:bg-red-600/50 border border-red-300/40 text-red-200 hover:text-white transition-all ml-1 shrink-0"
          >
            <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
