import api from './api';
import { Platform } from 'react-native';

export interface UploadedMedia {
  url: string;
  kind: 'image' | 'audio' | 'video';
  mimeType: string;
  size: number;
}

/**
 * Faz upload de um arquivo local (file:// URI no native, ou Blob/data-uri no web)
 * para o backend via multipart e retorna a URL pública servida em /uploads/media.
 *
 * Substitui o envio de base64 gigante — economiza banda, banco e memória.
 */
export async function uploadMedia(
  fileUri: string,
  opts?: { name?: string; mimeType?: string },
): Promise<UploadedMedia> {
  const form = new FormData();

  if (Platform.OS === 'web') {
    // No web, fileUri costuma ser blob: ou data: — converte pra Blob
    const resp = await fetch(fileUri);
    const blob = await resp.blob();
    const name = opts?.name || `upload-${Date.now()}`;
    form.append('file', blob, name);
  } else {
    // Native: RN aceita { uri, name, type } como parte do multipart
    const name = opts?.name || fileUri.split('/').pop() || `upload-${Date.now()}`;
    const type = opts?.mimeType || guessMime(name);
    form.append('file', { uri: fileUri, name, type } as any);
  }

  const { data } = await api.post<UploadedMedia>('/media/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60_000, // uploads podem demorar em conexões lentas
  });
  return data;
}

function guessMime(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    m4a: 'audio/m4a',
    mp3: 'audio/mpeg',
    aac: 'audio/aac',
    wav: 'audio/wav',
    caf: 'audio/x-caf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
  };
  return map[ext] || 'application/octet-stream';
}
