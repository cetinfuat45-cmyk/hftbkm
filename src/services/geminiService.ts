export interface TtsResponse {
  success: boolean;
  audioBase64?: string;
  mimeType?: string;
  message?: string;
}

export interface SearchGroundingResponse {
  success: boolean;
  text?: string;
  sources?: Array<{ title: string; url: string }>;
  message?: string;
}

export interface ImageAnalysisResponse {
  success: boolean;
  analysis?: string;
  verdict?: 'UYGUN' | 'RED';
  message?: string;
}

/**
 * Call gemini-3.8-flash-tts via server proxy
 */
export async function convertTextToSpeech(
  text: string,
  speaker: string = 'Kore',
  style?: string
): Promise<TtsResponse> {
  const res = await fetch('/api/gemini/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, speaker, style }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Seslendirme oluşturulamadı.');
  }
  return data;
}

/**
 * Call gemini-3.5-flash with googleSearch tool via server proxy
 */
export async function searchIndustrialGrounding(
  query: string,
  machineContext?: any
): Promise<SearchGroundingResponse> {
  const res = await fetch('/api/gemini/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, machineContext }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Teknik arama gerçekleştirilemedi.');
  }
  return data;
}

/**
 * Call gemini-3.1-pro-preview to analyze inspection photo
 */
export async function analyzeMaintenancePhoto(
  imageBase64: string,
  options?: {
    mimeType?: string;
    prompt?: string;
    taskName?: string;
    machineName?: string;
  }
): Promise<ImageAnalysisResponse> {
  const res = await fetch('/api/gemini/analyze-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64,
      mimeType: options?.mimeType || 'image/jpeg',
      prompt: options?.prompt,
      taskName: options?.taskName,
      machineName: options?.machineName,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Fotoğraf analizi başarısız oldu.');
  }
  return data;
}

/**
 * Play base64 WAV audio in browser
 */
export function playWavAudio(base64Audio: string): HTMLAudioElement {
  const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
  audio.play();
  return audio;
}
