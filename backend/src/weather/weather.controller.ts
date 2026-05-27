import { Controller, Get, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WeatherService } from './weather.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Weather')
@Controller('api/weather')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  private parseCoords(lat: any, lng: any): { latN: number; lngN: number } {
    const latN = Number(lat);
    const lngN = Number(lng);
    if (!isFinite(latN) || !isFinite(lngN) || latN < -90 || latN > 90 || lngN < -180 || lngN > 180) {
      throw new BadRequestException('Coordenadas GPS inválidas');
    }
    return { latN, lngN };
  }

  @Get('current')
  @ApiOperation({ summary: 'Clima atual' })
  getCurrentWeather(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
  ) {
    const { latN, lngN } = this.parseCoords(lat, lng);
    return this.weatherService.getCurrentWeather(latN, lngN);
  }

  @Get('forecast')
  @ApiOperation({ summary: 'Previsao do tempo' })
  getForecast(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('days') days?: string,
  ) {
    const { latN, lngN } = this.parseCoords(lat, lng);
    const daysN = days ? Math.max(1, Math.min(16, Number(days))) : 7;
    return this.weatherService.getForecast(latN, lngN, isFinite(daysN) ? daysN : 7);
  }

  @Get('recommendation')
  @ApiOperation({ summary: 'Recomendacao de exercicio baseada no clima' })
  getExerciseRecommendation(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
  ) {
    const { latN, lngN } = this.parseCoords(lat, lng);
    return this.weatherService.getExerciseRecommendation(latN, lngN);
  }
}
