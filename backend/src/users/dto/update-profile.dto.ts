import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SportLevel } from '../entities/user.entity';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'João Silva' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Amo correr e pedalar!' })
  @IsString()
  @IsOptional()
  bio?: string;

  @ApiPropertyOptional({ example: '1995-03-15' })
  @IsDateString()
  @IsOptional()
  birthDate?: string;

  @ApiPropertyOptional({ example: ['running', 'cycling'] })
  @IsArray()
  @IsOptional()
  sports?: string[];

  @ApiPropertyOptional({ enum: SportLevel, example: SportLevel.INTERMEDIATE })
  @IsEnum(SportLevel)
  @IsOptional()
  level?: SportLevel;

  @ApiPropertyOptional({ example: ['health', 'social'] })
  @IsArray()
  @IsOptional()
  objectives?: string[];

  @ApiPropertyOptional({ example: ['morning', 'weekend'] })
  @IsArray()
  @IsOptional()
  availability?: string[];

  @ApiPropertyOptional({ example: -23.5505 })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ example: -46.6333 })
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({ example: 'São Paulo' })
  @IsString()
  @IsOptional()
  city?: string;
}
