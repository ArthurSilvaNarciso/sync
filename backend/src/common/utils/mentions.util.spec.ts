import { extractMentions, normalizeUsername } from './mentions.util';

describe('mentions.util', () => {
  describe('extractMentions', () => {
    it('returns empty array for empty/null text', () => {
      expect(extractMentions('')).toEqual([]);
      expect(extractMentions(null as any)).toEqual([]);
      expect(extractMentions(undefined as any)).toEqual([]);
    });

    it('returns empty array for text without mentions', () => {
      expect(extractMentions('Treino top hoje')).toEqual([]);
      expect(extractMentions('email@dominio.com (não é mention)')).toEqual([]);
    });

    it('extracts single mention', () => {
      expect(extractMentions('@joao bom treino!')).toEqual(['joao']);
    });

    it('extracts multiple mentions and dedupes', () => {
      expect(extractMentions('@maria e @pedro junto com @maria')).toEqual(['maria', 'pedro']);
    });

    it('lowercases all mentions', () => {
      expect(extractMentions('@ANA muito bom')).toEqual(['ana']);
      expect(extractMentions('@PedroH treino')).toEqual(['pedroh']);
    });

    it('skips non-ASCII chars (limitacao conhecida do regex)', () => {
      // Regex ASCII-only — usernames com ç/ã/é não são reconhecidos.
      // Username "João" não vira mention; "joao" (sem acento) sim.
      expect(extractMentions('@João bom dia')).toEqual([]);
    });

    it('respects minimum length of 3', () => {
      expect(extractMentions('@ab muito curto')).toEqual([]);
      expect(extractMentions('@abc ok')).toEqual(['abc']);
    });

    it('respects maximum length of 30', () => {
      const long = 'a'.repeat(31);
      expect(extractMentions(`@${long}`)).toEqual([]);
    });

    it('allows underscore and dot', () => {
      expect(extractMentions('@user_name e @user.name')).toEqual(['user_name', 'user.name']);
    });
  });

  describe('normalizeUsername', () => {
    it('strips @ and lowercases', () => {
      expect(normalizeUsername('@User')).toBe('user');
      expect(normalizeUsername('Foo')).toBe('foo');
      expect(normalizeUsername('  @joao  ')).toBe('joao');
    });

    it('handles null/empty safely', () => {
      expect(normalizeUsername('')).toBe('');
      expect(normalizeUsername(null as any)).toBe('');
    });
  });
});
