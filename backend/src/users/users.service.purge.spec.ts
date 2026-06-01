import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LessThan } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UserBlock } from './entities/user-block.entity';
import { UserReport } from './entities/user-report.entity';

function repoMock() {
  return {
    update: jest.fn().mockResolvedValue({}),
    find: jest.fn(),
    delete: jest.fn().mockResolvedValue({}),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
}

describe('UsersService — LGPD soft-delete + purge', () => {
  let service: UsersService;
  let userRepo: ReturnType<typeof repoMock>;

  beforeEach(async () => {
    userRepo = repoMock();
    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(UserBlock), useValue: repoMock() },
        { provide: getRepositoryToken(UserReport), useValue: repoMock() },
      ],
    }).compile();
    service = moduleRef.get(UsersService);
  });

  describe('anonymizeUser', () => {
    it('anonimiza PII, desativa e marca deletedAt (soft-delete)', async () => {
      await service.anonymizeUser('abc12345-xxxx');
      expect(userRepo.update).toHaveBeenCalledTimes(1);
      const patch = userRepo.update.mock.calls[0][1];
      expect(patch.name).toBe('Usuário Removido');
      expect(patch.email).toMatch(/@deleted\.sync$/);
      expect(patch.bio).toBeNull();
      expect(patch.avatarUrl).toBeNull();
      expect(patch.isActive).toBe(false);
      expect(patch.deletedAt).toBeInstanceOf(Date); // soft-delete marker
    });
  });

  describe('purgeDeletedAccounts', () => {
    it('não chama delete quando não há contas vencidas', async () => {
      userRepo.find.mockResolvedValue([]);
      const removed = await service.purgeDeletedAccounts(30);
      expect(removed).toBe(0);
      expect(userRepo.delete).not.toHaveBeenCalled();
    });

    it('hard-deleta contas soft-deletadas há mais de 30 dias', async () => {
      userRepo.find.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]);
      const removed = await service.purgeDeletedAccounts(30);
      expect(removed).toBe(2);
      // busca com withDeleted + filtro de cutoff
      expect(userRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          withDeleted: true,
          where: { deletedAt: expect.anything() },
        }),
      );
      expect(userRepo.delete).toHaveBeenCalledWith(['u1', 'u2']);
    });

    it('usa o cutoff baseado no graceDays informado', async () => {
      userRepo.find.mockResolvedValue([]);
      await service.purgeDeletedAccounts(7);
      const whereArg = (userRepo.find.mock.calls[0][0] as any).where.deletedAt;
      // LessThan(date) — confere que é o operador correto
      expect(whereArg).toEqual(LessThan(expect.any(Date)));
    });
  });
});
