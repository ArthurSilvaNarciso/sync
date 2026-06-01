import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ChallengesService } from './challenges.service';
import { Challenge } from './entities/challenge.entity';

// Repositório TypeORM mockado — testa a lógica de negócio sem banco.
function makeRepoMock() {
  return {
    create: jest.fn((dto: any) => ({ ...dto })),
    save: jest.fn((entity: any) => Promise.resolve({ id: 'c1', ...entity })),
    find: jest.fn(),
    findOne: jest.fn(),
  };
}

describe('ChallengesService', () => {
  let service: ChallengesService;
  let repo: ReturnType<typeof makeRepoMock>;

  beforeEach(async () => {
    repo = makeRepoMock();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ChallengesService,
        { provide: getRepositoryToken(Challenge), useValue: repo },
      ],
    }).compile();
    service = moduleRef.get(ChallengesService);
  });

  describe('create', () => {
    it('cria um desafio com expiresAt e status implícito', async () => {
      const before = Date.now();
      const result = await service.create('userA', {
        challengedId: 'userB',
        sport: 'corrida',
        metric: 'distance',
        target: 5,
        expiresInDays: 7,
      });
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          challenger_id: 'userA',
          challenged_id: 'userB',
          sport: 'corrida',
          metric: 'distance',
          target: 5,
        }),
      );
      // expiresAt ~ 7 dias no futuro
      const exp = new Date((repo.create.mock.calls[0][0] as any).expiresAt).getTime();
      expect(exp).toBeGreaterThan(before + 6 * 86_400_000);
      expect(exp).toBeLessThan(before + 8 * 86_400_000);
      expect(result.id).toBe('c1');
    });

    it('usa 7 dias como prazo padrão quando expiresInDays é omitido', async () => {
      await service.create('userA', {
        challengedId: 'userB',
        sport: 'corrida',
        metric: 'distance',
        target: 5,
      });
      const exp = new Date((repo.create.mock.calls[0][0] as any).expiresAt).getTime();
      expect(exp).toBeGreaterThan(Date.now() + 6 * 86_400_000);
    });

    it('bloqueia auto-desafio', async () => {
      await expect(
        service.create('userA', {
          challengedId: 'userA',
          sport: 'corrida',
          metric: 'distance',
          target: 5,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('respond', () => {
    it('aceita um desafio pendente direcionado ao usuário', async () => {
      repo.findOne.mockResolvedValue({ id: 'c1', challenged_id: 'userB', status: 'pending' });
      const result = await service.respond('userB', 'c1', true);
      expect(result.status).toBe('accepted');
    });

    it('recusa um desafio pendente', async () => {
      repo.findOne.mockResolvedValue({ id: 'c1', challenged_id: 'userB', status: 'pending' });
      const result = await service.respond('userB', 'c1', false);
      expect(result.status).toBe('declined');
    });

    it('404 quando o desafio não existe', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.respond('userB', 'x', true)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('bloqueia quem não é o desafiado', async () => {
      repo.findOne.mockResolvedValue({ id: 'c1', challenged_id: 'userB', status: 'pending' });
      await expect(service.respond('intruso', 'c1', true)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('bloqueia responder um desafio já respondido', async () => {
      repo.findOne.mockResolvedValue({ id: 'c1', challenged_id: 'userB', status: 'accepted' });
      await expect(service.respond('userB', 'c1', true)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('complete', () => {
    it('marca como concluído e define o vencedor', async () => {
      repo.findOne.mockResolvedValue({
        id: 'c1', challenger_id: 'userA', challenged_id: 'userB', status: 'accepted',
      });
      const result = await service.complete('userA', 'c1');
      expect(result.status).toBe('completed');
      expect(result.winner_id).toBe('userA');
    });

    it('bloqueia completar um desafio que não está aceito', async () => {
      repo.findOne.mockResolvedValue({
        id: 'c1', challenger_id: 'userA', challenged_id: 'userB', status: 'pending',
      });
      await expect(service.complete('userA', 'c1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('bloqueia terceiros de completar', async () => {
      repo.findOne.mockResolvedValue({
        id: 'c1', challenger_id: 'userA', challenged_id: 'userB', status: 'accepted',
      });
      await expect(service.complete('intruso', 'c1')).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
