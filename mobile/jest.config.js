// Jest leve só para LÓGICA PURA (utils sem imports de React Native).
// Não usa jest-expo — evita o overhead de mockar módulos nativos.
// Componentes/telas (que importam RN) não são cobertos aqui de propósito.
/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  // Só roda arquivos *.test.ts (convenção desta suíte de lógica pura).
  // Specs de componentes usariam *.spec.tsx + jest-expo, fora deste escopo.
  testMatch: ['**/src/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { isolatedModules: true }],
  },
};
