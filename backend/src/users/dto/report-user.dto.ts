import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportReason } from '../entities/user-report.entity';

export class ReportUserDto {
  @ApiProperty({ enum: ReportReason, example: ReportReason.INAPPROPRIATE })
  @IsEnum(ReportReason)
  reason: ReportReason;

  @ApiPropertyOptional({ example: 'Perfil com conteúdo ofensivo' })
  @IsString()
  @IsOptional()
  description?: string;
}
