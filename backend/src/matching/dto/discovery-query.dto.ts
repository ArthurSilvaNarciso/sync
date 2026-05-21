import { IsOptional, IsNumber, IsString, IsEnum, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { SportLevel } from '../../users/entities/user.entity';

export class DiscoveryQueryDto {
  @ApiPropertyOptional({ description: 'Raio de busca em km', default: 10 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  radiusKm?: number = 10;

  @ApiPropertyOptional({ description: 'Filtrar por esporte' })
  @IsString()
  @IsOptional()
  sport?: string;

  @ApiPropertyOptional({ description: 'Filtrar por nível', enum: SportLevel })
  @IsEnum(SportLevel)
  @IsOptional()
  level?: SportLevel;

  @ApiPropertyOptional({ description: 'Página', default: 1 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Itens por página', default: 20 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Pace mínimo compatível (min/km)' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  paceMin?: number;

  @ApiPropertyOptional({ description: 'Pace máximo compatível (min/km)' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  paceMax?: number;

  @ApiPropertyOptional({ description: 'Filtra por horário preferido (madrugada|manha|tarde|noite|weekend)' })
  @IsString()
  @IsOptional()
  availability?: string;
}
