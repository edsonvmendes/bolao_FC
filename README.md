# Bolao da Resenha - Copa 2026

App web mobile-first para um bolao da Copa do Mundo em grupo de WhatsApp.

## O que ja existe

- Next.js, TypeScript e Tailwind CSS.
- Visual inspirado em campo de futebol/pixel art.
- Ranking publico com top 3 e Trofeu Bagre.
- Premios calculados por participantes pagos.
- Grade de palpites da primeira fase para preencher em lote.
- Fluxo de "Simular" e "Salvar todos" para testar a experiencia.
- Area admin com resumo, pagamentos pendentes e mensagem pronta para WhatsApp.
- SQL base do Supabase com tabelas, view de ranking e RLS.

## Primeira fase em lote

A tela de palpites foi desenhada para o participante registrar todos os jogos da primeira fase ja no inicio. O seed visual trabalha com 48 selecoes organizadas em 12 grupos, gerando 72 jogos de fase de grupos. No banco, o admin pode importar a tabela oficial em `matches` com `phase = 'group_stage'`, `group_name` e `round_number`.

## Rodando local

```bash
npm install
npm run dev
```

Abra `http://127.0.0.1:3000`.

## Supabase

Crie `.env.local` a partir de `.env.example`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://lncyknmddphfpmlmqtic.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sua_chave_publishable
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000
```

Em producao, defina `NEXT_PUBLIC_SITE_URL` com o dominio publicado do app, por exemplo `https://seu-dominio.com`. Esse valor e usado nos links de confirmacao de e-mail do Supabase.

Depois rode o SQL em `supabase/schema.sql` e `supabase/seed.sql` no SQL Editor do Supabase.

Opcionalmente, com a connection string do banco em variavel de ambiente:

```bash
$env:SUPABASE_DATABASE_URL="postgresql://postgres:SENHA@db.lncyknmddphfpmlmqtic.supabase.co:5432/postgres"
npm run db:apply
```

Nao grave a senha do banco nem service role em arquivo do projeto.

## Admin

1. Crie o usuario admin pelo app em `/cadastro`.
2. Rode `supabase/promote_admin.sql` no SQL Editor, trocando o e-mail.
3. Acesse `/admin`.

O admin pode marcar pagamento, lancar resultado oficial e recalcular ranking.
Participante comum nao consegue alterar pagamento, resultado ou pontuacao porque essas operacoes passam por RPCs com checagem `public.is_admin()`.

## Scripts

```bash
npm run lint
npm run build
```

## Proximos passos naturais

1. Rodar migrations no Supabase.
2. Criar o primeiro admin.
3. Testar cadastro/login com usuario real.
4. Ajustar a tabela oficial quando a Copa tiver grupos fechados.
5. Criar importador CSV para substituir a seed demonstrativa.
