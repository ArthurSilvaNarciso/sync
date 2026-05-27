import { Controller, Post, Delete, Get, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Follow } from './follow.entity';

@ApiTags('Follows')
@Controller('api/follows')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FollowsController {
  constructor(
    @InjectRepository(Follow) private readonly repo: Repository<Follow>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  @Post(':userId')
  @ApiOperation({ summary: 'Seguir usuário' })
  async follow(@CurrentUser() user: User, @Param('userId') userId: string) {
    if (user.id === userId) throw new BadRequestException('Não pode seguir você mesmo');
    const exists = await this.repo.findOne({ where: { follower_id: user.id, following_id: userId } });
    if (exists) return { ok: true, alreadyFollowing: true };
    await this.repo.save(this.repo.create({ follower_id: user.id, following_id: userId }));
    return { ok: true };
  }

  @Delete(':userId')
  @ApiOperation({ summary: 'Deixar de seguir' })
  async unfollow(@CurrentUser() user: User, @Param('userId') userId: string) {
    await this.repo.delete({ follower_id: user.id, following_id: userId });
    return { ok: true };
  }

  @Get(':userId/status')
  @ApiOperation({ summary: 'Estou seguindo este usuário?' })
  async status(@CurrentUser() user: User, @Param('userId') userId: string) {
    const f = await this.repo.findOne({ where: { follower_id: user.id, following_id: userId } });
    return { isFollowing: !!f };
  }

  @Get('me/following')
  @ApiOperation({ summary: 'Lista de quem eu sigo' })
  async myFollowing(@CurrentUser() user: User) {
    const rows = await this.repo.find({
      where: { follower_id: user.id },
      relations: ['following'],
      take: 500,
      order: { createdAt: 'DESC' },
    });
    return rows.map((r) => ({
      id: r.following?.id,
      name: r.following?.name,
      avatarUrl: r.following?.avatarUrl,
      city: r.following?.city,
      sports: (r.following as any)?.sports,
      level: (r.following as any)?.level,
    }));
  }

  @Get('me/followers')
  @ApiOperation({ summary: 'Lista de meus seguidores' })
  async myFollowers(@CurrentUser() user: User) {
    const rows = await this.repo.find({
      where: { following_id: user.id },
      relations: ['follower'],
      take: 500,
      order: { createdAt: 'DESC' },
    });
    return rows.map((r) => ({
      id: r.follower?.id,
      name: r.follower?.name,
      avatarUrl: r.follower?.avatarUrl,
      city: r.follower?.city,
      sports: (r.follower as any)?.sports,
      level: (r.follower as any)?.level,
    }));
  }

  @Get('me/counts')
  @ApiOperation({ summary: 'Total following + followers' })
  async counts(@CurrentUser() user: User) {
    const [following, followers] = await Promise.all([
      this.repo.count({ where: { follower_id: user.id } }),
      this.repo.count({ where: { following_id: user.id } }),
    ]);
    return { following, followers };
  }
}
