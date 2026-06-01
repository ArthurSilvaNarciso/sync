import { calculateMatchCompatibility } from './matchCompatibility';

describe('calculateMatchCompatibility', () => {
  it('retorna score 0-100 e estrutura completa', () => {
    const r = calculateMatchCompatibility({});
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(['baixa', 'media', 'alta', 'perfeita']).toContain(r.tier);
    expect(typeof r.color).toBe('string');
    expect(Array.isArray(r.reasons)).toBe(true);
    expect(Array.isArray(r.commonSports)).toBe(true);
  });

  it('dá score mais alto quando há mais em comum', () => {
    const baixa = calculateMatchCompatibility({
      meSports: ['corrida'],
      themSports: ['natacao'],
      meLevel: 'beginner',
      themLevel: 'advanced',
    });
    const alta = calculateMatchCompatibility({
      meSports: ['corrida', 'ciclismo'],
      themSports: ['corrida', 'ciclismo'],
      meLevel: 'intermediate',
      themLevel: 'intermediate',
      meObjectives: ['saude'],
      themObjectives: ['saude'],
      meAvailability: ['seg', 'qua'],
      themAvailability: ['seg', 'qua'],
      distanceKm: 2,
    });
    expect(alta.score).toBeGreaterThan(baixa.score);
  });

  it('identifica esportes em comum', () => {
    const r = calculateMatchCompatibility({
      meSports: ['corrida', 'ciclismo', 'natacao'],
      themSports: ['ciclismo', 'natacao', 'futebol'],
    });
    expect(r.commonSports.sort()).toEqual(['ciclismo', 'natacao']);
  });

  it('lida com entradas nulas/vazias sem quebrar', () => {
    expect(() =>
      calculateMatchCompatibility({
        meSports: null,
        themSports: undefined,
        meLevel: null,
        distanceKm: null,
      }),
    ).not.toThrow();
  });

  it('nunca passa de 100 mesmo com tudo em comum', () => {
    const r = calculateMatchCompatibility({
      meSports: ['corrida', 'ciclismo', 'natacao', 'futebol'],
      themSports: ['corrida', 'ciclismo', 'natacao', 'futebol'],
      meLevel: 'advanced',
      themLevel: 'advanced',
      meObjectives: ['competir', 'saude'],
      themObjectives: ['competir', 'saude'],
      meAvailability: ['seg', 'ter', 'qua', 'qui', 'sex'],
      themAvailability: ['seg', 'ter', 'qua', 'qui', 'sex'],
      distanceKm: 0.5,
    });
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.score).toBeGreaterThan(50);
  });
});
