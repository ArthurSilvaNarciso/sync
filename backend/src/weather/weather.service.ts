import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

const WEATHER_CODE_MAP: Record<number, string> = {
  0: 'Ceu limpo',
  1: 'Parcialmente limpo',
  2: 'Parcialmente nublado',
  3: 'Nublado',
  45: 'Nevoeiro',
  48: 'Nevoeiro com geada',
  51: 'Garoa leve',
  53: 'Garoa moderada',
  55: 'Garoa forte',
  61: 'Chuva leve',
  63: 'Chuva moderada',
  65: 'Chuva forte',
  71: 'Neve leve',
  73: 'Neve moderada',
  75: 'Neve forte',
  80: 'Pancadas de chuva leve',
  81: 'Pancadas de chuva',
  82: 'Pancadas de chuva forte',
  95: 'Tempestade',
  96: 'Tempestade com granizo',
};

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);

  constructor(private readonly httpService: HttpService) {}

  private getWeatherDescription(code: number): string {
    return WEATHER_CODE_MAP[code] ?? 'Desconhecido';
  }

  private isGoodForExercise(
    weatherCode: number,
    temperature: number,
    windSpeed: number,
  ): boolean {
    const heavyRainCodes = [55, 63, 65, 75, 82, 95, 96];
    if (heavyRainCodes.includes(weatherCode)) return false;
    if (temperature > 40 || temperature < 0) return false;
    if (windSpeed > 50) return false;
    return true;
  }

  async getCurrentWeather(latitude: number, longitude: number) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,uv_index&timezone=auto`;

    try {
      const { data } = await firstValueFrom(this.httpService.get(url));
      const current = data.current;

      return {
        temperature: current.temperature_2m,
        feelsLike: current.apparent_temperature,
        humidity: current.relative_humidity_2m,
        precipitation: current.precipitation,
        weatherCode: current.weather_code,
        weatherDescription: this.getWeatherDescription(current.weather_code),
        windSpeed: current.wind_speed_10m,
        uvIndex: current.uv_index,
        isGoodForExercise: this.isGoodForExercise(
          current.weather_code,
          current.temperature_2m,
          current.wind_speed_10m,
        ),
      };
    } catch (error) {
      this.logger.error(`Falha ao buscar clima atual: ${error.message}`);
      throw new InternalServerErrorException('Servico de clima indisponivel no momento');
    }
  }

  async getForecast(latitude: number, longitude: number, days: number = 7) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,uv_index_max&timezone=auto&forecast_days=${days}`;

    let data: any;
    try {
      ({ data } = await firstValueFrom(this.httpService.get(url)));
    } catch (error) {
      this.logger.error(`Falha ao buscar previsao: ${error.message}`);
      throw new InternalServerErrorException('Servico de previsao indisponivel no momento');
    }
    const daily = data.daily;

    return daily.time.map((date: string, i: number) => ({
      date,
      weatherCode: daily.weather_code[i],
      weatherDescription: this.getWeatherDescription(daily.weather_code[i]),
      temperatureMax: daily.temperature_2m_max[i],
      temperatureMin: daily.temperature_2m_min[i],
      precipitationSum: daily.precipitation_sum[i],
      windSpeedMax: daily.wind_speed_10m_max[i],
      uvIndexMax: daily.uv_index_max[i],
      isGoodForExercise: this.isGoodForExercise(
        daily.weather_code[i],
        daily.temperature_2m_max[i],
        daily.wind_speed_10m_max[i],
      ),
    }));
  }

  async getExerciseRecommendation(latitude: number, longitude: number) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,precipitation,weather_code,wind_speed_10m&timezone=auto&forecast_hours=24`;

    let data: any;
    try {
      ({ data } = await firstValueFrom(this.httpService.get(url)));
    } catch (error) {
      this.logger.error(`Falha ao buscar recomendacao de exercicio: ${error.message}`);
      throw new InternalServerErrorException('Servico de clima indisponivel no momento');
    }
    const hourly = data.hourly;

    // Analyze each hour and score it for exercise suitability
    const hourlyScores = hourly.time.map((time: string, i: number) => {
      const temp = hourly.temperature_2m[i];
      const precip = hourly.precipitation[i];
      const weatherCode = hourly.weather_code[i];
      const wind = hourly.wind_speed_10m[i];

      let score = 100;

      // Temperature penalty
      if (temp < 5 || temp > 35) score -= 40;
      else if (temp < 10 || temp > 30) score -= 20;
      else if (temp >= 18 && temp <= 25) score += 10;

      // Precipitation penalty
      if (precip > 5) score -= 50;
      else if (precip > 1) score -= 30;
      else if (precip > 0) score -= 10;

      // Wind penalty
      if (wind > 50) score -= 50;
      else if (wind > 30) score -= 20;
      else if (wind > 15) score -= 10;

      // Heavy weather codes penalty
      const heavyRainCodes = [55, 63, 65, 75, 82, 95, 96];
      if (heavyRainCodes.includes(weatherCode)) score -= 40;

      return {
        time,
        temperature: temp,
        precipitation: precip,
        weatherCode,
        weatherDescription: this.getWeatherDescription(weatherCode),
        windSpeed: wind,
        score: Math.max(0, Math.min(100, score)),
      };
    });

    // Find the best time window (best consecutive 2-hour block)
    let bestStart = 0;
    let bestScore = -1;
    for (let i = 0; i < hourlyScores.length - 1; i++) {
      const avgScore = (hourlyScores[i].score + hourlyScores[i + 1].score) / 2;
      if (avgScore > bestScore) {
        bestScore = avgScore;
        bestStart = i;
      }
    }

    const bestWindow = {
      start: hourlyScores[bestStart].time,
      end: hourlyScores[Math.min(bestStart + 1, hourlyScores.length - 1)].time,
      avgScore: bestScore,
      temperature: hourlyScores[bestStart].temperature,
      weatherDescription: hourlyScores[bestStart].weatherDescription,
    };

    // Suggest activities based on conditions
    const bestActivities: string[] = [];
    const temp = bestWindow.temperature;
    const precip = hourlyScores[bestStart].precipitation;

    if (precip < 1) {
      bestActivities.push('Corrida ao ar livre');
      bestActivities.push('Ciclismo');
      if (temp >= 15 && temp <= 30) {
        bestActivities.push('Treino no parque');
        bestActivities.push('Caminhada');
      }
      if (temp >= 25) {
        bestActivities.push('Natacao');
        bestActivities.push('Volei de praia');
      }
    } else {
      bestActivities.push('Academia');
      bestActivities.push('Yoga indoor');
      bestActivities.push('Natacao em piscina coberta');
    }

    // Generate recommendation text
    let recommendation: string;
    if (bestScore >= 80) {
      recommendation = `Excelente dia para exercicios! O melhor horario e entre ${this.formatHour(bestWindow.start)} e ${this.formatHour(bestWindow.end)}, com ${bestWindow.weatherDescription.toLowerCase()} e ${Math.round(temp)}°C.`;
    } else if (bestScore >= 50) {
      recommendation = `Condicoes razoaveis para exercicios. Aproveite o horario entre ${this.formatHour(bestWindow.start)} e ${this.formatHour(bestWindow.end)} (${bestWindow.weatherDescription.toLowerCase()}, ${Math.round(temp)}°C). Considere atividades indoor como alternativa.`;
    } else {
      recommendation = `Condicoes desfavoraveis para exercicios ao ar livre hoje. Recomendamos atividades indoor. Se possivel, o melhor horario seria entre ${this.formatHour(bestWindow.start)} e ${this.formatHour(bestWindow.end)}.`;
    }

    return {
      bestTimeWindow: bestWindow,
      bestActivities,
      recommendation,
      hourlyScores, // exposto para UI montar gráfico
    };
  }

  private formatHour(isoTime: string): string {
    const date = new Date(isoTime);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }
}
