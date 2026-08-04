# grand money

Limite diário de gastos para quem não tem salário fixo.

A maioria dos apps de finança pergunta quanto você ganha por mês. Freelancer não
sabe responder isso. A renda não é uma estimativa — ela **chega em lançamentos ao
longo do mês**, um projeto aqui, uma nota ali. Este app parte do dinheiro que já
entrou: separa o que tem dono (contas, tetos, metas) e transforma o que sobra num
número só, para hoje.

É um velocímetro de gastos, não um app de contabilidade. Não tem plano de contas,
não tem relatório de fim de ano, não tem gráfico de pizza. Tem um número grande na
tela e a pergunta que importa: **posso gastar isso hoje?**

---

## A conta

Tudo no app é a mesma conta, recalculada a cada lançamento:

```
livre  = saldo de abertura + recebido − gasto livre − contas já pagas − guardado
                           − contas ainda por pagar − reserva das metas

diário = livre ÷ dias que faltam no mês        (hoje conta)
```

Três decisões explicam quase todo o resto:

**Realizado e compromisso descem juntos.** A conta de luz que ainda vai chegar já
sai do bolo hoje. Pagar essa conta amanhã não muda o diário — só troca reserva por
gasto. É isso que faz o número parar de pular.

**O diário arredonda para baixo, e não existe diário negativo.** Quando o livre
fica negativo o app diz `falta entrar R$ x` e não inventa um diário. Primeira
quinzena de freelancer é assim; mentir sobre isso seria o único erro grave que um
app desses pode cometer.

**Cartão não adia dinheiro.** Uma compra no crédito sai do livre no dia em que
acontece. Fingir que ela só existe no mês seguinte engordaria o diário de hoje com
dinheiro já gasto — exatamente a mentira que o app existe para não contar. O
cartão é uma dimensão do lançamento, ao lado da categoria, e o limite dele avisa
sem reservar.

A regra completa, com os casos de borda (conta de valor variável, meta que se
refaz a cada mês, recorrência encerrada sem apagar o passado) está em
[`CLAUDE.md`](CLAUDE.md), seção 1 — a fonte da verdade. O código dela vive em
[`src/domain/projection.ts`](src/domain/projection.ts), puro e sem React, coberto
por 65 testes.

---

## As telas

| rota | o que faz |
|---|---|
| `/` | **hoje** — o diário em número grande, ritmo do dia, contas fixas, tetos, metas e cartões |
| `/saldos` | o mês dia a dia: lançamentos, diário e saldo projetado, célula por célula |
| `/gastos` | o que já saiu e o que ainda falta sair, com vencimento e atraso |
| `/totais` | para onde o dinheiro do mês foi — cada linha abre os lançamentos que a compõem |
| `/tags` | recorte por etiqueta |
| `/lancamento/novo` · `/lancamento/:id` | criar e editar, em tema escuro, com recorrência e parcelamento |
| `/entrar` | e-mail e senha, com link mágico como alternativa |
| `/bem-vindo` · `/onboarding/:step` | quatro passos: saldo de hoje, contas, tetos, meta |

Nenhum status é gravado. "Pago" é o lançamento existir com data até hoje; "a
pagar" é o previsto menos o que já saiu naquela categoria. Não existe flag de
pagamento no banco — e não deve passar a existir.

---

## Stack

Vite · React 19 · TypeScript strict · Tailwind v4 · React Router · Zustand ·
TanStack Query · Supabase (Postgres + Auth) · date-fns · lucide-react · vitest ·
oxlint

Sem biblioteca de componentes. Os nove componentes de `components/ui/` são escritos
uma vez e reusados — é o que mantém o app parecendo uma coisa só.

**Camadas, de dentro para fora:**

```
domain/         a conta. sem React, sem rede, sem Supabase — testável sozinha
repositories/   único lugar que fala com o Supabase
hooks/          TanStack Query em cima dos repositories
features/       as telas
components/ui/  as peças, sem estado de servidor
```

Nenhum componente importa `supabase` direto. É o que mantém o motor puro e o
banco trocável.

---

## Rodando

Precisa de Node 20+ e um projeto no Supabase (o plano free serve).

**1. Banco.** No SQL Editor do Supabase, cole o schema da seção 2 do
[`CLAUDE.md`](CLAUDE.md) — quatro tabelas: `settings`, `categories`, `cards`,
`entries`. Depois ligue RLS nas quatro e crie a policy de cada uma:

```sql
alter table <tabela> enable row level security;

create policy "own <tabela>" on <tabela>
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

O `with check` não é enfeite: só com `using`, o INSERT passa pelo SELECT e morre
na escrita com `42501`. E uma tabela sem policy num site publicado é o banco
inteiro exposto pela anon key — são dados financeiros.

**2. Auth.** Em Authentication → Providers, deixe só Email ligado. Crie sua conta,
**desligue signups** e adicione as URLs de redirect (`http://localhost:5173` e a
de produção).

**3. Chaves.**

```bash
cp .env.example .env.local   # preencha URL e anon key
npm install
npm run dev
```

A anon key é pública por design — quem protege os dados é a RLS. A `service_role`
key nunca entra no frontend, em hipótese alguma.

| comando | |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | `tsc -b` + build de produção |
| `npm test` | vitest — o motor de projeção |
| `npm run lint` | oxlint (este projeto **não** usa ESLint) |
| `npm run preview` | serve o `dist/` |

Para testar no celular na mesma rede: `npm run dev -- --host`.

---

## Instalável

O app é PWA: abre pelo ícone, em tela cheia, sem barra do navegador. No Android
o Chrome oferece instalar; no iPhone é Compartilhar → adicionar à tela de início.
Exige HTTPS (ou localhost).

**Não é offline.** O `public/sw.js` existe por um motivo só — o Chrome só oferece
"instalar" a quem tem um service worker com handler de `fetch` — e não guarda nada
em cache. Saldo servido de cache velho mente sobre o dinheiro.

---

## Convenções

- **Centavos, sempre.** Dinheiro circula como `number` inteiro. `formatBRL()` só
  na renderização. Float de reais não entra no domínio.
- **Caixa baixa em toda a interface**, incluindo botões e títulos. É a
  personalidade do produto, não um descuido — não "corrija" para sentence case.
- **Cor só por token.** Tudo em `@theme` no `index.css`. O tema escuro redefine os
  valores dos tokens; nenhum componente escreve `dark:` nem hex literal.
- **Recorrência é regra, não linha.** Uma despesa mensal grava **um** registro e é
  expandida em ocorrências virtuais na leitura. Por isso apagar a regra reescreve
  o passado — para parar uma recorrência existe `data_fim`, e a lixeira oferece
  `encerrar hoje` antes de `apagar tudo`.
- Antes de commitar: `npx oxlint` e `npx tsc --noEmit`.

---

## Fora do escopo, de propósito

Offline · open banking e importação de fatura · cadastro aberto (um usuário, dois
aparelhos) · flag de pagamento no banco · fatura de cartão com fechamento e
vencimento · gráficos e export.

Cada um desses ou contradiz a conta central ou transforma o velocímetro num app de
contabilidade. Se algum deles voltar à mesa, o lugar de discutir é o `CLAUDE.md`,
antes do código.

---

## Mapa da documentação

| arquivo | para quê |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | contexto permanente: regra de negócio, schema, tokens, telas, convenções. É o que qualquer sessão de trabalho lê primeiro |
| [`PLANO.md`](PLANO.md) | ordem em que o app foi construído, sessão por sessão, e receitas de manutenção (como regerar os ícones) |
| `docs/ref/` | as referências visuais que guiaram cada tela |

Projeto pessoal. Um usuário, dois aparelhos, um número na tela.
