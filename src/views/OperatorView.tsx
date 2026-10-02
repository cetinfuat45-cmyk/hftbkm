import React, { useState, useRef, useEffect } from 'react';
import {
  Machine,
  MaintenanceTemplate,
  MaintenanceRecord,
  UserSession,
  DEPARTMENTS,
} from '../types/cmms';
import { getWeekKey, cmmsApi } from '../services/cmmsApi';
import { AudioPlayerButton } from '../components/AudioPlayerButton';
import { analyzeMaintenancePhoto } from '../services/geminiService';
import {
  Search,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowLeft,
  Maximize2,
  X,
  Upload,
  Sparkles,
  ShieldAlert,
  Loader2,
  Check,
  RotateCcw,
} from 'lucide-react';

interface OperatorViewProps {
  user: UserSession;
  machines: Machine[];
  templates: MaintenanceTemplate[];
  records: MaintenanceRecord[];
  onRecordSaved: () => void;
  onNavigateHome: () => void;
}

export const OperatorView: React.FC<OperatorViewProps> = ({
  user,
  machines,
  templates,
  records,
  onRecordSaved,
  onNavigateHome,
}) => {
  // Navigation step within operator panel
  const [subStep, setSubStep] = useState<'machines' | 'qr' | 'tasks' | 'control'>('machines');
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [selectedTask, setSelectedTask] = useState<MaintenanceTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // QR Scanning state
  const [qrScanning, setQrScanning] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [wrongQrModal, setWrongQrModal] = useState<{ expected: string; scanned: string } | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Control / Form state
  const [measuredValue, setMeasuredValue] = useState('');
  const [result, setResult] = useState<'UYGUN' | 'RED' | ''>('');
  const [description, setDescription] = useState('');
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [proofImageFile, setProofImageFile] = useState<File | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Lightbox modals
  const [refImageModalOpen, setRefImageModalOpen] = useState(false);
  const [proofImageModalOpen, setProofImageModalOpen] = useState(false);

  // AI Image Analysis state (FEATURE 3: gemini-3.1-pro-preview)
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<string | null>(null);
  const [aiAnalysisVerdict, setAiAnalysisVerdict] = useState<'UYGUN' | 'RED' | null>(null);

  const isAdmin = String(user.role || '').toLowerCase().includes('admin');
  const currentWeek = getWeekKey();

  // Helper: map a machine & template to its status for current week
  const getTaskStatus = (machineId: string, templateId: string): 'bekleyen' | 'tamamlanan' | 'red' => {
    const record = records.find(
      (r) => r.machineId === machineId && r.templateId === templateId && r.weekKey === currentWeek
    );
    if (!record) return 'bekleyen';
    return record.result === 'RED' ? 'red' : 'tamamlanan';
  };

  // Helper: match department config
  const getDepartmentConfig = (sys?: string) => {
    if (!sys) return null;
    const cleanSys = sys.toUpperCase().trim();
    return DEPARTMENTS.find((d) => d.deger === cleanSys) || null;
  };

  // State to filter machines: by default true (only machines with defined maintenance tasks)
  const [onlyWithTasks, setOnlyWithTasks] = useState(true);

  // Helper to get active tasks for any machine (matching either machineId or machineName)
  const getMachineTasks = (m: Machine) => {
    return templates
      .filter((t) => (t.machineId === m.id || t.machineName === m.machineName) && t.active)
      .sort((a, b) => (a.orderNo || 1) - (b.orderNo || 1));
  };

  // Machines that have at least one defined active maintenance task
  const machinesWithTasks = machines.filter((m) => getMachineTasks(m).length > 0);

  // Tasks for selected machine
  const machineTasks = selectedMachine ? getMachineTasks(selectedMachine) : [];

  // Filtered machines
  const baseMachines = onlyWithTasks ? machinesWithTasks : machines;
  const filteredMachines = baseMachines.filter((m) =>
    m.machineName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.costCenter && m.costCenter.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // QR Selection Flow
  const handleSelectMachine = (machine: Machine) => {
    setSelectedMachine(machine);
    // If admin, bypass QR verification
    if (isAdmin) {
      setSubStep('tasks');
    } else {
      setSubStep('qr');
      setQrError(null);
      setQrScanning(true);
    }
  };

  // Camera stream cleanup
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (subStep === 'qr' && qrScanning) {
      navigator.mediaDevices
        ?.getUserMedia({ video: { facingMode: 'environment' } })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play();
          }
        })
        .catch((err) => {
          console.warn('Camera access error:', err);
          setQrError('Kamera başlatılamadı. Doğrudan QR Doğrula butonunu kullanabilirsiniz.');
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [subStep, qrScanning]);

  const handleSimulateQrScan = (scannedCode: string) => {
    if (!selectedMachine) return;
    const validCodes = [
      selectedMachine.id,
      selectedMachine.code,
      selectedMachine.machineCode,
      selectedMachine.machineName,
    ].filter(Boolean);

    const isMatch = validCodes.some((code) =>
      code?.toLowerCase().includes(scannedCode.toLowerCase()) ||
      scannedCode.toLowerCase().includes(code?.toLowerCase() || '')
    );

    if (isMatch) {
      setSubStep('tasks');
    } else {
      setWrongQrModal({
        expected: `${selectedMachine.machineName} (${selectedMachine.code || selectedMachine.id})`,
        scanned: scannedCode,
      });
    }
  };

  // Select a task to perform control
  const handleOpenTask = (task: MaintenanceTemplate) => {
    setSelectedTask(task);
    setMeasuredValue('');
    setResult('');
    setDescription('');
    setProofImage(null);
    setProofImageFile(null);
    setSaveMessage(null);
    setAiAnalysisResult(null);
    setAiAnalysisVerdict(null);
    setSubStep('control');
  };

  // Handle image upload / camera capture
  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofImageFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setProofImage(event.target?.result as string);
        setAiAnalysisResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // AI Image Inspection (FEATURE 3: gemini-3.1-pro-preview)
  const handleRunAiInspection = async () => {
    if (!proofImage) return;

    setAiAnalyzing(true);
    setAiAnalysisResult(null);

    try {
      const res = await analyzeMaintenancePhoto(proofImage, {
        taskName: selectedTask?.task,
        machineName: selectedMachine?.machineName,
      });

      if (res.success && res.analysis) {
        setAiAnalysisResult(res.analysis);
        setAiAnalysisVerdict(res.verdict || null);

        // If Gemini recommends RED and user has empty description, offer recommendation
        if (res.verdict === 'RED' && !description) {
          setDescription('AI Tarafından Tespit Edilen Kusur: Fotoğrafta aşınma ve sızıntı emareleri saptandı.');
          setResult('RED');
        } else if (res.verdict === 'UYGUN' && !result) {
          setResult('UYGUN');
        }
      }
    } catch (err: any) {
      alert(err.message || 'Görüntü analizi gerçekleştirilemedi.');
    } finally {
      setAiAnalyzing(false);
    }
  };

  // Save Control Record
  const handleSaveControl = async () => {
    if (!selectedMachine || !selectedTask) return;

    // Check mandatory measurement
    if (selectedTask.targetValue && !measuredValue.trim()) {
      setSaveMessage({
        type: 'error',
        text: 'Bu bakım için istenen değer tanımlıdır. Lütfen ölçtüğünüz değeri yazınız.',
      });
      return;
    }

    // Check result
    if (!result) {
      setSaveMessage({ type: 'error', text: 'Lütfen bakım sonucunu (UYGUN veya RED) seçiniz.' });
      return;
    }

    // Check RED description requirement (min 10 chars)
    if (result === 'RED' && description.trim().length < 10) {
      setSaveMessage({
        type: 'error',
        text: 'RED verilen bakımlarda arıza açıklaması zorunludur (en az 10 karakter).',
      });
      return;
    }

    // Check photo requirement
    if (selectedTask.photoRequired && !proofImage) {
      setSaveMessage({
        type: 'error',
        text: 'Yönetici bu bakım için kanıt fotoğrafını zorunlu tutmuştur. Lütfen fotoğraf ekleyiniz.',
      });
      return;
    }

    setSaveLoading(true);
    setSaveMessage(null);

    try {
      const res = await cmmsApi.saveRecord({
        templateId: selectedTask.templateId,
        machineId: selectedMachine.id,
        machineName: selectedMachine.machineName,
        operator: user.operator || user.name || 'Operatör',
        result,
        measuredValue: measuredValue.trim(),
        description: description.trim(),
        proofImageUrl: proofImage || undefined,
        weekKey: currentWeek,
        task: selectedTask.task,
        system: selectedTask.system,
        targetValue: selectedTask.targetValue,
      });

      if (res.success) {
        setSaveMessage({ type: 'success', text: `Kontrol kaydedildi (Kayıt No: ${res.recordId})` });
        onRecordSaved();
        setTimeout(() => {
          setSubStep('tasks');
        }, 1200);
      }
    } catch (err: any) {
      setSaveMessage({ type: 'error', text: err.message || 'Kayıt sırasında hata oluştu.' });
    } finally {
      setSaveLoading(false);
    }
  };

  // ==========================================
  // VIEW 1: MACHINE SELECTION
  // ==========================================
  if (subStep === 'machines') {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-[#0f2d4d]">
              Bakımı Yapılacak Makineler
            </h2>
            <p className="text-sm text-slate-500 font-medium mt-0.5">
              {onlyWithTasks
                ? `Yalnızca aktif bakım tanımı bulunan ${machinesWithTasks.length} makine listeleniyor.`
                : `Fabrikadaki tüm ${machines.length} makine listeleniyor.`}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            {/* Filter Toggle: Only with tasks vs All */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setOnlyWithTasks(true)}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg transition-all ${
                  onlyWithTasks
                    ? 'bg-[#0f4c81] text-white shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Bakımı Tanımlı ({machinesWithTasks.length})
              </button>
              <button
                type="button"
                onClick={() => setOnlyWithTasks(false)}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg transition-all ${
                  !onlyWithTasks
                    ? 'bg-[#0f4c81] text-white shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tümü ({machines.length})
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Makine ara..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0f4c81]"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-600 font-bold">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-[#FFB733] border border-black/20" />
              <span>Bekleyen</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-[#99FF99] border border-black/20" />
              <span>Tamamlanan</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-[#FF9999] border border-black/20" />
              <span>RED (Arıza)</span>
            </span>
          </div>

          <span className="text-[11px] text-slate-500 font-medium">
            Gösterilen: <b>{filteredMachines.length}</b> makine
          </span>
        </div>

        {/* Machine Cards */}
        {filteredMachines.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-700">Uygun Makine Bulunamadı</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Arama kriterinize veya seçili filtreye uygun makine bulunamadı.
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Aramayı Temizle
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredMachines.map((m) => {
              const mTasks = getMachineTasks(m);
              const completedCount = mTasks.filter(
                (t) => getTaskStatus(m.id, t.templateId) !== 'bekleyen'
              ).length;

              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelectMachine(m)}
                  className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-[#0f4c81] shadow-xs hover:shadow-md transition-all text-left flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h3 className="text-base sm:text-lg font-black text-[#0f2d4d] group-hover:text-[#0f4c81] transition-colors">
                        {m.machineName}
                      </h3>
                      <span className="text-[11px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md shrink-0">
                        {m.costCenter || m.code || m.id}
                      </span>
                    </div>

                    {/* Step bar with numbered badges */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {mTasks.length === 0 ? (
                        <span className="text-xs text-slate-400 italic">Tanımlı bakım yok</span>
                      ) : (
                        mTasks.map((t, idx) => {
                          const st = getTaskStatus(m.id, t.templateId);
                          const bg =
                            st === 'red'
                              ? 'bg-[#FF9999] text-[#7a1414]'
                              : st === 'tamamlanan'
                              ? 'bg-[#99FF99] text-[#0d5c2c]'
                              : 'bg-[#FFB733] text-amber-950';

                          return (
                            <span
                              key={t.templateId}
                              title={`${idx + 1}. ${t.task} (${st.toUpperCase()})`}
                              className={`w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center border border-black/15 shadow-2xs ${bg}`}
                            >
                              {idx + 1}
                            </span>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="text-xs font-bold text-slate-500 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span>
                      {completedCount} / {mTasks.length} bakım tamamlandı
                    </span>
                    <span className="text-[#0f4c81] group-hover:underline">Seç ve Başla →</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW 2: QR CODE SCANNER
  // ==========================================
  if (subStep === 'qr') {
    return (
      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        <button
          type="button"
          onClick={() => setSubStep('machines')}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-[#0f4c81] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Makinelere Dön</span>
        </button>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md text-center">
          <h2 className="text-xl font-black text-[#0f2d4d] mb-1">
            {selectedMachine?.machineName}
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Lütfen makine üzerindeki QR güvenlik etiketini kameraya okutun.
          </p>

          {/* Camera Frame */}
          <div className="relative w-full aspect-square max-w-[280px] mx-auto bg-slate-900 rounded-2xl overflow-hidden border-4 border-slate-700 shadow-inner flex items-center justify-center">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            <div className="absolute inset-4 border-2 border-dashed border-sky-400/80 rounded-xl pointer-events-none animate-pulse" />
          </div>

          {qrError && (
            <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-semibold">
              {qrError}
            </div>
          )}

          {/* Quick Simulation Buttons */}
          <div className="mt-6 pt-4 border-t border-slate-100 space-y-2">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Hızlı QR Doğrulama:
            </div>
            <button
              type="button"
              onClick={() => handleSimulateQrScan(selectedMachine?.machineName || '')}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Doğru QR Kodunu Oku ({selectedMachine?.code || selectedMachine?.id})</span>
            </button>

            <button
              type="button"
              onClick={() => handleSimulateQrScan('HATALI-MAKINE-999')}
              className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
            >
              Farklı / Yanlış QR Kodunu Test Et
            </button>
          </div>
        </div>

        {/* Wrong QR Modal */}
        {wrongQrModal && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95">
              <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-1">Hatalı Makine Etiketi!</h3>
              <p className="text-xs text-slate-600 mb-4">
                Okutulan QR kodu seçtiğiniz makine ile uyuşmuyor. Lütfen doğru makinenin başında olduğunuzdan emin olun.
              </p>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-left text-xs mb-4 space-y-1">
                <div>
                  <b className="text-slate-700">Seçilen Makine:</b>{' '}
                  <span className="text-emerald-700 font-bold">{wrongQrModal.expected}</span>
                </div>
                <div>
                  <b className="text-slate-700">Okunan Kod:</b>{' '}
                  <span className="text-red-600 font-bold">{wrongQrModal.scanned}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setWrongQrModal(null)}
                  className="flex-1 py-2.5 bg-[#0f4c81] text-white font-bold rounded-xl text-sm"
                >
                  Tekrar Okut
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWrongQrModal(null);
                    setSubStep('machines');
                  }}
                  className="py-2.5 px-4 bg-slate-200 text-slate-800 font-bold rounded-xl text-sm"
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

  // ==========================================
  // VIEW 3: TASKS CHECKLIST FOR MACHINE
  // ==========================================
  if (subStep === 'tasks') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        <button
          type="button"
          onClick={() => setSubStep('machines')}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-[#0f4c81] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Makinelere Dön</span>
        </button>

        {/* Machine Header */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-[#0f2d4d]">
              {selectedMachine?.machineName}
            </h2>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              {machineTasks.length} adet haftalık kontrol maddesi
            </p>
          </div>

          {isAdmin && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold">
              <span>Yönetici yetkisi ile QR atlandı</span>
            </div>
          )}
        </div>

        {/* Department Colors Legend */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700">
          <span className="text-slate-400 font-semibold mr-1">Birim Renkleri:</span>
          {DEPARTMENTS.map((d) => (
            <span key={d.kod} className="flex items-center gap-1.5">
              <span className={`w-3.5 h-3.5 rounded-md ${d.bgClass} border border-black/20`} />
              <span>{d.ad}</span>
            </span>
          ))}
        </div>

        {/* Task List Items */}
        <div className="space-y-3">
          {machineTasks.map((t, idx) => {
            const st = getTaskStatus(selectedMachine!.id, t.templateId);
            const dept = getDepartmentConfig(t.system);

            // Background color matches department, or white fallback
            const cardBg = dept ? dept.bgClass : 'bg-white';
            const cardText = dept ? dept.textClass : 'text-slate-900';

            const statusBadgeBg =
              st === 'red'
                ? 'bg-[#FF9999] text-[#7a1414] border-[#7a1414]/30'
                : st === 'tamamlanan'
                ? 'bg-[#99FF99] text-[#0d5c2c] border-[#0d5c2c]/30'
                : 'bg-[#FFB733] text-amber-950 border-amber-800/30';

            return (
              <button
                key={t.templateId}
                type="button"
                onClick={() => handleOpenTask(t)}
                className={`w-full p-4 rounded-2xl border border-black/15 shadow-xs hover:shadow-md transition-all text-left flex items-start gap-4 ${cardBg} ${cardText} hover:scale-[1.008] cursor-pointer`}
              >
                {/* Step Number with status color */}
                <div
                  className={`w-10 h-10 rounded-xl font-black text-base shrink-0 flex items-center justify-center border-2 shadow-xs ${statusBadgeBg}`}
                >
                  {idx + 1}
                </div>

                {/* Task Details */}
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-base leading-snug mb-1">
                    {t.task}
                  </div>
                  <div className="text-xs opacity-85 font-medium flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>Bölge: <b>{t.region || '-'}</b></span>
                    {t.part && <span>Parça: <b>{t.part}</b></span>}
                    {t.targetValue && <span>İstenen: <b>{t.targetValue}</b></span>}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-[11px] font-black bg-white/90 text-slate-800 px-2 py-0.5 rounded-full border border-black/15 shadow-2xs">
                      {dept?.ad || t.system || 'Genel'}
                    </span>
                    {t.photoRequired && (
                      <span className="text-[11px] font-black bg-[#b11f2e] text-white px-2 py-0.5 rounded-full shadow-2xs flex items-center gap-1">
                        <Camera className="w-3 h-3" />
                        <span>Fotoğraf gerekli</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 self-center text-sm font-black opacity-75">
                  {st === 'red' ? '🔴 RED' : st === 'tamamlanan' ? '🟢 OK' : 'Aç →'}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 4: TASK EXECUTION & CONTROL SCREEN
  // ==========================================
  const dept = getDepartmentConfig(selectedTask?.system);
  const isRed = result === 'RED';
  const descLength = description.trim().length;
  const isPhotoRequired = Boolean(selectedTask?.photoRequired);
  const saveDisabled = saveLoading || (isPhotoRequired && !proofImage);

  // Audio briefing text for TTS
  const taskSpeechText = `${selectedMachine?.machineName}, ${selectedTask?.orderNo || 1}. bakım kontrolü. Görev: ${selectedTask?.task}. İlgili birim: ${dept?.ad || selectedTask?.system || 'Belirtilmemiş'}. Bölge: ${selectedTask?.region || 'Genel'}. İstenen hedef değer: ${selectedTask?.targetValue || 'Görsel uygunluk'}. ${isPhotoRequired ? 'Uyarı: Yönetici bu bakım için kanıt fotoğrafı istemektedir.' : ''}`;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      <button
        type="button"
        onClick={() => setSubStep('tasks')}
        className="inline-flex items-center gap-1.5 text-sm font-bold text-[#0f4c81] hover:underline"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Bakım Listesine Dön</span>
      </button>

      {/* Control Header Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {selectedMachine?.machineName}
            </span>
            <h2 className="text-xl font-black text-[#0f2d4d]">
              {selectedTask?.orderNo || 1}. Kontrol Maddesi
            </h2>
          </div>

          {/* FEATURE 1: Audio Guidance button */}
          <AudioPlayerButton
            text={taskSpeechText}
            label="Talimatı Sesli Dinle"
            style="Calm, authoritative industrial safety supervisor speaking Turkish."
          />
        </div>

        {/* Reference Image Frame (Standard 4:3) */}
        {selectedTask?.referenceImageUrl ? (
          <div
            onClick={() => setRefImageModalOpen(true)}
            className="relative w-full aspect-4/3 max-h-72 bg-slate-900 rounded-xl overflow-hidden border border-slate-300 cursor-zoom-in group shadow-inner"
          >
            <img
              src={selectedTask.referenceImageUrl}
              alt="Referans Resim"
              className="w-full h-full object-contain"
            />
            <div className="absolute right-2 bottom-2 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1 opacity-90 group-hover:opacity-100">
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Büyütmek için dokunun</span>
            </div>
          </div>
        ) : (
          <div className="w-full aspect-16/6 bg-slate-50 rounded-xl border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400 font-semibold">
            Referans teknik resim yüklenmemiş
          </div>
        )}

        {/* Task Specification Info Card */}
        <div className={`p-4 rounded-xl border ${dept ? dept.bgClass : 'bg-slate-50'} ${dept ? dept.textClass : 'text-slate-900'}`}>
          <div className="text-xs uppercase font-extrabold tracking-wider opacity-75 mb-1">
            Yapılacak Bakım Görevi
          </div>
          <div className="text-lg font-black leading-snug mb-3">
            {selectedTask?.task}
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="font-extrabold bg-white/90 text-slate-900 px-2.5 py-1 rounded-full border border-black/15 shadow-2xs">
              Birim: {dept?.ad || selectedTask?.system || 'Genel'}
            </span>
            <span className="font-extrabold bg-white/90 text-slate-900 px-2.5 py-1 rounded-full border border-black/15 shadow-2xs">
              Bölge: {selectedTask?.region || '-'}
            </span>
            {selectedTask?.part && (
              <span className="font-extrabold bg-white/90 text-slate-900 px-2.5 py-1 rounded-full border border-black/15 shadow-2xs">
                Parça: {selectedTask?.part}
              </span>
            )}
          </div>

          {selectedTask?.targetValue && (
            <div className="mt-3 pt-2.5 border-t border-black/10 text-sm">
              <span className="opacity-80">İstenen Değer:</span>{' '}
              <b className="font-black underline">{selectedTask.targetValue}</b>
            </div>
          )}
        </div>
      </div>

      {/* Control Execution Form */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        {/* Measured Value Input (Mandatory if targetValue exists) */}
        {selectedTask?.targetValue && (
          <div className="p-4 bg-sky-50 rounded-xl border-2 border-sky-600">
            <label className="block text-sm font-black text-sky-950 mb-1 flex items-center justify-between">
              <span>Ölçülen Değer / Tespit</span>
              <span className="text-[10px] font-black bg-sky-700 text-white px-2 py-0.5 rounded-full uppercase">
                ZORUNLU
              </span>
            </label>
            <div className="text-xs text-slate-600 mb-2 font-medium">
              İstenen Referans: <b>{selectedTask.targetValue}</b>
            </div>
            <input
              type="text"
              value={measuredValue}
              onChange={(e) => setMeasuredValue(e.target.value)}
              placeholder="Ölçtüğünüz değeri yazın (ör: 4.8 bar / 48°C / 8.2mm)"
              className="w-full px-3.5 py-2.5 bg-white border border-sky-300 rounded-lg text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
            />
          </div>
        )}

        {/* Result Selection: UYGUN vs RED */}
        <div>
          <label className="block text-sm font-black text-slate-800 mb-2">
            Bakım Sonucu <span className="text-red-600">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setResult('UYGUN')}
              className={`py-3 px-4 rounded-xl font-black text-base border-2 transition-all flex items-center justify-center gap-2 ${
                result === 'UYGUN'
                  ? 'bg-[#99FF99] border-[#0d5c2c] text-[#0d5c2c] shadow-sm ring-2 ring-emerald-300'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>UYGUN</span>
            </button>

            <button
              type="button"
              onClick={() => setResult('RED')}
              className={`py-3 px-4 rounded-xl font-black text-base border-2 transition-all flex items-center justify-center gap-2 ${
                result === 'RED'
                  ? 'bg-[#FF9999] border-[#7a1414] text-[#7a1414] shadow-sm ring-2 ring-red-300'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
              <span>RED (Arıza)</span>
            </button>
          </div>
        </div>

        {/* Description Field (Mandatory 10 chars if RED) */}
        <div>
          <label className="block text-sm font-black text-slate-800 mb-1 flex items-center justify-between">
            <span>Açıklama</span>
            {isRed && (
              <span className="text-[10px] font-black bg-[#FF9999] text-[#7a1414] px-2 py-0.5 rounded-full uppercase">
                RED İÇİN ZORUNLU (En az 10 karakter)
              </span>
            )}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder={
              isRed
                ? 'Arızanın tanımı nedir? Hangi parçada hasar var? (En az 10 karakter)...'
                : 'Açıklama veya ilave notlar (isteğe bağlı)...'
            }
            className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm font-medium focus:outline-none transition-all ${
              isRed && descLength < 10
                ? 'border-red-400 focus:ring-2 focus:ring-red-400 bg-red-50/30'
                : 'border-slate-300 focus:ring-2 focus:ring-[#0f4c81]'
            }`}
          />
          {isRed && (
            <div className="flex items-center justify-between mt-1 text-xs">
              <span className="text-red-700 font-bold">
                {descLength < 10
                  ? `Lütfen en az ${10 - descLength} karakter daha yazın.`
                  : '✔ Açıklama uzunluğu uygun.'}
              </span>
              <span className={`font-black ${descLength >= 10 ? 'text-emerald-700' : 'text-red-600'}`}>
                {descLength} / 10
              </span>
            </div>
          )}
        </div>

        {/* Proof Photo Capture Area */}
        <div
          className={`p-4 rounded-xl border-2 transition-all ${
            isPhotoRequired && !proofImage
              ? 'bg-red-50/50 border-red-400'
              : proofImage
              ? 'bg-emerald-50/50 border-emerald-400'
              : 'bg-slate-50 border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-slate-700" />
              <span className="text-sm font-black text-slate-800">Kanıt Fotoğrafı</span>
              {isPhotoRequired && (
                <span className="text-[10px] font-black bg-[#b11f2e] text-white px-2 py-0.5 rounded-full uppercase">
                  ZORUNLU
                </span>
              )}
            </div>

            {proofImage && (
              <button
                type="button"
                onClick={() => setProofImageModalOpen(true)}
                className="text-xs font-bold text-sky-700 hover:underline flex items-center gap-1"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Büyüt</span>
              </button>
            )}
          </div>

          {/* Photo Actions & Preview */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <label className="w-full sm:w-auto cursor-pointer">
              <span className="w-full sm:w-auto py-2.5 px-4 bg-[#0f4c81] hover:bg-[#0c3c66] text-white text-sm font-extrabold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2">
                <Upload className="w-4 h-4" />
                <span>{proofImage ? 'Yeniden Çek / Yükle' : 'Fotoğraf Çek / Yükle'}</span>
              </span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageCapture}
                className="hidden"
              />
            </label>

            {proofImage && (
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <img
                  src={proofImage}
                  alt="Önizleme"
                  onClick={() => setProofImageModalOpen(true)}
                  className="w-14 h-14 object-cover rounded-lg border-2 border-emerald-500 shadow-xs cursor-pointer shrink-0"
                />
                <div className="text-xs text-slate-600 min-w-0">
                  <div className="font-bold text-emerald-700 truncate">Fotoğraf eklendi</div>
                  <div className="text-[11px] text-slate-400">
                    {proofImageFile ? `${Math.round(proofImageFile.size / 1024)} KB` : 'Hazır'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* FEATURE 3: AI Visual Defect Inspection Button (gemini-3.1-pro-preview) */}
          {proofImage && (
            <div className="mt-4 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={handleRunAiInspection}
                disabled={aiAnalyzing}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {aiAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Gemini 3.1 Pro Fotoğrafı İnceliyor...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>AI Görsel Kusur & Arıza Tespiti Yap (Gemini 3.1 Pro)</span>
                  </>
                )}
              </button>

              {/* Inspection Results Box */}
              {aiAnalysisResult && (
                <div className="mt-3 p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-950 space-y-2">
                  <div className="flex items-center justify-between font-black text-indigo-900 border-b border-indigo-200/60 pb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <span>Gemini Endüstriyel Analiz Raporu</span>
                    </span>
                    {aiAnalysisVerdict && (
                      <span
                        className={`px-2 py-0.5 rounded-full font-black text-[10px] ${
                          aiAnalysisVerdict === 'RED'
                            ? 'bg-red-600 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        ÖNERİ: {aiAnalysisVerdict}
                      </span>
                    )}
                  </div>
                  <div className="whitespace-pre-line leading-relaxed font-medium">
                    {aiAnalysisResult}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Feedback Message */}
        {saveMessage && (
          <div
            className={`p-3.5 rounded-xl text-sm font-bold ${
              saveMessage.type === 'error'
                ? 'bg-red-50 text-red-800 border border-red-200'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}
          >
            {saveMessage.text}
          </div>
        )}

        {/* Submit Save Button */}
        <button
          type="button"
          onClick={handleSaveControl}
          disabled={saveDisabled}
          className={`w-full py-4 px-6 rounded-xl font-black text-base shadow-md transition-all flex items-center justify-center gap-2 ${
            saveDisabled
              ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
              : 'bg-[#0f4c81] hover:bg-[#0c3c66] text-white'
          }`}
        >
          {saveLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Kaydediliyor...</span>
            </>
          ) : isPhotoRequired && !proofImage ? (
            <span>📷 Önce Kanıt Fotoğrafı Çekiniz</span>
          ) : (
            <span>Kontrolü Kaydet</span>
          )}
        </button>
      </div>

      {/* Lightbox Modal for Reference Image */}
      {refImageModalOpen && selectedTask?.referenceImageUrl && (
        <div
          onClick={() => setRefImageModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center">
            <button
              type="button"
              onClick={() => setRefImageModalOpen(false)}
              className="absolute -top-10 right-0 text-white hover:text-slate-300 p-1"
            >
              <X className="w-7 h-7" />
            </button>
            <img
              src={selectedTask.referenceImageUrl}
              alt="Referans Resim"
              className="max-w-full max-h-[80vh] object-contain rounded-xl bg-slate-900 shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* Lightbox Modal for Proof Image */}
      {proofImageModalOpen && proofImage && (
        <div
          onClick={() => setProofImageModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center">
            <button
              type="button"
              onClick={() => setProofImageModalOpen(false)}
              className="absolute -top-10 right-0 text-white hover:text-slate-300 p-1"
            >
              <X className="w-7 h-7" />
            </button>
            <img
              src={proofImage}
              alt="Kanıt Fotoğrafı"
              className="max-w-full max-h-[80vh] object-contain rounded-xl bg-slate-900 shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
