/**
 * External API integrations for SYNC
 * Free, no-key-required APIs for weather, quotes, geocoding, and sports news
 */

// ============ OPEN-METEO WEATHER API (free, no key) ============

export interface WeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  weatherDescription: string;
  weatherIcon: string;
  isDay: boolean;
  uvIndex: number;
  precipitation: number;
  isGoodForExercise: boolean;
}

export interface ForecastDay {
  date: string;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
  weatherDescription: string;
  weatherIcon: string;
  precipitationSum: number;
  windSpeedMax: number;
  uvIndexMax: number;
}

const WMO_CODES: Record<number, { description: string; icon: string }> = {
  0: { description: 'Ceu limpo', icon: 'sunny' },
  1: { description: 'Quase limpo', icon: 'sunny' },
  2: { description: 'Parcialmente nublado', icon: 'partly-sunny' },
  3: { description: 'Nublado', icon: 'cloudy' },
  45: { description: 'Neblina', icon: 'cloudy' },
  48: { description: 'Neblina gelada', icon: 'cloudy' },
  51: { description: 'Garoa leve', icon: 'rainy' },
  53: { description: 'Garoa moderada', icon: 'rainy' },
  55: { description: 'Garoa forte', icon: 'rainy' },
  61: { description: 'Chuva leve', icon: 'rainy' },
  63: { description: 'Chuva moderada', icon: 'rainy' },
  65: { description: 'Chuva forte', icon: 'thunderstorm' },
  71: { description: 'Neve leve', icon: 'snow' },
  73: { description: 'Neve moderada', icon: 'snow' },
  75: { description: 'Neve forte', icon: 'snow' },
  80: { description: 'Pancadas leves', icon: 'rainy' },
  81: { description: 'Pancadas moderadas', icon: 'rainy' },
  82: { description: 'Pancadas fortes', icon: 'thunderstorm' },
  95: { description: 'Tempestade', icon: 'thunderstorm' },
  96: { description: 'Tempestade com granizo', icon: 'thunderstorm' },
  99: { description: 'Tempestade severa', icon: 'thunderstorm' },
};

function getWeatherInfo(code: number) {
  return WMO_CODES[code] || { description: 'Desconhecido', icon: 'cloudy' };
}

function isGoodForExercise(code: number, temp: number, windSpeed: number): boolean {
  const badCodes = [65, 75, 82, 95, 96, 99];
  if (badCodes.includes(code)) return false;
  if (temp < 5 || temp > 40) return false;
  if (windSpeed > 50) return false;
  return true;
}

export async function fetchCurrentWeather(lat: number, lng: number): Promise<WeatherData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,is_day,uv_index&timezone=auto`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('Weather API failed');
  const data = await res.json();
  const c = data.current;
  const info = getWeatherInfo(c.weather_code);

  return {
    temperature: Math.round(c.temperature_2m),
    feelsLike: Math.round(c.apparent_temperature),
    humidity: c.relative_humidity_2m,
    windSpeed: Math.round(c.wind_speed_10m),
    weatherCode: c.weather_code,
    weatherDescription: info.description,
    weatherIcon: info.icon,
    isDay: c.is_day === 1,
    uvIndex: c.uv_index,
    precipitation: c.precipitation,
    isGoodForExercise: isGoodForExercise(c.weather_code, c.temperature_2m, c.wind_speed_10m),
  };
}

export async function fetchWeatherForecast(lat: number, lng: number, days = 7): Promise<ForecastDay[]> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum,wind_speed_10m_max,uv_index_max&timezone=auto&forecast_days=${days}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('Forecast API failed');
  const data = await res.json();
  const daily = data.daily;

  return daily.time.map((date: string, i: number) => {
    const info = getWeatherInfo(daily.weather_code[i]);
    return {
      date,
      tempMax: Math.round(daily.temperature_2m_max[i]),
      tempMin: Math.round(daily.temperature_2m_min[i]),
      weatherCode: daily.weather_code[i],
      weatherDescription: info.description,
      weatherIcon: info.icon,
      precipitationSum: daily.precipitation_sum[i],
      windSpeedMax: Math.round(daily.wind_speed_10m_max[i]),
      uvIndexMax: daily.uv_index_max[i],
    };
  });
}

// ============ REVERSE GEOCODING (Nominatim - free) ============

export interface GeocodingResult {
  city: string;
  state: string;
  country: string;
  displayName: string;
  neighborhood?: string;
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeocodingResult> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'SyncApp/1.0' },
  });
  if (!res.ok) throw new Error('Geocoding failed');
  const data = await res.json();
  const addr = data.address || {};

  return {
    city: addr.city || addr.town || addr.village || addr.municipality || '',
    state: addr.state || '',
    country: addr.country || '',
    displayName: data.display_name || '',
    neighborhood: addr.suburb || addr.neighbourhood || '',
  };
}

export async function searchAddress(query: string): Promise<Array<{
  displayName: string;
  lat: number;
  lng: number;
}>> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'SyncApp/1.0' },
  });
  if (!res.ok) throw new Error('Search failed');
  const data = await res.json();

  return data.map((item: any) => ({
    displayName: item.display_name,
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
  }));
}

// ============ MOTIVATIONAL QUOTES API ============

export interface MotivationalQuote {
  text: string;
  author: string;
}

const FALLBACK_QUOTES: MotivationalQuote[] = [
  { text: 'O corpo alcanca o que a mente acredita.', author: 'Napoleon Hill' },
  { text: 'Cada passo conta. Continue em frente.', author: 'Desconhecido' },
  { text: 'A dor que voce sente hoje sera a forca que voce sentira amanha.', author: 'Arnold Schwarzenegger' },
  { text: 'Nao espere por oportunidades. Crie-as.', author: 'George Bernard Shaw' },
  { text: 'O unico treino ruim e aquele que nao aconteceu.', author: 'Desconhecido' },
  { text: 'Motivacao te faz comecar. Habito te faz continuar.', author: 'Jim Ryun' },
  { text: 'Voce e mais forte do que pensa.', author: 'Desconhecido' },
  { text: 'Limite e apenas um conceito. Se ultrapassar, voce descobre o infinito.', author: 'Bruce Lee' },
  { text: 'A excelencia nao e um ato, mas um habito.', author: 'Aristoteles' },
  { text: 'Quem treina junto, cresce junto.', author: 'Sync' },
  { text: 'A unica corrida que voce perde e aquela que nao corre.', author: 'Desconhecido' },
  { text: 'Disciplina e a ponte entre metas e conquistas.', author: 'Jim Rohn' },
];

export function getRandomQuote(): MotivationalQuote {
  const index = Math.floor(Math.random() * FALLBACK_QUOTES.length);
  return FALLBACK_QUOTES[index];
}

export async function fetchMotivationalQuote(): Promise<MotivationalQuote> {
  try {
    const res = await fetch('https://api.quotable.io/random?tags=motivational|inspirational', {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      return { text: data.content, author: data.author };
    }
  } catch {
    // Fall through to local quotes
  }
  return getRandomQuote();
}

// ============ EXERCISE RECOMMENDATION ENGINE ============

export interface ExerciseRecommendation {
  score: number; // 0-100
  level: 'excelente' | 'bom' | 'moderado' | 'ruim';
  color: string;
  message: string;
  bestActivities: string[];
  tips: string[];
}

export function getExerciseRecommendation(weather: WeatherData): ExerciseRecommendation {
  let score = 100;
  const tips: string[] = [];
  const bestActivities: string[] = [];

  // Temperature scoring
  if (weather.temperature >= 18 && weather.temperature <= 28) {
    score -= 0;
  } else if (weather.temperature >= 10 && weather.temperature < 18) {
    score -= 10;
    tips.push('Temperatura amena - vista-se em camadas');
  } else if (weather.temperature > 28 && weather.temperature <= 35) {
    score -= 15;
    tips.push('Calor intenso - hidrate-se bastante');
  } else if (weather.temperature < 10) {
    score -= 25;
    tips.push('Frio - aqueca bem antes de exercitar');
  } else {
    score -= 35;
    tips.push('Temperatura extrema - prefira ambientes internos');
  }

  // Rain scoring
  if (weather.precipitation > 5) {
    score -= 30;
    tips.push('Chuva - leve capa ou treine indoor');
    bestActivities.push('gym', 'yoga', 'swimming');
  } else if (weather.precipitation > 0) {
    score -= 10;
    tips.push('Garoa leve - pode treinar ao ar livre');
  }

  // Wind scoring
  if (weather.windSpeed > 40) {
    score -= 20;
    tips.push('Vento forte - evite ciclismo');
  } else if (weather.windSpeed > 25) {
    score -= 10;
  }

  // UV scoring
  if (weather.uvIndex > 8) {
    score -= 15;
    tips.push('UV muito alto - use protetor solar e bone');
  } else if (weather.uvIndex > 5) {
    score -= 5;
    tips.push('Nao esqueca o protetor solar');
  }

  // Best activities based on conditions
  if (bestActivities.length === 0) {
    if (weather.temperature >= 15 && weather.temperature <= 30 && weather.precipitation < 2) {
      bestActivities.push('running', 'cycling', 'hiking', 'football');
    }
    if (weather.temperature > 25) {
      bestActivities.push('swimming');
    }
    bestActivities.push('gym', 'yoga');
  }

  score = Math.max(0, Math.min(100, score));

  let level: ExerciseRecommendation['level'];
  let color: string;
  let message: string;

  if (score >= 80) {
    level = 'excelente';
    color = '#4ADE80';
    message = 'Condicoes perfeitas para treinar ao ar livre!';
  } else if (score >= 60) {
    level = 'bom';
    color = '#2E7BFF';
    message = 'Boas condicoes para a maioria dos exercicios.';
  } else if (score >= 40) {
    level = 'moderado';
    color = '#FAAD14';
    message = 'Condicoes razoaveis - tome precaucoes.';
  } else {
    level = 'ruim';
    color = '#F87171';
    message = 'Prefira treinar em ambientes fechados hoje.';
  }

  if (tips.length === 0) {
    tips.push('Otimo dia para treinar!');
  }

  return { score, level, color, message, bestActivities, tips };
}

// ============ SPORTS NEWS (RSS via public API) ============

export interface NewsItem {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
}

const SPORTS_TIPS: NewsItem[] = [
  {
    title: 'Como melhorar seu pace na corrida',
    description: 'Treinos intervalados sao a chave para aumentar velocidade mantendo resistencia.',
    url: '',
    source: 'Sync Tips',
    publishedAt: new Date().toISOString(),
  },
  {
    title: 'A importancia do descanso ativo',
    description: 'Dias de descanso ativo com caminhadas leves ou yoga aceleram a recuperacao muscular.',
    url: '',
    source: 'Sync Tips',
    publishedAt: new Date().toISOString(),
  },
  {
    title: 'Hidratacao durante o exercicio',
    description: 'Beba 200ml de agua a cada 20 minutos de atividade intensa para manter a performance.',
    url: '',
    source: 'Sync Tips',
    publishedAt: new Date().toISOString(),
  },
  {
    title: 'Treinar em grupo melhora resultados',
    description: 'Estudos mostram que pessoas que treinam acompanhadas tem 95% mais consistencia.',
    url: '',
    source: 'Sync Tips',
    publishedAt: new Date().toISOString(),
  },
  {
    title: 'Alongamento pos-treino',
    description: 'Reservar 10 minutos para alongar apos o exercicio reduz risco de lesoes em ate 50%.',
    url: '',
    source: 'Sync Tips',
    publishedAt: new Date().toISOString(),
  },
];

export function getSportsTips(): NewsItem[] {
  return SPORTS_TIPS;
}

// ============================================================================
// NOVAS APIs FREE (sem key) — Sunrise/Sunset, Air Quality, Bored, Joke, Quote
// ============================================================================

// --- Sunrise/Sunset (free, sem key) ---
export interface SunData {
  sunrise: string;     // "06:15:23"
  sunset: string;      // "17:45:12"
  dayLength: string;   // "11:29:49"
  solarNoon: string;
  isDaylight: boolean;
}

export async function fetchSunData(lat: number, lng: number): Promise<SunData | null> {
  try {
    const r = await fetch(
      `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lng}&formatted=0`,
    );
    if (!r.ok) return null;
    const j = await r.json();
    if (j.status !== 'OK') return null;
    const now = new Date();
    const sunrise = new Date(j.results.sunrise);
    const sunset = new Date(j.results.sunset);
    const fmt = (d: Date) =>
      d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return {
      sunrise: fmt(sunrise),
      sunset: fmt(sunset),
      dayLength: j.results.day_length,
      solarNoon: fmt(new Date(j.results.solar_noon)),
      isDaylight: now >= sunrise && now <= sunset,
    };
  } catch {
    return null;
  }
}

// --- Air Quality (Open-Meteo, free, sem key) ---
export interface AirQuality {
  aqi: number;             // 0-500 (US EPA)
  pm25: number;
  pm10: number;
  level: 'Boa' | 'Moderada' | 'Ruim' | 'Muito ruim' | 'Perigosa';
  color: string;
  recommendation: string;
}

export async function fetchAirQuality(lat: number, lng: number): Promise<AirQuality | null> {
  try {
    const r = await fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=us_aqi,pm2_5,pm10`,
    );
    if (!r.ok) return null;
    const j = await r.json();
    const c = j.current || {};
    const aqi = Math.round(c.us_aqi || 0);
    let level: AirQuality['level'] = 'Boa';
    let color = '#4ADE80';
    let rec = 'Ar limpo — ótimo pra treinar ao ar livre!';
    if (aqi > 50) { level = 'Moderada'; color = '#FAAD14'; rec = 'OK pra treinos leves a moderados.'; }
    if (aqi > 100) { level = 'Ruim'; color = '#FF6B35'; rec = 'Treine indoor se possível.'; }
    if (aqi > 150) { level = 'Muito ruim'; color = '#F87171'; rec = 'Evite atividade ao ar livre.'; }
    if (aqi > 200) { level = 'Perigosa'; color = '#7C0000'; rec = 'NÃO treine ao ar livre hoje.'; }
    return {
      aqi,
      pm25: Math.round(c.pm2_5 || 0),
      pm10: Math.round(c.pm10 || 0),
      level,
      color,
      recommendation: rec,
    };
  } catch {
    return null;
  }
}

// --- Random workout idea (free, sem key) ---
const WORKOUT_IDEAS = [
  { sport: 'running', title: '5km easy', desc: 'Pace confortável, foco em respiração.', duration: 30 },
  { sport: 'running', title: 'Tiros 400m', desc: '6x 400m com 90s descanso entre eles.', duration: 35 },
  { sport: 'running', title: 'Long run', desc: '10-15km em pace conversável.', duration: 90 },
  { sport: 'cycling', title: 'Pedal urbano', desc: '1h30 pela cidade, ritmo moderado.', duration: 90 },
  { sport: 'cycling', title: 'Subida intensa', desc: '4 subidas de 5min, descida de recuperação.', duration: 60 },
  { sport: 'gym', title: 'Pull day', desc: 'Costas e bíceps — 6 exercícios, 4x10.', duration: 60 },
  { sport: 'gym', title: 'Push day', desc: 'Peito, ombros e tríceps — 6 exercícios, 4x10.', duration: 60 },
  { sport: 'gym', title: 'Leg day', desc: 'Agachamento livre + 5 acessórios.', duration: 75 },
  { sport: 'swimming', title: 'Natação técnica', desc: '20x50m com foco em respiração.', duration: 45 },
  { sport: 'yoga', title: 'Yoga vinyasa', desc: 'Fluxo de 30min focado em quadril.', duration: 30 },
  { sport: 'hiking', title: 'Trilha leve', desc: '5km de trilha próxima — vista garantida.', duration: 90 },
];

export function getWorkoutIdea(sport?: string) {
  const pool = sport ? WORKOUT_IDEAS.filter((w) => w.sport === sport) : WORKOUT_IDEAS;
  const list = pool.length > 0 ? pool : WORKOUT_IDEAS;
  return list[Math.floor(Math.random() * list.length)];
}

// --- Daily challenge generator (deterministic por dia, no API needed) ---
export interface DailyChallenge {
  id: string;
  emoji: string;
  title: string;
  description: string;
  reward: string;
}

const CHALLENGES: Omit<DailyChallenge, 'id'>[] = [
  { emoji: '🔥', title: 'Comece o dia movendo', description: 'Registre 1 treino antes das 10h', reward: '20 XP' },
  { emoji: '⚡', title: 'Velocidade pura', description: 'Faça 1 corrida com pace abaixo de 5:30/km', reward: '30 XP' },
  { emoji: '🏔️', title: 'Suba o monte', description: 'Acumule 50m de elevação hoje', reward: '25 XP' },
  { emoji: '👥', title: 'Bora junto', description: 'Convide um amigo pra treinar com você', reward: '40 XP' },
  { emoji: '📏', title: 'Vá longe', description: 'Acumule 10km em qualquer esporte', reward: '50 XP' },
  { emoji: '🎯', title: 'Foco', description: 'Treine no horário que o app recomendou', reward: '15 XP' },
  { emoji: '💪', title: 'Treino duplo', description: 'Faça 2 atividades diferentes hoje', reward: '60 XP' },
  { emoji: '🌅', title: 'Madrugador', description: 'Treine antes do nascer do sol', reward: '35 XP' },
  { emoji: '🏃', title: 'Sequência ativa', description: 'Mantenha streak por 3 dias seguidos', reward: '45 XP' },
];

export function getDailyChallenges(date = new Date()): DailyChallenge[] {
  const seed = parseInt(
    `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`,
    10,
  );
  // Pseudo-random determinístico baseado na data
  const a = CHALLENGES[seed % CHALLENGES.length];
  const b = CHALLENGES[(seed * 31) % CHALLENGES.length];
  const c = CHALLENGES[(seed * 17) % CHALLENGES.length];
  const seen = new Set<string>();
  return [a, b, c]
    .filter((x) => {
      if (seen.has(x.title)) return false;
      seen.add(x.title);
      return true;
    })
    .map((x, i) => ({ ...x, id: `daily-${seed}-${i}` }));
}

// --- Calculadora de queima calórica (MET values, padrão científico) ---
export function calculateCalories(
  sport: string,
  durationMinutes: number,
  weightKg = 70,
): number {
  const MET: Record<string, number> = {
    running: 9.8,
    cycling: 7.5,
    swimming: 8.0,
    walking: 3.5,
    hiking: 6.0,
    gym: 5.5,
    yoga: 3.0,
    football: 8.0,
    basketball: 8.0,
    tennis: 7.3,
    crossfit: 10.0,
    martial_arts: 10.3,
    volleyball: 4.0,
    dance: 6.5,
  };
  const met = MET[sport] || 6.0;
  return Math.round((met * 3.5 * weightKg / 200) * durationMinutes);
}

// --- Conversor pace → velocidade ---
export function paceToSpeed(paceMinKm: number): number {
  if (paceMinKm <= 0) return 0;
  return Math.round((60 / paceMinKm) * 10) / 10; // km/h
}

export function speedToPace(speedKmh: number): string {
  if (speedKmh <= 0) return '--:--';
  const totalMin = 60 / speedKmh;
  const m = Math.floor(totalMin);
  const s = Math.round((totalMin - m) * 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// --- VO2 max estimado (fórmula de Daniels) ---
export function estimateVO2Max(distanceKm: number, durationMin: number): number {
  if (distanceKm <= 0 || durationMin <= 0) return 0;
  const speedMpm = (distanceKm * 1000) / durationMin;
  // Fórmula simplificada de Daniels (acurácia ±5)
  const vo2 = -4.6 + 0.182258 * speedMpm + 0.000104 * speedMpm * speedMpm;
  return Math.max(0, Math.round(vo2));
}

// --- Frase motivacional do dia (determinística por dia) ---
const DAILY_QUOTES = [
  { text: 'A dor que voce sente hoje sera a forca que voce sentira amanha.', author: 'Arnold Schwarzenegger' },
  { text: 'A unica corrida ruim e a que voce nao faz.', author: 'Anonimo' },
  { text: 'Quando voce sentir que vai desistir, lembre por que comecou.', author: 'Anonimo' },
  { text: 'A disciplina e a ponte entre metas e conquistas.', author: 'Jim Rohn' },
  { text: 'Voce nao precisa ser extremo, so consistente.', author: 'Anonimo' },
  { text: 'Cada km comeca com 1 passo.', author: 'Sync' },
  { text: 'Treinar quando ninguem ve e o que te diferencia.', author: 'Anonimo' },
  { text: 'O corpo alcanca o que a mente acredita.', author: 'Anonimo' },
  { text: 'Pace lento ainda e movimento. Movimento e tudo.', author: 'Sync' },
  { text: 'O melhor momento pra comecar foi ontem. O segundo melhor e agora.', author: 'Provérbio chinês' },
];

export function getDailyQuote(date = new Date()): { text: string; author: string } {
  const seed = parseInt(
    `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`,
    10,
  );
  return DAILY_QUOTES[seed % DAILY_QUOTES.length];
}

// --- Recommendation de hidratação ---
export interface HydrationTip {
  ml: number;
  glasses: number;
  message: string;
}

export function recommendHydration(
  weightKg = 70,
  exerciseMinutesToday = 0,
  tempC = 25,
): HydrationTip {
  const base = weightKg * 35;             // 35ml/kg dia
  const exerciseExtra = exerciseMinutesToday * 12; // 12ml por minuto
  const heatExtra = tempC > 28 ? (tempC - 28) * 50 : 0;
  const total = Math.round((base + exerciseExtra + heatExtra) / 100) * 100;
  const glasses = Math.round(total / 250);
  let msg = `Beba ${glasses} copos de água ao longo do dia.`;
  if (exerciseMinutesToday > 60) msg += ' Treino longo — leve garrafa!';
  if (tempC > 30) msg += ' Calor extremo — hidrate antes, durante e depois.';
  return { ml: total, glasses, message: msg };
}

