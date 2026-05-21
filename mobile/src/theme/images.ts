// Banco curado de imagens — Unsplash com paleta dark + laranja.
// Todas as URLs são estáveis e otimizadas (auto format + crop).

const u = (id: string, w = 1200) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

// Heros de tela inteira / cover (9:16 ou 4:5)
export const heroImages = {
  runnerSunrise: u('1571008887538-b36bb32f4571'),   // corredor amanhecer
  trailNature: u('1486218119243-13883505764c'),     // trilha natureza
  cityGroup: u('1552674605-db6ffd4facb5'),          // grupo correndo cidade
  runnerCity: u('1518611012118-696072aa579a'),      // corredor urbano
  cyclistSunset: u('1517649763962-0c623066013b'),   // ciclista entardecer
  mountainTrail: u('1530143584546-02191bc84eb5'),   // trilha montanha
  shoes: u('1483721310020-03333e577078'),           // tênis close-up
  victory: u('1551632811-561732d1e306'),            // braços abertos vitória
};

// Cards / thumbs por esporte (quadrado)
export const sportImages: Record<string, string> = {
  running: u('1486218119243-13883505764c', 600),
  cycling: u('1517649763962-0c623066013b', 600),
  swimming: u('1530549387789-4c1017266635', 600),
  football: u('1551958219-acbc608c6377', 600),
  basketball: u('1546519638-68e109498ffc', 600),
  tennis: u('1622279457486-62dcc4a431d6', 600),
  yoga: u('1545205597-3d9d02c29597', 600),
  gym: u('1534438327276-14e5300c3a48', 600),
  hiking: u('1551632811-561732d1e306', 600),
  crossfit: u('1571019613454-1cb2f99b2d8b', 600),
  martial_arts: u('1555597673-b21d5c935865', 600),
  volleyball: u('1592656094267-764a45160876', 600),
  dance: u('1508807526345-15e9b5f4eaff', 600),
};

// Padrão quando não tem foto
export const sportDefault = u('1571019613454-1cb2f99b2d8b', 600);

// Empty states (subtis, low-saturation pra serem pano de fundo)
export const emptyImages = {
  noEvents: u('1601971943370-cd1fc73e2bc1', 800),
  noMatches: u('1574680096145-d05b474e2155', 800),
  noActivities: u('1502810190503-8303352d0dd1', 800),
};

// Banner de eventos (16:9, com pessoas em ação)
export const bannerImages = {
  community: u('1552674605-db6ffd4facb5', 1400),
  pace: u('1571902943202-507ec2618e8f', 1400),
  trail: u('1486218119243-13883505764c', 1400),
};

export const getSportImage = (sport?: string) =>
  (sport && sportImages[sport]) || sportDefault;
