// Audio Coach — anúncios de voz durante treino.
// Web: Web Speech API (free, sem deps).
// Native: usa expo-speech se instalado; senão silencia gracefully.
import { Platform } from 'react-native';

let enabled = true;
let lang = 'pt-BR';
let voiceRate = 1;

export function setCoachEnabled(v: boolean) { enabled = v; }
export function getCoachEnabled() { return enabled; }
export function setCoachLang(l: string) { lang = l; }
export function setCoachRate(r: number) { voiceRate = Math.max(0.5, Math.min(2, r)); }

export async function speak(text: string): Promise<void> {
  if (!enabled) return;
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      // Cancela falas anteriores pra evitar fila
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang;
      u.rate = voiceRate;
      u.pitch = 1;
      u.volume = 1;
      window.speechSynthesis.speak(u);
    } catch {}
    return;
  }
  // Native: tenta importar expo-speech dinamicamente
  try {
    const Speech = await import('expo-speech' as any).catch(() => null);
    if (Speech && Speech.speak) {
      Speech.speak(text, { language: lang, rate: voiceRate });
    }
  } catch {}
}

/** Anúncios padronizados durante o treino. */
export const announce = {
  start: () => speak('Treino iniciado. Vamos lá!'),
  pause: () => speak('Treino pausado.'),
  resume: () => speak('Retomando treino.'),
  finish: (km: number, minutes: number) =>
    speak(`Treino finalizado. ${km.toFixed(2)} quilômetros em ${Math.round(minutes)} minutos. Excelente!`),
  km: (km: number, paceStr: string) =>
    speak(`${km} quilômetro${km > 1 ? 's' : ''}. Ritmo médio ${paceStr} por quilômetro.`),
  halfway: (totalKm: number) =>
    speak(`Você passou da metade. Faltam ${(totalKm / 2).toFixed(1)} quilômetros.`),
  motivation: () => {
    const phrases = [
      'Você está indo muito bem, continue!',
      'Foco no ritmo. Respiração tranquila.',
      'Mantém a postura. Você consegue!',
      'Cada passo conta. Vai com tudo!',
      'Lembra do seu objetivo. Não desiste agora.',
    ];
    speak(phrases[Math.floor(Math.random() * phrases.length)]);
  },
  paceZone: (zone: number) => {
    const names = ['', 'recuperação', 'aeróbico leve', 'aeróbico forte', 'limiar', 'VO2 máximo'];
    if (zone >= 1 && zone <= 5) speak(`Zona ${zone}, ${names[zone]}.`);
  },
};
