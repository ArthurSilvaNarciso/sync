// Aplica os efeitos das preferências de acessibilidade no nível do app.
// - Web: alto contraste (filtro), texto grande (zoom), VLibras (Libras).
// - Sincroniza "reduzir movimento" com a config do SISTEMA OPERACIONAL.
// Renderiza null — é só um "driver" de efeitos colaterais.
import { useEffect } from 'react';
import { Platform, AccessibilityInfo } from 'react-native';
import { useAccessibilityStore } from '../store/accessibilityStore';

const CONTRAST_STYLE_ID = 'sync-a11y-contrast';
const CB_DEFS_ID = 'sync-a11y-cb-defs';

// Matrizes feColorMatrix de daltonização (ajudam a distinguir cores).
const CB_MATRIX: Record<string, string> = {
  protanopia: '0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0',
  deuteranopia: '0.625 0.375 0 0 0  0.7 0.3 0 0 0  0 0.3 0.7 0 0  0 0 0 1 0',
  tritanopia: '0.95 0.05 0 0 0  0 0.433 0.567 0 0  0 0.475 0.525 0 0  0 0 0 1 0',
};

// Injeta os filtros SVG uma vez (escondidos) pra usar via filter: url(#id)
function ensureColorBlindDefs() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById(CB_DEFS_ID)) return;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('id', CB_DEFS_ID);
  svg.setAttribute('aria-hidden', 'true');
  svg.style.position = 'absolute';
  svg.style.width = '0';
  svg.style.height = '0';
  let defs = '';
  for (const [name, matrix] of Object.entries(CB_MATRIX)) {
    defs += `<filter id="sync-cb-${name}"><feColorMatrix type="matrix" values="${matrix}"/></filter>`;
  }
  svg.innerHTML = `<defs>${defs}</defs>`;
  document.body.appendChild(svg);
}

function applyWebEffects(opts: { highContrast: boolean; largeText: boolean; colorBlindMode: string }) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const root = document.getElementById('root') || document.body;
  ensureColorBlindDefs();

  // Combina alto contraste + filtro de daltonismo num só `filter`
  const filters: string[] = [];
  if (opts.highContrast) filters.push('contrast(1.25) brightness(1.08) saturate(1.1)');
  if (opts.colorBlindMode && opts.colorBlindMode !== 'off') filters.push(`url(#sync-cb-${opts.colorBlindMode})`);

  let style = document.getElementById(CONTRAST_STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = CONTRAST_STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = filters.length ? `#root, body { filter: ${filters.join(' ')}; }` : '';

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
  const colorBlindMode = useAccessibilityStore((s) => s.colorBlindMode);
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
    applyWebEffects({ highContrast, largeText, colorBlindMode });
  }, [highContrast, largeText, colorBlindMode]);

  useEffect(() => {
    applyLibras(libras);
  }, [libras]);

  return null;
}
