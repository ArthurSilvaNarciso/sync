import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GroupsService } from './groups.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Groups')
@Controller('api/groups')
export class GroupsController {
  constructor(private readonly service: GroupsService) {}

  @Get('public')
  @ApiOperation({ summary: 'Listar grupos públicos' })
  publicGroups(@Query('city') city?: string, @Query('sport') sport?: string, @Query('page') page?: string) {
    return this.service.listPublic({ city, sport, page: page ? parseInt(page, 10) : 1 });
  }

  @Get('ranking')
  @ApiOperation({ summary: 'Ranking de grupos por km total' })
  ranking(@Query('city') city?: string, @Query('sport') sport?: string) {
    return this.service.groupRanking({ city, sport });
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar grupo (admin = criador)' })
  create(
    @CurrentUser() user: User,
    @Body() body: { name: string; description?: string; sport?: string; city?: string; isPrivate?: boolean },
  ) {
    return this.service.create(user.id, body);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Meus grupos' })
  mine(@CurrentUser() user: User) {
    return this.service.myGroups(user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Detalhe do grupo' })
  detail(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.getById(id, user.id);
  }

  @Get(':id/members')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ranking de membros (km contribuído)' })
  members(@Param('id') id: string) {
    return this.service.listMembers(id);
  }

  @Post(':id/join')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Entrar no grupo (com código se privado)' })
  join(@CurrentUser() user: User, @Param('id') id: string, @Body() body: { inviteCode?: string }) {
    return this.service.join(user.id, id, body.inviteCode);
  }

  @Post(':id/leave')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sair do grupo' })
  leave(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.leave(user.id, id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deletar grupo (só admin)' })
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.delete(user.id, id);
  }
}
