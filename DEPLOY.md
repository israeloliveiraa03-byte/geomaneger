# Deploy do GeoManager (Neon + Render + Vercel)

Esse caminho não custa nada para começar e aguenta os primeiros usuários pagantes sem problema. Siga na ordem: banco → backend → frontend → Mercado Pago.

## 1. Banco de dados (Neon)

1. Crie uma conta em https://neon.tech e um novo projeto (região South America, se disponível)
2. No SQL Editor do próprio Neon, rode:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```
3. Cole o conteúdo de `backend/src/db/schema.sql` e rode também
4. Copie a **connection string** (formato `postgres://usuario:senha@host/banco?sslmode=require`) — vai usar no passo 2

## 2. Backend (Render)

1. Suba a pasta `backend/` para um repositório no GitHub (pode ser o projeto inteiro, o Render só vai olhar essa pasta)
2. Em https://render.com → New → Web Service → conecte o repositório
3. Configure:
   - **Root directory**: `backend`
   - **Build command**: `npm install && npm run build`
   - **Start command**: `npm start`
4. Em Environment, adicione as variáveis (mesmas do `.env.example`):
   - `DATABASE_URL` → a connection string do Neon
   - `JWT_SECRET` → gere uma string aleatória longa (ex: `openssl rand -hex 32`)
   - `MP_ACCESS_TOKEN` → o token do Mercado Pago (comece com o de teste)
   - `APP_URL` → o domínio do frontend (você vai preencher depois de fazer o deploy do passo 3 — pode deixar `http://localhost:5173` por enquanto e trocar depois)
   - `PORT` → `4000`
5. Deploy. No final você terá uma URL tipo `https://geomanager-backend.onrender.com`

> O plano gratuito do Render "dorme" depois de alguns minutos sem uso — a primeira requisição depois disso demora ~30s para acordar. Para uma versão paga (~US$7/mês) isso some.

## 3. Frontend (Vercel)

1. Em https://vercel.com → Add New → Project → conecte o mesmo repositório
2. Configure:
   - **Root directory**: `frontend`
   - **Build command**: `npm run build` (padrão do Vite, já detectado)
   - **Output directory**: `dist`
3. Em Environment Variables, adicione:
   - `VITE_API_URL` → a URL do backend que você pegou no passo 2 (ex: `https://geomanager-backend.onrender.com`)
4. Deploy. Você terá uma URL tipo `https://geomanager.vercel.app`
5. Volte no Render (passo 2) e atualize `APP_URL` para essa URL da Vercel — isso é o que faz o link de "Publicar" e o checkout do Mercado Pago apontarem pro lugar certo

## 4. Mercado Pago

1. Crie/acesse sua conta de vendedor em https://www.mercadopago.com.br/developers/panel
2. Em "Suas integrações" → crie uma aplicação → pegue o **Access Token de teste** primeiro
3. Cole esse token em `MP_ACCESS_TOKEN` no Render e refaça o deploy do backend
4. Teste o fluxo completo: crie uma conta no seu site publicado, abra a tela de planos, clique em assinar — deve te levar ao checkout sandbox do Mercado Pago
5. Quando estiver tudo certo, troque pelo **Access Token de produção** e o dinheiro de verdade já cai na sua conta MP a cada assinatura

### Webhook de confirmação de pagamento

1. No painel do Mercado Pago, em "Webhooks", configure a URL: `https://SEU-BACKEND.onrender.com/billing/webhook`
2. Marque o evento de assinaturas (`subscription_preapproval`)
3. Sem isso, o pagamento acontece mas o plano do usuário não é atualizado automaticamente no banco

## 5. Domínio próprio (opcional, mas ajuda a ganhar confiança)

- Compre um domínio (ex: Registro.br, ~R$40/ano para `.com.br`)
- Na Vercel, em Settings → Domains, adicione o domínio e aponte o DNS conforme instruções na tela
- Atualize `APP_URL` no Render para o domínio novo

## Checklist final antes de divulgar

- [ ] Consigo criar conta, criar mapa, importar CSV, salvar e ver "Salvar" sem erro
- [ ] Consigo publicar um mapa e abrir o link `/m/...` numa aba anônima
- [ ] Consigo assinar um plano com o token de teste e ver `plan` mudar no banco depois do webhook
- [ ] Troquei `MP_ACCESS_TOKEN` para o token de produção
- [ ] `JWT_SECRET` é uma string aleatória forte, não o valor de exemplo
