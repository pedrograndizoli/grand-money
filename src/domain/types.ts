/** Todo valor monetário neste app é um inteiro em centavos. */
export type Cents = number

/**
 * `guardado` não é gasto nem receita: é dinheiro que sai do bolo livre para uma
 * meta e não volta. Contabilizá-lo como saída inflaria os gastos do mês.
 */
export type EntryType = 'entrada' | 'saida' | 'guardado'

export type Recurrence =
  | 'nenhuma'
  | 'mensal'
  | 'semanal'
  | 'diaria'
  | 'parcelado'

/**
 * `fixa`     conta com valor previsto e dia de vencimento (aluguel, energia)
 * `flexivel` teto mensal de gasto livre (mercado, lazer)
 * `meta`     quanto guardar por mês, com total opcional
 */
export type CategoryType = 'fixa' | 'flexivel' | 'meta'

export interface Category {
  id: string
  nome: string
  tipo: CategoryType
  /** fixa: valor da conta · flexivel: teto do mês · meta: não usa (o mensal é calculado) */
  valorPrevisto: Cents
  /**
   * Só em `fixa`: a conta vem todo mês mas o valor muda (energia, água). O
   * previsto vira estimativa, e o primeiro pagamento do mês fecha a conta —
   * seguir reservando a diferença seria segurar dinheiro que já foi resolvido.
   */
  valorEstimado: boolean
  /** só em `fixa` */
  diaVencimento: number | null
  /** só em `meta`: o total a juntar */
  metaTotal: Cents | null
  /** só em `meta`: o prazo (YYYY-MM-DD). O quanto por mês sai dele, não do usuário */
  dataFinal: string | null
  cor: string | null
}

export type CategoryDraft = Omit<Category, 'id'>

/**
 * Cartão de crédito informado na mão — não existe integração com banco. É só
 * uma forma de pagamento com teto próprio: gastar no cartão **não** adia nada,
 * a saída sai do livre no dia em que acontece, como qualquer outra.
 */
export interface Card {
  id: string
  nome: string
  /** teto de gasto do mês no cartão; 0 = sem teto */
  limiteMensal: Cents
  cor: string | null
}

export type CardDraft = Omit<Card, 'id'>

export interface Entry {
  id: string
  tipo: EntryType
  /** sempre positivo; o sinal vem de `tipo` */
  valor: Cents
  descricao: string | null
  /** YYYY-MM-DD */
  data: string
  /** null = gasto livre sem categoria */
  categoryId: string | null
  /** só em saída: null = pago à vista, no débito ou em dinheiro */
  cardId: string | null
  recorrencia: Recurrence
  /** só quando recorrencia = 'parcelado' */
  parcelas: number | null
  /**
   * Último dia em que a recorrência ainda vale (YYYY-MM-DD); `null` = sem fim.
   * Encerrar preenche isto — apagar a regra levaria o histórico junto, porque
   * as ocorrências passadas são virtuais.
   */
  dataFim: string | null
  tags: string[]
  createdAt: string
}

export type EntryDraft = Omit<Entry, 'id' | 'createdAt'>

export interface Settings {
  /**
   * Âncora: o saldo no **início do dia** `saldoRef`. Não é o saldo de todo mês
   * — o motor caminha pelos lançamentos para chegar a qualquer outro mês.
   */
  saldoInicial: Cents
  /** YYYY-MM-DD */
  saldoRef: string
  updatedAt: string
}

/** Uma ocorrência já materializada de um lançamento (recorrências expandidas). */
export interface Occurrence {
  entryId: string
  tipo: EntryType
  valor: Cents
  /** YYYY-MM-DD */
  data: string
  descricao: string | null
  categoryId: string | null
  cardId: string | null
  tags: string[]
  /** a regra que gerou esta ocorrência — editar/apagar age sobre ela, não sobre o dia */
  recorrencia: Recurrence
  /** presente só em lançamentos parcelados */
  parcela?: { atual: number; total: number }
}
