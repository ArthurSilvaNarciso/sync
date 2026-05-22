// Copia arquivos estáticos da pasta public/ para dist/ após o build do Expo.
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

try {
  copyRecursive(src, dst);
  console.log('[postbuild] done');
} catch (e) {
  console.warn('[postbuild] error:', e.message);
  // Não falha o build se a copia falhar
}
