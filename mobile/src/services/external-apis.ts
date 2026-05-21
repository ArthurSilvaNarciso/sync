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
