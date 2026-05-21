// Paleta de cores oficial do Sync — Dark + Orange (running brand)
export const colors = {
  primary: '#FF6B35',          // laranja principal (brand)
  primaryDark: '#FF4500',      // laranja escuro pra gradient
  primaryLight: '#FF8A5C',     // laranja claro
  darkPurple: '#2B0F5E',       // legado — mantido pra compat
  highlight: '#FFB07A',        // destaque secundário
  blueAccent: '#2E7BFF',       // azul (ciclismo, info)
  deepBlue: '#0D1B3D',         // fundo profundo

  // Dark-first defaults
  background: '#0A0A0F',
  surface: '#1A1A2E',
  surfaceLight: '#252540',
  card: '#1E1E32',
  text: '#F0F0FF',
  secondaryText: '#8E8EA0',
  border: '#2A2A40',
  cardBg: '#1E1E32',

  // Gradiente principal (laranja brand)
  gradient: ['#FF6B35', '#FF4500', '#FF1744'] as const,
  // Gradiente azul (alternativo, ciclismo)
  gradientBlue: ['#2E7BFF', '#5B2EFF', '#8B5CFF'] as const,

  // Auxiliares
  white: '#FFFFFF',
  black: '#000000',
  error: '#FF4D4F',
  success: '#00E676',
  warning: '#FAAD14',
  overlay: 'rgba(0, 0, 0, 0.7)',

  // Match feedback
  likeGreen: '#4ADE80',
  dislikeRed: '#F87171',
  superLikeBlue: '#2E7BFF',

  // Sport colors
  sportColors: {
    running: '#FF6B35',
    cycling: '#2E7BFF',
    swimming: '#00BCD4',
    soccer: '#4CAF50',
    basketball: '#FF9800',
    tennis: '#FFEB3B',
    volleyball: '#9C27B0',
    gym: '#F44336',
    yoga: '#8BC34A',
    hiking: '#795548',
    surfing: '#00ACC1',
    martial_arts: '#E91E63',
  },

  // Level colors
  levelColors: {
    beginner: '#4ADE80',
    intermediate: '#FAAD14',
    advanced: '#F87171',
  },

  // Notification colors
  notificationColors: {
    new_match: '#4ADE80',
    new_message: '#2E7BFF',
    event_reminder: '#FAAD14',
    achievement_unlocked: '#8B5CFF',
    like_received: '#F87171',
    default: '#8E8EA0',
  },

  // Dark theme alias (kept for backwards compat)
  dark: {
    background: '#0A0A0F',
    surface: '#1A1A2E',
    surfaceLight: '#252540',
    card: '#1E1E32',
    text: '#F0F0FF',
    secondaryText: '#8E8EA0',
    border: '#2A2A40',
    accent: '#FF6B35',
    accentLight: '#FF8A5C',
    success: '#00E676',
    mapOverlay: 'rgba(10, 10, 15, 0.85)',
  },
};
