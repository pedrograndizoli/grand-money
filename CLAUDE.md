# CLAUDE.md

Contexto permanente deste projeto. Leia antes de qualquer tarefa.

---

## 1. O produto

App web de **limite diário de gastos para renda irregular**. O usuário é
freelancer: a renda não é estimada, ela **chega em lançamentos de entrada ao
longo do mês**. O app aloca o que chegou — separa compromissos, e o que sobra
vira um diário para os dias que faltam. A cada lançamento, tudo é recalculado.
Funciona como um velocímetro de gastos, não como um app de contabilidade.

Não é um clone de nenhum app existente. Não copie nomes, logos ou textos de
marcas de terceiros. O nome do produto está em `src/config/app.ts`.

### Categorias

Categoria é uma entidade, com três tipos:

| tipo | o que é | campos que usa |
|---|---|---|
| `fixa` | conta com valor previsto e vencimento (aluguel, energia) | `valor_previsto`, `dia_vencimento` |
| `flexivel` | teto mensal de gasto livre (mercado, lazer) | `valor_previsto` |
| `meta` | quanto guardar por mês, com total opcional | `valor_previsto`, `meta_total` |

Uma conta fixa é considerada paga **pelos próprios lançamentos**: o pendente dela
é `valor_previsto − soma das saídas naquela categoria no mês`. Não existe flag
nem tabela de status de pagamento — não crie.

### Regra de negócio central

Em `src/domain/projection.ts`, função `allocateMonth`:

```
recebido       = soma das entradas do mês até hoje
gastoLivre     = saídas em categorias flexíveis ou sem categoria
pagoFixas      = saídas em categorias fixas
guardado       = lançamentos de tipo `guardado` no mês
pendenteFixas  = Σ max(0, previsto − pago)     das categorias fixas
reservaMeta    = Σ max(0, previsto − guardado) das categorias meta

livre  = saldoInicial + recebido − gastoLivre − pagoFixas − guardado
                      − pendenteFixas − reservaMeta

diario = livre / diasRestantesNoMes            (hoje conta)
```

Realizado e compromisso entram os dois, e é o que mantém a conta estável: a fixa
desconta o que já foi pago **mais** o que ainda falta, e a meta segue a mesma
simetria com `guardado` e `reservaMeta`. Pagar uma conta não muda o `livre` — só
troca reserva por gasto. Sem o termo `guardado`, o dinheiro voltaria ao bolo
livre no instante em que fosse guardado.

- Quando `livre < 0` **não existe diário**. `allocateMonth` retorna
  `{ status: 'deficit', falta: -livre }` e a UI decide a mensagem. Isso é estado
  normal de primeira quinzena de freelancer, **não é erro**.
- Por categoria flexível, retorna `{ alocado, gasto, restante }`. `restante` é
  assinado: negativo quando estourou o teto. Se `Σ max(0, restante) > livre`,
  marca `tetosAcimaDoDisponivel: true` — teto não reserva dinheiro, só avisa.
- **Ritmo não é economia.** `ritmoDoDia = diario − gastoLivreHoje` é indicador,
  não dinheiro guardado. Dinheiro só vira guardado com um lançamento de tipo
  `guardado`, que sai do bolo livre e não volta. **Nunca** chame o ritmo de
  "economizado".
- O diário arredonda **para baixo**: prometer mais do que existe é mentira.
- Lançamentos recorrentes (mensal/semanal/diário/parcelado) são **expandidos em
  ocorrências virtuais** na hora de calcular. Nunca gravar 12 linhas no banco por
  uma despesa mensal: gravar a regra e expandir na leitura.
- Arredondamento: calcular em **centavos inteiros** (`number` em centavos), nunca
  em float de reais. Formatar só na borda da UI.

---

## 2. Stack

| Camada | Escolha |
|---|---|
| Build | Vite |
| UI | React 18 + TypeScript (strict) |
| Estilo | Tailwind v4 (`@tailwindcss/vite`, config via `@theme` no CSS) |
| Rotas | React Router v6 |
| Estado de UI | Zustand |
| Estado de servidor | TanStack Query |
| Backend | Supabase (Postgres + Auth), atrás de uma camada `repositories/` |
| Datas | date-fns + `date-fns/locale/pt-BR` |
| Ícones | lucide-react |

**Uso pessoal, um usuário, dois aparelhos.** Os dados vivem no Postgres do
Supabase para que celular e desktop enxerguem a mesma coisa.

Toda leitura/escrita passa por `src/repositories/*.ts`. Nenhum componente importa
`supabase` direto — componentes usam hooks do TanStack Query, que chamam os
repositories. Isso mantém o motor de projeção puro e testável.

### Autenticação

Magic link (OTP por e-mail) do Supabase Auth. Sem senha, sem cadastro, sem
recuperação de conta — é uma tela só com campo de e-mail e botão `entrar`. Rota
`/entrar`, com `RequireAuth` envolvendo todo o resto.

`user_id` em todas as tabelas, com RLS ligada e policy
`auth.uid() = user_id` para select/insert/update/delete. Isso não é opcional:
são dados financeiros num site público.

### Chaves

`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` em `.env.local`, que está no
`.gitignore`. A anon key é pública por design — a proteção real é a RLS. Nunca,
em hipótese alguma, coloque a `service_role` key no frontend.

### Schema

```sql
create table settings (
  user_id uuid primary key references auth.users on delete cascade,
  saldo_inicial int not null default 0,   -- centavos
  saldo_ref date not null default current_date,
  updated_at timestamptz not null default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  nome text not null,
  tipo text not null check (tipo in ('fixa','flexivel','meta')),
  valor_previsto int not null default 0,  -- fixa: conta · flexivel: teto · meta: por mês
  dia_vencimento int,                     -- só em 'fixa'
  meta_total int,                         -- só em 'meta', opcional
  cor text
);

create table entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  tipo text not null check (tipo in ('entrada','saida','guardado')),
  valor int not null,                 -- centavos, sempre positivo
  descricao text,
  data date not null,
  category_id uuid references categories,  -- null = gasto livre sem categoria
  recorrencia text not null default 'nenhuma'
    check (recorrencia in ('nenhuma','mensal','semanal','diaria','parcelado')),
  parcelas int,                       -- só quando recorrencia = 'parcelado'
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index entries_user_data_idx on entries (user_id, data);
```

`guardado` não é saída: contá-lo como gasto inflaria os gastos do mês. É dinheiro
que sai do bolo livre para uma meta.

RLS ligada nas três tabelas. A policy precisa de `using` **e** `with check` — só
`using` deixa o INSERT passar pelo SELECT e morrer na escrita com `42501`:

```sql
create policy "own <tabela>" on <tabela>
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

**Offline não está no escopo.** O site exige conexão. Se isso incomodar depois,
a solução é cache do TanStack Query persistido, não um motor de sincronização.

---

## 3. Estrutura de pastas

```
src/
  config/app.ts            nome do app, moeda, locale
  domain/
    types.ts               Entry, Category, CategoryType, Settings, Recurrence
    money.ts               centavos <-> string BRL
    projection.ts          allocateMonth + expandEntries — o motor
    projection.test.ts     único lugar com testes
  lib/
    supabase.ts            client único
    queryClient.ts  cn.ts  date.ts  errors.ts
  repositories/
    entries.ts  settings.ts  categories.ts
  hooks/
    useEntries.ts  useSettings.ts  useCategories.ts   (TanStack Query)
    useIsTouch.ts
  store/
    useMonth.ts            mês visível — só isso é estado global de UI
  components/
    ui/                    Button, Sheet, Field, NumericKeypad, MoneyInput...
    layout/                AppShell, BottomNav, Sidebar, MonthStepper, BrandScreen
  features/
    auth/                  tela /entrar + RequireAuth
    onboarding/            um passo só: quanto você tem hoje
    balances/              tela principal — a alocação do mês
    entry-form/            criar/editar/apagar lançamento
    totals/  tags/  menu/
  routes.tsx
  index.css                tokens do Tailwind v4
```

---

## 4. Design tokens

Definir em `index.css` com `@theme`. Nunca hardcodar hex em componente.

```css
@theme {
  /* pink — exclusivo do onboarding */
  --color-brand-500: #f2649b;
  --color-brand-300: #f7a3c4;
  --color-brand-100: #fdeef4;

  /* preto/cinza — texto e botões primários */
  --color-ink-900: #1b1b1b;
  --color-ink-600: #6b6b6b;
  --color-ink-300: #d9d9d9;

  /* laranja — saídas e tab ativa */
  --color-accent-600: #cf420f;
  --color-accent-500: #e8531f;

  /* projeção de saldo */
  --color-positive: #fbe5a0;   /* fundo da célula com saldo >= 0 */
  --color-negative: #f8c9cd;   /* fundo da célula com saldo < 0  */
  --color-badge:    #e8156f;   /* selo "D" do diário */

  /* dark (formulário de lançamento) */
  --color-surface-dark: #121212;
  --color-row-dark:     #0d0d0d;
  --color-line-dark:    #2a2a2a;

  --font-display: "Outfit", system-ui, sans-serif;
  --font-num:     "Inter", system-ui, sans-serif;  /* font-variant-numeric: tabular-nums */
}
```

**Tipografia:** Outfit (geométrica arredondada) para títulos e labels; Inter com
`tabular-nums` para toda coluna de valores — sem isso os números da tabela
dançam. Fonte via `@fontsource` (evita FOUC e dependência de CDN).

**Regra de voz:** toda a interface é em **caixa baixa**, incluindo botões e
títulos. `adicionar saída`, `calcular previsão de diário`, `saldos`. É a
personalidade do produto — não "corrija" para sentence case.

**Raio:** pílula total (`rounded-full`) em botões; `rounded-2xl` em sheets e
cards; `rounded-none` nas linhas da tabela de saldos.

---

## 5. As telas

### 5.1 Pré-onboarding (`/bem-vindo`)
Fundo `brand-500` inteiro. `X` no topo esquerdo. Título grande em caixa baixa,
parágrafo explicativo em `ink-900/60`. No rodapé, dois botões empilhados:
`calcular previsão de diário` (preto, sólido) e `calcular depois` (contorno).

### 5.2 Onboarding (`/onboarding/:step`)
**Um passo só:** quanto você tem hoje. A renda não é mais estimada aqui — ela
chega em lançamentos de entrada — e categorias são criadas como entidade, fora
do onboarding.

Layout: seta voltar + bolinhas de progresso no topo, pergunta em display grande,
`MoneyInput` gigante com `R$` fixo e placeholder `0,00`, texto de ajuda embaixo,
botão preto no rodapé. O texto do passo fica em `features/onboarding/steps.ts` —
conversacional, não corporativo.

O teclado numérico customizado (3×4, com apagar) aparece **só em touch**. No
desktop o input recebe foco e usa o teclado real.

### 5.3 Alocação (`/`) — tela principal
Tema claro, `‹ ago/26 ›` no topo. De cima para baixo:

1. **Herói:** o diário em display grande sobre `--color-positive`, com
   `R$ x livres para N dias` embaixo, e a linha de ritmo do dia. Em déficit, vira
   `falta entrar R$ x` sobre `--color-negative`, sem diário.
2. **Aviso** quando `tetosAcimaDoDisponivel`.
3. **o mês até aqui:** recebido · gasto livre · pago em fixas · guardado.
4. **comprometido:** fixas a pagar · ainda a guardar · **livre**.
5. **Blocos por tipo de categoria:** contas fixas (com vencimento e pendente),
   tetos flexíveis (com barra de uso), metas (guardado / previsto).
6. **Nav inferior (mobile):** saldos · totais · **+** (FAB preto) · tags · menu.
   Item ativo em `accent-500` com barra no topo.

> Esta tela é provisória. A visão dia a dia (tabela com selo `D`, saldo por dia,
> cores por linha) saiu do modelo — os componentes dela seguem em
> `features/balances/` (`TodayBadge`, `LegendButton`, `DayEntriesSheet`)
> aguardando virar uma tela à parte. Não apague sem combinar.

### 5.4 Lançamento (`/lancamento/novo` e `/lancamento/:id`)
Tema **escuro**, contrastando com o resto do app. Valor grande no topo, depois
linhas separadas por hairline: tipo, categoria, descrição, data, repetição, tags.
Botão laranja no rodapé. Teclado numérico embaixo (touch).

Três tipos, cada um com ícone circular próprio: `saída` (laranja), `entrada`
(verde), `guardado` (`--color-badge`). A categoria oferecida segue o tipo —
`guardado` só lista metas, `saída` lista fixas e flexíveis, `entrada` não tem
categoria. Trocar o tipo limpa a categoria.

Selecionar "repetição" abre um sheet vindo de baixo com 5 opções, cada uma com
título e descrição: não repete · mensalmente · semanalmente · diariamente ·
parcelado (pede número de parcelas e divide o valor).

Em modo edição aparece uma lixeira no topo. Recorrência não tem exceção por dia:
editar ou apagar age sobre a **regra inteira**, e a UI diz isso antes de agir.

---

## 6. Responsividade

Mobile-first. Breakpoint único que importa: `lg` (1024px).

| | mobile | desktop |
|---|---|---|
| navegação | bottom nav + FAB | sidebar fixa à esquerda (240px), botão `+ novo` no topo dela |
| conteúdo | full width | `max-w-3xl` centralizado |
| sheets | slide de baixo, full width | modal centralizado, `max-w-md`, fade + scale |
| teclado numérico | visível | oculto (`pointer: fine`), teclado do SO |
| tabela de saldos | 4 colunas compactas | mesmas colunas, mais respiro, hover na linha |
| onboarding | full bleed pink | card branco `max-w-lg` centralizado sobre fundo pink |

Detectar touch com `@media (pointer: coarse)`, não com user-agent nem com
largura de tela.

---

## 7. Regras para você, Claude

- **Não invente escopo.** Construa a tela pedida e pare. Nada de settings, dark
  mode toggle, gráficos ou export que não foram pedidos.
- **Leia só o necessário.** Se eu não citar um arquivo com `@`, não vasculhe o
  projeto atrás dele.
- Componentes de `components/ui/` são criados **uma vez** e reusados. Antes de
  criar um botão, cheque se `Button` já existe.
- TypeScript strict, sem `any`. Props tipadas.
- Valores monetários circulam como `number` em **centavos**. `formatBRL()` só na
  renderização.
- Acessibilidade mínima: foco visível, `aria-label` em botão só-ícone,
  `prefers-reduced-motion` respeitado.
- Sem biblioteca de componentes pronta (shadcn, MUI, Chakra). Tailwind puro.
- Comentário só onde a regra de negócio não é óbvia. Não narre o código.
- Este projeto usa **oxlint**, não ESLint. Não instale ESLint nem crie
  `eslint.config.js`.
- Nunca escreva chave, URL de projeto ou e-mail dentro do código. Só
  `import.meta.env.VITE_*`.
- Mutação (criar/editar/apagar lançamento) sempre invalida a query do mês
  afetado. Sem `refetch` manual espalhado em componente.
- Ao terminar, rode `npx oxlint` e `npx tsc --noEmit` e corrija o que aparecer.
