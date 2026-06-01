import { IsString, IsUUID, IsNotEmpty, MaxLength, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ description: 'ID do match (conversa)' })
  @IsUUID()
  matchId: string;

  // Texto: até 1000 chars. Áudio: agora é uma URL (/uploads/media/...),
  // não mais base64 — por isso 4000 cobre URLs com folga (antes era 2MB!).
  @ApiProperty({ description: 'Texto da mensagem ou URL do áudio' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4_000)
  content: string;

  @ApiPropertyOptional({ enum: ['text', 'audio'], default: 'text' })
  @IsOptional()
  @IsIn(['text', 'audio'])
  type?: string;
}
