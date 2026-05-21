import { IsString, IsNotEmpty, IsDateString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const VALID_SPORTS = [
  'running', 'cycling', 'swimming', 'football', 'basketball',
  'tennis', 'yoga', 'gym', 'hiking', 'crossfit', 'martial_arts', 'dance',
];

export class CreateActivityDto {
  @ApiProperty({ example: 'running', enum: VALID_SPORTS })
  @IsString()
  @IsNotEmpty()
  @IsIn(VALID_SPORTS, { message: `sport deve ser um dos valores: ${VALID_SPORTS.join(', ')}` })
  sport: string;

  @ApiProperty({ example: '2026-04-10T07:30:00Z' })
  @IsDateString()
  startTime: string;
}
