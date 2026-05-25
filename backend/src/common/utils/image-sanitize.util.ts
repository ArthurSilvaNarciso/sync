import * as fs from 'fs';
import * as path from 'path';

/**
 * Strip EXIF e metadados de uma imagem in-place.
 *
 * - Remove GPS, datetime, info de câmera, etc (privacidade)
 * - Re-encoda mantendo qualidade alta
 * - Limita dimensões máximas (proteção contra bombas de descompressão)
 * - Em caso de erro, mantém o arquivo original sem quebrar o upload
 *
 * Retorna o path final (mesmo path do input) ou o original se falhou.
 */
export async function stripExifInPlace(filePath: string, opts: { maxWidth?: number; maxHeight?: number; quality?: number } = {}): Promise<{ ok: boolean; bytesBefore: number; bytesAfter: number; error?: string }> {
  const maxWidth = opts.maxWidth ?? 2400;
  const maxHeight = opts.maxHeight ?? 2400;
  const quality = opts.quality ?? 88;

  let sharp: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    sharp = require('sharp');
  } catch {
    return { ok: false, bytesBefore: 0, bytesAfter: 0, error: 'sharp not installed' };
  }

  let bytesBefore = 0;
  try {
    bytesBefore = fs.statSync(filePath).size;
  } catch {
    return { ok: false, bytesBefore: 0, bytesAfter: 0, error: 'file not found' };
  }

  const ext = path.extname(filePath).toLowerCase();
  const isGif = ext === '.gif';
  const tmpPath = filePath + '.sanitizing.tmp';

  try {
    let pipeline = sharp(filePath, { animated: isGif, failOn: 'error' });

    // Resize cap (sem upscale)
    pipeline = pipeline.resize({
      width: maxWidth,
      height: maxHeight,
      fit: 'inside',
      withoutEnlargement: true,
    });

    // Re-encoda no formato original SEM metadata (default sharp behavior)
    if (ext === '.png') {
      pipeline = pipeline.png({ compressionLevel: 9, adaptiveFiltering: true });
    } else if (ext === '.webp') {
      pipeline = pipeline.webp({ quality });
    } else if (ext === '.gif') {
      pipeline = pipeline.gif();
    } else {
      // JPEG default
      pipeline = pipeline.jpeg({ quality, mozjpeg: true, progressive: true });
    }

    await pipeline.toFile(tmpPath);

    // Substitui o original
    fs.renameSync(tmpPath, filePath);

    const bytesAfter = fs.statSync(filePath).size;
    return { ok: true, bytesBefore, bytesAfter };
  } catch (err: any) {
    // Limpa tmp se sobrou
    try { fs.unlinkSync(tmpPath); } catch {}
    return { ok: false, bytesBefore, bytesAfter: bytesBefore, error: err?.message || 'sanitize failed' };
  }
}
