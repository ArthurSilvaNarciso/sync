import { IsUUID, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SwipeDto {
  @ApiProperty({ description: 'ID do usuário alvo do swipe' })
  @IsUUID()
  targetUserId: string;

  @ApiProperty({ description: 'true = like, false = ignore' })
  @IsBoolean()
  isLike: boolean;

  @ApiPropertyOptional({ description: 'Super like (interesse especial)' })
  @IsBoolean()
  @IsOptional()
  isSuperLike?: boolean;
}
