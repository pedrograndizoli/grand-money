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
  /** fixa: valor da conta · flexivel: teto do mês · meta: quanto guardar no mês */
  valorPrevisto: Cents
  /** só em `fixa` */
  diaVencimento: number | null
  /** só em `meta`, e opcional: objetivo acumulado */
  metaTotal: Cents | null
  cor: string | null
}

export type CategoryDraft = Omit<Category, 'id'>

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
  recorrencia: Recurrence
  /** só quando recorrencia = 'parcelado' */
  parcelas: number | null
  tags: string[]
  createdAt: string
}

export type EntryDraft = Omit<Entry, 'id' | 'createdAt'>

export interface Settings {
  /** saldo informado pelo usuário na data `saldoRef` */
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
  tags: string[]
  /** a regra que gerou esta ocorrência — editar/apagar age sobre ela, não sobre o dia */
  recorrencia: Recurrence
  /** presente só em lançamentos parcelados */
  parcela?: { atual: number; total: number }
}
