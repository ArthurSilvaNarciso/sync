import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WeatherService } from './weather.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Weather')
@Controller('api/weather')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Get('current')
  @ApiOperation({ summary: 'Clima atual' })
  getCurrentWeather(
    @Query('lat') lat: number,
    @Query('lng') lng: number,
  ) {
    return this.weatherService.getCurrentWeather(Number(lat), Number(lng));
  }

  @Get('forecast')
  @ApiOperation({ summary: 'Previsao do tempo' })
  getForecast(
    @Query('lat') lat: number,
    @Query('lng') lng: number,
    @Query('days') days?: number,
  ) {
    return this.weatherService.getForecast(
      Number(lat),
      Number(lng),
      days ? Number(days) : 7,
    );
  }

  @Get('recommendation')
  @ApiOperation({ summary: 'Recomendacao de exercicio baseada no clima' })
  getExerciseRecommendation(
    @Query('lat') lat: number,
    @Query('lng') lng: number,
  ) {
    return this.weatherService.getExerciseRecommendation(
      Number(lat),
      Number(lng),
    );
  }
}
