// Endpoint de seed pra popular DB com usuários fake e atividades demo.
// Protegido por SEED_TOKEN env. Idempotente — ignora se já populou.
import { Controller, Post, Headers, ForbiddenException, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, SportLevel } from '../../users/entities/user.entity';
import { Activity } from '../../activities/entities/activity.entity';
import { ActivityPoint } from '../../activities/entities/activity-point.entity';

// 20 atletas fake distribuídos em São Paulo, RJ, BH, Porto Alegre
const FAKE_USERS = [
  { name: 'Ana Silva', email: 'ana@demo.sync', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80', bio: 'Maratonista 🏃‍♀️ Café e quilometragem', city: 'São Paulo', lat: -23.5505, lng: -46.6333, sports: ['Corrida', 'Yoga'], level: SportLevel.ADVANCED },
  { name: 'Carlos Mendes', email: 'carlos@demo.sync', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80', bio: 'Ciclista urbano. 100km/semana 🚴', city: 'São Paulo', lat: -23.5605, lng: -46.6433, sports: ['Ciclismo'], level: SportLevel.INTERMEDIATE },
  { name: 'Juliana Costa', email: 'juliana@demo.sync', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80', bio: 'Triatleta amadora. Adoro pista 🏊‍♀️', city: 'São Paulo', lat: -23.5455, lng: -46.6533, sports: ['Natação', 'Corrida', 'Ciclismo'], level: SportLevel.ADVANCED },
  { name: 'Pedro Almeida', email: 'pedro@demo.sync', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80', bio: 'Iniciante na corrida, vamos juntos!', city: 'São Paulo', lat: -23.5705, lng: -46.6233, sports: ['Corrida'], level: SportLevel.BEGINNER },
  { name: 'Mariana Lima', email: 'mariana@demo.sync', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80', bio: 'CrossFit + Trail running 🏔️', city: 'Rio de Janeiro', lat: -22.9068, lng: -43.1729, sports: ['CrossFit', 'Trilha'], level: SportLevel.ADVANCED },
  { name: 'Rafael Santos', email: 'rafael@demo.sync', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80', bio: 'Sub-3h na maratona, vem treinar comigo!', city: 'São Paulo', lat: -23.5380, lng: -46.6400, sports: ['Corrida'], level: SportLevel.ADVANCED },
  { name: 'Beatriz Rocha', email: 'beatriz@demo.sync', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80', bio: 'Yoga + caminhada matinal ☀️', city: 'São Paulo', lat: -23.5610, lng: -46.6350, sports: ['Yoga', 'Caminhada'], level: SportLevel.INTERMEDIATE },
  { name: 'Lucas Ferreira', email: 'lucas@demo.sync', avatar: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=400&q=80', bio: 'Mountain biker 🚵‍♂️ Trilhas no fds', city: 'Belo Horizonte', lat: -19.9167, lng: -43.9345, sports: ['Ciclismo', 'Trilha'], level: SportLevel.ADVANCED },
  { name: 'Camila Souza', email: 'camila@demo.sync', avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&q=80', bio: 'Pilates + corrida leve. Mãe atleta 💪', city: 'São Paulo', lat: -23.5500, lng: -46.6600, sports: ['Corrida', 'Pilates'], level: SportLevel.INTERMEDIATE },
  { name: 'Bruno Carvalho', email: 'bruno@demo.sync', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&q=80', bio: 'Boxe + corrida HIIT 🥊', city: 'São Paulo', lat: -23.5520, lng: -46.6520, sports: ['Boxe', 'Corrida'], level: SportLevel.ADVANCED },
  { name: 'Larissa Pinto', email: 'larissa@demo.sync', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80', bio: 'Treinando pra primeira meia 🎯', city: 'Porto Alegre', lat: -30.0346, lng: -51.2177, sports: ['Corrida'], level: SportLevel.INTERMEDIATE },
  { name: 'Diego Oliveira', email: 'diego@demo.sync', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&q=80', bio: 'Surfista + corredor de praia 🏄‍♂️', city: 'Florianópolis', lat: -27.5954, lng: -48.5480, sports: ['Surfe', 'Corrida'], level: SportLevel.ADVANCED },
  { name: 'Fernanda Dias', email: 'fernanda@demo.sync', avatar: 'https://images.unsplash.com/photo-1545167622-3a6ac756afa4?w=400&q=80', bio: 'Pesquisadora + corrida = sanidade 📚', city: 'São Paulo', lat: -23.5630, lng: -46.6400, sports: ['Corrida', 'Yoga'], level: SportLevel.INTERMEDIATE },
  { name: 'Thiago Ribeiro', email: 'thiago@demo.sync', avatar: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=400&q=80', bio: 'Engenheiro + ciclista. 5K diário 🚴‍♂️', city: 'São Paulo', lat: -23.5400, lng: -46.6300, sports: ['Ciclismo'], level: SportLevel.INTERMEDIATE },
  { name: 'Patrícia Gomes', email: 'patricia@demo.sync', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&q=80', bio: 'Natação master 🏊‍♀️ Adoro raia longa', city: 'São Paulo', lat: -23.5550, lng: -46.6400, sports: ['Natação'], level: SportLevel.ADVANCED },
  { name: 'Marcelo Araújo', email: 'marcelo@demo.sync', avatar: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=400&q=80', bio: 'Cross + corrida. Fim de semana é trilha', city: 'São Paulo', lat: -23.5650, lng: -46.6450, sports: ['CrossFit', 'Trilha'], level: SportLevel.ADVANCED },
  { name: 'Renata Castro', email: 'renata@demo.sync', avatar: 'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=400&q=80', bio: 'Beginner runner 🐢 Mas constante!', city: 'Rio de Janeiro', lat: -22.9100, lng: -43.1900, sports: ['Corrida'], level: SportLevel.BEGINNER },
  { name: 'Gustavo Nunes', email: 'gustavo@demo.sync', avatar: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=400&q=80', bio: 'Maratonista + cervejeiro 🍺', city: 'Curitiba', lat: -25.4284, lng: -49.2733, sports: ['Corrida'], level: SportLevel.ADVANCED },
  { name: 'Vanessa Martins', email: 'vanessa@demo.sync', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&q=80', bio: 'Yoga teacher + caminhada. Bom dia! 🌅', city: 'São Paulo', lat: -23.5570, lng: -46.6480, sports: ['Yoga', 'Caminhada'], level: SportLevel.INTERMEDIATE },
  { name: 'Rodrigo Tavares', email: 'rodrigo@demo.sync', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&q=80', bio: 'Triatleta. Foco em Ironman 70.3 💪', city: 'São Paulo', lat: -23.5480, lng: -46.6450, sports: ['Natação', 'Ciclismo', 'Corrida'], level: SportLevel.ADVANCED },
];

@ApiTags('Admin Seed')
@Controller('api/admin')
export class SeedController {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Activity) private readonly activityRepo: Repository<Activity>,
    @InjectRepository(ActivityPoint) private readonly pointRepo: Repository<ActivityPoint>,
  ) {}

  @Get('seed-status')
  @ApiOperation({ summary: 'Status do seed (quantos demo users existem)' })
  async status() {
    const count = await this.userRepo
      .createQueryBuilder('u')
      .where('u.email LIKE :p', { p: '%@demo.sync' })
      .getCount();
    return { demoUsers: count, expected: FAKE_USERS.length };
  }

  @Post('seed-demo')
  @ApiOperation({ summary: 'Popula DB com 20 usuários fake + atividades. Idempotente.' })
  async seed(@Headers('x-seed-token') token: string) {
    // Anti-abuso: bloqueia se já populou (20 demo users existem) — exige token pra re-rodar
    const existingCount = await this.userRepo
      .createQueryBuilder('u')
      .where('u.email LIKE :p', { p: '%@demo.sync' })
      .getCount();

    if (existingCount >= FAKE_USERS.length) {
      // Já populou: exige SEED_TOKEN pra fazer qualquer coisa
      if (!process.env.SEED_TOKEN || token !== process.env.SEED_TOKEN) {
        throw new ForbiddenException('Demo já populado. Use SEED_TOKEN pra re-rodar.');
      }
    }
    // Caso contrário: liberado (primeira execução em prod)

    const hashedPassword = await bcrypt.hash('demo1234', 10);
    let created = 0;
    let skipped = 0;
    const createdUsers: User[] = [];

    for (const fake of FAKE_USERS) {
      const existing = await this.userRepo.findOne({ where: { email: fake.email } });
      if (existing) {
        skipped++;
        createdUsers.push(existing);
        continue;
      }
      const user = this.userRepo.create({
        name: fake.name,
        email: fake.email,
        password: hashedPassword,
        bio: fake.bio,
        avatarUrl: fake.avatar,
        city: fake.city,
        latitude: fake.lat,
        longitude: fake.lng,
        sports: fake.sports,
        level: fake.level,
        objectives: ['Melhorar performance', 'Fazer amigos'],
        availability: ['weekday_morning', 'weekend_morning'],
        onboardingCompleted: true,
        isActive: true,
      });
      const saved = await this.userRepo.save(user);
      createdUsers.push(saved);
      created++;
    }

    // Cria 1 atividade completa por usuário (50% probabilidade)
    let activitiesCreated = 0;
    for (const u of createdUsers) {
      const hasActivity = await this.activityRepo
        .createQueryBuilder('a')
        .where('a.user_id = :uid', { uid: u.id })
        .getCount();
      if (hasActivity > 0) continue;
      if (Math.random() < 0.5) continue;

      const distanceM = 3000 + Math.random() * 12000; // 3-15km
      const durationS = Math.round(distanceM / (2.5 + Math.random() * 1.5)); // pace variável
      const avgPace = (durationS / 60) / (distanceM / 1000);
      const startTime = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + durationS * 1000);

      const activity = await this.activityRepo.save(
        this.activityRepo.create({
          user_id: u.id,
          sport: (u.sports && u.sports[0]?.toLowerCase()) || 'running',
          startTime,
          endTime,
          distance: distanceM,
          duration: durationS,
          avgPace: Math.round(avgPace * 100) / 100,
          avgSpeed: Math.round(((distanceM / 1000) / (durationS / 3600)) * 10) / 10,
          isCompleted: true,
        }),
      );

      // 30 pontos GPS fake ao redor da localização do user
      const pts = [];
      for (let i = 0; i < 30; i++) {
        pts.push(
          this.pointRepo.create({
            activity_id: activity.id,
            latitude: (u.latitude ?? -23.55) + (Math.random() - 0.5) * 0.01,
            longitude: (u.longitude ?? -46.63) + (Math.random() - 0.5) * 0.01,
            altitude: 750 + Math.random() * 100,
            timestamp: new Date(startTime.getTime() + i * (durationS * 1000) / 30),
          }),
        );
      }
      await this.pointRepo.save(pts);
      activitiesCreated++;
    }

    return {
      ok: true,
      created,
      skipped,
      activitiesCreated,
      totalDemoUsers: createdUsers.length,
      message: `${created} criados, ${skipped} já existiam. ${activitiesCreated} atividades fake.`,
    };
  }
}
