// Copia arquivos estáticos da pasta public/ para dist/ após o build do Expo.
// Também corrige o index.html gerado pelo Expo para incluir as tags PWA
// (manifest, meta theme-color, Apple Web App, favicon e title correto).
// Cross-platform (não usa cp/shell), funciona em Vercel (Linux) e Windows local.
const fs = require('fs');
const path = require('path');

const src = path.resolve(__dirname, '..', 'public');
const dst = path.resolve(__dirname, '..', 'dist');

function copyRecursive(from, to) {
  if (!fs.existsSync(from)) return;
  const stat = fs.statSync(from);
  if (stat.isDirectory()) {
    if (!fs.existsSync(to)) fs.mkdirSync(to, { recursive: true });
    for (const entry of fs.readdirSync(from)) {
      copyRecursive(path.join(from, entry), path.join(to, entry));
    }
  } else {
    fs.copyFileSync(from, to);
    console.log('[postbuild] copied', path.relative(process.cwd(), to));
  }
}

// ─── Inject PWA meta tags into index.html ───────────────────────────────────
function patchIndexHtml() {
  const indexPath = path.join(dst, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.warn('[postbuild] index.html not found, skipping PWA patch');
    return;
  }

  let html = fs.readFileSync(indexPath, 'utf8');

  // Tags to inject (only if not already present)
  const pwaTags = `
    <!-- PWA: manifest & icons injected by postbuild.js -->
    <link rel="manifest" href="/manifest.json" />
    <meta name="theme-color" content="#4A0E2C" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Sync" />
    <link rel="apple-touch-icon" href="/icon-512.png" />
    <link rel="apple-touch-icon" sizes="192x192" href="/icon-192.png" />
    <link rel="icon" type="image/png" sizes="512x512" href="/favicon.png" />
    <link rel="shortcut icon" href="/favicon.png" />`;

  // Only inject once
  if (!html.includes('rel="manifest"')) {
    html = html.replace('</head>', pwaTags + '\n  </head>');
    console.log('[postbuild] injected PWA meta tags into index.html');
  }

  // Fix the title — always "Sync", never screen-level names like "Welcome"
  html = html.replace(/<title>[^<]*<\/title>/, '<title>Sync</title>');
  console.log('[postbuild] set <title>Sync</title>');

  fs.writeFileSync(indexPath, html, 'utf8');
}

// ── main ─────────────────────────────────────────────────────────────────────
try {
  copyRecursive(src, dst);
  patchIndexHtml();
  console.log('[postbuild] done');
} catch (e) {
  console.warn('[postbuild] error:', e.message);
  // Não falha o build se a cópia/patch falhar
}
