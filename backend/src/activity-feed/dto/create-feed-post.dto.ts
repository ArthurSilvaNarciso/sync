import { IsString, IsOptional, IsNumber, IsUUID, MaxLength, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFeedPostDto {
  @ApiPropertyOptional({ description: 'ID da atividade GPS relacionada' })
  @IsUUID()
  @IsOptional()
  activityId?: string;

  @ApiPropertyOptional({ description: 'Legenda do post (máx 500 chars)' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  caption?: string;

  @ApiPropertyOptional({ description: 'URL da foto (data:image ou https)' })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  photoUrl?: string;

  @ApiPropertyOptional({ description: 'Distância em km', example: 5.2 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(10000)
  distanceKm?: number;

  @ApiPropertyOptional({ description: 'Duração em segundos', example: 1800 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(86400 * 7)
  durationSeconds?: number;

  @ApiPropertyOptional({ description: 'Pace médio (min/km)', example: 5.5 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(60)
  avgPace?: number;

  @ApiPropertyOptional({ description: 'Calorias queimadas', example: 350 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100000)
  calories?: number;

  @ApiPropertyOptional({ description: 'Modalidade esportiva', example: 'running' })
  @IsString()
  @IsOptional()
  @MaxLength(40)
  sport?: string;
}
