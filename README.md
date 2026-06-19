# GeoManager

Plataforma para criar, importar e publicar mapas interativos. Este pacote contém o **MVP do editor de mapas** (frontend funcional, sem necessidade de login) e a **base do backend** (autenticação + assinaturas via Mercado Pago), pronta para você plugar quando quiser ativar login e planos pagos.

## O que já funciona agora (frontend)

- Editor de mapas no navegador com Leaflet
- Desenho de pontos, linhas e polígonos
- Importação de **CSV** (detecta lat/lon automaticamente), **GeoJSON**, **KML**, **GPX** e **Shapefile** (.zip com .shp/.dbf/.prj)
- Painel de camadas: renomear, reordenar, esconder, trocar cor, excluir
- **Painel de atributos**: clique em qualquer feição no mapa para editar seus campos (adicionar, renomear valor, remover) ou excluí-la
- Medição automática de área (polígonos) e comprimento (linhas)
- Exportação do mapa completo como GeoJSON
- **Login e cadastro**, **salvar/abrir mapas no servidor**, e **tela de planos com checkout do Mercado Pago** — tudo já ligado ao backend abaixo
- **Página pública de mapas publicados** (`/m/:slug`) — botão "Publicar" gera um link que qualquer pessoa abre sem precisar de conta

Rode localmente:

```bash
cd frontend
cp .env.example .env   # aponte VITE_API_URL para o backend (padrão: http://localhost:4000)
npm install
npm run dev
```

Abra http://localhost:5173 — o editor funciona sem login (não salva no servidor). Clicando em "Entrar / Criar conta" você ganha acesso a salvar mapas, ver seus mapas salvos e assinar um plano pago.

## O que está pronto no backend

- Cadastro/login com JWT (`/auth/register`, `/auth/login`)
- Banco PostgreSQL + PostGIS (`src/db/schema.sql`)
- Limites por plano (free / básico / pro) aplicados de verdade ao criar mapas e ao salvar camadas
- CRUD completo de mapas: criar, listar, abrir (`GET /maps/:id`), salvar todas as camadas/feições (`PUT /maps/:id/layers`), publicar (`PATCH /maps/:id/publish`), excluir
- Integração real com **Mercado Pago** usando assinatura recorrente (PreApproval): `/billing/subscribe` gera o link de checkout, `/billing/webhook` recebe a confirmação de pagamento e atualiza o plano do usuário automaticamente

Rode localmente:

```bash
cd backend
cp .env.example .env   # preencha DATABASE_URL, JWT_SECRET e MP_ACCESS_TOKEN
npm install
# crie o banco e rode o schema:
psql $DATABASE_URL -f src/db/schema.sql
npm run dev
```

### Sobre o Mercado Pago

- Crie uma conta de vendedor e gere o **Access Token** em https://www.mercadopago.com.br/developers/panel
- Use o token de **teste** primeiro (sandbox) para validar o fluxo de assinatura antes de ir para produção
- O preço de cada plano está em `backend/src/routes/billing.ts` (constante `PLANS`) — hoje os dois planos pagos estão em **R$ 9,90/mês**, dentro do teto de R$10 que você pediu. Se quiser dois preços diferentes, é só ajustar ali.
- O webhook precisa de uma URL pública (não funciona com `localhost`) — use [ngrok](https://ngrok.com) em desenvolvimento, ou a URL real do servidor em produção, configurada no painel do Mercado Pago.

## Como testar o fluxo completo localmente

1. Suba o backend (`cd backend && npm install && npm run dev`) com o `.env` preenchido e o schema já rodado no banco
2. Suba o frontend (`cd frontend && npm install && npm run dev`)
3. No navegador, clique em "Entrar / Criar conta" e crie uma conta de teste
4. Clique em "+ Novo mapa", desenhe ou importe alguns dados, depois em "Salvar"
5. Clique em "Plano: Gratuito" para abrir a tela de planos e testar o checkout (use o **access token de teste** do Mercado Pago para não cobrar de verdade)

## Próximos passos sugeridos

- **Colaboração em tempo real** — é o item que falta e o mais trabalhoso. Diferente do resto, não dá pra fazer incrementalmente: precisa de um servidor de WebSocket (ou serviço como Liveblocks/Supabase Realtime), uma estratégia de resolução de conflito (CRDT, ex: Yjs) para quando duas pessoas editam a mesma camada ao mesmo tempo, e cursores/presença dos outros usuários no mapa. Vale fazer quando já houver usuários pagantes pedindo, não antes — é fácil gastar muito tempo aqui sem necessidade real ainda
- Permissões de visualização/edição por mapa (hoje só o dono acessa)
- Histórico de versões do mapa (desfazer uma edição salva por engano)

## Onde hospedar (gratuito ou barato, compatível com planos de R$10)

| Parte | Opção recomendada | Custo |
|---|---|---|
| Frontend | Vercel ou Netlify | Grátis |
| Backend | Render ou Railway | Grátis no início, ~US$5-7/mês quando crescer |
| Banco de dados | Neon ou Supabase (PostgreSQL + PostGIS gerenciado) | Grátis no plano inicial |

Com esses três, dá pra colocar o GeoManager no ar sem custo fixo até você ter os primeiros assinantes pagando, o que mantém a conta saudável com planos de R$9,90/mês.


