# Plano de execução

Ordem pensada para gastar o mínimo de contexto: fundação primeiro, telas depois.
**Uma sessão por bloco. `/clear` entre cada uma.** O `CLAUDE.md` é recarregado
sozinho a cada sessão, então cada bloco começa leve.

Antes de rodar cada sessão, coloque as imagens de referência na pasta `docs/ref/`
e cite só as que interessam àquela tela.

---

## Sessão 0 — Supabase (você faz na mão, gasta zero token)

No painel do Supabase, sem envolver o Claude Code:

1. Crie o projeto. Anote a URL e a `anon key` em `.env.local`.
2. Cole o SQL da seção "Schema" do `CLAUDE.md` no SQL Editor.
3. Ligue RLS nas duas tabelas e crie as policies:
   ```sql
   alter table settings enable row level security;
   alter table entries  enable row level security;

   create policy "own settings" on settings for all
     using (auth.uid() = user_id) with check (auth.uid() = user_id);
   create policy "own entries" on entries for all
     using (auth.uid() = user_id) with check (auth.uid() = user_id);
   ```
4. Em Authentication → Providers, deixe só **Email** ligado, com "Confirm email"
   ativo. Desligue signups depois que você criar a sua própria conta — assim
   ninguém mais entra.
5. Em URL Configuration, adicione `http://localhost:5173` e, mais tarde, a URL de
   produção.

Confira que a RLS está mesmo ativa antes de seguir. Uma tabela sem policy num
site publicado é o banco inteiro exposto pela anon key.

---

## Sessão 1 — fundação (sem UI)

> leia @CLAUDE.md. configure o tailwind v4 com os tokens da seção 4 em
> `src/index.css`, instale @fontsource-variable/outfit e @fontsource-variable/inter.
> depois implemente só a camada de domínio, sem nenhum componente:
>
> - `src/domain/types.ts` — Entry, EntryType, Recurrence, Category, Settings
> - `src/domain/money.ts` — parseBRL, formatBRL, tudo em centavos
> - `src/domain/projection.ts` — `calcDiario(settings, mes)` e
>   `projectMonth(settings, entries, mes)` retornando um array de
>   `{ dia, isToday, diario, entradas, saidas, saldo }`, com recorrências
>   expandidas em ocorrências virtuais
> - `src/lib/supabase.ts` — client lendo `import.meta.env.VITE_*`
> - `src/repositories/entries.ts` + `settings.ts` — CRUD tipado contra o schema
>   da seção "Schema" do CLAUDE.md, convertendo linha do banco para os tipos do
>   domínio. sem nenhum hook nem componente aqui.
>
> escreva testes com vitest só para `projection.ts`, cobrindo: mês sem
> lançamentos, saldo virando negativo no meio do mês, despesa mensal recorrente,
> e parcelamento em 3x. rode os testes.

**Por que primeiro:** é a parte que, se sair errada, contamina todas as telas. E
teste aqui é barato porque não tem DOM envolvido.

---

## Sessão 2 — design system

> leia @CLAUDE.md. crie os componentes de `src/components/ui/`, isolados, sem
> conectar a estado nenhum:
>
> Button (variantes: primary preta, accent laranja, outline, ghost — todas
> pílula), Sheet (bottom sheet no mobile, modal centralizado no desktop, fecha no
> esc e no clique fora), Field (linha com ícone à esquerda, label, valor à
> direita, chevron opcional), MoneyInput (R$ fixo + máscara de centavos),
> NumericKeypad (3×4 + apagar, temas light e dark, oculto em `pointer: fine`),
> ProgressDots.
>
> monte uma rota temporária `/kitchen-sink` mostrando todos eles nos dois temas.

**Por que segundo:** as três telas seguintes consomem esses componentes. Sem
isso, o Claude Code reinventa um botão diferente em cada tela.

---

## Sessão 3 — shell, auth e navegação

> leia @CLAUDE.md. implemente:
>
> - `src/lib/queryClient.ts` e o provider do TanStack Query
> - `features/auth/`: tela `/entrar` (campo de e-mail + botão "entrar", magic
>   link via supabase.auth.signInWithOtp), callback de sessão, e um
>   `RequireAuth` que redireciona para `/entrar` quando não há sessão
> - `AppShell`, `BottomNav`, `Sidebar` e as rotas da seção 3, seguindo a tabela
>   de responsividade da seção 6
>
> as telas internas podem ser placeholders com o nome da rota. o FAB do mobile e
> o botão "+ novo" da sidebar levam a `/lancamento/novo`. a tela de entrar segue
> o visual do onboarding (fundo brand-500, botão preto).

Teste no celular antes de seguir: abra a URL do `npm run dev` pelo IP da rede
local (`--host`) e confirme que o link do e-mail te loga no aparelho.

---

## Sessão 4 — onboarding

> leia @CLAUDE.md. veja @docs/ref/pre-onboarding.jpg e
> @docs/ref/onboarding01.jpg. implemente `/bem-vindo` e `/onboarding/:step`
> conforme a seção 5.1 e 5.2, usando os componentes já existentes em
> @src/components/ui. os textos de cada passo ficam em
> `features/onboarding/steps.ts`. ao concluir o passo 5, salva em settings via
> repository e redireciona para `/`.

---

## Sessão 5 — tela de saldos

> leia @CLAUDE.md. veja @docs/ref/app_home_saldos.jpg. implemente a tela de
> saldos da seção 5.3 consumindo `projectMonth` de @src/domain/projection.ts.
> navegação de mês no topo, dia de hoje centralizado ao abrir, cores de saldo
> vindas dos tokens. mobile e desktop conforme a seção 6.

Essa é a tela mais densa do app. Se o contexto encher, pare e abra sessão nova
só para o polimento visual dela.

---

## Sessão 6 — lançamento

> leia @CLAUDE.md. veja @docs/ref/app_home_add_saida.jpg e
> @docs/ref/app_home_add_saida02.jpg. implemente `/lancamento/novo` conforme a
> seção 5.4: tema escuro, alternância entrada/saída, sheet de repetição com as 5
> opções, parcelado pedindo o número de parcelas. salvar via
> @src/repositories/entries.ts e voltar para `/`.

---

## Sessão 7 — totais, tags, menu

Só depois que o fluxo principal estiver de pé. Uma sessão por tela, ou as três
juntas se forem simples.

---

## Sessão 8 — passada de acabamento

> leia @CLAUDE.md. sem adicionar features: revise foco visível em todos os
> interativos, `prefers-reduced-motion`, estados vazios (mês sem lançamento,
> onboarding não concluído) e o comportamento em 360px de largura. rode
> `npx tsc --noEmit`.

---

## Hábitos que cortam consumo pela metade

- `/clear` entre sessões, sempre. Contexto acumulado é o que mais custa.
- Cite arquivos com `@caminho` em vez de descrever onde estão.
- Nunca peça "veja o projeto e melhore" — isso faz ele ler tudo.
- Commit ao fim de cada sessão. Se a sessão seguinte der errado, `git reset` sai
  mais barato que pedir para desfazer conversando.
- Erro de tipo ou build: cole a mensagem crua, sem explicar. Ele resolve mais
  rápido lendo o stack trace do que a sua paráfrase.
- Ajuste visual pequeno (cor, espaçamento, tamanho) você faz na mão. Não vale
  uma rodada de contexto.
