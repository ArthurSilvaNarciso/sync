# 📱 SYNC — Documentação Técnica Completa

**App social esportivo geolocalizado** — Encontre parceiros de treino, organize eventos, acompanhe seu progresso em tempo real.

- **Frontend:** https://tutu-sync.vercel.app
- **Backend:** https://sync-production-4830.up.railway.app
- **Repositório:** https://github.com/ArthurSilvaNarciso/sync
- **Autor:** Arthur Silva Narciso (Tutu)
- **Versão:** 1.0.0
- **Última atualização:** 2026-05-22

---

# Índice

1. [Visão Geral](#1-visão-geral)
2. [Arquitetura](#2-arquitetura)
3. [Stack de Tecnologias](#3-stack-de-tecnologias)
4. [Estrutura de Pastas](#4-estrutura-de-pastas)
5. [Banco de Dados](#5-banco-de-dados)
6. [API REST — Endpoints](#6-api-rest--endpoints)
7. [WebSockets](#7-websockets)
8. [Telas Mobile/Web](#8-telas-mobileweb)
9. [Componentes Reutilizáveis](#9-componentes-reutilizáveis)
10. [Serviços e Utilitários](#10-serviços-e-utilitários)
11. [Requisitos Funcionais (RF)](#11-requisitos-funcionais-rf)
12. [Requisitos Não-Funcionais (RNF)](#12-requisitos-não-funcionais-rnf)
13. [Segurança](#13-segurança)
14. [Performance](#14-performance)
15. [Deploy & Infra](#15-deploy--infra)
16. [Variáveis de Ambiente](#16-variáveis-de-ambiente)
17. [Como rodar localmente](#17-como-rodar-localmente)
18. [APIs Externas](#18-apis-externas)
19. [PWA](#19-pwa)
20. [Roadmap / Pendências](#20-roadmap--pendências)

---

# 1. Visão Geral

**Sync** é uma plataforma social esportiva com geolocalização que combina:
- **Match estilo Tinder** entre atletas próximos
- **Tracking GPS Strava-like** em tempo real
- **Stories de treino** (24h)
- **Eventos esportivos** organizados pela comunidade
- **Chat 1:1** entre matches
- **Grupos/clubes** com ranking colaborativo
- **Feed de atividades** público
- **Gamificação** (XP, levels, conquistas, daily quests)
- **Planos de treino** prontos (5K/10K/21K)
- **Audio coach** com TTS durante treinos

Plataforma única para iOS, Android e Web (PWA instalável).

### Diferenciais
- 100% **APIs gratuitas** (sem Google Maps/Stripe pagos)
- **Mapa self-hosted** com Leaflet + OpenStreetMap
- **Live tracking compartilhável** via link público
- **Auto-pause inteligente** durante treino
- **3 níveis de fallback de GPS** (alta precisão → IP → manual)

---

# 2. Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                        USUÁRIOS                             │
│       iOS App   │   Android App   │   PWA Web Browser       │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Vercel CDN)                    │
│  React Native + Expo 52  ─  React Native Web                │
│  https://tutu-sync.vercel.app                               │
└─────────────────────────────────────────────────────────────┘
                          │ HTTPS / WSS
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND (Railway)                          │
│  NestJS 10 + TypeORM + Socket.io                            │
│  https://sync-production-4830.up.railway.app                │
│  ┌─────────────┬──────────────┬───────────────┐             │
│  │  REST API   │  WebSocket   │  Static files │             │
│  └─────────────┴──────────────┴───────────────┘             │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  POSTGRES (Railway)                         │
│  15+ tables, synchronize=true (ou migrations futuro)        │
└─────────────────────────────────────────────────────────────┘

APIs EXTERNAS GRATUITAS (todas chamadas direto do cliente):
• OpenStreetMap (tiles do mapa)
• Nominatim (geocoding reverso)
• Open-Meteo (clima + AQI)
• Sunrise-Sunset.org
• Expo Push API (notificações)
• ipapi.co (geolocalização por IP, fallback)
• Unsplash (imagens hero)
```

### Padrões arquiteturais
- **Modular** — cada feature = módulo NestJS isolado
- **DTO + Validation Pipe** — todo input validado por class-validator
- **Repository pattern** via TypeORM
- **Guards** para autenticação JWT
- **Decorators** customizados (`@CurrentUser()`)
- **Stateless backend** (escalável horizontalmente)
- **JWT em SecureStore** no cliente (Keychain/EncryptedSharedPreferences)

---

# 3. Stack de Tecnologias

## 3.1 Backend

### Runtime e framework
| Tech | Versão | Uso |
|------|--------|-----|
| **Node.js** | 20+ | Runtime |
| **TypeScript** | 5.3 | Linguagem |
| **NestJS** | 10.3 | Framework |
| **Express** | (via Nest) | HTTP server |
| **Socket.io** | 4.7 | WebSockets |

### Banco e ORM
| Tech | Versão | Uso |
|------|--------|-----|
| **PostgreSQL** | 15+ | Produção (Railway) |
| **better-sqlite3** | 12 | Dev local (opcional) |
| **TypeORM** | 0.3 | ORM |
| **pg** | 8.11 | Driver Postgres |

### Auth e segurança
| Tech | Uso |
|------|-----|
| **@nestjs/jwt** | Geração e validação de JWT |
| **passport-jwt** | Strategy JWT |
| **bcrypt** | Hash de senhas (12 rounds) |
| **helmet** | Headers de segurança (CSP, HSTS, etc) |
| **@nestjs/throttler** | Rate limiting |
| **express-basic-auth** | Proteção do Swagger em prod |
| **class-validator** | Validação DTOs |
| **class-transformer** | Transformação DTOs |

### Features
| Tech | Uso |
|------|-----|
| **@nestjs/swagger** | Documentação API |
| **@nestjs/schedule** | Cron jobs (lembretes) |
| **@nestjs/websockets** | Gateway WebSocket |
| **@nestjs/platform-socket.io** | Adapter Socket.io |
| **@nestjs/serve-static** | Servir uploads |
| **multer** | Upload de arquivos |
| **axios** | HTTP client (chamadas externas server-side) |
| **@nestjs/axios** | Wrapper HTTP |
| **reflect-metadata** | Decorators metadata |
| **rxjs** | Observables (interno do Nest) |

## 3.2 Frontend (Mobile + Web)

### Core
| Tech | Versão | Uso |
|------|--------|-----|
| **React Native** | 0.76 | Framework UI |
| **React** | 18.3 | View library |
| **Expo SDK** | 52 | Toolkit RN |
| **TypeScript** | 5.3 | Linguagem |
| **React Native Web** | 0.19 | Web target |

### Navegação e estado
| Tech | Uso |
|------|-----|
| **@react-navigation/native** | Navegação |
| **@react-navigation/native-stack** | Stack navigator |
| **@react-navigation/bottom-tabs** | Tab bar inferior |
| **zustand** | Estado global (authStore, onboardingStore) |
| **@react-native-async-storage/async-storage** | Storage não-sensível |

### Rede e auth
| Tech | Uso |
|------|-----|
| **axios** | HTTP client com interceptors |
| **socket.io-client** | WebSocket cliente |
| **expo-secure-store** | Token JWT em Keychain/EncryptedSharedPreferences |

### Mapas e GPS
| Tech | Uso |
|------|-----|
| **react-native-maps** | Mapa nativo (iOS/Android) |
| **leaflet** | Mapa web self-hosted |
| **expo-location** | GPS nativo |
| **navigator.geolocation** | GPS web |

### Mídia e UI
| Tech | Uso |
|------|-----|
| **expo-image-picker** | Câmera/galeria (avatar, stories) |
| **expo-font** | Fontes customizadas |
| **expo-splash-screen** | Splash launch |
| **expo-linear-gradient** | Gradientes UI |
| **@expo/vector-icons** | Ícones (Ionicons) |
| **expo-status-bar** | Status bar |
| **expo-device** | Detecção de device |
| **expo-notifications** | Push notifications cliente |
| **react-native-svg** | Suporte SVG |
| **react-native-reanimated** | Animações nativas |
| **react-native-gesture-handler** | Gestos |
| **react-native-safe-area-context** | Safe areas |
| **react-native-screens** | Otimização navegação |

## 3.3 APIs Externas (todas gratuitas)

| API | Uso | Limite Free |
|-----|-----|-------------|
| **OpenStreetMap Tiles** | Mapa base | Ilimitado (atribuição) |
| **Nominatim** | Geocoding reverso | 1 req/sec |
| **Open-Meteo** | Clima atual + previsão | Ilimitado |
| **Open-Meteo Air Quality** | Qualidade do ar (AQI) | Ilimitado |
| **Sunrise-Sunset.org** | Nascer/pôr do sol | Ilimitado |
| **Expo Push API** | Push notifications | Ilimitado |
| **ipapi.co** | Geolocalização por IP (fallback) | 1k/dia |
| **Unsplash** | Imagens hero (URL direta) | Ilimitado |

## 3.4 Infraestrutura

| Serviço | Uso |
|---------|-----|
| **Vercel** | Frontend hosting + CDN global + HTTPS |
| **Railway** | Backend container + Postgres + Volume |
| **GitHub** | Versionamento + CI/CD via webhook |
| **jsdelivr.net** | CDN para Leaflet CSS/icons |

---

# 4. Estrutura de Pastas

```
SYNC/
├── backend/                      # NestJS API
│   ├── src/
│   │   ├── auth/                 # Autenticação JWT + Refresh tokens
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── refresh-token.service.ts
│   │   │   ├── auth.module.ts
│   │   │   ├── dto/
│   │   │   ├── entities/
│   │   │   │   └── refresh-token.entity.ts
│   │   │   └── guards/
│   │   ├── users/                # Usuários + perfil + LGPD
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   └── entities/
│   │   │       ├── user.entity.ts
│   │   │       ├── user-block.entity.ts
│   │   │       └── user-report.entity.ts
│   │   ├── activities/           # Tracking GPS, atividades, kudos, comentários
│   │   │   ├── activities.controller.ts
│   │   │   ├── activities.service.ts
│   │   │   ├── activities.gateway.ts  (WebSocket)
│   │   │   └── entities/
│   │   ├── matching/             # Discovery + likes + matches
│   │   ├── chat/                 # Chat 1:1 entre matches
│   │   ├── events/               # Eventos esportivos
│   │   ├── ranking/              # Ranking semanal/mensal/amigos
│   │   ├── notifications/        # Push + in-app + cron reminders
│   │   │   ├── push.service.ts
│   │   │   ├── reminders.service.ts  (cron)
│   │   │   └── entities/
│   │   ├── weather/              # Open-Meteo wrapper
│   │   ├── achievements/         # 50+ conquistas
│   │   ├── stats/                # Estatísticas agregadas
│   │   ├── stories/              # Stories 24h
│   │   ├── groups/               # Grupos/clubes
│   │   │   ├── groups.controller.ts
│   │   │   ├── groups.service.ts
│   │   │   └── entities/
│   │   │       ├── group.entity.ts
│   │   │       └── group-member.entity.ts
│   │   ├── activity-feed/        # Feed de atividades públicas
│   │   ├── common/
│   │   │   ├── security/         # Audit log + sanitização
│   │   │   │   ├── audit-log.entity.ts
│   │   │   │   ├── audit.service.ts
│   │   │   │   ├── sanitize.util.ts
│   │   │   │   └── security.module.ts
│   │   │   ├── decorators/       # @CurrentUser
│   │   │   └── utils/
│   │   │       └── haversine.ts
│   │   ├── config/
│   │   │   └── database.config.ts
│   │   ├── health.controller.ts  # /health endpoint
│   │   ├── app.module.ts
│   │   └── main.ts               # Bootstrap (Helmet, CORS, Swagger, etc)
│   ├── uploads/                  # Arquivos enviados (avatars, stories)
│   ├── package.json
│   ├── railway.json
│   ├── Procfile
│   ├── .npmrc                    # legacy-peer-deps=true
│   └── tsconfig.json
│
├── mobile/                       # React Native + Expo
│   ├── src/
│   │   ├── screens/
│   │   │   ├── Auth/
│   │   │   │   ├── WelcomeScreen.tsx       # Landing page
│   │   │   │   ├── LoginScreen.tsx
│   │   │   │   ├── RegisterScreen.tsx
│   │   │   │   └── SplashScreen.tsx
│   │   │   ├── Onboarding/
│   │   │   │   ├── SportsScreen.tsx
│   │   │   │   ├── LevelScreen.tsx
│   │   │   │   ├── ObjectivesScreen.tsx
│   │   │   │   ├── AvailabilityScreen.tsx
│   │   │   │   └── LocationScreen.tsx
│   │   │   ├── Home/
│   │   │   │   └── DiscoveryScreen.tsx     # Swipe Tinder-like
│   │   │   ├── Map/
│   │   │   │   └── MapMainScreen.tsx       # Mapa com eventos + heatmap
│   │   │   ├── Tracking/
│   │   │   │   ├── TrackingMainScreen.tsx  # Botão iniciar
│   │   │   │   ├── ActiveTrackingScreen.tsx  # Em treino
│   │   │   │   ├── ActivitySummaryScreen.tsx  # Resumo + postar feed
│   │   │   │   └── ActivityHistoryScreen.tsx
│   │   │   ├── Chat/
│   │   │   ├── Events/
│   │   │   ├── Profile/
│   │   │   │   ├── MyProfileScreen.tsx
│   │   │   │   └── EditProfileScreen.tsx
│   │   │   ├── Ranking/
│   │   │   │   └── RankingScreen.tsx       # Monthly/Weekly/Friends
│   │   │   ├── Stories/
│   │   │   │   ├── StoryViewerScreen.tsx
│   │   │   │   └── CreateStoryScreen.tsx
│   │   │   ├── Groups/
│   │   │   │   └── GroupsScreen.tsx        # Mine/Discover/Ranking
│   │   │   ├── Training/
│   │   │   │   └── TrainingPlanScreen.tsx  # 5K/10K/21K
│   │   │   └── LiveViewScreen.tsx          # Tracking público
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Toast.tsx
│   │   │   │   ├── Skeleton.tsx
│   │   │   │   ├── SkeletonList.tsx
│   │   │   │   └── ProgressBar.tsx
│   │   │   ├── layout/
│   │   │   │   └── ScreenContainer.tsx
│   │   │   ├── map/
│   │   │   │   ├── SyncMap.tsx              # Native
│   │   │   │   └── SyncMap.web.tsx          # Leaflet vanilla
│   │   │   ├── XPBar.tsx
│   │   │   ├── DailyQuestsCard.tsx
│   │   │   ├── StreakBadge.tsx
│   │   │   ├── StoriesBar.tsx
│   │   │   ├── ActivityComments.tsx
│   │   │   ├── TodayBriefWidget.tsx
│   │   │   └── BestTimeWidget.tsx
│   │   ├── services/
│   │   │   ├── api.ts                       # Axios + interceptors
│   │   │   ├── secure-storage.ts            # Wrapper SecureStore
│   │   │   ├── location.service.ts          # GPS + Nominatim
│   │   │   ├── external-apis.ts             # Clima, sun, AQI, etc
│   │   │   ├── tracking-socket.service.ts   # WS /tracking
│   │   │   ├── push-notifications.service.ts
│   │   │   ├── stories.service.ts
│   │   │   ├── groups.service.ts
│   │   │   ├── feed.service.ts
│   │   │   └── audio-coach.service.ts       # TTS
│   │   ├── utils/
│   │   │   ├── pace-zones.ts                # Z1-Z5
│   │   │   ├── xp-system.ts                 # XP + Levels
│   │   │   ├── daily-quests.ts              # 12 quests pool
│   │   │   ├── workout-summary.ts           # Natural language
│   │   │   ├── auto-pause.ts                # Detect 5s stopped
│   │   │   └── training-plans.ts            # 5K/10K/21K
│   │   ├── navigation/
│   │   │   ├── RootNavigator.tsx
│   │   │   ├── AuthNavigator.tsx
│   │   │   ├── OnboardingNavigator.tsx
│   │   │   ├── MainTabNavigator.tsx         # Custom tab bar
│   │   │   ├── stacks/
│   │   │   └── types.ts
│   │   ├── store/
│   │   │   ├── authStore.ts                 # Zustand
│   │   │   └── onboardingStore.ts
│   │   ├── theme/
│   │   │   ├── colors.ts                    # Paleta laranja
│   │   │   ├── spacing.ts
│   │   │   ├── fontSize.ts
│   │   │   ├── borderRadius.ts
│   │   │   └── index.ts
│   │   ├── types/                           # TypeScript types
│   │   └── assets/
│   │       └── images/
│   ├── public/                              # PWA assets
│   │   ├── manifest.json
│   │   └── service-worker.js
│   ├── scripts/
│   │   └── postbuild.js                     # Copia public/ pra dist/
│   ├── App.tsx
│   ├── app.json                             # Expo config
│   ├── package.json
│   └── vercel.json
│
├── DOCUMENTACAO.md (este arquivo)
└── README.md
```

---

# 5. Banco de Dados

## 5.1 Tabelas

### `users`
Cadastro principal de atletas.

| Coluna | Tipo | Constraints |
|--------|------|-------------|
| id | uuid PK | gerado |
| name | varchar(100) | obrigatório |
| email | varchar(255) | UNIQUE |
| password | varchar | select:false, bcrypt 12 |
| bio | text | nullable |
| avatarUrl | varchar | nullable |
| birthDate | varchar | nullable |
| sports | simple-array | nullable |
| level | varchar | beginner/intermediate/advanced |
| objectives | simple-array | nullable |
| availability | simple-array | nullable |
| latitude / longitude | real | nullable |
| city | varchar | nullable |
| isActive | boolean | default true |
| onboardingCompleted | boolean | default false |
| resetPasswordToken | varchar | select:false |
| resetPasswordExpires | timestamp | select:false |
| failedLoginAttempts | int | default 0, select:false |
| lockedUntil | timestamp | select:false |
| lastLoginAt | timestamp | select:false |
| lastLoginIp | varchar | select:false (mascarado) |
| twoFactorSecret | varchar | select:false |
| twoFactorEnabled | boolean | default false |
| createdAt / updatedAt | timestamps | auto |

### `activities`
Atividades esportivas registradas.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| user_id | uuid FK | dono |
| sport | varchar(50) | running, cycling, etc |
| startTime / endTime | timestamp | |
| distance | real | metros |
| duration | int | segundos |
| avgPace | real | min/km |
| avgSpeed | real | km/h |
| isCompleted | boolean | default false |
| liveToken | varchar | nullable (compartilhamento) |
| liveTokenExpiresAt | timestamp | nullable (24h) |
| createdAt | timestamp | |

### `activity_points`
Pontos GPS individuais (até dezenas de milhares por atividade).

| Coluna | Tipo |
|--------|------|
| id | uuid PK |
| activity_id | uuid FK |
| latitude | real |
| longitude | real |
| altitude | real (nullable) |
| timestamp | timestamp |

### `activity_comments`
Comentários em atividades.

| Coluna | Tipo |
|--------|------|
| id | uuid PK |
| activity_id | uuid FK |
| user_id | uuid FK |
| content | text (sanitizado, ≤500) |
| createdAt | timestamp |

### `activity_kudos`
Kudos (curtidas) em atividades. `UNIQUE(activity_id, user_id)`.

### `likes` / `matches`
Sistema Tinder-like.

### `messages`
Chat 1:1 entre matches.

### `events`
Eventos esportivos organizados pela comunidade.

### `event_participants`
Inscrições em eventos.

### `notifications`
Notificações in-app.

### `push_tokens`
Tokens Expo Push por dispositivo. `UNIQUE(user_id, token)`.

### `stories` / `story_views`
Stories 24h + visualizações únicas.

### `groups`
Grupos/clubes esportivos.

| Coluna | Tipo |
|--------|------|
| id | uuid PK |
| name | varchar(80) |
| description | text (nullable) |
| sport | varchar(40) |
| city | varchar(80) |
| isPrivate | boolean |
| inviteCode | varchar(16) (nullable, gerado por crypto.randomBytes) |
| admin_id | uuid FK → users |
| memberCount | int |
| totalDistanceKm | float |
| totalActivities | int |
| createdAt | timestamp |

### `group_members`
Membros + contribuição individual. `UNIQUE(group_id, user_id)`.

### `activity_feed_posts`
Feed de atividades públicas.

| Coluna | Tipo |
|--------|------|
| id | uuid PK |
| user_id | uuid FK |
| activity_id | uuid (nullable) |
| caption | text (≤500, sanitizado) |
| photoUrl | varchar (sanitizado) |
| distanceKm, durationSeconds, avgPace, calories | numbers |
| sport | varchar(40) |
| likesCount, commentsCount | int |
| createdAt | timestamp |

### `refresh_tokens`
Refresh tokens com família.

| Coluna | Tipo |
|--------|------|
| id | uuid PK |
| user_id | uuid FK |
| familyId | varchar(36) — agrupa rotações |
| tokenHash | varchar(64) — SHA-256 do token em claro |
| expiresAt | timestamp (7 dias) |
| used | boolean (rotacionado?) |
| revoked | boolean |
| userAgent | varchar(200) |
| ipMasked | varchar(45) |
| createdAt | timestamp |

### `audit_logs`
Eventos de segurança.

| Coluna | Tipo |
|--------|------|
| id | uuid PK |
| userId | varchar(64) (nullable) |
| event | enum (login_success, login_failure, account_locked, etc) |
| ipMasked | varchar(45) |
| userAgent | text |
| detail | text |
| createdAt | timestamp |

### `achievements` / `user_achievements`
50+ conquistas + relação com usuários.

### `user_blocks` / `user_reports`
Moderação.

## 5.2 Configuração

- **Produção:** PostgreSQL via `DATABASE_URL` (Railway)
- **Dev:** SQLite via `better-sqlite3`
- **SSL:** auto (production)
- **Synchronize:** `true` (auto-create tables) — TODO: migrar pra migrations

---

# 6. API REST — Endpoints

Base URL: `https://sync-production-4830.up.railway.app/api`

## 6.1 Auth (`/auth`)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/register` | — | Cadastro (rate 3/min) |
| POST | `/login` | — | Login (rate 5/5min) |
| POST | `/forgot-password` | — | Solicita token de reset |
| POST | `/reset-password` | — | Redefine senha com token |
| POST | `/refresh` | — | Rotaciona refresh + emite novo access |
| POST | `/logout` | — | Revoga família de refresh |
| GET | `/sessions` | JWT | Lista devices logados |
| DELETE | `/sessions/:familyId` | JWT | Revoga sessão específica |

## 6.2 Users (`/users`)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/me` | JWT | Meu perfil |
| PUT | `/me` | JWT | Atualizar perfil |
| POST | `/me/avatar` | JWT | Upload de avatar (multipart, ≤5MB) |
| POST | `/onboarding` | JWT | Completar onboarding |
| PUT | `/location` | JWT | Atualizar GPS |
| GET | `/me/export` | JWT | Exportar dados (LGPD/GDPR) |
| DELETE | `/me` | JWT | Anonimizar conta (LGPD/GDPR) |
| GET | `/search?q=` | JWT | Buscar usuários |
| GET | `/blocked` | JWT | Listar bloqueados |
| GET | `/:id` | JWT | Perfil de outro usuário |
| POST | `/:id/block` | JWT | Bloquear |
| DELETE | `/:id/block` | JWT | Desbloquear |
| POST | `/:id/report` | JWT | Denunciar |

## 6.3 Matching (`/matching`)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/discover` | JWT | Lista de atletas próximos (filtros: pace, raio, esporte) |
| POST | `/like/:id` | JWT | Like em usuário |
| GET | `/matches` | JWT | Meus matches |

## 6.4 Chat (`/chat`)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/conversations` | JWT | Lista de conversas |
| GET | `/messages/:matchId` | JWT | Mensagens de um match |
| POST | `/messages` | JWT | Enviar mensagem |

## 6.5 Activities (`/activities`)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/start` | JWT | Iniciar atividade |
| POST | `/:id/points` | JWT | Adicionar ponto GPS |
| PUT | `/:id/finish` | JWT | Finalizar |
| GET | `/history?page=` | JWT | Histórico |
| GET | `/:id` | JWT | Detalhes (com pontos) |
| POST | `/:id/share` | JWT | Gerar token público (24h) |
| DELETE | `/:id/share` | JWT | Revogar compartilhamento |
| GET | `/live/:token` | — | Ver atividade ao vivo (público) |
| POST | `/:id/comments` | JWT | Comentar (sanitizado) |
| GET | `/:id/comments` | JWT | Listar comentários |
| DELETE | `/comments/:commentId` | JWT | Deletar próprio |
| POST | `/:id/kudos` | JWT | Toggle kudos |
| GET | `/:id/kudos` | — | Total de kudos |
| GET | `/:id/export.gpx` | — | Exportar GPX (Strava/Garmin) |
| GET | `/heatmap/nearby?lat&lng&radiusKm` | — | Pontos GPS agregados |

## 6.6 Events (`/events`)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/` | JWT | Listar eventos (filtros) |
| POST | `/` | JWT | Criar evento |
| POST | `/flash` | JWT | Evento relâmpago (notifica usuários próximos) |
| GET | `/:id` | JWT | Detalhes |
| POST | `/:id/join` | JWT | Inscrever-se |
| DELETE | `/:id/join` | JWT | Cancelar inscrição |

## 6.7 Ranking (`/ranking`)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/monthly?sport=` | JWT | Ranking mensal |
| GET | `/weekly?sport=` | JWT | Ranking semanal |
| GET | `/friends?sport=` | JWT | Entre amigos |

## 6.8 Notifications (`/notifications`)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/` | JWT | Listar notificações in-app |
| PUT | `/:id/read` | JWT | Marcar como lida |
| POST | `/push-token` | JWT | Registrar token Expo |
| DELETE | `/push-token` | JWT | Remover token |
| POST | `/test-push` | JWT | Push de teste |

## 6.9 Stories (`/stories`)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/` | JWT | Criar story (multipart, ≤25MB) |
| GET | `/feed` | JWT | Feed de stories ativas |
| GET | `/user/:userId` | JWT | Stories de um usuário |
| POST | `/:id/view` | JWT | Marcar como visualizada |
| POST | `/:id/like` | JWT | Like |
| DELETE | `/:id` | JWT | Deletar (só dono) |

## 6.10 Groups (`/groups`)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/public?city=&sport=&page=` | — | Grupos públicos |
| GET | `/ranking?city=&sport=` | — | Ranking por km |
| POST | `/` | JWT | Criar (admin) |
| GET | `/me` | JWT | Meus grupos |
| GET | `/:id` | JWT | Detalhe |
| GET | `/:id/members` | JWT | Ranking interno de membros |
| POST | `/:id/join` | JWT | Entrar (com inviteCode se privado) |
| POST | `/:id/leave` | JWT | Sair |
| DELETE | `/:id` | JWT | Deletar (só admin) |

## 6.11 Feed (`/feed`)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/?page=` | JWT | Feed global |
| GET | `/user/:userId?page=` | JWT | Feed de um usuário |
| POST | `/` | JWT | Postar atividade (sanitizado) |
| POST | `/:id/like` | JWT | Like |
| DELETE | `/:id` | JWT | Deletar (só dono) |

## 6.12 Weather (`/weather`)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/current?lat&lng` | JWT | Clima atual |
| GET | `/recommendation?lat&lng` | JWT | Melhor horário com score por hora |

## 6.13 Outros

- **`/health`** — Healthcheck (200 OK)
- **`/`** — Status básico
- **`/api/docs`** — Swagger (gated com basic-auth em prod)
- **`/uploads/*`** — Arquivos estáticos (avatars, stories)

---

# 7. WebSockets

## 7.1 Namespace `/tracking`

URL: `wss://sync-production-4830.up.railway.app/tracking`

**Autenticação:** JWT no handshake (`auth.token` ou `?token=`).

### Eventos cliente → servidor

| Evento | Payload | Descrição |
|--------|---------|-----------|
| `joinActivity` | `{ activityId }` | Entra na sala (read-only se sem auth, write se for o dono) |
| `point` | `{ activityId, latitude, longitude, altitude?, timestamp? }` | Atleta streama ponto GPS (validação de ownership) |
| `finishActivity` | `{ activityId }` | Finaliza e flusha buffer |

### Eventos servidor → cliente

| Evento | Payload | Descrição |
|--------|---------|-----------|
| `livePoint` | `{ activityId, latitude, longitude, distance, timestamp, snapshot? }` | Broadcast para seguidores |
| `activityFinished` | `{ activityId }` | Atividade encerrada |

### Características
- Buffer de pontos persistido em batch a cada 3s (reduz I/O)
- Cache do último ponto por atividade (snapshot pra novo seguidor)
- Distância acumulada via Haversine
- Validação de coordenadas (-90..90, -180..180)
- Reconnect infinito no cliente (backoff até 8s)

## 7.2 Namespace `/chat` (futuro)

Mensagens em tempo real entre matches.

---

# 8. Telas Mobile/Web

## 8.1 Auth
- **WelcomeScreen** — Landing page mobile + landing rica desktop (carousel hero, stats bar, 6 features cards, CTA final, footer)
- **LoginScreen** — Hero image + glass card + CTA gradient
- **RegisterScreen** — Senha forte com medidor visual
- **SplashScreen** — Logo laranja

## 8.2 Onboarding (5 telas)
- **SportsScreen** — Multi-select de 12 esportes
- **LevelScreen** — Iniciante/Intermediário/Avançado
- **ObjectivesScreen** — Objetivos (perder peso, performance, social, etc)
- **AvailabilityScreen** — Disponibilidade semanal
- **LocationScreen** — GPS de alta precisão → IP → 12 cidades manuais

## 8.3 Main Tabs
- **HomeTab (Feed)** — Discovery + Stories bar + posts
- **MapTab** — Mapa interativo com eventos + heatmap toggle
- **TrackingTab (Treinar)** — Botão central elevado com gradient
- **ChatTab (Grupos)** — Lista de grupos + chats
- **ProfileTab** — Hero + XP bar + stats + conquistas

## 8.4 Tracking
- **TrackingMainScreen** — Pre-treino com clima + sugestão + botão Start
- **ActiveTrackingScreen** — Em treino com:
  - Mapa fullscreen
  - Timer grande
  - Métricas (km, pace, velocidade, calorias)
  - Linha 2 (altitude, ganho elevação, pontos GPS)
  - Voltas
  - Audio coach toggle 🔊
  - Auto-pause toggle ⏸
  - Live tracking toggle 📡
  - Controles (lap/pause/finish)
- **ActivitySummaryScreen** — Resumo natural + métricas + mapa da rota + post no feed + export GPX
- **ActivityHistoryScreen** — Histórico paginado

## 8.5 Social
- **DiscoveryScreen** — Swipe Tinder-like com card grande + Stories bar topo
- **MyProfileScreen** — Hero + avatar + stats grid 2x3
- **EditProfileScreen** — Avatar, bio, esportes, etc

## 8.6 Stories
- **StoryViewerScreen** — Fullscreen com progress bars + tap zones + like
- **CreateStoryScreen** — Camera/galeria + caption + sport tag

## 8.7 Outros
- **RankingScreen** — Tabs Mensal/Semanal/Amigos + pódio top 3 + lista
- **GroupsScreen** — Tabs Meus/Descobrir/Ranking + modal de criação
- **TrainingPlanScreen** — Escolha 5K/10K/21K + visualizar semana atual + timeline
- **LiveViewScreen** — Tracking público via `/live/:token`

---

# 9. Componentes Reutilizáveis

## UI
- **Button** — Pressable com gradient, animação de press, 3 sizes (sm/md/lg), variants (primary/outline/ghost), icon left/right
- **Toast** — `showToast(msg, kind)` global com 3 kinds (success/error/info), animação slide+fade
- **Skeleton** — Shimmer loader
- **SkeletonList** — Presets (ChatList, EventCard, StatsCard, Profile)
- **ProgressBar** — Barra de progresso (onboarding, etc)

## Layout
- **ScreenContainer** — maxWidth 520px web + safe area

## Mapa
- **SyncMap** (native re-export) + **SyncMap.web** (Leaflet vanilla)
  - `MapView`, `Marker`, `Circle`, `Polyline`, `HeatLayer`

## Features
- **XPBar** — Nível + título + barra de XP
- **DailyQuestsCard** — 3 missões + countdown reset
- **StreakBadge** — 4 tiers (Começando/Aceso/Em Chamas/Lendário) com animação de fogo
- **StoriesBar** — Lista horizontal estilo Instagram
- **ActivityComments** — Lista + input + animação heart
- **TodayBriefWidget** — Sunrise/sunset + AQI + workout idea + hidratação + frase
- **BestTimeWidget** — Chart de 12h com peak

---

# 10. Serviços e Utilitários

## Serviços (`mobile/src/services/`)
- **api.ts** — Axios + interceptors (JWT do SecureStore)
- **secure-storage.ts** — Wrapper unificado SecureStore + fallback web
- **location.service.ts** — GPS alta precisão + Nominatim + cache
- **external-apis.ts** — 9 APIs free (clima, sun, AQI, workout idea, calorias, pace, VO2max, quote, hidratação)
- **tracking-socket.service.ts** — Socket.io com JWT no handshake
- **push-notifications.service.ts** — Expo Push (native) + Notification API (web)
- **audio-coach.service.ts** — TTS (Web Speech API + expo-speech)
- **stories.service.ts** — API stories
- **groups.service.ts** — API groups
- **feed.service.ts** — API feed

## Utilitários (`mobile/src/utils/`)
- **pace-zones.ts** — Z1-Z5 do pace de limiar
- **xp-system.ts** — Curva polinomial level 1-100 + 9 títulos
- **daily-quests.ts** — 12 quests pool com shuffle determinístico
- **workout-summary.ts** — Resumo natural em pt-BR
- **auto-pause.ts** — Detector com janela rolante 5s
- **training-plans.ts** — 3 planos completos com semanas/sessões

## Backend utils (`backend/src/common/`)
- **haversine.ts** — Distância entre coordenadas
- **sanitize.util.ts** — `sanitizeText`, `sanitizeUrl`, `isSafeImageBuffer` (magic bytes)
- **audit.service.ts** — Audit log + mascaramento IP

---

# 11. Requisitos Funcionais (RF)

## RF1 — Autenticação
- **RF1.1** Cadastro com email + senha forte
- **RF1.2** Login email/senha
- **RF1.3** Recuperação por token (`/forgot-password`)
- **RF1.4** Refresh token rotation (access 15min + refresh 7d)
- **RF1.5** Logout (revoga família)
- **RF1.6** Listar sessões ativas
- **RF1.7** Revogar sessão específica
- **RF1.8** Exportar dados (LGPD)
- **RF1.9** Anonimizar conta (LGPD)
- **RF1.10** 2FA TOTP (estrutura pronta)

## RF2 — Perfil & Onboarding
- **RF2.1** Escolha de esportes (12 opções)
- **RF2.2** Nível esportivo
- **RF2.3** Objetivos
- **RF2.4** Disponibilidade semanal
- **RF2.5** Localização (3 níveis de fallback)
- **RF2.6** Upload de avatar
- **RF2.7** Bio, data de nascimento, cidade
- **RF2.8** Editar perfil
- **RF2.9** Bloquear/desbloquear/denunciar

## RF3 — Geolocalização
- **RF3.1** GPS de alta precisão
- **RF3.2** Geocoding reverso (cidade/bairro)
- **RF3.3** Mapa interativo (Leaflet web / RN-Maps native)
- **RF3.4** Heatmap de rotas populares
- **RF3.5** Markers de eventos no mapa
- **RF3.6** Sincronização de localização no backend

## RF4 — Atividade Esportiva
- **RF4.1** Iniciar/pausar/finalizar
- **RF4.2** Tracking via WebSocket
- **RF4.3** Cálculo de distância (Haversine + filtro ruído)
- **RF4.4** Pace em min:seg/km
- **RF4.5** Velocidade
- **RF4.6** Calorias via MET
- **RF4.7** Altitude + ganho de elevação
- **RF4.8** Voltas manuais
- **RF4.9** **Auto-pause inteligente** (5s)
- **RF4.10** **Audio Coach** (TTS): início/km/pausa/finish/motivação
- **RF4.11** **Pace Zones Z1-Z5**
- **RF4.12** **Live tracking compartilhável** (link 24h)
- **RF4.13** Histórico paginado
- **RF4.14** Detalhes (rota desenhada)
- **RF4.15** **Export GPX/CSV** (Strava/Garmin)
- **RF4.16** **Resumo natural** automático

## RF5 — Social
- **RF5.1** Discovery (swipe)
- **RF5.2** Match por pace compatível
- **RF5.3** Like + match mútuo
- **RF5.4** Chat 1:1
- **RF5.5** **Stories 24h** (foto/vídeo)
- **RF5.6** Visualizar story fullscreen
- **RF5.7** Like em story
- **RF5.8** Comentários em atividades
- **RF5.9** Kudos (curtir)
- **RF5.10** Bloquear/denunciar
- **RF5.11** **Feed público de atividades**
- **RF5.12** Like no feed

## RF6 — Grupos/Clubes
- **RF6.1** Criar grupo (admin)
- **RF6.2** Público (descoberta livre) ou Privado (com inviteCode)
- **RF6.3** Entrar/sair
- **RF6.4** Deletar (só admin)
- **RF6.5** Soma de km dos membros
- **RF6.6** Ranking de grupos (por cidade/esporte)
- **RF6.7** Ranking interno de membros

## RF7 — Eventos
- **RF7.1** Criar evento
- **RF7.2** Listar próximos (raio)
- **RF7.3** Inscrever-se
- **RF7.4** Cancelar inscrição
- **RF7.5** **Eventos relâmpago** (push pra usuários no raio)

## RF8 — Gamificação
- **RF8.1** **Sistema XP + Levels** (1-100, 9 títulos)
- **RF8.2** XP por: 10/km, 50/atividade, 100/conquista, 25/streak
- **RF8.3** **Daily Quests** (3 missões rotativas)
- **RF8.4** **Streaks** (dias consecutivos)
- **RF8.5** **50+ Conquistas**
- **RF8.6** Ranking mensal/semanal/amigos
- **RF8.7** Pódio top 3 (medalha)

## RF9 — Planos de Treino
- **RF9.1** **5K em 8 semanas** (iniciante)
- **RF9.2** **10K em 10 semanas** (intermediário)
- **RF9.3** **21K em 12 semanas** (meia maratona)
- **RF9.4** Visualizar semana atual
- **RF9.5** Persistência local

## RF10 — Notificações
- **RF10.1** Push (Expo)
- **RF10.2** In-app: kudos/comentário/match/mensagem/story/event
- **RF10.3** **Cron hidratação** 10/14/17h
- **RF10.4** **Cron lembrete treino** 7h
- **RF10.5** Evento relâmpago dispara push em raio

## RF11 — Clima & Ambiente
- **RF11.1** Clima atual (temp, ícone, recomendação)
- **RF11.2** **AQI** (qualidade do ar)
- **RF11.3** Sunrise/sunset
- **RF11.4** **Melhor horário** (score por hora)
- **RF11.5** Recomendação de hidratação

## RF12 — Outros
- **RF12.1** Idioma pt-BR
- **RF12.2** Citações motivacionais
- **RF12.3** Estimativa **VO2 max** (Daniels)
- **RF12.4** Sugestão de treino do dia
- **RF12.5** **PWA instalável**
- **RF12.6** Funcionamento offline parcial

---

# 12. Requisitos Não-Funcionais (RNF)

## RNF1 — Segurança
- bcrypt 12 rounds
- JWT_SECRET obrigatório em prod
- Access 15min + Refresh 7d (rotação com família)
- Detecção de reuse → revoga família
- Account lockout 5 tentativas / 30min
- Anti-enumeração (timing constante + msg genérica)
- CSP estrito em prod
- HSTS preload 6 meses
- Permissions-Policy
- CORS exact-match
- Rate limit por rota (login 5/5min)
- Sanitização XSS em UGC
- URLs sanitizadas
- Token JWT em SecureStore (não AsyncStorage)
- WebSocket com auth JWT
- Live tracking token expira 24h
- crypto.randomBytes (não Math.random)
- Audit log com IP mascarado
- Swagger gated por basic-auth em prod
- LGPD/GDPR endpoints

## RNF2 — Performance
- WebSocket batch persist 3s
- Cache local de geocoding
- Cache local de heatmap
- Subsampling de pontos GPS (1/5)
- Service Worker (4 estratégias)
- Brotli compression (Vercel)
- maxWidth 520px no web
- Imagens Unsplash com qualidade reduzida
- Healthcheck dedicado sem auth

## RNF3 — Disponibilidade
- Auto-restart Railway
- Healthcheck 120s
- CDN global (Vercel)
- GPS resiliente (3 fallbacks)
- WS reconnect infinito
- PWA offline parcial

## RNF4 — Usabilidade
- Tema dark consistente (#FF6B35)
- Mobile-first (412px)
- Touch targets ≥44px
- 60fps animations
- Pull-to-refresh
- Skeleton loaders
- Empty states ilustrados
- Toast notifications
- pt-BR
- Glass morphism
- Splash customizada
- Tab bar com botão central elevado

## RNF5 — Manutenibilidade
- TypeScript strict
- DTO validation
- ESLint
- Modular NestJS
- SW versionado
- CI/CD automático
- Lazy require pra pkgs opcionais

## RNF6 — Privacidade
- Localização só com matches
- Email único
- EXIF strip (TODO)
- Senhas nunca em logs
- Tokens fora de URLs
- Sem trackers third-party

## RNF7 — Escalabilidade
- Postgres réplicas-ready
- WS isolado em namespace
- Stateless backend
- Push batch de 100
- Trust proxy

## RNF8 — Custo
- 100% APIs free
- Vercel free tier
- Railway free tier (~$5/mês créditos)
- Push Expo grátis
- OSM/Nominatim grátis

## RNF9 — Compatibilidade
- iOS 13+ via Expo/PWA
- Android 6+ via Expo/PWA
- Chrome/Firefox/Safari/Edge modernos
- SW degrada graciosamente

## RNF10 — Internacionalização
- pt-BR
- toLocaleDateString
- TTS pt-BR

---

# 13. Segurança

## 13.1 Camadas de defesa

```
┌─────────────────────────────────────────────────────┐
│  1. CDN (Vercel) — DDoS protection, TLS 1.3, HSTS   │
├─────────────────────────────────────────────────────┤
│  2. CORS exact-match — Railway só aceita FRONTEND   │
├─────────────────────────────────────────────────────┤
│  3. Helmet — CSP, HSTS, Permissions-Policy, X-* hdrs│
├─────────────────────────────────────────────────────┤
│  4. Rate limiting — Throttler por IP/rota           │
├─────────────────────────────────────────────────────┤
│  5. Validation Pipe — DTOs strict + sanitização     │
├─────────────────────────────────────────────────────┤
│  6. Auth JWT — Bearer obrigatório em rotas guard    │
├─────────────────────────────────────────────────────┤
│  7. Ownership checks — só dono modifica recurso     │
├─────────────────────────────────────────────────────┤
│  8. Audit log — eventos sensíveis (IP mascarado)    │
└─────────────────────────────────────────────────────┘
```

## 13.2 Senhas
- bcrypt 12 rounds (~250ms/hash)
- Mínimo 8 chars
- Obriga letras + números
- Blacklist top 10 senhas comuns
- Anti-timing: senha errada gasta mesmo tempo de bcrypt

## 13.3 Tokens
- **Access JWT**: 15min, contém `{ sub, email }`
- **Refresh**: 7d, opaque random (48 bytes base64url), SHA-256 hashed no banco
- **Família**: agrupa rotações; reuse detection revoga toda família
- **Live tracking**: 24h, crypto.randomBytes(24)

## 13.4 Account lockout
- 5 tentativas erradas em janela
- 30min bloqueado
- Audit log registra `account_locked`

## 13.5 Sanitização UGC
Aplicada em: feed caption/photo, comentários, grupo name/desc/sport/city, story caption.

Remove: `<script>`, `<style>`, event handlers, `javascript:` URLs, `data:` não-imagem.

## 13.6 LGPD/GDPR
- `GET /users/me/export` — JSON com todos os dados
- `DELETE /users/me` — anonimização (não delete, pra integridade referencial)
- IP mascarado nos logs (último octeto IPv4 zerado, IPv6 /64)

## 13.7 Headers de produção
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; ...
Strict-Transport-Security: max-age=15552000; includeSubDomains; preload
Permissions-Policy: camera=(), microphone=(), payment=(), usb=()
Referrer-Policy: strict-origin-when-cross-origin
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
```

---

# 14. Performance

## 14.1 Frontend
- Bundle ~2.5MB (Expo web export)
- Brotli compression no CDN
- Imagens Unsplash com `auto=format&q=80`
- Lazy load (TODO: code splitting)
- Memoização em listas (TODO: propagar React.memo)

## 14.2 Backend
- Batch persist GPS (3s)
- Subsampling heatmap (1/5)
- Index em audit_logs(userId, createdAt) e (event, createdAt)
- Cache de membership em socket (evita query por ponto)

## 14.3 PWA / Service Worker
4 estratégias de cache:
1. **Cache-first** — app shell (HTML/JS/CSS)
2. **Stale-while-revalidate** — imagens
3. **Network-first** — APIs (5min TTL)
4. **Cache-first long** — OSM tiles

Versão `sync-v3` com invalidação automática.

---

# 15. Deploy & Infra

## 15.1 Frontend (Vercel)
- Build: `npx expo export --platform web --output-dir dist && node scripts/postbuild.js`
- Output: `dist/`
- Install: `npm install --legacy-peer-deps`
- Rewrites:
  - `/live/:token` → `/index.html`
  - SPA fallback (exclui SW e manifest)
- Headers:
  - SW: `Cache-Control: no-cache` + `Service-Worker-Allowed: /`
  - Manifest: `Content-Type: application/manifest+json`
  - Global: `X-Content-Type-Options`, `X-Frame-Options: DENY`

## 15.2 Backend (Railway)
- Builder: Nixpacks
- Build: `npm install && npm run build`
- Start: `node dist/main.js`
- Healthcheck: `/health` (timeout 120s)
- Restart: `ON_FAILURE` (10 retries)
- Region: US East (IAD)

## 15.3 Postgres (Railway)
- Volume persistente (`postgres-volume`)
- SSL automático em prod
- `synchronize: true` (TODO: migrar pra migrations)

## 15.4 CI/CD
- Push em `main` no GitHub
- Vercel webhook → build frontend
- Railway webhook → build backend
- Sem testes automatizados (TODO: Jest + supertest)

---

# 16. Variáveis de Ambiente

## 16.1 Backend (Railway)

| Var | Obrigatória | Descrição |
|-----|-------------|-----------|
| `DATABASE_URL` | sim | Postgres connection string (auto via `${{Postgres.DATABASE_URL}}`) |
| `JWT_SECRET` | **sim em prod** | Segredo JWT (64 chars random) |
| `JWT_EXPIRATION` | não | Default `7d` |
| `NODE_ENV` | sim | `production` |
| `PORT` | não | Default `3000` |
| `FRONTEND_URL` | sim | CSV de URLs permitidas no CORS |
| `DB_SYNCHRONIZE` | não | Default `true` |
| `DB_SSL` | não | Default `true` em prod |
| `SWAGGER_USER` | não | Username pra basic-auth do `/api/docs` |
| `SWAGGER_PASS` | não | Senha pra basic-auth |
| `REMINDERS_DISABLED` | não | `true` desabilita cron de lembretes |

## 16.2 Frontend (Vercel)

| Var | Descrição |
|-----|-----------|
| `EXPO_PUBLIC_API_URL` | URL base do backend (ex: `https://sync-production-4830.up.railway.app`) |

---

# 17. Como rodar localmente

## 17.1 Pré-requisitos
- Node.js 20+
- npm 10+
- (Opcional) Postgres 15+ local

## 17.2 Backend

```bash
cd backend
npm install --legacy-peer-deps
# Opcional: instalar SQLite pra rodar sem Postgres
npm install better-sqlite3
# Configurar .env
cat > .env << EOF
NODE_ENV=development
JWT_SECRET=local-dev-secret-change-me
PORT=3000
FRONTEND_URL=http://localhost:8081
EOF
npm run start:dev
```

API em `http://localhost:3000`, Swagger em `http://localhost:3000/api/docs`.

## 17.3 Frontend

```bash
cd mobile
npm install --legacy-peer-deps
# Para web
npx expo start --web
# Para iOS (precisa de Mac)
npx expo start --ios
# Para Android
npx expo start --android
```

Acesse `http://localhost:8081` (web).

## 17.4 Variáveis no mobile

```bash
# mobile/.env.local
EXPO_PUBLIC_API_URL=http://localhost:3000
```

---

# 18. APIs Externas

## 18.1 OpenStreetMap Tiles
- URL: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
- Atribuição: `© OpenStreetMap`
- Sem chave

## 18.2 Nominatim
- URL: `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=&lon=`
- Rate limit: 1 req/sec (uso individual respeitoso)
- Header `Referer` recomendado

## 18.3 Open-Meteo
- Clima: `https://api.open-meteo.com/v1/forecast?latitude=&longitude=&current_weather=true&hourly=...`
- AQI: `https://air-quality-api.open-meteo.com/v1/air-quality?...`
- Sem chave, sem limite documentado

## 18.4 Sunrise-Sunset.org
- URL: `https://api.sunrise-sunset.org/json?lat=&lng=`
- Sem chave

## 18.5 ipapi.co
- URL: `https://ipapi.co/json/`
- Limite: 1k/dia (uso esporádico como fallback)

## 18.6 Expo Push API
- URL: `https://exp.host/--/api/v2/push/send`
- Sem chave, batch de até 100 messages

## 18.7 Unsplash
- URL direta: `https://images.unsplash.com/photo-XXX?auto=format&fit=crop&w=1400&q=80`
- Sem chave (uso de URLs específicas em hero images)

---

# 19. PWA

## 19.1 Manifest (`mobile/public/manifest.json`)
```json
{
  "name": "Sync — Seu próximo treino começa aqui",
  "short_name": "Sync",
  "theme_color": "#FF6B35",
  "background_color": "#0A0A0F",
  "display": "standalone",
  "orientation": "portrait",
  "lang": "pt-BR",
  "shortcuts": [
    { "name": "Treinar", "url": "/?tab=tracking" },
    { "name": "Descobrir", "url": "/?tab=home" }
  ]
}
```

## 19.2 Service Worker (`mobile/public/service-worker.js`)
- Versão: `sync-v3`
- 4 estratégias de cache (ver §14.3)
- Push notifications handler
- Notificationclick → abre app

## 19.3 Instalação
- Chrome/Edge: ícone "+" na barra de endereço
- iOS Safari: Compartilhar → "Adicionar à tela inicial"
- Android Chrome: prompt automático após uso

---

# 20. Roadmap / Pendências

## Pendentes (curto prazo)
- [ ] Code splitting (lazy load Stories/Map/Stats)
- [ ] Mentions + reactions em comentários
- [ ] EXIF strip em uploads
- [ ] 2FA TOTP ativação (estrutura já criada)
- [ ] Migrations TypeORM (substituir `synchronize:true`)
- [ ] Testes automatizados (Jest + supertest)
- [ ] Sentry error tracking (free tier)
- [ ] PostHog analytics (free tier)

## Médio prazo
- [ ] Audio coach durante navegação ("vire à direita em 200m")
- [ ] Segments KOM/QOM estilo Strava
- [ ] Importar GPX/TCX/FIT
- [ ] Integração Google Fit + Apple Health
- [ ] Heart rate via câmera (PPG)
- [ ] Chat em grupo dentro de Groups
- [ ] Direct calls voz/vídeo (WebRTC peer-to-peer)

## Longo prazo
- [ ] IA Coach básico (analisa últimos treinos)
- [ ] Marketplace de eventos pagos
- [ ] Coach humano marketplace
- [ ] Mascote evolutivo (avatar pet)
- [ ] Treino ao vivo em grupo (todos veem todos correndo)

---

# 📊 Estatísticas do Projeto

| Métrica | Valor |
|---------|-------|
| Arquivos TypeScript | 80+ |
| Módulos NestJS | 15 |
| Telas mobile | 25+ |
| Entities de banco | 18 |
| Endpoints REST | 60+ |
| WebSocket gateways | 2 |
| APIs externas integradas | 9 |
| Conquistas (achievements) | 50+ |
| Daily quests no pool | 12 |
| Planos de treino completos | 3 |
| Cidades pré-cadastradas (fallback) | 12 |
| Tipos de evento de auditoria | 9 |

---

# 📝 Contato e Suporte

- **GitHub:** https://github.com/ArthurSilvaNarciso/sync
- **Issues:** https://github.com/ArthurSilvaNarciso/sync/issues
- **Live:** https://tutu-sync.vercel.app

---

**Documentação gerada em 2026-05-22 — versão 1.0 — Sync v1.0.0**
