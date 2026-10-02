import React, { useState } from 'react';
import { searchIndustrialGrounding } from '../services/geminiService';
import { AudioPlayerButton } from '../components/AudioPlayerButton';
import { Machine } from '../types/cmms';
import {
  Sparkles,
  Search,
  ExternalLink,
  BookOpen,
  HelpCircle,
  Loader2,
  Wrench,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface AiAssistantViewProps {
  machines: Machine[];
  onNavigateHome: () => void;
}

export const AiAssistantView: React.FC<AiAssistantViewProps> = ({ machines }) => {
  const [query, setQuery] = useState('');
  const [selectedMachineContext, setSelectedMachineContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [responseResult, setResponseResult] = useState<{
    text: string;
    sources: Array<{ title: string; url: string }>;
  } | null>(null);

  const samplePrompts = [
    'Radyatör peteklerinde mikro sızıntı ve helyum kaçak kontrolü nasıl yapılır?',
    'Nocolok alüminyum lehimleme fırınında azot (N2) ve O2 limitleri nelerdir?',
    'Hidrolik preslerde yağ köpürmesi, kavitasyon ve aşırı ısınma nedenleri',
    'Elektrik panosu termal kamera kontrolü ISO 18434 standart sınır değerleri',
    'Fin Mill petek kıvırma bıçaklarında çapak oluşumu ve tolerans ayarı',
  ];

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setResponseResult(null);

    const m = machines.find((mac) => mac.id === selectedMachineContext);

    try {
      const res = await searchIndustrialGrounding(searchQuery, m);
      if (res.success && res.text) {
        setResponseResult({
          text: res.text,
          sources: res.sources || [],
        });
      }
    } catch (err: any) {
      alert(err.message || 'Arama yapılamadı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-[#0f4c81] text-white p-6 sm:p-8 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 rounded-full text-xs font-bold text-indigo-200 mb-3 backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Gemini 3.5 Flash & Canlı Google Search Grounding</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">
            AKG Teknik Kılavuz & Arıza Danışmanı
          </h2>
          <p className="text-indigo-100 text-xs sm:text-sm leading-relaxed">
            Endüstriyel radyatör ve soğutucu ekipmanlarının bakımı, arıza kodları, hidrolik-pnömatik parametreler ve uluslararası standartlar (ISO, DIN, CE) hakkında anında güncel Google verisiyle arama yapın.
          </p>
        </div>

        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Query Form */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            İlgili Makine / Ekipman (İsteğe Bağlı)
          </label>
          <select
            value={selectedMachineContext}
            onChange={(e) => setSelectedMachineContext(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            <option value="">Genel Fabrika Ekipmanı / Radyatör Standardı</option>
            {machines.map((m) => (
              <option key={m.id} value={m.id}>
                {m.machineName} ({m.costCenter || m.id})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Teknik Sorunuz veya Arıza Belirtisi *
          </label>
          <div className="relative">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={3}
              placeholder="Örn: 250 ton hidrolik preste basınç aniden 140 bara düşüyor, oransal valf ve filtre kontrolü için adımlar nelerdir?"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => handleSearch(query)}
            disabled={loading || !query.trim()}
            className="w-full sm:w-auto py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Google Arama Verileri İnceleniyor...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Google Search ile Yanıtla</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Sample Prompts */}
        <div className="pt-3 border-t border-slate-100">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Örnek Teknik Sorular:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {samplePrompts.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setQuery(p);
                  handleSearch(p);
                }}
                className="text-xs font-semibold px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-900 hover:border-indigo-300 text-slate-700 rounded-xl border border-slate-200 transition-all text-left"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Answer Output */}
      {responseResult && (
        <div className="bg-white p-6 rounded-2xl border border-indigo-200 shadow-md space-y-4 animate-in fade-in duration-300">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                Teknik Analiz ve Çözüm Adımları
              </h3>
            </div>

            {/* Read aloud with TTS */}
            <AudioPlayerButton
              text={responseResult.text}
              label="Yanıtı Sesli Oku (TTS)"
              size="sm"
              className="bg-indigo-50 text-indigo-800 border-indigo-200"
            />
          </div>

          <div className="prose prose-slate max-w-none text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-medium">
            {responseResult.text}
          </div>

          {/* Web Sources / Grounding Citations */}
          {responseResult.sources.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-100">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                <span>Google Arama Doğrulama Kaynakları:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {responseResult.sources.map((src, i) => (
                  <a
                    key={i}
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-slate-50 hover:bg-sky-50 text-sky-700 rounded-lg border border-slate-200 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>{src.title || 'Kaynak Bağlantısı'}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
