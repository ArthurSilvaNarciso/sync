import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsNumber,
  IsDateString,
  IsIn,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SportLevel } from '../entities/user.entity';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'João Silva' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Amo correr e pedalar!' })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  bio?: string;

  @ApiPropertyOptional({ example: '1995-03-15' })
  @IsDateString()
  @IsOptional()
  birthDate?: string;

  @ApiPropertyOptional({ example: ['running', 'cycling'] })
  @IsArray()
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  @IsOptional()
  sports?: string[];

  @ApiPropertyOptional({ enum: SportLevel, example: SportLevel.INTERMEDIATE })
  @IsEnum(SportLevel)
  @IsOptional()
  level?: SportLevel;

  @ApiPropertyOptional({ example: ['health', 'social'] })
  @IsArray()
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  @IsOptional()
  objectives?: string[];

  @ApiPropertyOptional({ example: ['morning', 'weekend'] })
  @IsArray()
  @IsString({ each: true })
  @MaxLength(40, { each: true })
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

  @ApiPropertyOptional({ example: 70 })
  @IsNumber()
  @IsOptional()
  weightKg?: number;

  @ApiPropertyOptional({ example: 175 })
  @IsNumber()
  @IsOptional()
  heightCm?: number;

  @ApiPropertyOptional({ example: 'male', enum: ['male', 'female', 'other'] })
  @IsIn(['male', 'female', 'other'])
  @IsOptional()
  gender?: string;

  // Frases estilo Tinder. Validação fina (texto/limites) é feita no service.
  @ApiPropertyOptional({ example: [{ q: 'Meu esporte favorito', a: 'Corrida de rua' }] })
  @IsArray()
  @IsOptional()
  prompts?: { q: string; a: string }[];
}
