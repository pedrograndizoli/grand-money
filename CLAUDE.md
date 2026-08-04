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
| `meta` | um total a juntar até uma data | `meta_total`, `data_final` |

Uma conta fixa é considerada paga **pelos próprios lançamentos**: o pendente dela
é `valor_previsto − soma das saídas naquela categoria no mês`. Não existe flag
nem tabela de status de pagamento — não crie.

**Conta fixa de valor variável** (`valor_estimado = true`): energia, água, aquela
que vem todo mês mas nunca no mesmo valor. O `valor_previsto` dela é só uma
estimativa para reservar, e **o primeiro pagamento do mês fecha a conta**:

```
pendente = valor_estimado && pago > 0 ? 0 : max(0, valor_previsto − pago)
```

Sem isso, pagar R$ 150 de uma estimativa de R$ 200 deixaria R$ 50 reservados para
sempre, segurando dinheiro que já foi resolvido. Continua sem flag de status — o
que fecha a conta é existir lançamento nela no mês. Numa conta de valor exato o
pagamento parcial segue cobrando a diferença, porque ali a diferença é real.

**A meta não tem valor mensal digitado.** O usuário informa quanto quer juntar
(`meta_total`) e até quando (`data_final`); o mensal é calculado e se refaz a
cada mês, em cima do que ainda falta:

```
faltaNoInicioDoMes = max(0, meta_total − guardado em todos os meses anteriores)
mesesAtePrazo      = meses de (mês visível) até (mês de data_final), inclusive
mensal             = ceil(faltaNoInicioDoMes / mesesAtePrazo)
```

Arredonda **para cima**: por baixo, a soma dos meses não fecha a meta. No último
mês — ou com o prazo vencido — cai tudo o que falta de uma vez, senão a meta
sumiria da conta justo quando mais aperta. Guardar a mais num mês alivia os
seguintes; pular um mês dilui o resto nos que sobraram. Meta sem `meta_total` ou
sem `data_final` não reserva nada.

### Cartões de crédito

Cartão é entidade própria (`cards`), informada **na mão** — não existe open
banking nem importação de fatura. Tem nome e `limite_mensal`, o teto de gasto do
mês naquele cartão (`0` = sem teto). Um lançamento de **saída** aponta para um
cartão em `entries.card_id`; `null` é à vista, débito ou dinheiro. Entrada e
`guardado` nunca têm cartão.

**O cartão não adia dinheiro.** Uma saída no cartão sai do `livre` no dia em que
acontece, igual a qualquer outra: não existe fatura, fechamento nem vencimento
no modelo. Fingir que o dinheiro só sai no mês seguinte aumentaria o diário de
hoje com dinheiro já comprometido, e isso é exatamente a mentira que o app
existe para não contar. O cartão é uma **dimensão** do lançamento, ao lado da
categoria, não um caminho diferente para o dinheiro.

O teto do cartão, como o teto flexível, **avisa e não reserva**: `allocateMonth`
devolve `cartoes: { limite, gasto, restante, acimaDoLimite }` e a UI mostra a
barra. Nada disso entra na conta do `livre`.

### Regra de negócio central

Em `src/domain/projection.ts`, função `allocateMonth`:

```
saldoAbertura  = saldo no dia 1 do mês visível, caminhando do `saldo_ref`
recebido       = soma das entradas do mês até hoje
gastoLivre     = saídas em categorias flexíveis ou sem categoria
pagoFixas      = saídas em categorias fixas
guardado       = lançamentos de tipo `guardado` no mês
pendenteFixas  = Σ pendente das categorias fixas  (ver conta de valor variável)
reservaMeta    = Σ max(0, mensal − guardado)   das categorias meta
                 (mensal calculado do total e do prazo, ver acima)

livre  = saldoAbertura + recebido − gastoLivre − pagoFixas − guardado
                       − pendenteFixas − reservaMeta

diario = livre / diasRestantesNoMes            (hoje conta)
```

**O saldo de partida é âncora com data, não um número que se repete.**
`saldo_inicial` vale no **início do dia** `saldo_ref`; para qualquer outro mês,
o motor caminha pelos lançamentos entre as duas datas — para frente somando,
para trás subtraindo. Sem isso, abrir setembro somava de novo o dinheiro que já
tinha sido contado em agosto, e o próprio mês de referência contava duas vezes
tudo que caiu entre o dia 1 e o `saldo_ref`.

O dia do `saldo_ref` conta normalmente dentro do mês. A leitura oposta (o saldo
já inclui o dia inteiro) erraria toda vez que se gasta algo mais tarde no mesmo
dia, que é o caso comum; esta erra só ao catalogar, depois do onboarding, algo
que aconteceu mais cedo naquele mesmo dia.

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
- **Encerrar ≠ apagar.** Como a ocorrência passada é virtual, apagar a regra
  reescreve o histórico: os oito meses de assinatura somem dos totais de meses
  já fechados. Para parar uma recorrência existe `entries.data_fim` — a regra
  deixa de gerar dali em diante e o passado fica de pé. A lixeira do formulário
  oferece `encerrar hoje` primeiro e só depois `apagar tudo, inclusive o
  passado`. Parcelado não tem o que encerrar: acaba pelo número de parcelas.
- Arredondamento: calcular em **centavos inteiros** (`number` em centavos), nunca
  em float de reais. Formatar só na borda da UI.

---

## 2. Stack

| Camada | Escolha |
|---|---|
| Build | Vite |
| UI | React 19 + TypeScript (strict) |
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

Supabase Auth com **e-mail e senha** como caminho principal e **magic link**
(OTP) como alternativa, na mesma tela `/entrar`, com `RequireAuth` envolvendo
todo o resto. Sem cadastro: o usuário é criado uma vez e os signups ficam
desligados no painel.

Os dois métodos são do **mesmo** usuário — senha não substitui o link, soma.
`supabase.auth.updateUser({ password })` mexe na linha existente de
`auth.users`, então o `id` não muda e nada que pende dele por `user_id` se
perde. Trocar de método **nunca** deve virar usuário novo: uuid diferente é
conta diferente, e a RLS esconderia todo o histórico.

Definir e trocar senha fica no menu (`auth/SenhaSheet`), não no painel do
Supabase — é por ali que se recupera o acesso: entra pelo link mágico e troca a
senha. O link só abre no aparelho onde se toca nele, e é justamente essa
limitação que a senha existe para resolver (entrar num segundo aparelho).

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
  valor_previsto int not null default 0,  -- fixa: conta · flexivel: teto · meta: não usa
  valor_estimado boolean not null default false,  -- só em 'fixa': o valor muda todo mês
  dia_vencimento int,                     -- só em 'fixa'
  meta_total int,                         -- só em 'meta': o total a juntar
  data_final date,                        -- só em 'meta': o prazo
  cor text
);

create table cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  nome text not null,
  limite_mensal int not null default 0,   -- centavos · 0 = sem teto
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
  card_id uuid references cards on delete set null,  -- null = à vista; só em saída
  recorrencia text not null default 'nenhuma'
    check (recorrencia in ('nenhuma','mensal','semanal','diaria','parcelado')),
  parcelas int,                       -- só quando recorrencia = 'parcelado'
  data_fim date,                      -- último dia da recorrência; null = sem fim
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index entries_user_data_idx on entries (user_id, data);
```

`guardado` não é saída: contá-lo como gasto inflaria os gastos do mês. É dinheiro
que sai do bolo livre para uma meta.

RLS ligada nas quatro tabelas. A policy precisa de `using` **e** `with check` — só
`using` deixa o INSERT passar pelo SELECT e morrer na escrita com `42501`:

```sql
create policy "own <tabela>" on <tabela>
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

**Offline não está no escopo.** O site exige conexão. Se isso incomodar depois,
a solução é cache do TanStack Query persistido, não um motor de sincronização.

### Instalação (PWA)

O app é **instalável**: abre pelo ícone, em tela cheia, sem barra do navegador.
É um app que se consulta várias vezes por dia — a barra do navegador em cima do
diário é ruído. Isso são quatro coisas, e nenhuma delas é offline:

- `public/manifest.webmanifest` — `display: standalone`, `start_url: /`, nome e
  ícones.
- Ícones em `public/`: `icon-192/512.png` (cantos arredondados, `purpose: any`),
  `icon-maskable-512.png` (full-bleed, o Android recorta no formato do launcher)
  e `apple-touch-icon.png` (180 — o iOS ignora os ícones do manifest na tela de
  início). Todos derivados do `favicon.svg` e do `icon-square.svg`; a receita de
  regerar está no `PLANO.md`.
- `theme-color` acompanha o tema. Instalado, o Android pinta a barra de status
  com esse valor: fixo no branco, ela viraria uma tira clara em cima do app
  escuro. `store/useTheme` reescreve a meta lendo `--color-surface` já
  resolvido, para não hardcodar hex fora do `index.css`.
- `public/sw.js` — service worker **de instalação, não de offline**. Existe
  porque o Chrome no Android só oferece "instalar app" a quem tem um service
  worker com handler de `fetch`; sem ele sobra o atalho genérico, que abre com
  barra do navegador. Ele repassa a navegação para a rede e **não guarda nada**.

Não transforme o `sw.js` em cache achando que ele está pela metade. Saldo
servido de cache velho mente sobre o dinheiro, e é exatamente essa mentira que o
app existe para não contar. Registrado por `lib/pwa.ts`, só em produção.

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
    entries.ts  settings.ts  categories.ts  cards.ts
  hooks/
    useEntries.ts  useSettings.ts  useCategories.ts  useCards.ts
    useIsTouch.ts
  store/
    useMonth.ts            mês visível
    useTheme.ts            claro/escuro, persistido no localStorage
  components/
    ui/                    Button, Sheet, Field, NumericKeypad, MoneyInput,
                           PasswordInput, StatusPill...
    layout/                AppShell, BottomNav, Sidebar, MonthStepper, BrandScreen, ThemeToggle
  features/
    auth/                  tela /entrar + RequireAuth
    onboarding/            4 passos: saldo de hoje + categorias iniciais
    today/                 `/` — o diário de hoje, metas e cartões
    balances/              `/saldos` — o mês dia a dia
    expenses/              `/gastos` — o que já saiu e o que falta sair
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

  /* tints dos selos de status: fundo suave, cor forte no texto */
  --color-accent-100: #fce8e0;
  --color-income-100: #dff2e8;
  --color-badge-100:  #fce0ec;
  --color-ink-100:    #eeeeee;

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

**Tema escuro.** O `.dark` no `<html>` **só redefine os valores dos tokens** em
`index.css` — `--color-surface`, `--color-ink-*`, `--color-positive/negative` e
os tints dos selos. Como toda utility do Tailwind v4 compila para
`var(--color-…)`, o app inteiro vira sem uma única classe `dark:`. Não escreva
`dark:` em componente: se algo não virou, é porque foi escrito como cor literal
(`bg-white`, `bg-ink-900` num fundo sólido) — troque pelo token
(`bg-surface`, `bg-solid` + `text-on-solid`).

Duas exceções por desenho: o formulário de lançamento e os sheets `tone="dark"`
são escuros sempre (`surface-dark`, `line-dark`, `white/xx`), e as telas de marca
(`BrandScreen`, onboarding, `/entrar`) levam a classe **`.tema-claro`**, que
retrava os tokens no claro — pink da marca com texto escuro é identidade, não
preferência.

O botão fica no canto superior direito do `AppShell` (`layout/ThemeToggle`), o
estado em `store/useTheme` (localStorage, com `prefers-color-scheme` como
padrão), e a troca anima por um círculo que cresce do botão via View Transitions
API. Sem suporte (Firefox) ou com `prefers-reduced-motion`, troca seca.

**Vocabulário de estado.** Um só, em todas as telas, via `components/ui/StatusPill`:

| estado | selo | onde |
|---|---|---|
| pago / paga | verde claro (`income-100` + `income-600`), com ✓ | lançamento já realizado, conta fixa quitada |
| a pagar · agendado · estimada | laranja claro (`accent-100` + `accent-600`) | conta em aberto, saída com data futura |
| atrasada · teto estourado | laranja sólido (`accent-600` + branco) | vencimento já passou, teto ultrapassado |
| neutro | cinza (`ink-100` + `ink-600`) | informação sem urgência, tipo "restam R$ x" |

Só o estado que **exige ação** ganha cor sólida — se tudo grita, nada grita. Na
lista de gastos a linha ainda leva uma barra de 4px na borda esquerda com a
mesma cor do selo, para o olho varrer a coluna sem ler.

---

## 5. As telas

### 5.1 Pré-onboarding (`/bem-vindo`)
Fundo `brand-500` inteiro. `X` no topo esquerdo. Título grande em caixa baixa,
parágrafo explicativo em `ink-900/60`. No rodapé, dois botões empilhados:
`calcular previsão de diário` (preto, sólido) e `calcular depois` (contorno).

### 5.2 Onboarding (`/onboarding/:step`)
**Quatro passos**, quatro bolinhas: 1) saldo de hoje · 2) contas fixas ·
3) tetos flexíveis · 4) meta (opcional, com `pular`). A renda não é estimada
aqui — ela chega em lançamentos de entrada. No passo 4 o usuário dá o **valor
total** e o **prazo**, e a tela mostra o mensal que o app calculou — nome, valor
e prazo são os três obrigatórios ali.

Layout comum: seta voltar + bolinhas de progresso no topo, pergunta em display
grande, botão preto no rodapé. O texto de cada passo fica em
`features/onboarding/steps.ts` — conversacional, não corporativo.

O passo 1 é um `MoneyInput` gigante com `R$` fixo e placeholder `0,00`. Os
passos 2 a 4 usam o `CategoryComposer`: chips com nomes comuns (aluguel,
energia, mercado…), campo de nome, valor, `vence dia` só em `fixa`,
`adicionar outra` e a lista do que já entrou, com remover. O mesmo nome no mesmo
tipo atualiza a linha em vez de duplicar.

Nada é gravado no meio do caminho: as categorias ficam num rascunho em
`sessionStorage` e vão para o banco num insert só (`createCategories`) junto com
`settings`, no fim do último passo.

O teclado numérico customizado (3×4, com apagar) aparece **só em touch**, e
alimenta um campo por vez — `valor` ou `dia`, conforme o último tocado. No
desktop os inputs recebem foco e usam o teclado real.

### 5.3 Hoje (`/`) — tela principal
Tema claro, título `hoje` e a data por extenso. Sempre o **mês corrente**: hoje
não existe em outro mês, então esta tela não tem navegação de mês.

1. **Herói:** o diário em display grande sobre `--color-positive`, com
   `R$ x livres para N dias` embaixo. Em déficit, vira `falta entrar R$ x`,
   sem diário.
2. **Ritmo do dia:** quanto do diário de hoje já foi usado, com barra. É
   indicador, nunca "economizado".
3. **Aviso** quando `tetosAcimaDoDisponivel`.
4. **Blocos por tipo de categoria:** contas fixas (vencimento, selo de estado e
   pendente), tetos flexíveis (barra de uso), metas (guardado / previsto) e
   cartões (gasto / teto). Toda linha abre um sheet de edição, e cada bloco
   termina no botão de criar — **é daqui que saem** conta fixa, teto e cartão,
   fora do onboarding. Conta fixa e teto usam `today/CategorySheet`, cartão usa
   `CardSheet`, meta usa `MetaSheet` (campos diferentes: total e prazo). A meta
   mostra barra de progresso da meta **inteira** (`guardadoTotal / metaTotal`),
   não do mês.
5. **Nav inferior (mobile):** hoje · saldos · **+** (FAB preto) · gastos ·
   totais · menu. Item ativo em `accent-500` com barra no topo. Cinco itens é o
   teto: o FAB ocupa uma coluna e não cabe em coluna mais estreita, então uma
   tela nova no rodapé empurra outra para o menu.

### 5.4 Saldos (`/saldos`) — o mês dia a dia
Tabela navegável por mês, quatro colunas: **dia · lançamentos · diário · saldo**.
`TodayBadge` volta para o mês corrente, `LegendButton` explica as cores, e o dia
de hoje é centralizado ao abrir. A coluna de saldo é o `livre` queimando o
diário (`projectMonth`), com fundo `--color-positive`/`--color-negative` por
célula; dia já passado não tem projeção, mostra só o que aconteceu. Tocar num
dia com lançamento abre o `EntriesSheet`.

### 5.5 Gastos do mês (`/gastos`)
Lista das saídas do mês visível em duas seções: **a pagar** (contas fixas com
pendente, ordenadas por vencimento e marcadas quando atrasam, mais as saídas com
data futura dentro do mês) e **pago** (saídas com data até hoje, mais recentes
primeiro). No topo, `pago` e `a pagar` em números.

Nada aqui é status gravado — **não crie flag de pagamento**. "Pago" é o
lançamento existir com data até hoje; "a pagar" é `valor_previsto − pago` da
categoria fixa. Tocar numa linha de lançamento abre a edição dele.
`guardado` não aparece: não é gasto.

### 5.6 Totais (`/totais`)
Hero com o livre do mês, saldo de partida e **movimentações do mês**: uma linha
por destino do dinheiro, com ícone circular colorido, contagem e total —
entradas · gasto livre · contas fixas · guardado · no cartão. Cada linha abre o
`EntriesSheet` com os lançamentos daquele grupo, e cada lançamento leva à
edição. Abaixo, o que ainda está comprometido e os totais por categoria e por
cartão.

O total de cada grupo é a soma do que está listado dentro dele — abrir e
conferir fecha a conta. **`no cartão` é recorte, não fluxo**: aquelas saídas já
estão contadas em gasto livre ou contas fixas, e a linha diz isso. Somar as
cinco linhas não dá o gasto do mês.

### 5.7 Adicionar (sheet) e lançamento (`/lancamento/novo` e `/lancamento/:id`)
O FAB e o `+ novo` da sidebar abrem antes o sheet **adicionar**
(`entry-form/NewEntrySheet`), com cinco caminhos: entrada · conta fixa · gasto
livre · guardado · gasto no cartão. Não são cinco tipos — são os três tipos de
lançamento mais dois atalhos de saída. A escolha vira query no formulário
(`?tipo=` e `?abrir=categoria|cartao`): `tipo` define o tipo já selecionado e
`abrir` faz o formulário nascer com aquela lista aberta. Query só vale ao criar;
em edição, o lançamento manda.

Tema **escuro**, contrastando com o resto do app. Valor grande no topo, depois
linhas separadas por hairline: tipo, categoria, cartão, descrição, data,
repetição, tags. Botão laranja no rodapé. Teclado numérico embaixo (touch).
A linha de cartão só aparece em `saída`, e `à vista` é o padrão.

Três tipos, cada um com ícone circular próprio: `saída` (laranja), `entrada`
(verde), `guardado` (`--color-badge`). A categoria oferecida segue o tipo —
`guardado` só lista metas, `saída` lista fixas e flexíveis, `entrada` não tem
categoria. Trocar o tipo limpa a categoria.

Selecionar "repetição" abre um sheet vindo de baixo com 5 opções, cada uma com
título e descrição: não repete · mensalmente · semanalmente · diariamente ·
parcelado (pede número de parcelas e divide o valor).

Repetição sem fim ganha a linha **`repete até`**, que começa em `sem fim` e
grava `data_fim`. Parcelado não tem essa linha: o fim dele é o número de
parcelas.

Em modo edição aparece uma lixeira no topo. Recorrência não tem exceção por dia:
editar age sobre a **regra inteira**, e a UI diz isso antes de agir. Na lixeira,
repetição sem fim oferece `encerrar hoje` como ação principal e `apagar tudo,
inclusive o passado` como a destrutiva — apagar reescreveria meses fechados.

---

## 6. Responsividade

Mobile-first. Breakpoint único que importa: `lg` (1024px).

| | mobile | desktop |
|---|---|---|
| navegação | bottom nav + FAB | sidebar fixa à esquerda (240px), botão `+ novo` no topo dela |
| conteúdo | full width | shell até `max-w-6xl`; **cada tela escolhe sua largura** |
| sheets | slide de baixo, full width | modal centralizado, `max-w-md`, fade + scale |
| lançamento | tela cheia | modal `max-w-md` sobre escurecido |
| teclado numérico | visível | oculto (`pointer: fine`), teclado do SO |
| tabela de saldos | 4 colunas compactas | `max-w-4xl`, mesmas colunas com mais respiro |
| listas (gastos, totais, tags, menu) | full width | `max-w-3xl`: linha longa demais é ruim de ler |
| hoje | uma coluna, blocos empilhados | usa a largura toda: faixa do velocímetro + grid de cards, 2 colunas em `lg` e 3 em `xl` |
| onboarding | full bleed pink | card branco `max-w-lg` centralizado sobre fundo pink |

**A largura não é do shell, é da tela.** O `AppShell` só põe o teto em `6xl`;
quem decide é cada página, porque elas querem coisas opostas — a lista quer
linha curta para ler, o painel de hoje quer espaço para distribuir os cards. Um
`max-w-3xl` no shell espremia `hoje` numa tira com scroll próprio no meio de um
monitor vazio.

Nos blocos de `hoje`, a moldura de card (`rounded-2xl` + borda) é **só no
desktop**: no celular eles seguem chapados, separados por hairline, que já
estava bom.

Detectar touch com `@media (pointer: coarse)`, não com user-agent nem com
largura de tela.

---

## 7. Regras para você, Claude

- **Não invente escopo.** Construa a tela pedida e pare. Nada de settings,
  gráficos ou export que não foram pedidos. (O tema escuro **foi** pedido e
  existe — ver seção 4.)
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
