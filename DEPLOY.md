# Deploy do Sync — Vercel (web) + Railway (API)

Fluxo total: ~15 minutos. Você só loga uma vez em cada serviço.

---

## 1. Backend no Railway

### Pré-requisitos
- Conta em https://railway.com (login com GitHub)
- O código precisa estar num repo Git (GitHub funciona melhor)

### Passo a passo

1. **Suba o código pro GitHub** (se ainda não está):
   ```bash
   cd C:\Users\tutun\Desktop\SYNC
   git init
   git add .
   git commit -m "Sync app — primeiro deploy"
   # crie um repo em github.com/new, depois:
   git remote add origin https://github.com/SEU_USER/sync.git
   git push -u origin main
   ```

2. **Crie o projeto no Railway**:
   - Acesse https://railway.com/new
   - "Deploy from GitHub repo" → escolha o repositório do Sync
   - Quando perguntar qual diretório → aponte pra `backend/`
   - O Railway detecta NestJS e usa `railway.json` (já configurado)

3. **Adicione o banco Postgres**:
   - No painel do projeto → "+ New" → "Database" → "PostgreSQL"
   - Railway conecta automaticamente via `DATABASE_URL`

4. **Configure as variáveis** (Settings → Variables):
   ```
   NODE_ENV=production
   JWT_SECRET=cole-aqui-uma-string-aleatoria-longa
   DB_SYNCHRONIZE=true              # SÓ NO PRIMEIRO DEPLOY (cria schema)
   FRONTEND_URL=https://SEU-PROJETO.vercel.app   # você preenche após passo 2
   ```

5. **Aguarde o deploy** (~2min). Quando ficar verde, copie o **domínio público**
   gerado em Settings → Networking → "Generate Domain". Algo tipo
   `sync-api-production.up.railway.app`.

6. **Confirme que está vivo**: abra `https://seu-dominio/api/docs` — Swagger
   deve aparecer.

7. **Importante após o primeiro acesso**: volte em Variables e troque
   `DB_SYNCHRONIZE=true` → `DB_SYNCHRONIZE=false` (segurança em prod).

---

## 2. Frontend no Vercel

### Pré-requisitos
- Conta em https://vercel.com (login com GitHub)
- Mesmo repo Git do passo anterior

### Passo a passo

1. https://vercel.com/new → escolha o repositório
2. **Configure o projeto**:
   - **Root Directory**: `mobile`
   - **Framework Preset**: `Other`
   - Build/Install commands ficam vazios — o `vercel.json` (já existe) cuida disso
3. **Environment Variables** (única que importa):
   ```
   EXPO_PUBLIC_API_URL=https://sync-api-production.up.railway.app
   ```
   (use o domínio que o Railway gerou no passo 1.5)
4. Clique em **Deploy**. ~3min depois você tem `seu-app.vercel.app` no ar.

5. **Volte no Railway** e ajuste `FRONTEND_URL` pra esse domínio do Vercel
   (CORS bloqueia se ficar como `*`).

---

## 3. Testar

- Acesse `https://seu-app.vercel.app` → Welcome screen carrega
- Criar conta → completar onboarding → entrar no app
- O backend Railway processa tudo: login, GPS, eventos, chat WebSocket

---

## Troubleshooting

| Sintoma | Causa | Fix |
|---------|-------|-----|
| Login 500 | DB ainda não criou schema | `DB_SYNCHRONIZE=true` no Railway, redeploy |
| Login OK mas /me 404 | Schema desatualizado | Mesmo acima |
| CORS error no browser | `FRONTEND_URL` errado no Railway | Cole exatamente o domínio do Vercel |
| Mapa não carrega | Tile bloqueado | OSM precisa estar acessível — não é bloqueio nosso |
| GPS sempre falha no Vercel | Vercel é HTTPS, GPS só funciona em HTTPS (OK) ou se você negou no navegador | Cadeado da URL → liberar Localização |

---

## Custo

- **Railway**: $5/mês free trial; depois ~$5-10/mês conforme uso
- **Vercel**: free para sites pessoais (até 100GB de bandwidth/mês)
- **Postgres no Railway**: incluído nos $5

Total esperado pra MVP: **$5-10/mês**.

---

## 4. ⚠️ Atualizações importantes (mídia, push, LGPD, crons)

Mudanças recentes adicionaram requisitos novos de operação. **Leia antes do próximo deploy.**

### 4.1 `BACKEND_URL` — agora obrigatória
Uploads (avatar, banner, fotos de perfil, áudio do chat, stories) deixaram de ser
base64 no banco e viram **arquivos** servidos em `/uploads/...`. O backend monta a
URL pública a partir de `BACKEND_URL`.

```
BACKEND_URL=https://sync-api-production.up.railway.app   # mesmo domínio do §1.5
```
Sem isso, as imagens/áudios vêm com host errado e não carregam.

### 4.2 🔴 Disco efêmero — mídia some no redeploy
O Railway (e qualquer container) tem **disco efêmero**: a pasta `uploads/` é apagada
a cada deploy. Para mídia persistir, escolha uma:
- **Railway Volume** montado em `backend/uploads/` (rápido) — Settings → Volumes
- **S3 / Cloudflare R2 / Cloudinary** (correto a longo prazo — trocar o `diskStorage`
  do multer em `media.controller.ts` por um adapter de storage)

Em beta dá pra viver sem; em produção paga, configure um dos dois.

### 4.3 Push notifications (build standalone)
O envio via Expo Push já está conectado (novo match + nova mensagem + lembretes).
Para o **registro de token** funcionar num build standalone (EAS):
```bash
cd mobile
eas init                       # cria/linka projeto Expo → grava extra.eas.projectId
```
- Em Expo Go funciona sem projectId
- Sem projectId num standalone, o registro é pulado com aviso (não crasha)

### 4.4 Crons agora ativos (`@nestjs/schedule` instalado)
Antes nenhum cron rodava. Agora rodam:
- **Lembretes** (hidratação 10/14/17h, treino 7h) → desligar com `REMINDERS_DISABLED=true`
- **Purga LGPD** (3h da manhã, hard-delete de contas excluídas há +30 dias) →
  desligar com `PURGE_DISABLED=true`

### 4.5 LGPD soft-delete — nova coluna `deletedAt`
A exclusão de conta agora é soft-delete real (anonimiza + esconde + purga em 30 dias).
A coluna `deletedAt` é criada pelo `DB_SYNCHRONIZE=true`. **No próximo deploy**, suba
uma vez com `DB_SYNCHRONIZE=true` pra criar a coluna, depois volte pra `false`.

### 4.6 Env vars opcionais úteis
| Variável | Pra quê |
|----------|---------|
| `SWAGGER_USER` / `SWAGGER_PASS` | Proteger `/api/docs` com basic auth em prod |
| `SENTRY_DSN` | Error tracking (recomendado em prod) |
| `REMINDERS_DISABLED` / `PURGE_DISABLED` | Desligar crons individualmente |

### 4.7 Sanity check (roda no CI também)
```bash
cd backend && npm run typecheck && npm test   # 26 testes
cd mobile  && npm run typecheck && npm test    # 5 testes
```
O `.github/workflows/ci.yml` já executa isso em todo PR/push na `main`.
