<div align="center">

# 🟠 Sync

**O app social esportivo geolocalizado para quem treina de verdade.**

Conecte. Treine. Evolua. — junto com uma comunidade que respira esporte.

[🌐 Acessar app](https://tutu-sync.vercel.app) · [📱 Demo login](#demo) · [📖 Documentação](./DOCUMENTACAO.md)

[![Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?logo=vercel)](https://tutu-sync.vercel.app)
[![Railway](https://img.shields.io/badge/Backend-Railway-0B0D0E?logo=railway)](https://sync-production-4830.up.railway.app/health)
[![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?logo=nestjs)](https://nestjs.com)
[![React Native](https://img.shields.io/badge/React%20Native-0.76-61DAFB?logo=react)](https://reactnative.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)](https://postgresql.org)
[![License](https://img.shields.io/badge/License-MIT-FF6B35)](#licença)

</div>

---

## ✨ O que é o Sync

Sync é uma plataforma esportiva mobile-first que combina o melhor do **Strava**, **Adidas Running Club** e **Tinder fitness** em um único app:

- 🏃 **Tracking GPS profissional** — pace, calorias, altitude, audio coach, auto-pause
- 👥 **Match com atletas próximos** — swipe Tinder-like com compatibilidade por pace
- 🗺️ **Planejador de rotas** — clique no mapa, escolha esporte, veja calorias/tempo
- 🔥 **Heatmap** das rotas mais corridas da sua cidade
- 🚩 **Segmentos com KOM/QOM** — trechos cronometrados e ranking automático ao finalizar o treino
- 🏆 **Gamificação completa** — XP, levels, 50+ conquistas, daily quests
- 📰 **Feed social** estilo Strava com fotos, kudos e comentários
- 👯 **Grupos / Clubes** com ranking interno
- 📋 **Planos de treino** prontos (5K, 10K, 21K)
- 🤖 **IA Coach** com insights baseados nos seus treinos
- 📡 **Live tracking** compartilhável + botão "Vai!" pra família torcer
- 🌐 **PWA instalável** + iOS + Android

**Tudo grátis. Open source. Brasileiro 🇧🇷.**

---

## 🚀 Demo

App rodando em produção:

| Ambiente | URL | Status |
|----------|-----|--------|
| **Frontend (PWA)** | https://tutu-sync.vercel.app | 🟢 Online |
| **Backend API** | https://sync-production-4830.up.railway.app | 🟢 Online |
| **Healthcheck** | https://sync-production-4830.up.railway.app/health | 🟢 OK |

### Login de demonstração

Use qualquer um dos **20 atletas de teste** já cadastrados:

```
Email:    ana@demo.sync       (ou carlos@demo.sync, juliana@demo.sync, etc.)
Senha:    demo1234
```

Ou crie sua própria conta em https://tutu-sync.vercel.app/

---

## 🎯 Features completas

<details>
<summary><b>🏃 Tracking & Atividade</b> (clique pra expandir)</summary>

- GPS de alta precisão (sem fallback fake)
- Distância via Haversine + filtro de ruído
- Pace em min:seg/km, velocidade km/h
- Calorias via fórmula MET (varia por esporte)
- Altitude e ganho acumulado de elevação
- Voltas manuais (laps)
- **Auto-pause** — detecta 5s parado e pausa automático
- **Audio coach (TTS)** — anuncia início, cada km, pause/resume, finish
- **Pace zones Z1-Z5** baseadas no LT pace do usuário
- **Live tracking** com link público compartilhável (24h)
- **Botão "Vai!"** público pra família torcer
- Export **GPX/CSV como arquivo** (expo-sharing) compatível Strava/Garmin
- **Recordes pessoais (PRs)** detectados automaticamente (distância/pace) com banner de celebração
- Badges de PR no histórico
- Histórico completo com mapa da rota
- Resumo natural automático ("Você correu 5km em 28min…")
- Modal de avaliação pós-treino (energia, satisfação, RPE, dor, tipo)

</details>

<details>
<summary><b>👥 Social & Match</b></summary>

- Discovery Tinder-like — swipe atletas próximos
- Match por pace compatível + esporte + nível
- Like / Match mútuo
- Chat 1:1 em tempo real (WebSocket)
- **Mensagens de voz** no chat (grava, envia e reproduz)
- **Recibos de leitura** (✓✓) em tempo real
- **Follow/unfollow** (separado de match)
- Stories de treino (foto/**vídeo**, expira 24h)
- Feed estilo Strava com fotos + kudos + comentários
- Posts com rota desenhada + métricas
- Bloquear / denunciar usuário (com tela de bloqueados)
- **Selo verificado** (atletas/coaches/academias)
- Mentions e reactions em comentários

</details>

<details>
<summary><b>⚡ Desafios & Premium</b></summary>

- **Desafios entre atletas** — distância, pace ou duração, com prazo
- Caixa de entrada/saída, aceitar/recusar, marcar concluído + vencedor
- **Planos Premium** (Free / Premium / Atleta Pro) com comparação de recursos
- Badge de plano e selo verificado no perfil

</details>

<details>
<summary><b>🗺️ Mapa & Rotas</b></summary>

- Mapa minimalista estilo Strava (CartoDB Dark)
- **Planejador de rotas** — clique no destino, calcula via OSRM (free)
- Distância + tempo + calorias por sport (walking/running/cycling)
- **Heatmap** das rotas populares próximas
- Marker de eventos no mapa
- Reverse geocoding via Nominatim
- Funciona offline parcialmente (cache PWA)

</details>

<details>
<summary><b>🏆 Gamificação</b></summary>

- XP + Levels (1-100 com 9 títulos: Iniciante → Imortal)
- 10 XP/km, 50 XP/atividade, 100 XP/conquista, 25 XP/dia em streak
- **3 Daily Quests rotativas** (determinísticas por data)
- **Streaks** — dias consecutivos com atividade
- **50+ Conquistas** (distância, frequência, pace, clima, sazonais)
- **Ranking** mensal / semanal / amigos
- Pódio top 3 com medalhas

</details>

<details>
<summary><b>🚩 Segmentos (estilo Strava)</b></summary>

- Trechos cronometrados criados pela comunidade
- **Leaderboard** por segmento — melhor tempo de cada atleta, ranqueado
- **KOM/QOM** — o mais rápido vira "rei/rainha do trecho"
- **Recorde pessoal (PR)** detectado a cada novo tempo
- **Auto-match**: ao finalizar um treino, os segmentos cobertos pela rota são
  cronometrados **automaticamente** a partir dos pontos GPS (raio de 35m no
  início e fim) — o atleta não precisa fazer nada
- Registro manual de tempo também disponível (modal min:seg)
- Lista de segmentos próximos via GPS + tela de detalhe com medalhas
- Idempotente: um effort por treino/segmento

</details>

<details>
<summary><b>👯 Grupos / Clubes</b></summary>

- Criar grupo público ou privado
- Privado gera código de convite
- Soma cumulativa de km e atividades
- Ranking de grupos por contribuição
- Ranking de membros dentro do grupo

</details>

<details>
<summary><b>📋 Planos de treino</b></summary>

- 5K em 8 semanas (iniciante)
- 10K em 10 semanas (intermediário)
- 21K (meia maratona) em 12 semanas
- Cronograma com tipo (easy/long/interval/tempo/rest)
- Persiste plano ativo no AsyncStorage
- Timeline visual de progresso

</details>

<details>
<summary><b>🤖 IA Coach</b></summary>

- Analisa últimos 30 dias automaticamente
- Detecta **overtraining** (>6 treinos/semana)
- **Análise de consistência** (dias ativos)
- **Pace trend** (compara últimas 5 vs anteriores 5)
- Sugestão de próximo treino
- Lembretes de hidratação
- Cards de insights com emoji + cor por tipo

</details>

<details>
<summary><b>🛡️ Segurança</b></summary>

- bcrypt 12 rounds
- JWT refresh token rotation (15min access + 7d refresh)
- Account lockout (5 tentativas → 30min)
- Anti-enumeração em register/login
- CSP estrito + HSTS preload + Permissions-Policy
- Audit log com IP mascarado (LGPD)
- Sanitização XSS em todo UGC
- WebSocket autenticado
- Live token expira em 24h
- LGPD compliant: export + anonimização de conta
- Rate limiting por rota

</details>

<details>
<summary><b>🌡️ Eventos & Clima</b></summary>

- Eventos relâmpago com push pra usuários no raio
- **Adicionar evento ao calendário** do celular (expo-calendar, com alarmes)
- Clima atual + recomendação por hora
- **Sugestão de treino baseada no clima** (card no Discovery)
- AQI (qualidade do ar)
- Sunrise/sunset
- Melhor horário pra treinar (scoring inteligente)

</details>

---

## 🛠️ Stack técnico

### Backend
```
NestJS 10  ·  TypeORM  ·  PostgreSQL  ·  Socket.io  ·  JWT + bcrypt
@nestjs/throttler  ·  Helmet  ·  multer  ·  @nestjs/schedule
Railway hosting + auto-deploy
```

### Mobile
```
React Native 0.76  ·  Expo 52  ·  TypeScript
React Navigation 6  ·  Zustand  ·  Axios
Leaflet (web) + react-native-maps (native)
expo-location · expo-secure-store · expo-notifications
expo-image (cache em disco) · expo-av (áudio) · expo-haptics · expo-calendar
Web Speech API · Service Worker · PWA manifest
```

### Qualidade
```
TypeScript estrito (tsc 0 erros)  ·  Jest (backend + lógica mobile)
GitHub Actions CI (typecheck + testes em todo PR)
```

### Resiliência (sem perder dados na mão do usuário)
```
Chat: reconexão automática de socket (re-vincula handlers + re-entra nas salas)
Fila offline de mensagens — reenvia quando a internet volta
Swipe (like/nope) e like do feed com retry antes de reverter
Retry automático em GET no cold-start do backend (Railway free tier)
Sessão expirada → volta pro login sozinho (sem tela travada)
Estados de erro consistentes com "Tentar de novo" (sem dado falso/mock)
```

### APIs externas (todas free)
```
OSRM (routing)  ·  OpenStreetMap + CartoDB (tiles)
Nominatim (geocoding)  ·  Open-Meteo (clima + AQI)
Sunrise-Sunset.org  ·  ipapi.co  ·  Expo Push  ·  Unsplash
```

### Hosting
```
Frontend:  Vercel (CDN global)
Backend:   Railway (container Node.js)
Database:  PostgreSQL (Railway volume persistente)
```

---

## 🏗️ Arquitetura

```
sync/
├── backend/          NestJS API + WebSocket
│   ├── src/
│   │   ├── auth/             # Login, register, refresh, sessions, change-password
│   │   ├── users/            # CRUD perfil, blocks, reports, LGPD export
│   │   ├── activities/       # Tracking, points, comments, kudos, ratings, photos
│   │   ├── matching/         # Discovery, swipe, match
│   │   ├── chat/             # Mensagens 1:1 via WebSocket
│   │   ├── events/           # Eventos esportivos + relâmpago
│   │   ├── groups/           # Clubes públicos/privados
│   │   ├── stories/          # Stories 24h
│   │   ├── activity-feed/    # Feed social
│   │   ├── follows/          # Follow/unfollow
│   │   ├── segments/         # KOM/QOM
│   │   ├── coach/            # IA Coach insights
│   │   ├── ranking/          # Mensal/semanal/friends
│   │   ├── achievements/     # 50+ conquistas
│   │   ├── stats/            # Stats agregadas
│   │   ├── notifications/    # Push + in-app + reminders cron
│   │   ├── weather/          # Open-Meteo integration
│   │   ├── subscriptions/    # Free/Premium/Pro tiers
│   │   ├── feedback/         # Bug/sugestão/rating/support
│   │   └── common/
│   │       ├── security/     # CSP, audit log, sanitize
│   │       └── seed/         # Demo users seeder
│   └── package.json
│
├── mobile/           Expo / React Native
│   ├── src/
│   │   ├── screens/
│   │   │   ├── Auth/         # Welcome (com Strava landing), Login, Register
│   │   │   ├── Onboarding/   # Sports, Level, Objectives, Availability, Location
│   │   │   ├── Tracking/     # TrackingMain, ActiveTracking, Summary
│   │   │   ├── Home/         # Discovery (swipe)
│   │   │   ├── Map/          # MapMain (heatmap + planner)
│   │   │   ├── Chat/         # Conversations, ChatRoom
│   │   │   ├── Feed/         # FeedScreen
│   │   │   ├── Profile/      # MyProfile, EditProfile, UserProfile
│   │   │   ├── Events/       # CreateEvent, EventDetail
│   │   │   ├── Stories/      # Viewer, Create
│   │   │   ├── Groups/       # ListGroups, GroupDetail
│   │   │   ├── Training/     # TrainingPlanScreen
│   │   │   ├── Settings/     # SettingsScreen com tudo funcional
│   │   │   ├── Legal/        # Privacy, Terms, Help
│   │   │   ├── Ranking/      # RankingScreen
│   │   │   └── ...
│   │   ├── components/       # Logo, Toast, modals, widgets
│   │   ├── services/         # api, auth, tracking-socket, routing, audio-coach
│   │   ├── utils/            # haversine, training-plans, daily-quests, xp-system
│   │   ├── theme/            # colors, spacing, images
│   │   ├── store/            # authStore, onboardingStore (Zustand)
│   │   └── navigation/       # MainTabNavigator + stacks
│   ├── public/               # service-worker.js, manifest.json
│   └── package.json
│
├── DOCUMENTACAO.md   Documentação técnica completa
└── README.md         (você está aqui)
```

---

## 🚀 Rodando localmente

### Pré-requisitos

```bash
node >= 18
npm >= 9
PostgreSQL (ou usar SQLite via better-sqlite3 em dev)
```

### Backend

```bash
cd backend
npm install --legacy-peer-deps
cp .env.example .env  # configurar DATABASE_URL e JWT_SECRET
npm run start:dev     # http://localhost:3000
```

### Mobile (web dev)

```bash
cd mobile
npm install --legacy-peer-deps
npm run web           # http://localhost:19006
```

### Mobile (iOS/Android dev)

```bash
cd mobile
npm run ios           # ou npm run android
```

### Variáveis de ambiente (Railway / dev)

```env
NODE_ENV=production
DATABASE_URL=postgres://...
JWT_SECRET=<64+ chars random>
JWT_EXPIRATION=7d
DB_SSL=true
DB_SYNCHRONIZE=true
PORT=3000
FRONTEND_URL=https://tutu-sync.vercel.app

# Opcionais
SWAGGER_USER=admin
SWAGGER_PASS=<senha>
SEED_TOKEN=<token>          # pra re-rodar seed em prod
REMINDERS_DISABLED=false    # cron de hidratação
GOOGLE_CLIENT_ID=<config>   # OAuth (futuro)
STRIPE_SECRET_KEY=<config>  # Pagamentos (futuro)
```

---

## 🎨 Logo & Branding

| Cor | Hex | Uso |
|-----|-----|-----|
| 🟣 Brand | `#4A0E2C` | Logo infinito, badges principais |
| 🟠 Accent | `#FF6B35` | CTAs, tracking, gradients |
| ⚫ Background | `#0A0A0F` | Dark theme base |

**Logo:** símbolo de infinito (∞) em roxo profundo — representando conexão e movimento contínuo.

---

## 📡 API

Swagger docs: https://sync-production-4830.up.railway.app/api/docs *(protegido com basic auth em prod)*

### Endpoints principais

```
POST   /api/auth/register             # Criar conta
POST   /api/auth/login                # Login
POST   /api/auth/refresh              # Renovar token
POST   /api/auth/change-password      # Alterar senha
GET    /api/auth/sessions             # Sessões ativas
DELETE /api/auth/sessions/:familyId   # Revogar sessão

GET    /api/users/me                  # Meu perfil
PUT    /api/users/me                  # Atualizar perfil
GET    /api/users/me/export           # Export LGPD
DELETE /api/users/me                  # Anonimizar conta (LGPD)

POST   /api/activities/start          # Iniciar treino
POST   /api/activities/:id/points     # Adicionar ponto GPS
PUT    /api/activities/:id/finish     # Finalizar
POST   /api/activities/:id/rating     # Avaliar treino
GET    /api/activities/:id/export.gpx # Export GPX
GET    /api/activities/compare/:a1/:a2 # Comparar 2 atividades
GET    /api/activities/heatmap/nearby # Heatmap rotas próximas

POST   /api/matching/swipe            # Like / pass
GET    /api/matching/discover         # Próximos atletas
GET    /api/matching/matches          # Meus matches

POST   /api/follows/:userId           # Seguir
DELETE /api/follows/:userId           # Deixar de seguir
GET    /api/follows/me/counts         # Contagens

POST   /api/groups                    # Criar grupo
GET    /api/groups/public             # Grupos públicos
GET    /api/groups/ranking            # Ranking de grupos

GET    /api/coach/insights            # IA Coach insights
GET    /api/subscriptions/plans       # Planos disponíveis
POST   /api/feedback                  # Enviar feedback
GET    /api/segments/nearby           # Segments próximos
POST   /api/segments                   # Criar segment
GET    /api/segments/:id               # Detalhe do segment
GET    /api/segments/:id/leaderboard   # Ranking de tempos (KOM/QOM)
POST   /api/segments/:id/effort        # Registrar tempo no trecho
```

---

## 🤝 Contribuindo

Pull requests são bem-vindos! Pra mudanças grandes, abra uma issue primeiro pra discutirmos.

```bash
1. Fork o projeto
2. git checkout -b feature/MinhaFeature
3. git commit -m 'feat: adiciona MinhaFeature'
4. git push origin feature/MinhaFeature
5. Abra um Pull Request
```

---

## 📄 Licença

MIT © Arthur Silva Narciso

---

## 🙏 Créditos

- **Mapas:** OpenStreetMap contributors + CartoDB
- **Roteamento:** OSRM (Project OSRM)
- **Geocoding:** Nominatim
- **Clima:** Open-Meteo (free, sem API key)
- **Imagens:** Unsplash
- **Inspiração:** Strava, Adidas Running Club, Nike Run Club

---

<div align="center">

**Feito com 🟣 + 🟠 no Brasil.**

[🌐 tutu-sync.vercel.app](https://tutu-sync.vercel.app)

</div>
