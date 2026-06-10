// Aplica os efeitos das preferências de acessibilidade no nível do app.
// - Web: alto contraste (filtro), texto grande (zoom), VLibras (Libras).
// - Sincroniza "reduzir movimento" com a config do SISTEMA OPERACIONAL.
// Renderiza null — é só um "driver" de efeitos colaterais.
import { useEffect } from 'react';
import { Platform, AccessibilityInfo } from 'react-native';
import { useAccessibilityStore } from '../store/accessibilityStore';

const CONTRAST_STYLE_ID = 'sync-a11y-contrast';

function applyWebEffects(opts: { highContrast: boolean; largeText: boolean }) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const root = document.getElementById('root') || document.body;

  // Alto contraste — filtro global no conteúdo
  let style = document.getElementById(CONTRAST_STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = CONTRAST_STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = opts.highContrast
    ? `#root, body { filter: contrast(1.25) brightness(1.08) saturate(1.1); }`
    : '';

  // Texto grande — zoom do conteúdo (Chromium suporta bem; escala layout junto)
  try {
    (root as HTMLElement).style.zoom = opts.largeText ? '1.15' : '';
  } catch {
    // fallback: transform scale não usado pra não quebrar layout
  }
}

const VLIBRAS_WRAP_ID = 'sync-vlibras-wrap';
const VLIBRAS_SCRIPT_ID = 'sync-vlibras-script';

function applyLibras(enabled: boolean) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const existingWrap = document.getElementById(VLIBRAS_WRAP_ID);

  if (!enabled) {
    existingWrap?.remove();
    return;
  }
  if (existingWrap) return; // já ativo

  // Estrutura exigida pelo plugin VLibras (governo brasileiro — acessibilidade
  // em Língua Brasileira de Sinais).
  const wrap = document.createElement('div');
  wrap.id = VLIBRAS_WRAP_ID;
  wrap.innerHTML = `
    <div vw class="enabled">
      <div vw-access-button class="active"></div>
      <div vw-plugin-wrapper>
        <div class="vw-plugin-top-wrapper"></div>
      </div>
    </div>`;
  document.body.appendChild(wrap);

  const init = () => {
    try {
      // @ts-ignore — VLibras é injetado globalmente pelo script
      if (window.VLibras) new window.VLibras.Widget('https://vlibras.gov.br/app');
    } catch {
      // silencioso
    }
  };

  if (document.getElementById(VLIBRAS_SCRIPT_ID)) {
    init();
    return;
  }
  const script = document.createElement('script');
  script.id = VLIBRAS_SCRIPT_ID;
  script.src = 'https://vlibras.gov.br/app/vlibras-plugin.js';
  script.async = true;
  script.onload = init;
  document.body.appendChild(script);
}

export default function AccessibilityEffects() {
  const highContrast = useAccessibilityStore((s) => s.highContrast);
  const largeText = useAccessibilityStore((s) => s.largeText);
  const libras = useAccessibilityStore((s) => s.libras);
  const hydrate = useAccessibilityStore((s) => s.hydrate);
  const setStore = useAccessibilityStore((s) => s.set);

  // Carrega preferências salvas + sincroniza reduce-motion do SO uma vez
  useEffect(() => {
    hydrate();
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((osReduce) => {
        if (osReduce) setStore({ reduceMotion: true });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    applyWebEffects({ highContrast, largeText });
  }, [highContrast, largeText]);

  useEffect(() => {
    applyLibras(libras);
  }, [libras]);

  return null;
}
