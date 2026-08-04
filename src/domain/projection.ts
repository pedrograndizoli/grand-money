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
  Card,
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
  ate: Date,
): Occurrence[] {
  const out: Occurrence[] = []
  if (ate < from) return out

  for (const entry of entries) {
    const start = fromISO(entry.data)

    // a recorrência encerrada para de gerar dali em diante, mas o que já caiu
    // antes continua existindo: é isso que preserva o histórico
    const encerrada = entry.dataFim ? fromISO(entry.dataFim) : null
    const to = encerrada !== null && encerrada < ate ? encerrada : ate

    const base = {
      entryId: entry.id,
      tipo: entry.tipo,
      descricao: entry.descricao,
      categoryId: entry.categoryId,
      cardId: entry.cardId,
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
  /** o previsto é só uma estimativa: qualquer pagamento no mês fecha a conta */
  estimado: boolean
  diaVencimento: number | null
}

export interface MetaStatus {
  categoryId: string
  nome: string
  /** quanto guardar neste mês — calculado do que falta e do prazo, não digitado */
  previsto: Cents
  /** guardado dentro do mês visível */
  guardado: Cents
  /** o que ainda falta guardar no mês */
  reserva: Cents
  /** o total a juntar */
  metaTotal: Cents | null
  /** o prazo, YYYY-MM-DD */
  dataFinal: string | null
  /** guardado em todos os meses, o visível incluído */
  guardadoTotal: Cents
  /** o que falta para fechar a meta inteira */
  faltaTotal: Cents
  /** meses de cobrança contando o visível; 0 = prazo vencido */
  mesesRestantes: number
  /** sem total ou sem prazo não dá para calcular o mensal: a meta não reserva nada */
  semPlano: boolean
}

/**
 * Quanto guardar neste mês para fechar `falta` até o prazo, com o mês visível
 * contando. Arredonda **para cima**: por baixo a soma dos meses não fecha a
 * meta. No último mês — ou com o prazo vencido — cai tudo de uma vez, senão a
 * meta sumiria da conta justo quando mais aperta.
 */
export function mensalDaMeta(
  falta: Cents,
  dataFinal: string | null,
  month: Date,
): Cents {
  if (falta <= 0 || !dataFinal) return 0
  const meses = differenceInCalendarMonths(fromISO(dataFinal), month) + 1
  if (meses <= 1) return falta
  return Math.ceil(falta / meses)
}

/** Meses de cobrança que ainda restam, contando o visível. 0 = prazo vencido. */
export function mesesAtePrazo(dataFinal: string | null, month: Date): number {
  if (!dataFinal) return 0
  return Math.max(0, differenceInCalendarMonths(fromISO(dataFinal), month) + 1)
}

export interface CardUsage {
  cardId: string
  nome: string
  /** 0 = cartão sem teto definido */
  limite: Cents
  gasto: Cents
  /** negativo quando passou do teto; 0 em cartão sem teto */
  restante: Cents
  acimaDoLimite: boolean
}

interface AllocationBase {
  /** o saldo no primeiro dia do mês, caminhando do `saldoRef` até aqui */
  saldoAbertura: Cents
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
  /**
   * Gasto do mês por cartão contra o teto de cada um. O teto do cartão não
   * reserva nem adia dinheiro — a saída no cartão já saiu do livre no dia dela.
   * É um aviso, como o teto flexível.
   */
  cartoes: CardUsage[]
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
  cards: Card[]
  entries: Entry[]
  /** qualquer data dentro do mês visível */
  month: Date
  today: Date
}

/**
 * O saldo no primeiro dia do mês visível.
 *
 * `saldoInicial` é uma **âncora com data**, não um número que se repete: vale
 * no início do dia `saldoRef`. Para chegar a outro mês, caminha-se pelos
 * lançamentos entre as duas datas — para frente somando, para trás
 * subtraindo. Sem isso, abrir setembro somava de novo o dinheiro que já tinha
 * sido contado em agosto, e o mês de referência contava duas vezes tudo que
 * caiu entre o dia 1 e o `saldoRef`.
 *
 * O dia do `saldoRef` conta **normalmente** dentro do mês: o saldo é o do
 * começo daquele dia. A leitura oposta (já inclui o dia) erraria toda vez que
 * se gasta algo mais tarde no mesmo dia, que é o caso comum.
 */
function saldoDeAbertura(
  entries: Entry[],
  settings: Settings,
  inicio: Date,
): Cents {
  const ref = fromISO(settings.saldoRef)
  const paraFrente = inicio > ref

  // janela entre as duas datas, sempre com o extremo de destino de fora
  const de = paraFrente ? ref : inicio
  const ate = addDays(paraFrente ? inicio : ref, -1)

  let movimento = 0
  for (const o of expandEntries(entries, de, ate)) {
    movimento += o.tipo === 'entrada' ? o.valor : -o.valor
  }

  return settings.saldoInicial + (paraFrente ? movimento : -movimento)
}

/**
 * Quanto já foi guardado em cada meta antes do mês visível. O plano mensal se
 * refaz em cima do que falta: um mês em que se guardou a mais alivia os
 * seguintes, e um mês pulado se dilui nos que sobraram.
 */
function guardadoAntesDoMes(entries: Entry[], inicio: Date): Map<string, Cents> {
  const total = new Map<string, Cents>()
  const guardados = entries.filter((e) => e.tipo === 'guardado' && e.categoryId)
  if (guardados.length === 0) return total

  const primeiro = guardados.reduce(
    (min, e) => (e.data < min ? e.data : min),
    guardados[0].data,
  )

  for (const o of expandEntries(guardados, fromISO(primeiro), addDays(inicio, -1))) {
    if (!o.categoryId) continue
    total.set(o.categoryId, (total.get(o.categoryId) ?? 0) + o.valor)
  }
  return total
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
 *   livre  = saldoAbertura + recebido − gastoLivre − pagoFixas − guardado
 *                          − pendenteFixas − reservaMeta
 *   diario = livre / diasRestantes
 *
 * Compromissos e realizações entram os dois: uma fixa desconta o que já foi
 * pago (`pagoFixas`) mais o que ainda falta (`pendenteFixas`), e a meta segue a
 * mesma simetria com `guardado` e `reservaMeta`. Sem o termo `guardado` o
 * dinheiro voltaria ao bolo livre no instante em que fosse guardado.
 *
 * A parcela mensal da meta não é digitada: vem de `mensalDaMeta`, o que falta
 * juntar dividido pelos meses até o prazo. Meta sem total ou sem prazo não
 * reserva nada.
 */
export function allocateMonth({
  settings,
  categories,
  cards,
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
  const gastoPorCartao = new Map<string, Cents>()
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
    // o cartão é só a forma de pagamento: não muda para onde a saída vai
    if (o.cardId) soma(gastoPorCartao, o.cardId, o.valor)
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
  const acumulado = guardadoAntesDoMes(entries, inicio)
  let pendenteFixas = 0
  let reservaMeta = 0

  for (const c of categories) {
    if (c.tipo === 'fixa') {
      const pago = gastoPorCategoria.get(c.id) ?? 0
      // conta de valor variável se fecha no primeiro pagamento do mês: a conta
      // chegou, foi paga pelo que veio, e reservar a diferença de uma
      // estimativa seria segurar dinheiro que não vai mais sair
      const pendente =
        c.valorEstimado && pago > 0 ? 0 : Math.max(0, c.valorPrevisto - pago)
      pendenteFixas += pendente
      fixas.push({
        categoryId: c.id,
        nome: c.nome,
        previsto: c.valorPrevisto,
        pago,
        pendente,
        estimado: c.valorEstimado,
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

    // a meta não tem valor mensal digitado: ele sai do que ainda falta juntar
    // dividido pelos meses até o prazo, e se refaz todo mês
    const guardadoNaMeta = guardadoPorCategoria.get(c.id) ?? 0
    const guardadoAntes = acumulado.get(c.id) ?? 0
    const semPlano = c.metaTotal === null || c.dataFinal === null
    const faltaNoInicio = semPlano ? 0 : Math.max(0, (c.metaTotal ?? 0) - guardadoAntes)
    const previsto = mensalDaMeta(faltaNoInicio, c.dataFinal, inicio)
    const reserva = Math.max(0, previsto - guardadoNaMeta)
    const guardadoTotal = guardadoAntes + guardadoNaMeta

    reservaMeta += reserva
    metas.push({
      categoryId: c.id,
      nome: c.nome,
      previsto,
      guardado: guardadoNaMeta,
      reserva,
      metaTotal: c.metaTotal,
      dataFinal: c.dataFinal,
      guardadoTotal,
      faltaTotal: Math.max(0, (c.metaTotal ?? 0) - guardadoTotal),
      mesesRestantes: mesesAtePrazo(c.dataFinal, inicio),
      semPlano,
    })
  }

  const cartoes: CardUsage[] = cards.map((c) => {
    const gasto = gastoPorCartao.get(c.id) ?? 0
    return {
      cardId: c.id,
      nome: c.nome,
      limite: c.limiteMensal,
      gasto,
      // sem teto não há restante nem estouro: o cartão só acompanha o gasto
      restante: c.limiteMensal > 0 ? c.limiteMensal - gasto : 0,
      acimaDoLimite: c.limiteMensal > 0 && gasto > c.limiteMensal,
    }
  })

  const saldoAbertura = saldoDeAbertura(entries, settings, inicio)

  const livre =
    saldoAbertura +
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
    saldoAbertura,
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
    cartoes,
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

export interface DayProjection {
  /** YYYY-MM-DD */
  data: string
  dia: number
  isToday: boolean
  /** dia já vencido: mostra o que aconteceu, não projeção */
  passado: boolean
  entradas: Cents
  saidas: Cents
  guardado: Cents
  /** a fatia do diário reservada para este dia; 0 nos dias passados e em déficit */
  diario: Cents
  /** o livre projetado no fim do dia; null nos dias que já passaram */
  saldo: Cents | null
  occurrences: Occurrence[]
}

export interface MonthProjection {
  alloc: Allocation
  dias: DayProjection[]
}

/**
 * O mês dia a dia, em cima da mesma conta de `allocateMonth` — a tabela de
 * saldos não tem projeção própria.
 *
 * O saldo de cada dia é o `livre` queimando o diário: reserva-se `diario` por
 * dia contado, de hoje até o fim do mês. Como `diario` é o piso de
 * `livre / diasRestantes`, o último dia fecha no troco da divisão — em mês que
 * fecha a conta a projeção não vai para o vermelho. Em déficit não existe
 * diário: o livre fica parado no negativo até entrar mais dinheiro, e todo dia
 * que falta nasce vermelho.
 *
 * Lançamento com data futura já entrou em `livre` (o motor só olha o calendário
 * para receber, não para gastar), então ele aparece na linha do dia sem
 * descontar de novo.
 */
export function projectMonth(args: AllocateMonthArgs): MonthProjection {
  const { entries, month, today } = args
  const alloc = allocateMonth(args)

  const inicio = startOfMonth(month)
  const hoje = toISO(today)

  const porDia = new Map<string, Occurrence[]>()
  for (const o of expandEntries(entries, inicio, endOfMonth(month))) {
    const doDia = porDia.get(o.data)
    if (doDia) doDia.push(o)
    else porDia.set(o.data, [o])
  }

  const diario = alloc.status === 'ok' ? alloc.diario : 0
  let saldo = alloc.livre
  const dias: DayProjection[] = []

  for (let d = 1; d <= getDaysInMonth(month); d++) {
    const data = toISO(addDays(inicio, d - 1))
    const occurrences = porDia.get(data) ?? []

    let entradas = 0
    let saidas = 0
    let guardado = 0
    for (const o of occurrences) {
      if (o.tipo === 'entrada') entradas += o.valor
      else if (o.tipo === 'guardado') guardado += o.valor
      else saidas += o.valor
    }

    // os dias de hoje em diante são exatamente os que formam `diasRestantes`:
    // num mês passado nenhum conta, num mês futuro todos contam
    const contado = data >= hoje
    if (contado) saldo -= diario

    dias.push({
      data,
      dia: d,
      isToday: data === hoje,
      passado: !contado,
      entradas,
      saidas,
      guardado,
      diario: contado ? diario : 0,
      saldo: contado ? saldo : null,
      occurrences,
    })
  }

  return { alloc, dias }
}
