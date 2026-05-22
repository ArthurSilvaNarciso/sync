import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group } from './entities/group.entity';
import { GroupMember } from './entities/group-member.entity';
import { randomBytes } from 'crypto';
import { sanitizeText } from '../common/security/sanitize.util';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group) private readonly groupRepo: Repository<Group>,
    @InjectRepository(GroupMember) private readonly memberRepo: Repository<GroupMember>,
  ) {}

  async create(adminId: string, dto: { name: string; description?: string; sport?: string; city?: string; isPrivate?: boolean }) {
    if (!dto.name || dto.name.trim().length < 3) {
      throw new BadRequestException('Nome do grupo precisa ter pelo menos 3 caracteres');
    }
    const group = this.groupRepo.create({
      name: sanitizeText(dto.name, 80),
      description: sanitizeText(dto.description, 500) || null,
      sport: sanitizeText(dto.sport, 40) || null,
      city: sanitizeText(dto.city, 80) || null,
      isPrivate: !!dto.isPrivate,
      admin_id: adminId,
      inviteCode: dto.isPrivate ? randomBytes(6).toString('hex') : null,
      memberCount: 1,
    });
    const saved = await this.groupRepo.save(group);
    await this.memberRepo.save(
      this.memberRepo.create({ group_id: saved.id, user_id: adminId, role: 'admin' }),
    );
    return saved;
  }

  async listPublic(opts: { city?: string; sport?: string; page?: number }) {
    const qb = this.groupRepo
      .createQueryBuilder('g')
      .where('g.isPrivate = :pub', { pub: false })
      .orderBy('g.totalDistanceKm', 'DESC')
      .take(20)
      .skip(((opts.page || 1) - 1) * 20);
    if (opts.city) qb.andWhere('g.city = :city', { city: opts.city });
    if (opts.sport) qb.andWhere('g.sport = :sport', { sport: opts.sport });
    return qb.getMany();
  }

  async getById(groupId: string, requesterId?: string) {
    const group = await this.groupRepo.findOne({
      where: { id: groupId },
      relations: ['admin'],
    });
    if (!group) throw new NotFoundException('Grupo não encontrado');
    if (group.isPrivate && requesterId) {
      const isMember = await this.memberRepo.findOne({ where: { group_id: groupId, user_id: requesterId } });
      if (!isMember) throw new ForbiddenException('Grupo privado — entre pelo código de convite');
    }
    return group;
  }

  async myGroups(userId: string) {
    const members = await this.memberRepo.find({
      where: { user_id: userId },
      relations: ['group'],
    });
    return members.map((m) => ({ ...m.group, role: m.role, contributedKm: m.contributedKm }));
  }

  async join(userId: string, groupId: string, inviteCode?: string) {
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Grupo não encontrado');
    if (group.isPrivate && group.inviteCode !== inviteCode) {
      throw new ForbiddenException('Código de convite inválido');
    }
    const existing = await this.memberRepo.findOne({ where: { group_id: groupId, user_id: userId } });
    if (existing) return existing;
    const member = await this.memberRepo.save(
      this.memberRepo.create({ group_id: groupId, user_id: userId, role: 'member' }),
    );
    await this.groupRepo.increment({ id: groupId }, 'memberCount', 1);
    return member;
  }

  async leave(userId: string, groupId: string) {
    const member = await this.memberRepo.findOne({ where: { group_id: groupId, user_id: userId } });
    if (!member) throw new NotFoundException('Você não é membro deste grupo');
    if (member.role === 'admin') {
      throw new BadRequestException('Admin não pode sair. Transfira a admin ou delete o grupo.');
    }
    await this.memberRepo.remove(member);
    await this.groupRepo.decrement({ id: groupId }, 'memberCount', 1);
    return { ok: true };
  }

  async listMembers(groupId: string) {
    return this.memberRepo.find({
      where: { group_id: groupId },
      relations: ['user'],
      order: { contributedKm: 'DESC' },
      take: 100,
    });
  }

  async groupRanking(opts: { sport?: string; city?: string }) {
    const qb = this.groupRepo
      .createQueryBuilder('g')
      .orderBy('g.totalDistanceKm', 'DESC')
      .take(50);
    if (opts.sport) qb.andWhere('g.sport = :s', { s: opts.sport });
    if (opts.city) qb.andWhere('g.city = :c', { c: opts.city });
    const list = await qb.getMany();
    return list.map((g, i) => ({ position: i + 1, ...g }));
  }

  /** Contabiliza nova atividade — chamado pelo ActivitiesService quando finalizar */
  async creditActivity(userId: string, distanceKm: number) {
    const memberships = await this.memberRepo.find({ where: { user_id: userId } });
    for (const m of memberships) {
      await this.memberRepo.increment({ id: m.id }, 'contributedKm', distanceKm);
      await this.memberRepo.increment({ id: m.id }, 'contributedActivities', 1);
      await this.groupRepo.increment({ id: m.group_id }, 'totalDistanceKm', distanceKm);
      await this.groupRepo.increment({ id: m.group_id }, 'totalActivities', 1);
    }
  }

  async delete(userId: string, groupId: string) {
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Grupo não encontrado');
    if (group.admin_id !== userId) throw new ForbiddenException('Só o admin pode deletar');
    await this.groupRepo.remove(group);
    return { ok: true };
  }
}
