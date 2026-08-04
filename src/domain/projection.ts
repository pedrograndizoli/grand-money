import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  endOfMonth,
  format,
  getDaysInMonth,
  isSameMonth,
  parseISO,
  startOfMonth,
} from 'date-fns'
import { splitCents } from './money'
import type {
  Category,
  Cents,
  Entry,
  Occurrence,
  Settings,
} from './types'

/** Teto de ocorrências geradas por lançamento — guarda contra intervalo absurdo. */
const MAX_OCCURRENCES = 5000

export function toISO(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function fromISO(iso: string): Date {
  return parseISO(iso)
}

/**
 * Materializa as recorrências como ocorrências virtuais dentro de [from, to].
 * Nada disso é gravado: o banco guarda a regra, a leitura expande.
 */
export function expandEntries(
  entries: Entry[],
  from: Date,
  to: Date,
): Occurrence[] {
  const out: Occurrence[] = []
  if (to < from) return out

  for (const entry of entries) {
    const start = fromISO(entry.data)
    const base = {
      entryId: entry.id,
      tipo: entry.tipo,
      descricao: entry.descricao,
      categoryId: entry.categoryId,
      tags: entry.tags,
      recorrencia: entry.recorrencia,
    }

    if (entry.recorrencia === 'nenhuma') {
      if (start >= from && start <= to) {
        out.push({ ...base, valor: entry.valor, data: toISO(start) })
      }
      continue
    }

    if (entry.recorrencia === 'parcelado') {
      const total = Math.max(1, entry.parcelas ?? 1)
      const valores = splitCents(entry.valor, total)
      for (let i = 0; i < total; i++) {
        const d = addMonths(start, i)
        if (d > to) break
        if (d < from) continue
        out.push({
          ...base,
          valor: valores[i],
          data: toISO(d),
          parcela: { atual: i + 1, total },
        })
      }
      continue
    }

    // recorrências sem fim: começa no primeiro índice que cai dentro da janela
    const stepAt = (i: number): Date => {
      switch (entry.recorrencia) {
        case 'diaria':
          return addDays(start, i)
        case 'semanal':
          return addDays(start, i * 7)
        default:
          // sempre a partir da origem: addMonths trunca o dia 31 por mês,
          // sem acumular o erro de mês em mês
          return addMonths(start, i)
      }
    }

    let i = 0
    if (start < from) {
      const days = differenceInCalendarDays(from, start)
      if (entry.recorrencia === 'diaria') i = days
      else if (entry.recorrencia === 'semanal') i = Math.floor(days / 7)
      else i = Math.max(0, differenceInCalendarMonths(from, start) - 1)
    }

    for (let n = 0; n < MAX_OCCURRENCES; n++, i++) {
      const d = stepAt(i)
      if (d > to) break
      if (d < from || d < start) continue
      out.push({ ...base, valor: entry.valor, data: toISO(d) })
    }
  }

  return out
}

export interface FlexAllocation {
  categoryId: string
  nome: string
  /** o teto do mês */
  alocado: Cents
  gasto: Cents
  /** negativo quando estourou o teto */
  restante: Cents
}

export interface FixedStatus {
  categoryId: string
  nome: string
  previsto: Cents
  /** a conta é paga pelos próprios lançamentos — não existe flag de status */
  pago: Cents
  pendente: Cents
  diaVencimento: number | null
}

export interface MetaStatus {
  categoryId: string
  nome: string
  previsto: Cents
  guardado: Cents
  /** o que ainda falta guardar no mês */
  reserva: Cents
  metaTotal: Cents | null
}

interface AllocationBase {
  /** entradas do mês até hoje */
  recebido: Cents
  /** saídas em categorias flexíveis ou sem categoria */
  gastoLivre: Cents
  /** a fatia de `gastoLivre` que caiu hoje */
  gastoLivreHoje: Cents
  /** saídas em categorias fixas */
  pagoFixas: Cents
  /** Σ max(0, previsto − pago) das fixas */
  pendenteFixas: Cents
  /** lançamentos `guardado` já feitos no mês */
  guardado: Cents
  /** Σ max(0, previsto − guardado) das metas */
  reservaMeta: Cents
  livre: Cents
  diasRestantes: number
  fixas: FixedStatus[]
  flexiveis: FlexAllocation[]
  metas: MetaStatus[]
  /** os tetos flexíveis restantes somam mais do que sobrou */
  tetosAcimaDoDisponivel: boolean
}

export type Allocation =
  | (AllocationBase & {
      status: 'ok'
      diario: Cents
      /**
       * `diario − gastoLivreHoje`. É um indicador de ritmo, não saldo: sobrar
       * aqui não guardou dinheiro nenhum. Só um lançamento `guardado` guarda.
       * Nunca rotule isso como "economizado".
       */
      ritmoDoDia: Cents
    })
  | (AllocationBase & { status: 'deficit'; falta: Cents })

export interface AllocateMonthArgs {
  settings: Settings
  categories: Category[]
  entries: Entry[]
  /** qualquer data dentro do mês visível */
  month: Date
  today: Date
}

/**
 * Quantos dias ainda contam para o diário. Hoje conta: o limite de hoje ainda
 * está de pé quando o app abre de manhã.
 */
function diasRestantesNoMes(month: Date, today: Date): number {
  const dias = getDaysInMonth(month)
  if (isSameMonth(month, today)) return dias - today.getDate() + 1
  return startOfMonth(month) > startOfMonth(today) ? dias : 0
}

/**
 * A conta central do app.
 *
 *   livre  = saldoInicial + recebido − gastoLivre − pagoFixas − guardado
 *                         − pendenteFixas − reservaMeta
 *   diario = livre / diasRestantes
 *
 * Compromissos e realizações entram os dois: uma fixa desconta o que já foi
 * pago (`pagoFixas`) mais o que ainda falta (`pendenteFixas`), e a meta segue a
 * mesma simetria com `guardado` e `reservaMeta`. Sem o termo `guardado` o
 * dinheiro voltaria ao bolo livre no instante em que fosse guardado.
 */
export function allocateMonth({
  settings,
  categories,
  entries,
  month,
  today,
}: AllocateMonthArgs): Allocation {
  const inicio = startOfMonth(month)
  const fim = endOfMonth(month)

  // "até hoje" só faz sentido no mês corrente; nos outros, vale o mês inteiro
  const corte = isSameMonth(month, today) ? today : fim

  const occ = expandEntries(entries, inicio, fim)
  const porId = new Map(categories.map((c) => [c.id, c]))

  const hojeISO = toISO(today)
  let recebido = 0
  let gastoLivre = 0
  let gastoLivreHoje = 0
  let pagoFixas = 0
  let guardado = 0

  const gastoPorCategoria = new Map<string, Cents>()
  const guardadoPorCategoria = new Map<string, Cents>()
  const soma = (m: Map<string, Cents>, k: string, v: Cents) =>
    m.set(k, (m.get(k) ?? 0) + v)

  for (const o of occ) {
    const data = fromISO(o.data)
    const cat = o.categoryId ? porId.get(o.categoryId) : undefined

    if (o.tipo === 'entrada') {
      if (data <= corte) recebido += o.valor
      continue
    }

    if (o.tipo === 'guardado') {
      guardado += o.valor
      if (o.categoryId) soma(guardadoPorCategoria, o.categoryId, o.valor)
      continue
    }

    // saída
    if (o.categoryId) soma(gastoPorCategoria, o.categoryId, o.valor)
    if (cat?.tipo === 'fixa') {
      pagoFixas += o.valor
    } else {
      gastoLivre += o.valor
      if (o.data === hojeISO) gastoLivreHoje += o.valor
    }
  }

  const fixas: FixedStatus[] = []
  const flexiveis: FlexAllocation[] = []
  const metas: MetaStatus[] = []
  let pendenteFixas = 0
  let reservaMeta = 0

  for (const c of categories) {
    if (c.tipo === 'fixa') {
      const pago = gastoPorCategoria.get(c.id) ?? 0
      const pendente = Math.max(0, c.valorPrevisto - pago)
      pendenteFixas += pendente
      fixas.push({
        categoryId: c.id,
        nome: c.nome,
        previsto: c.valorPrevisto,
        pago,
        pendente,
        diaVencimento: c.diaVencimento,
      })
      continue
    }

    if (c.tipo === 'flexivel') {
      const gasto = gastoPorCategoria.get(c.id) ?? 0
      flexiveis.push({
        categoryId: c.id,
        nome: c.nome,
        alocado: c.valorPrevisto,
        gasto,
        restante: c.valorPrevisto - gasto,
      })
      continue
    }

    const guardadoNaMeta = guardadoPorCategoria.get(c.id) ?? 0
    const reserva = Math.max(0, c.valorPrevisto - guardadoNaMeta)
    reservaMeta += reserva
    metas.push({
      categoryId: c.id,
      nome: c.nome,
      previsto: c.valorPrevisto,
      guardado: guardadoNaMeta,
      reserva,
      metaTotal: c.metaTotal,
    })
  }

  const livre =
    settings.saldoInicial +
    recebido -
    gastoLivre -
    pagoFixas -
    guardado -
    pendenteFixas -
    reservaMeta

  const diasRestantes = diasRestantesNoMes(month, today)

  // teto estourado não sobra nada, então não alivia a soma dos outros
  const tetoRestante = flexiveis.reduce(
    (s, f) => s + Math.max(0, f.restante),
    0,
  )

  const base: AllocationBase = {
    recebido,
    gastoLivre,
    gastoLivreHoje,
    pagoFixas,
    pendenteFixas,
    guardado,
    reservaMeta,
    livre,
    diasRestantes,
    fixas,
    flexiveis,
    metas,
    tetosAcimaDoDisponivel: tetoRestante > livre,
  }

  // déficit é estado normal de primeira quinzena de freelancer, não erro
  if (livre < 0) return { ...base, status: 'deficit', falta: -livre }

  // arredonda para baixo: um diário maior que o disponível é promessa falsa
  const diario = diasRestantes > 0 ? Math.floor(livre / diasRestantes) : 0

  return {
    ...base,
    status: 'ok',
    diario,
    ritmoDoDia: diario - gastoLivreHoje,
  }
}
