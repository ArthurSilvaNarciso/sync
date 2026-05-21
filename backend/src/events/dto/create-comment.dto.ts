import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({ example: 'Ótimo evento, vou participar!' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  content: string;
}
