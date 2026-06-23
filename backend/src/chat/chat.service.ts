import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { Match } from '../matching/entities/match.entity';
import { User } from '../users/entities/user.entity';
import { UserBlock } from '../users/entities/user-block.entity';
import { SendMessageDto } from './dto/send-message.dto';
import { sanitizeText, moderateText } from '../common/security/sanitize.util';
import { PushService } from '../notifications/push.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly pushService: PushService,
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
    const match = await this.verifyMatchAccess(dto.matchId, userId);

    // SEGURANÇA: se há bloqueio entre os dois (qualquer sentido), não deixa enviar.
    const otherId = match.user1_id === userId ? match.user2_id : match.user1_id;
    const block = await this.messageRepository.manager.findOne(UserBlock, {
      where: [
        { blocker_id: userId, blocked_id: otherId },
        { blocker_id: otherId, blocked_id: userId },
      ],
    });
    if (block) {
      throw new ForbiddenException('Não é possível enviar mensagens: há um bloqueio entre vocês.');
    }

    const msgType = dto.type === 'audio' ? 'audio' : 'text';
    // Áudio agora chega como URL (/uploads/media/...) — validamos que é mesmo
    // uma URL e não base64/script. Texto continua sanitizado.
    let content: string;
    if (msgType === 'audio') {
      const isValidUrl = /^https?:\/\/\S+$/i.test(dto.content) || dto.content.startsWith('/uploads/');
      if (!isValidUrl) {
        throw new BadRequestException('Mensagem de áudio deve ser uma URL válida');
      }
      content = dto.content.trim();
    } else {
      content = sanitizeText(dto.content, 1000);
      // Moderação: bloqueia ameaças e discurso de ódio óbvios.
      const mod = moderateText(content);
      if (mod.block) {
        throw new ForbiddenException(
          'Mensagem bloqueada por conteúdo ofensivo (' + mod.reason + '). Seja respeitoso.',
        );
      }
    }

    const message = this.messageRepository.create({
      match_id: dto.matchId,
      sender_id: userId,
      content,
      type: msgType,
    });

    const saved = await this.messageRepository.save(message);

    // Push para o destinatário (fire-and-forget — não bloqueia o envio)
    const recipientId = match.user1_id === userId ? match.user2_id : match.user1_id;
    this.notifyNewMessage(recipientId, userId, dto.matchId, msgType, content).catch(() => {});

    return saved;
  }

  /** Push de nova mensagem para o destinatário */
  private async notifyNewMessage(
    recipientId: string,
    senderId: string,
    matchId: string,
    type: string,
    content: string,
  ) {
    const sender = await this.userRepository.findOne({
      where: { id: senderId },
      select: ['id', 'name'],
    });
    const firstName = (sender?.name || 'Alguém').split(' ')[0];
    const preview = type === 'audio' ? '🎤 Mensagem de áudio' : content.slice(0, 80);
    await this.pushService.sendToUser(recipientId, firstName, preview, {
      type: 'message',
      matchId,
    });
  }

  // Buscar mensagens de uma conversa com paginação
  async getMessages(
    userId: string,
    matchId: string,
    page: number = 1,
    limit: number = 50,
  ) {
    await this.verifyMatchAccess(matchId, userId);

    const safePage = Math.max(1, Math.min(page, 1000));
    const safeLimit = Math.max(1, Math.min(limit, 100));

    const [messages, total] = await this.messageRepository.findAndCount({
      where: { match_id: matchId },
      relations: ['sender'],
      order: { createdAt: 'DESC' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    });

    return { messages: messages.reverse(), total, page: safePage, limit: safeLimit };
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

  // Listar conversas do usuário com última mensagem.
  // NOTA: usamos queries simples e independentes (sem subquery-join). A versão
  // anterior montava um leftJoinAndSelect com subquery ('lastMsgSub') que o
  // Postgres rejeitava com "missing FROM-clause entry for table lastmsgsub"
  // → todo o chat dava 500 em produção. Aqui buscamos matches + relações e
  // calculamos última mensagem / não-lidas em queries à parte (robusto e
  // independente de dialeto SQL).
  async getConversations(userId: string) {
    const conversations = await this.matchRepository
      .createQueryBuilder('match')
      .leftJoinAndSelect('match.user1', 'user1')
      .leftJoinAndSelect('match.user2', 'user2')
      .where('match.user1_id = :userId OR match.user2_id = :userId', { userId })
      .getMany();

    const matchIds = conversations.map((m) => m.id);
    const unreadCounts: Record<string, number> = {};
    const lastMessageMap: Record<string, Message> = {};

    if (matchIds.length > 0) {
      // Não-lidas em batch (uma query só)
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

      // Última mensagem por match — uma query por conversa (N pequeno, robusto)
      await Promise.all(
        matchIds.map(async (mid) => {
          const last = await this.messageRepository.findOne({
            where: { match_id: mid },
            order: { createdAt: 'DESC' },
          });
          if (last) lastMessageMap[mid] = last;
        }),
      );
    }

    // Privacidade: expõe apenas campos públicos do parceiro de conversa (sem email, lat/long)
    const safeUser = (u: any) => u ? {
      id: u.id,
      name: u.name,
      avatarUrl: u.avatarUrl,
      city: u.city,
      sports: u.sports,
      level: u.level,
    } : null;

    return conversations
      .map((match) => ({
        matchId: match.id,
        user: safeUser(match.user1_id === userId ? match.user2 : match.user1),
        lastMessage: lastMessageMap[match.id] ?? null,
        unreadCount: unreadCounts[match.id] ?? 0,
      }))
      // Ordena: conversas com mensagem mais recente primeiro; sem mensagem por último
      .sort((a, b) => {
        const ta = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
        const tb = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
        return tb - ta;
      });
  }
}
