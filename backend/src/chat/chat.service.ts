import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { Match } from '../matching/entities/match.entity';
import { SendMessageDto } from './dto/send-message.dto';
import { sanitizeText } from '../common/security/sanitize.util';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
  ) {}

  // Verificar se o usuário faz parte do match (segurança)
  private async verifyMatchAccess(
    matchId: string,
    userId: string,
  ): Promise<Match> {
    const match = await this.matchRepository.findOne({
      where: { id: matchId },
    });
    if (!match) {
      throw new NotFoundException('Conversa não encontrada');
    }
    if (match.user1_id !== userId && match.user2_id !== userId) {
      throw new ForbiddenException('Acesso negado a esta conversa');
    }
    return match;
  }

  // Enviar mensagem - chat só liberado após match
  async sendMessage(userId: string, dto: SendMessageDto): Promise<Message> {
    await this.verifyMatchAccess(dto.matchId, userId);

    const message = this.messageRepository.create({
      match_id: dto.matchId,
      sender_id: userId,
      content: sanitizeText(dto.content, 1000),
    });

    return this.messageRepository.save(message);
  }

  // Buscar mensagens de uma conversa com paginação
  async getMessages(
    userId: string,
    matchId: string,
    page: number = 1,
    limit: number = 50,
  ) {
    await this.verifyMatchAccess(matchId, userId);

    const [messages, total] = await this.messageRepository.findAndCount({
      where: { match_id: matchId },
      relations: ['sender'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { messages: messages.reverse(), total, page, limit };
  }

  // Marcar mensagens como lidas
  async markAsRead(userId: string, matchId: string): Promise<void> {
    await this.verifyMatchAccess(matchId, userId);

    await this.messageRepository
      .createQueryBuilder()
      .update(Message)
      .set({ isRead: true })
      .where('match_id = :matchId AND sender_id != :userId AND isRead = false', {
        matchId,
        userId,
      })
      .execute();
  }

  // Listar conversas do usuário com última mensagem (JOIN único, sem N+1)
  async getConversations(userId: string) {
    // Busca matches com a última mensagem via subquery (sem N+1)
    const conversations = await this.matchRepository
      .createQueryBuilder('match')
      .leftJoinAndSelect('match.user1', 'user1')
      .leftJoinAndSelect('match.user2', 'user2')
      .leftJoinAndSelect(
        (qb) =>
          qb
            .select('msg.match_id', 'match_id')
            .addSelect('MAX(msg.createdAt)', 'lastDate')
            .from('message', 'msg')
            .groupBy('msg.match_id'),
        'lastMsgSub',
        'lastMsgSub.match_id = match.id',
      )
      .leftJoinAndSelect(
        'message',
        'lastMsg',
        'lastMsg.match_id = match.id AND lastMsg.createdAt = lastMsgSub.lastDate',
      )
      .where('match.user1_id = :userId OR match.user2_id = :userId', { userId })
      .orderBy('lastMsgSub.lastDate', 'DESC')
      .getMany();

    // Contar não lidas em batch (uma query só)
    const matchIds = conversations.map((m) => m.id);
    const unreadCounts: Record<string, number> = {};

    if (matchIds.length > 0) {
      const counts = await this.messageRepository
        .createQueryBuilder('msg')
        .select('msg.match_id', 'matchId')
        .addSelect('COUNT(msg.id)', 'count')
        .where('msg.match_id IN (:...matchIds)', { matchIds })
        .andWhere('msg.isRead = :isRead', { isRead: false })
        .andWhere('msg.sender_id != :userId', { userId })
        .groupBy('msg.match_id')
        .getRawMany();

      for (const row of counts) {
        unreadCounts[row.matchId] = parseInt(row.count, 10);
      }
    }

    // Busca última mensagem por match (uma query)
    const lastMessages = matchIds.length > 0
      ? await this.messageRepository
          .createQueryBuilder('msg')
          .where('msg.match_id IN (:...matchIds)', { matchIds })
          .orderBy('msg.createdAt', 'DESC')
          .getMany()
      : [];

    const lastMessageMap: Record<string, typeof lastMessages[0]> = {};
    for (const msg of lastMessages) {
      if (!lastMessageMap[msg.match_id]) {
        lastMessageMap[msg.match_id] = msg;
      }
    }

    return conversations.map((match) => ({
      matchId: match.id,
      user: match.user1_id === userId ? match.user2 : match.user1,
      lastMessage: lastMessageMap[match.id] ?? null,
      unreadCount: unreadCounts[match.id] ?? 0,
    }));
  }
}
