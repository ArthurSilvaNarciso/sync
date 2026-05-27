import { IsString, IsUUID, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ description: 'ID do match (conversa)' })
  @IsUUID()
  matchId: string;

  @ApiProperty({ description: 'Conteúdo da mensagem (máx 1000 caracteres)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  content: string;
}
