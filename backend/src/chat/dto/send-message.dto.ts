import { IsString, IsUUID, IsNotEmpty, MaxLength, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ description: 'ID do match (conversa)' })
  @IsUUID()
  matchId: string;

  @ApiProperty({ description: 'Conteúdo da mensagem (máx 1000 caracteres)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2_000_000) // base64 audio can be larger
  content: string;

  @ApiPropertyOptional({ enum: ['text', 'audio'], default: 'text' })
  @IsOptional()
  @IsIn(['text', 'audio'])
  type?: string;
}
