import { IsNumber, IsDateString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddPointDto {
  @ApiProperty({ example: -23.5505 })
  @IsNumber()
  latitude: number;

  @ApiProperty({ example: -46.6333 })
  @IsNumber()
  longitude: number;

  @ApiPropertyOptional({ example: 760.5 })
  @IsNumber()
  @IsOptional()
  altitude?: number;

  @ApiProperty({ example: '2026-04-10T07:30:15Z' })
  @IsDateString()
  timestamp: string;
}
