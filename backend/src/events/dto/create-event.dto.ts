import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsDateString,
  IsOptional,
  Min,
  Max,
  IsIn,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

function IsFutureDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isFutureDate',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: string) {
          return new Date(value) > new Date();
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} deve ser uma data futura`;
        },
      },
    });
  };
}

const VALID_SPORTS = [
  'running', 'cycling', 'swimming', 'football', 'basketball',
  'tennis', 'yoga', 'gym', 'hiking', 'crossfit', 'martial_arts', 'dance',
];

export class CreateEventDto {
  @ApiProperty({ example: 'Corrida no Ibirapuera' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'Corrida leve de 5km, todos os níveis!' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'running', enum: VALID_SPORTS })
  @IsString()
  @IsNotEmpty()
  @IsIn(VALID_SPORTS, { message: `sport deve ser um dos valores: ${VALID_SPORTS.join(', ')}` })
  sport: string;

  @ApiProperty({ example: '2026-04-15T08:00:00Z' })
  @IsDateString()
  @IsFutureDate({ message: 'A data do evento deve ser futura' })
  date: string;

  @ApiProperty({ example: -23.5874 })
  @IsNumber()
  latitude: number;

  @ApiProperty({ example: -46.6576 })
  @IsNumber()
  longitude: number;

  @ApiPropertyOptional({ example: 'Parque Ibirapuera, São Paulo' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: 15, default: 10 })
  @IsNumber()
  @IsOptional()
  @Min(2)
  @Max(100)
  maxParticipants?: number;
}
