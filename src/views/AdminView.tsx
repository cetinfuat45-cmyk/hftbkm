import React, { useState } from 'react';
import { MaintenanceTemplate, Machine, DEPARTMENTS } from '../types/cmms';
import { cmmsApi } from '../services/cmmsApi';
import {
  Settings,
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  Upload,
  Camera,
  Search,
  Check,
  X,
  Loader2,
} from 'lucide-react';

interface AdminViewProps {
  machines: Machine[];
  templates: MaintenanceTemplate[];
  onTemplatesUpdated: () => void;
  onNavigateHome: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  machines,
  templates,
  onTemplatesUpdated,
  onNavigateHome,
}) => {
  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [machineId, setMachineId] = useState('');
  const [region, setRegion] = useState('');
  const [system, setSystem] = useState('');
  const [part, setPart] = useState('');
  const [task, setTask] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [orderNo, setOrderNo] = useState(1);
  const [photoRequired, setPhotoRequired] = useState(false);
  const [active, setActive] = useState(true);
  const [refImageBase64, setRefImageBase64] = useState<string | null>(null);

  // Search & Collapsible groups
  const [filterQuery, setFilterQuery] = useState('');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Group templates by machine
  const groupedTemplates: Record<string, MaintenanceTemplate[]> = {};
  templates.forEach((t) => {
    const key = t.machineName || t.machineId;
    if (!groupedTemplates[key]) {
      groupedTemplates[key] = [];
    }
    groupedTemplates[key].push(t);
  });

  const handleToggleGroup = (machineName: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [machineName]: !prev[machineName],
    }));
  };

  const handleToggleAll = (open: boolean) => {
    const newState: Record<string, boolean> = {};
    Object.keys(groupedTemplates).forEach((k) => {
      newState[k] = open;
    });
    setOpenGroups(newState);
  };

  const handleStartEdit = (t: MaintenanceTemplate) => {
    setEditingId(t.templateId);
    setMachineId(t.machineId);
    setRegion(t.region || '');
    setSystem(t.system || '');
    setPart(t.part || '');
    setTask(t.task);
    setTargetValue(t.targetValue || '');
    setOrderNo(t.orderNo || 1);
    setPhotoRequired(Boolean(t.photoRequired));
    setActive(Boolean(t.active));
    setRefImageBase64(t.referenceImageUrl || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setMachineId('');
    setRegion('');
    setSystem('');
    setPart('');
    setTask('');
    setTargetValue('');
    setOrderNo(1);
    setPhotoRequired(false);
    setActive(true);
    setRefImageBase64(null);
    setStatusMessage(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setRefImageBase64(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!machineId) {
      setStatusMessage({ type: 'error', text: 'Lütfen bir makine seçiniz.' });
      return;
    }
    if (!task.trim()) {
      setStatusMessage({ type: 'error', text: 'Yapılacak bakım açıklaması zorunludur.' });
      return;
    }
    if (!system) {
      setStatusMessage({ type: 'error', text: 'Lütfen bakımı yapacak birimi seçiniz.' });
      return;
    }

    setSaveLoading(true);
    setStatusMessage(null);

    try {
      const res = await cmmsApi.saveTemplate({
        templateId: editingId || '',
        machineId,
        region: region.trim(),
        system,
        part: part.trim(),
        task: task.trim(),
        targetValue: targetValue.trim(),
        orderNo: Number(orderNo) || 1,
        photoRequired,
        active,
        referenceImageUrl: refImageBase64 || undefined,
      });

      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: editingId ? 'Bakım tanımı güncellendi.' : 'Yeni bakım tanımı kaydedildi.',
        });
        onTemplatesUpdated();
        handleCancelEdit();
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Kayıt sırasında hata oluştu.' });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async (templateId: string, taskTitle: string) => {
    if (!confirm(`Bu bakım tanımı silinecektir:\n\n${taskTitle}\n\nOnaylıyor musunuz?`)) {
      return;
    }

    try {
      await cmmsApi.deleteTemplate(templateId);
      onTemplatesUpdated();
    } catch (err: any) {
      alert(`Silinemedi: ${err.message}`);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#0f2d4d]">
              Admin Bakım Tanımı Paneli
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Haftalık kontrol listesini düzenleyin, yeni maddeler ve birim standartları ekleyin.
          </p>
        </div>
      </div>

      {/* Form Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-lg font-black text-[#0f2d4d] border-b border-slate-100 pb-3 flex items-center gap-2">
          <Plus className="w-5 h-5 text-[#0f4c81]" />
          <span>{editingId ? 'Bakım Tanımını Düzenle' : 'Yeni Bakım Tanımı Ekle'}</span>
        </h3>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Makine Seçimi *</label>
              <select
                value={machineId}
                onChange={(e) => setMachineId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0f4c81]"
              >
                <option value="">Makine seçiniz...</option>
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.machineName} ({m.costCenter || m.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Bakımı Yapan Birim *</label>
              <select
                value={system}
                onChange={(e) => setSystem(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0f4c81]"
              >
                <option value="">Birim seçiniz...</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d.kod} value={d.deger}>
                    {d.ad}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Bölge (Ünite / Bölüm)</label>
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="Örn: Besleme Ünitesi, Fırın Girişi"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Parça / Ekipman</label>
              <input
                type="text"
                value={part}
                onChange={(e) => setPart(e.target.value)}
                placeholder="Örn: Rulman, Basınç Valfi, Servo Motor"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Yapılacak Bakım Görevi *</label>
              <textarea
                value={task}
                onChange={(e) => setTask(e.target.value)}
                required
                rows={2}
                placeholder="Operatörün sahada uygulayacağı kontrol talimatı..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">İstenen Değer / Tolerans</label>
              <input
                type="text"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder="Örn: 210 bar ± 5 bar, 8.2mm, Max 55°C"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Sıra No</label>
              <input
                type="number"
                min={1}
                value={orderNo}
                onChange={(e) => setOrderNo(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium"
              />
            </div>
          </div>

          {/* Reference Image Upload & Preview */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <label className="block text-xs font-bold text-slate-700 mb-2">Referans Resim (Teknik Şema)</label>
            <div className="flex flex-wrap items-center gap-4">
              <label className="cursor-pointer">
                <span className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold text-xs flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  <span>Resim Dosyası Seç</span>
                </span>
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>

              {refImageBase64 && (
                <div className="flex items-center gap-2">
                  <img
                    src={refImageBase64}
                    alt="Referans Önizleme"
                    className="w-16 h-12 object-cover rounded-lg border border-slate-300 shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setRefImageBase64(null)}
                    className="text-xs text-red-600 font-bold hover:underline"
                  >
                    Kaldır
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Checkbox Options */}
          <div className="flex flex-wrap items-center gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-800">
              <input
                type="checkbox"
                checked={photoRequired}
                onChange={(e) => setPhotoRequired(e.target.checked)}
                className="w-4 h-4 rounded text-[#0f4c81] focus:ring-[#0f4c81]"
              />
              <span>Operatörden kanıt fotoğrafı zorunlu tutulsun</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-800">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="w-4 h-4 rounded text-[#0f4c81] focus:ring-[#0f4c81]"
              />
              <span>Aktif</span>
            </label>
          </div>

          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs font-bold ${
                statusMessage.type === 'error'
                  ? 'bg-red-50 text-red-800 border border-red-200'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              }`}
            >
              {statusMessage.text}
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="submit"
              disabled={saveLoading}
              className="py-3 px-6 bg-[#0f4c81] hover:bg-[#0c3c66] text-white font-extrabold rounded-xl text-sm shadow-md transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {saveLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Kaydediliyor...</span>
                </>
              ) : (
                <span>{editingId ? 'Değişiklikleri Kaydet' : 'Bakım Tanımını Kaydet'}</span>
              )}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="py-3 px-4 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-sm"
              >
                Vazgeç
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Existing Templates Section with Collapsible Machine Groups */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-lg font-black text-[#0f2d4d]">Kayıtlı Bakım Tanımları</h3>
            <span className="text-xs text-slate-500 font-semibold">{templates.length} toplam bakım maddesi</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleToggleAll(true)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
            >
              Tümünü Aç
            </button>
            <button
              type="button"
              onClick={() => handleToggleAll(false)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
            >
              Tümünü Kapat
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Makine veya bakım arayın..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        {/* Collapsible Groups */}
        <div className="space-y-3">
          {Object.keys(groupedTemplates).map((machineName) => {
            const groupTasks = groupedTemplates[machineName].filter((t) => {
              if (!filterQuery) return true;
              return (
                t.task.toLowerCase().includes(filterQuery.toLowerCase()) ||
                machineName.toLowerCase().includes(filterQuery.toLowerCase())
              );
            });

            if (groupTasks.length === 0) return null;
            const isOpen = openGroups[machineName] ?? true;

            return (
              <div key={machineName} className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                {/* Accordion Header */}
                <button
                  type="button"
                  onClick={() => handleToggleGroup(machineName)}
                  className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-200/80 transition-colors flex items-center justify-between text-left font-black text-sm text-[#0f2d4d]"
                >
                  <div className="flex items-center gap-2">
                    {isOpen ? <ChevronDown className="w-4 h-4 text-[#0f4c81]" /> : <ChevronRight className="w-4 h-4 text-[#0f4c81]" />}
                    <span>{machineName}</span>
                  </div>
                  <span className="text-xs bg-white text-[#0f4c81] px-2.5 py-0.5 rounded-full border border-slate-200 font-extrabold">
                    {groupTasks.length} bakım
                  </span>
                </button>

                {/* Accordion Body */}
                {isOpen && (
                  <div className="divide-y divide-slate-100 bg-white">
                    {groupTasks.map((t, idx) => (
                      <div key={t.templateId} className="p-3.5 flex items-start justify-between gap-3 hover:bg-slate-50">
                        <div className="space-y-1 min-w-0">
                          <div className="font-extrabold text-sm text-slate-900 leading-snug">
                            {idx + 1}. {t.task}
                          </div>
                          <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                            <span>Birim: <b>{t.system || '-'}</b></span>
                            <span>Bölge: <b>{t.region || '-'}</b></span>
                            {t.targetValue && <span>İstenen: <b>{t.targetValue}</b></span>}
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                              {t.active ? 'Aktif' : 'Pasif'}
                            </span>
                            {t.photoRequired && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                                Fotoğraf zorunlu
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(t)}
                            className="p-1.5 text-sky-700 hover:bg-sky-50 rounded-lg"
                            title="Düzenle"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(t.templateId, t.task)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
