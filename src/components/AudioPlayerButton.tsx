import React, { useState, useRef } from 'react';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';
import { convertTextToSpeech, playWavAudio } from '../services/geminiService';

interface AudioPlayerButtonProps {
  text: string;
  label?: string;
  className?: string;
  size?: 'sm' | 'md';
  speaker?: string;
  style?: string;
}

export const AudioPlayerButton: React.FC<AudioPlayerButtonProps> = ({
  text,
  label = 'Sesli Oku',
  className = '',
  size = 'md',
  speaker = 'Kore',
  style,
}) => {
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (playing && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlaying(false);
      return;
    }

    if (!text?.trim()) return;

    setLoading(true);
    try {
      const res = await convertTextToSpeech(text, speaker, style);
      if (res.audioBase64) {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        const audio = playWavAudio(res.audioBase64);
        audioRef.current = audio;
        setPlaying(true);

        audio.onended = () => {
          setPlaying(false);
        };
        audio.onerror = () => {
          setPlaying(false);
        };
      }
    } catch (err: any) {
      console.error('TTS Playback failed:', err);
      alert(err.message || 'Ses oluşturulamadı.');
      setPlaying(false);
    } finally {
      setLoading(false);
    }
  };

  const isSmall = size === 'sm';

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading || !text?.trim()}
      title={playing ? 'Sesi Durdur' : 'Gemini 3.8 TTS ile Sesli Oku'}
      className={`inline-flex items-center gap-1.5 font-semibold transition-all rounded-lg ${
        isSmall ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'
      } ${
        playing
          ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400 animate-pulse'
          : 'bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200 shadow-xs'
      } disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {loading ? (
        <Loader2 className={`animate-spin ${isSmall ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
      ) : playing ? (
        <VolumeX className={`${isSmall ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-white`} />
      ) : (
        <Volume2 className={`${isSmall ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-sky-700`} />
      )}
      <span>{loading ? 'Ses Hazırlanıyor...' : playing ? 'Durdur' : label}</span>
    </button>
  );
};
