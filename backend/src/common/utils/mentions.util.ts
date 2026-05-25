/**
 * Extrai @usernames de um texto.
 * Aceita username com 3-30 chars, letras/números/underscore/dot.
 * Retorna lista única (sem duplicatas, sem @).
 */
export function extractMentions(text: string): string[] {
  if (!text) return [];
  const regex = /@([a-zA-Z0-9._]{3,30})/g;
  const set = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    set.add(m[1].toLowerCase());
  }
  return Array.from(set);
}

/**
 * Sanitiza username para lookup (lowercase, sem @, sem espaços).
 */
export function normalizeUsername(u: string): string {
  return (u || '').trim().toLowerCase().replace(/^@/, '');
}
