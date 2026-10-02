import React, { useState, useEffect } from 'react';
import { UserSession, Machine, MaintenanceTemplate, MaintenanceRecord } from './types/cmms';
import { getStoredUser, clearStoredUser, cmmsApi, getWeekKey } from './services/cmmsApi';
import { Header } from './components/Header';
import { LoginView } from './views/LoginView';
import { HomeView } from './views/HomeView';
import { OperatorView } from './views/OperatorView';
import { RedListView } from './views/RedListView';
import { ReportsView } from './views/ReportsView';
import { AdminView } from './views/AdminView';
import { AiAssistantView } from './views/AiAssistantView';
import { Loader2, LogOut, AlertCircle, X } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [currentScreen, setCurrentScreen] = useState<
    'home' | 'operator' | 'redList' | 'reports' | 'admin' | 'aiSearch'
  >('home');
  const [machines, setMachines] = useState<Machine[]>([]);
  const [templates, setTemplates] = useState<MaintenanceTemplate[]>([]);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Clear legacy mock data once to ensure only real Google Sheet data is present
  useEffect(() => {
    localStorage.removeItem('cmmsRecords_V5442');
    localStorage.removeItem('cmmsTemplates_V5442');
    localStorage.removeItem('cmmsMachines_V5442');
  }, []);

  // Fetch live data directly from Google Spreadsheet
  const loadData = async (showSyncSpinner: boolean = false) => {
    if (showSyncSpinner) setSyncing(true);
    try {
      const [m, t, r] = await Promise.all([
        cmmsApi.getMachines(),
        cmmsApi.getTemplates(),
        cmmsApi.getRecords(),
      ]);
      setMachines(m);
      setTemplates(t);
      setRecords(r);
      setLastSyncTime(new Date().toLocaleTimeString('tr-TR'));
    } catch (err) {
      console.error('Failed to load Google Sheet data:', err);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    const existing = getStoredUser();
    if (existing) {
      setUser(existing);
    }
    loadData();
  }, []);

  const handleLoginSuccess = (loggedInUser: UserSession) => {
    setUser(loggedInUser);
    setCurrentScreen('home');
    loadData(true);
  };

  // Safe In-App Logout (never depends on window.confirm)
  const handleRequestLogout = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = () => {
    clearStoredUser();
    setUser(null);
    setCurrentScreen('home');
    setShowLogoutConfirm(false);
  };

  const handleManualSync = () => {
    loadData(true);
  };

  // Calculate current week's RED count for badge
  const thisWeek = getWeekKey();
  const redCount = records.filter(
    (r) => r.weekKey === thisWeek && r.result === 'RED'
  ).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="text-center space-y-3 bg-white p-8 rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full">
          <Loader2 className="w-10 h-10 animate-spin text-[#0f4c81] mx-auto" />
          <div className="text-base font-black text-slate-800">
            Google E-Tabloya Bağlanılıyor...
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Makineler, kontrol tanımları ve arıza kayıtları senkronize ediliyor.
          </div>
        </div>
      </div>
    );
  }

  // Not logged in: Show Login Screen
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100">
        <LoginView onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  // Logged in: Render Full Application with Responsive Header
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <Header
        currentScreen={currentScreen}
        onNavigate={setCurrentScreen}
        user={user}
        redCount={redCount}
        onRequestLogout={handleRequestLogout}
        onSync={handleManualSync}
        syncing={syncing}
        lastSyncTime={lastSyncTime}
        machinesCount={machines.length}
        recordsCount={records.length}
      />

      <main className="flex-1 pb-12">
        {currentScreen === 'home' && (
          <HomeView
            user={user}
            machines={machines}
            templates={templates}
            records={records}
            onNavigate={setCurrentScreen}
          />
        )}

        {currentScreen === 'operator' && (
          <OperatorView
            user={user}
            machines={machines}
            templates={templates}
            records={records}
            onRecordSaved={() => loadData(true)}
            onNavigateHome={() => setCurrentScreen('home')}
          />
        )}

        {currentScreen === 'redList' && (
          <RedListView
            records={records}
            machines={machines}
            onRecordUpdated={() => loadData(true)}
            onNavigateHome={() => setCurrentScreen('home')}
          />
        )}

        {currentScreen === 'reports' && (
          <ReportsView
            user={user}
            records={records}
            machines={machines}
            templates={templates}
            onNavigateHome={() => setCurrentScreen('home')}
          />
        )}

        {currentScreen === 'admin' && (
          <AdminView
            machines={machines}
            templates={templates}
            onTemplatesUpdated={() => loadData(true)}
            onNavigateHome={() => setCurrentScreen('home')}
          />
        )}

        {currentScreen === 'aiSearch' && (
          <AiAssistantView
            machines={machines}
            onNavigateHome={() => setCurrentScreen('home')}
          />
        )}
      </main>

      {/* Corporate Footer with live E-Tablo status */}
      <footer className="bg-white border-t border-slate-200 py-3 px-4 text-center text-xs text-slate-500 font-medium print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span className="font-bold text-slate-700">Google E-Tablo Canlı Bağlantısı Aktif</span>
            <span>•</span>
            <span>{machines.length} Makine</span>
            <span>•</span>
            <span>{records.length} Kayıt</span>
            {lastSyncTime && <span>(Son senkron: {lastSyncTime})</span>}
          </div>
          <span>AKG Endüstriyel Soğutma Sistemleri • Haftalık Bakım CMMS V5.4.42</span>
        </div>
      </footer>

      {/* IN-APP LOGOUT CONFIRMATION MODAL (Does not depend on window.confirm) */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <LogOut className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900 mb-1">
                Sistemden Çıkış Yapılsın mı?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Aktif oturumunuz sonlandırılacak ve şifre giriş ekranına yönlendirileceksiniz.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="flex-1 py-3 bg-[#b11f2e] hover:bg-[#8f1824] text-white font-extrabold rounded-xl text-sm shadow-md transition-colors"
              >
                Çıkış Yap
              </button>

              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-colors"
              >
                Vazgeç
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
