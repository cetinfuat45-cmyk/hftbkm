import React, { useState, useEffect } from 'react';
import { AkgLogo } from '../components/AkgLogo';
import { cmmsApi } from '../services/cmmsApi';
import { UserSession } from '../types/cmms';
import { KeyRound, ShieldCheck, Loader2, Database, RefreshCw } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: UserSession) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [sheetStatus, setSheetStatus] = useState<{ connected: boolean; version?: string } | null>(null);

  // Check Google E-Tablo connection
  const verifySheetConnection = async () => {
    try {
      const res = await cmmsApi.checkConnection();
      setSheetStatus({ connected: res.success, version: res.version });
    } catch {
      setSheetStatus({ connected: false });
    }
  };

  useEffect(() => {
    verifySheetConnection();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMsg('Lütfen şifrenizi giriniz.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await cmmsApi.login(password);
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setErrorMsg(res.message || 'Şifre hatalı veya kullanıcı bulunamadı.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Giriş yapılırken bağlantı hatası oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Card Header with AKG branding */}
        <div className="bg-[#0f4c81] p-6 text-white text-center flex flex-col items-center">
          <div className="bg-white rounded-xl p-3 shadow-md mb-3">
            <AkgLogo size="md" />
          </div>
          <h2 className="text-xl font-black tracking-tight">Haftalık Bakım CMMS</h2>
          <p className="text-xs text-sky-200 mt-1 font-medium">
            AKG Endüstriyel Soğutma Sistemleri Bakım Portalı
          </p>

          {/* Live Google E-Tablo Connection Indicator */}
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-sky-100 backdrop-blur-xs border border-white/20">
            <span className={`w-2 h-2 rounded-full ${sheetStatus?.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span>
              Google E-Tablo:{' '}
              {sheetStatus?.connected ? `Bağlı (${sheetStatus.version || 'v5.4.39'})` : 'Bağlantı Kontrol Ediliyor...'}
            </span>
            <button
              type="button"
              onClick={verifySheetConnection}
              title="Bağlantıyı Yenile"
              className="hover:rotate-180 transition-transform cursor-pointer"
            >
              <RefreshCw className="w-3 h-3 text-sky-300" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-bold text-slate-700 mb-1">
                E-Tablo Kullanıcı Şifresi
              </label>
              <div className="relative">
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Şifrenizi girin..."
                  autoFocus
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-base font-semibold focus:outline-none focus:ring-2 focus:ring-[#0f4c81] focus:border-transparent transition-all"
                />
                <KeyRound className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
              </div>
              <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5 font-medium">
                <Database className="w-3.5 h-3.5 text-emerald-600 inline shrink-0" />
                <span>Kullanıcılar Google E-Tablo içindeki <b>veri</b> sayfasından doğrulanır.</span>
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm rounded-xl font-medium">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-[#0f4c81] hover:bg-[#0c3c66] text-white font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-base disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>E-Tablodan Doğrulanıyor...</span>
                </>
              ) : (
                <span>Giriş Yap</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
