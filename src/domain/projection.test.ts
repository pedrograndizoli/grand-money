import { describe, expect, it } from 'vitest'
import { allocateMonth, expandEntries, projectMonth } from './projection'
import { splitCents } from './money'
import type { Category, Entry, Settings } from './types'

const settings: Settings = {
  saldoInicial: 0,
  saldoRef: '2026-08-01',
  updatedAt: '2026-08-01T00:00:00Z',
}

const MES = new Date(2026, 7, 15)
const HOJE = new Date(2026, 7, 10) // 10/08 -> 22 dias restantes de 31

function cat(over: Partial<Category> & Pick<Category, 'id' | 'tipo'>): Category {
  return {
    nome: over.id,
    valorPrevisto: 0,
    valorEstimado: false,
    diaVencimento: null,
    metaTotal: null,
    dataFinal: null,
    cor: null,
    ...over,
  }
}

function entry(over: Partial<Entry>): Entry {
  return {
    id: 'e1',
    tipo: 'saida',
    valor: 10000,
    descricao: null,
    data: '2026-08-05',
    categoryId: null,
    cardId: null,
    recorrencia: 'nenhuma',
    parcelas: null,
    dataFim: null,
    tags: [],
    createdAt: '2026-08-01T00:00:00Z',
    ...over,
  }
}

function alocar(entries: Entry[], categories: Category[] = [], s = settings) {
  return allocateMonth({
    settings: s,
    categories,
    cards: [],
    entries,
    month: MES,
    today: HOJE,
  })
}

describe('alocação do que chegou', () => {
  it('sem nada, tudo é zero e não há diário', () => {
    const a = alocar([])
    expect(a.status).toBe('ok')
    expect(a.livre).toBe(0)
    expect(a.diasRestantes).toBe(22)
    if (a.status === 'ok') expect(a.diario).toBe(0)
  })

  it('divide o que entrou pelos dias que faltam, hoje incluído', () => {
    const a = alocar([entry({ tipo: 'entrada', valor: 220000, data: '2026-08-03' })])
    expect(a.recebido).toBe(220000)
    expect(a.livre).toBe(220000)
    expect(a.diasRestantes).toBe(22)
    if (a.status === 'ok') expect(a.diario).toBe(10000)
  })

  it('não conta entrada que ainda não chegou', () => {
    const a = alocar([
      entry({ tipo: 'entrada', valor: 100000, data: '2026-08-03' }),
      entry({ id: 'e2', tipo: 'entrada', valor: 500000, data: '2026-08-28' }),
    ])
    expect(a.recebido).toBe(100000)
  })

  it('gasto sem categoria é gasto livre', () => {
    const a = alocar([
      entry({ tipo: 'entrada', valor: 220000, data: '2026-08-01' }),
      entry({ id: 'e2', valor: 20000, data: '2026-08-04' }),
    ])
    expect(a.gastoLivre).toBe(20000)
    expect(a.livre).toBe(200000)
  })

  it('arredonda o diário para baixo, nunca prometendo mais do que há', () => {
    const a = alocar([entry({ tipo: 'entrada', valor: 10000, data: '2026-08-01' })])
    // 10000 / 22 = 454,54...
    if (a.status === 'ok') expect(a.diario).toBe(454)
  })
})

describe('mês em déficit', () => {
  const aluguel = cat({ id: 'aluguel', tipo: 'fixa', valorPrevisto: 150000 })

  it('compromisso maior que o recebido não gera diário, gera falta', () => {
    const a = alocar(
      [entry({ tipo: 'entrada', valor: 40000, data: '2026-08-02' })],
      [aluguel],
    )
    expect(a.livre).toBe(40000 - 150000)
    expect(a.status).toBe('deficit')
    if (a.status === 'deficit') expect(a.falta).toBe(110000)
    expect(a).not.toHaveProperty('diario')
  })

  it('sai do déficit quando entra dinheiro suficiente', () => {
    const a = alocar(
      [
        entry({ tipo: 'entrada', valor: 40000, data: '2026-08-02' }),
        entry({ id: 'e2', tipo: 'entrada', valor: 132000, data: '2026-08-09' }),
      ],
      [aluguel],
    )
    expect(a.status).toBe('ok')
    expect(a.livre).toBe(22000)
    if (a.status === 'ok') expect(a.diario).toBe(1000)
  })
})

describe('conta fixa paga pelos próprios lançamentos', () => {
  const energia = cat({
    id: 'energia',
    tipo: 'fixa',
    valorPrevisto: 30000,
    diaVencimento: 12,
  })

  it('parcialmente paga: desconta o pago e ainda reserva o que falta', () => {
    const a = alocar(
      [
        entry({ tipo: 'entrada', valor: 100000, data: '2026-08-01' }),
        entry({ id: 'e2', valor: 20000, categoryId: 'energia', data: '2026-08-08' }),
      ],
      [energia],
    )
    expect(a.pagoFixas).toBe(20000)
    expect(a.pendenteFixas).toBe(10000)
    expect(a.gastoLivre).toBe(0) // saída de fixa não é gasto livre
    expect(a.livre).toBe(100000 - 20000 - 10000)
    expect(a.fixas[0]).toMatchObject({
      nome: 'energia',
      previsto: 30000,
      pago: 20000,
      pendente: 10000,
      diaVencimento: 12,
    })
  })

  it('pagar a conta inteira não muda o livre — só troca reserva por gasto', () => {
    const entrada = entry({ tipo: 'entrada', valor: 100000, data: '2026-08-01' })
    const antes = alocar([entrada], [energia])
    const depois = alocar(
      [entrada, entry({ id: 'e2', valor: 30000, categoryId: 'energia' })],
      [energia],
    )
    expect(antes.livre).toBe(70000)
    expect(depois.livre).toBe(70000)
    expect(depois.pendenteFixas).toBe(0)
  })

  it('pagar mais que o previsto desconta o excedente de verdade', () => {
    const a = alocar(
      [
        entry({ tipo: 'entrada', valor: 100000, data: '2026-08-01' }),
        entry({ id: 'e2', valor: 45000, categoryId: 'energia' }),
      ],
      [energia],
    )
    expect(a.pendenteFixas).toBe(0)
    expect(a.livre).toBe(55000)
  })
})

describe('tetos flexíveis', () => {
  const mercado = cat({ id: 'mercado', tipo: 'flexivel', valorPrevisto: 80000 })
  const lazer = cat({ id: 'lazer', tipo: 'flexivel', valorPrevisto: 60000 })

  it('reporta alocado, gasto e restante por categoria', () => {
    const a = alocar(
      [
        entry({ tipo: 'entrada', valor: 200000, data: '2026-08-01' }),
        entry({ id: 'e2', valor: 30000, categoryId: 'mercado' }),
      ],
      [mercado, lazer],
    )
    // preserva a ordem recebida: ordenar é papel do repository, não do motor
    expect(a.flexiveis).toEqual([
      {
        categoryId: 'mercado',
        nome: 'mercado',
        alocado: 80000,
        gasto: 30000,
        restante: 50000,
      },
      { categoryId: 'lazer', nome: 'lazer', alocado: 60000, gasto: 0, restante: 60000 },
    ])
    // teto não reserva dinheiro: só o gasto real sai do livre
    expect(a.livre).toBe(170000)
  })

  it('marca quando os tetos restantes somam mais do que sobrou', () => {
    const magro = alocar(
      [entry({ tipo: 'entrada', valor: 100000, data: '2026-08-01' })],
      [mercado, lazer],
    )
    expect(magro.livre).toBe(100000)
    expect(magro.tetosAcimaDoDisponivel).toBe(true) // 80000 + 60000 > 100000

    const folgado = alocar(
      [entry({ tipo: 'entrada', valor: 200000, data: '2026-08-01' })],
      [mercado, lazer],
    )
    expect(folgado.tetosAcimaDoDisponivel).toBe(false)
  })

  it('teto estourado não alivia a soma dos outros', () => {
    const a = alocar(
      [
        entry({ tipo: 'entrada', valor: 150000, data: '2026-08-01' }),
        entry({ id: 'e2', valor: 100000, categoryId: 'mercado' }),
      ],
      [mercado, lazer],
    )
    expect(a.flexiveis.find((f) => f.categoryId === 'mercado')?.restante).toBe(-20000)
    // sobrou 50000 e o teto de lazer ainda promete 60000
    expect(a.livre).toBe(50000)
    expect(a.tetosAcimaDoDisponivel).toBe(true)
  })
})

describe('lançamento guardado', () => {
  // 500.000 até maio/27 = 10 meses a partir de agosto/26 -> 50.000 por mês
  const reserva = cat({
    id: 'reserva',
    tipo: 'meta',
    metaTotal: 500000,
    dataFinal: '2027-05-31',
  })

  it('a meta reserva do livre antes mesmo de guardar', () => {
    const a = alocar(
      [entry({ tipo: 'entrada', valor: 200000, data: '2026-08-01' })],
      [reserva],
    )
    expect(a.reservaMeta).toBe(50000)
    expect(a.guardado).toBe(0)
    expect(a.livre).toBe(150000)
  })

  it('guardar não devolve dinheiro ao bolo livre', () => {
    const entrada = entry({ tipo: 'entrada', valor: 200000, data: '2026-08-01' })
    const a = alocar(
      [
        entrada,
        entry({ id: 'g1', tipo: 'guardado', valor: 50000, categoryId: 'reserva' }),
      ],
      [reserva],
    )
    expect(a.guardado).toBe(50000)
    expect(a.reservaMeta).toBe(0)
    expect(a.livre).toBe(150000) // idêntico ao caso anterior
    expect(a.gastoLivre).toBe(0) // guardado não é gasto
    expect(a.metas[0]).toMatchObject({ previsto: 50000, guardado: 50000, reserva: 0 })
  })

  it('guardar além da meta sai do livre de verdade', () => {
    const a = alocar(
      [
        entry({ tipo: 'entrada', valor: 200000, data: '2026-08-01' }),
        entry({ id: 'g1', tipo: 'guardado', valor: 70000, categoryId: 'reserva' }),
      ],
      [reserva],
    )
    expect(a.livre).toBe(130000)
  })
})

describe('ritmo do dia', () => {
  it('é o diário menos o que já saiu hoje, e não é dinheiro guardado', () => {
    const a = alocar([
      entry({ tipo: 'entrada', valor: 220000, data: '2026-08-01' }),
      entry({ id: 'e2', valor: 3000, data: '2026-08-10' }), // hoje
      entry({ id: 'e3', valor: 5000, data: '2026-08-04' }), // outro dia
    ])
    expect(a.gastoLivre).toBe(8000)
    expect(a.gastoLivreHoje).toBe(3000)
    if (a.status === 'ok') {
      expect(a.diario).toBe(Math.floor((220000 - 8000) / 22))
      expect(a.ritmoDoDia).toBe(a.diario - 3000)
    }
    // sobrar ritmo não move o guardado
    expect(a.guardado).toBe(0)
  })
})

describe('recorrências', () => {
  it('mensal cai uma vez por mês e trunca o dia 31', () => {
    const dia31 = entry({ data: '2026-01-31', recorrencia: 'mensal' })
    const fev = expandEntries([dia31], new Date(2026, 1, 1), new Date(2026, 1, 28))
    expect(fev.map((o) => o.data)).toEqual(['2026-02-28'])
    const mar = expandEntries([dia31], new Date(2026, 2, 1), new Date(2026, 2, 31))
    expect(mar.map((o) => o.data)).toEqual(['2026-03-31'])
  })

  it('semanal a cada 7 dias, diária todo dia', () => {
    const semanal = expandEntries(
      [entry({ data: '2026-08-03', recorrencia: 'semanal' })],
      new Date(2026, 7, 1),
      new Date(2026, 7, 31),
    )
    expect(semanal.map((o) => o.data)).toEqual([
      '2026-08-03',
      '2026-08-10',
      '2026-08-17',
      '2026-08-24',
      '2026-08-31',
    ])

    const diaria = expandEntries(
      [entry({ data: '2026-07-20', recorrencia: 'diaria' })],
      new Date(2026, 7, 1),
      new Date(2026, 7, 31),
    )
    expect(diaria).toHaveLength(31)
    expect(diaria[0].data).toBe('2026-08-01')
  })

  it('parcelado divide sem perder centavo e espalha um por mês', () => {
    expect(splitCents(30001, 3)).toEqual([10001, 10000, 10000])
    const occ = expandEntries(
      [
        entry({
          valor: 300000,
          data: '2026-08-12',
          recorrencia: 'parcelado',
          parcelas: 3,
        }),
      ],
      new Date(2026, 7, 1),
      new Date(2026, 11, 31),
    )
    expect(occ.map((o) => [o.data, o.valor])).toEqual([
      ['2026-08-12', 100000],
      ['2026-09-12', 100000],
      ['2026-10-12', 100000],
    ])
    expect(occ[0].parcela).toEqual({ atual: 1, total: 3 })
  })

  it('a alocação enxerga a ocorrência da recorrência, não só o lançamento', () => {
    const a = alocar([
      entry({ tipo: 'entrada', valor: 200000, data: '2026-08-01' }),
      entry({ id: 'netflix', valor: 5000, data: '2026-05-09', recorrencia: 'mensal' }),
    ])
    expect(a.gastoLivre).toBe(5000)
    expect(a.livre).toBe(195000)
  })

  it('carrega categoria e regra de origem em cada ocorrência', () => {
    const occ = expandEntries(
      [entry({ categoryId: 'mercado', recorrencia: 'mensal' })],
      new Date(2026, 7, 1),
      new Date(2026, 7, 31),
    )
    expect(occ[0]).toMatchObject({
      categoryId: 'mercado',
      recorrencia: 'mensal',
      entryId: 'e1',
    })
  })
})

describe('dias restantes', () => {
  it('conta hoje', () => {
    const ultimoDia = allocateMonth({
      settings,
      categories: [],
      cards: [],
      entries: [],
      month: MES,
      today: new Date(2026, 7, 31),
    })
    expect(ultimoDia.diasRestantes).toBe(1)
  })

  it('mês futuro tem o mês inteiro; mês passado não tem diário', () => {
    const futuro = allocateMonth({
      settings,
      categories: [],
      cards: [],
      entries: [],
      month: new Date(2026, 8, 15),
      today: HOJE,
    })
    expect(futuro.diasRestantes).toBe(30)

    const passado = allocateMonth({
      settings,
      categories: [],
      cards: [],
      entries: [entry({ tipo: 'entrada', valor: 50000, data: '2026-07-05' })],
      month: new Date(2026, 6, 15),
      today: HOJE,
    })
    expect(passado.diasRestantes).toBe(0)
    if (passado.status === 'ok') expect(passado.diario).toBe(0)
  })
})

describe('o mês dia a dia', () => {
  const projetar = (entries: Entry[], categories: Category[] = [], month = MES) =>
    projectMonth({ settings, categories, cards: [], entries, month, today: HOJE })

  it('reserva o diário recalculado em cada dia que ainda conta', () => {
    const { alloc, dias } = projetar([
      entry({ tipo: 'entrada', valor: 220000, data: '2026-08-03' }),
    ])

    const diario = alloc.status === 'ok' ? alloc.diario : 0
    expect(diario).toBe(10000)

    const contados = dias.filter((d) => !d.passado)
    expect(contados).toHaveLength(alloc.diasRestantes)
    expect(contados.every((d) => d.diario === diario)).toBe(true)
    expect(dias.filter((d) => d.passado).every((d) => d.diario === 0)).toBe(true)
  })

  it('o dia que já passou mostra o que aconteceu, sem projeção', () => {
    const { dias } = projetar([entry({ valor: 20000, data: '2026-08-04' })])

    const dia4 = dias[3]
    expect(dia4.passado).toBe(true)
    expect(dia4.saldo).toBeNull()
    expect(dia4.saidas).toBe(20000)
    expect(dias[9].isToday).toBe(true)
  })

  it('o saldo queima o diário dia a dia e fecha no troco da divisão', () => {
    // 220.000 em 22 dias -> diário de 10.000, sem sobra
    const { alloc, dias } = projetar([
      entry({ tipo: 'entrada', valor: 220000, data: '2026-08-03' }),
    ])

    expect(dias[9].saldo).toBe(210000) // hoje já desconta o próprio diário
    expect(dias[10].saldo).toBe(200000)
    expect(dias.at(-1)?.saldo).toBe(alloc.livre % alloc.diasRestantes)
  })

  it('sobra do arredondamento fica no último dia, nunca negativa', () => {
    const { dias } = projetar([
      entry({ tipo: 'entrada', valor: 100000, data: '2026-08-03' }),
    ])

    // 100.000 / 22 -> 4.545 por dia, 10 centavos de troco
    expect(dias.at(-1)?.saldo).toBe(10)
    expect(dias.every((d) => d.saldo === null || d.saldo >= 0)).toBe(true)
  })

  it('em déficit não há diário e todo dia que falta nasce negativo', () => {
    const { alloc, dias } = projetar(
      [entry({ tipo: 'entrada', valor: 50000, data: '2026-08-03' })],
      [cat({ id: 'aluguel', tipo: 'fixa', valorPrevisto: 150000 })],
    )

    expect(alloc.status).toBe('deficit')

    const contados = dias.filter((d) => !d.passado)
    expect(contados.every((d) => d.diario === 0)).toBe(true)
    expect(contados.every((d) => d.saldo === -100000)).toBe(true)
  })

  it('lançamento futuro aparece no dia sem descontar de novo', () => {
    const { dias } = projetar([
      entry({ tipo: 'entrada', valor: 220000, data: '2026-08-03' }),
      entry({ id: 'e2', valor: 30000, data: '2026-08-20' }),
    ])

    const dia20 = dias[19]
    expect(dia20.saidas).toBe(30000)
    // livre já descontou os 300 -> a linha só perde o diário do dia
    expect(dia20.saldo).toBe((dias[18].saldo ?? 0) - dia20.diario)
  })

  it('mês inteiro no futuro conta desde o dia 1', () => {
    const { alloc, dias } = projetar(
      [entry({ tipo: 'entrada', valor: 300000, data: '2026-09-02' })],
      [],
      new Date(2026, 8, 15),
    )

    expect(dias).toHaveLength(30)
    expect(dias.every((d) => !d.passado)).toBe(true)
    expect(dias[0].saldo).toBe(alloc.livre - dias[0].diario)
  })

  it('mês passado não projeta nada', () => {
    const { dias } = projetar(
      [entry({ valor: 8000, data: '2026-07-05' })],
      [],
      new Date(2026, 6, 15),
    )

    expect(dias.every((d) => d.passado && d.saldo === null)).toBe(true)
    expect(dias[4].saidas).toBe(8000)
  })

  it('agrupa entrada, saída e guardado do dia', () => {
    const { dias } = projetar([
      entry({ tipo: 'entrada', valor: 500000, data: '2026-08-12' }),
      entry({ id: 'e2', valor: 7000, data: '2026-08-12' }),
      entry({ id: 'e3', tipo: 'guardado', valor: 20000, data: '2026-08-12' }),
    ])

    const dia12 = dias[11]
    expect(dia12.entradas).toBe(500000)
    expect(dia12.saidas).toBe(7000)
    expect(dia12.guardado).toBe(20000)
    expect(dia12.occurrences).toHaveLength(3)
  })
})

describe('a meta sai do total e do prazo', () => {
  const meta = (over: Partial<Category> = {}) =>
    cat({ id: 'viagem', tipo: 'meta', metaTotal: 100000, dataFinal: '2026-11-20', ...over })

  it('divide o total pelos meses que faltam, contando o mês visível', () => {
    const a = alocar([entry({ tipo: 'entrada', valor: 300000, data: '2026-08-01' })], [meta()])

    // ago, set, out, nov = 4 meses
    expect(a.metas[0]).toMatchObject({
      previsto: 25000,
      mesesRestantes: 4,
      faltaTotal: 100000,
      semPlano: false,
    })
    expect(a.reservaMeta).toBe(25000)
    expect(a.livre).toBe(275000)
  })

  it('arredonda o mensal para cima: por baixo a soma não fecha a meta', () => {
    const a = alocar([], [meta({ dataFinal: '2026-10-31' })]) // ago, set, out
    expect(a.metas[0].previsto).toBe(33334)
  })

  it('o que já foi guardado antes derruba o mensal dos meses seguintes', () => {
    const a = alocar(
      [entry({ id: 'g1', tipo: 'guardado', valor: 40000, data: '2026-07-15', categoryId: 'viagem' })],
      [meta()],
    )

    // faltam 60.000 em 4 meses
    expect(a.metas[0]).toMatchObject({
      previsto: 15000,
      guardado: 0,
      guardadoTotal: 40000,
      faltaTotal: 60000,
    })
  })

  it('guardado recorrente de meses anteriores também conta', () => {
    const a = alocar(
      [
        entry({
          id: 'g1',
          tipo: 'guardado',
          valor: 10000,
          data: '2026-05-10',
          recorrencia: 'mensal',
          categoryId: 'viagem',
        }),
      ],
      [meta()],
    )

    // mai, jun, jul antes do mês visível; ago cai dentro dele
    expect(a.metas[0].guardadoTotal).toBe(40000)
    expect(a.metas[0].guardado).toBe(10000)
    expect(a.metas[0].previsto).toBe(17500) // 70.000 em 4 meses
  })

  it('no último mês cobra tudo o que falta', () => {
    const a = alocar([], [meta({ dataFinal: '2026-08-28' })])
    expect(a.metas[0]).toMatchObject({ previsto: 100000, mesesRestantes: 1 })
  })

  it('prazo vencido não some da conta: cobra o que falta no mês', () => {
    const a = alocar([], [meta({ dataFinal: '2026-06-30' })])
    expect(a.metas[0]).toMatchObject({ previsto: 100000, mesesRestantes: 0 })
    expect(a.reservaMeta).toBe(100000)
  })

  it('meta batida para de reservar', () => {
    const a = alocar(
      [entry({ id: 'g1', tipo: 'guardado', valor: 100000, data: '2026-07-02', categoryId: 'viagem' })],
      [meta()],
    )
    expect(a.metas[0]).toMatchObject({ previsto: 0, faltaTotal: 0 })
    expect(a.reservaMeta).toBe(0)
  })

  it('meta sem total ou sem prazo não entra na conta do mês', () => {
    const semPrazo = alocar([], [meta({ dataFinal: null })])
    expect(semPrazo.metas[0]).toMatchObject({ previsto: 0, semPlano: true })
    expect(semPrazo.reservaMeta).toBe(0)

    const semTotal = alocar([], [meta({ metaTotal: null })])
    expect(semTotal.metas[0]).toMatchObject({ previsto: 0, semPlano: true })
  })

  it('o mensal sobe conforme o prazo se aproxima', () => {
    const mensalEm = (month: Date) =>
      allocateMonth({
        settings,
        categories: [meta()],
        cards: [],
        entries: [],
        month,
        today: HOJE,
      })
        .metas[0].previsto

    expect(mensalEm(new Date(2026, 7, 1))).toBe(25000) // ago: 4 meses
    expect(mensalEm(new Date(2026, 8, 1))).toBe(33334) // set: 3 meses
    expect(mensalEm(new Date(2026, 10, 1))).toBe(100000) // nov: o último
  })
})

describe('cartão de crédito', () => {
  const nubank = { id: 'nubank', nome: 'nubank', limiteMensal: 100000, cor: null }
  const semTeto = { id: 'outro', nome: 'outro', limiteMensal: 0, cor: null }

  const comCartao = (entries: Entry[], cards = [nubank], categories: Category[] = []) =>
    allocateMonth({
      settings,
      categories,
      cards,
      entries,
      month: MES,
      today: HOJE,
    })

  it('soma o gasto do mês por cartão contra o teto', () => {
    const a = comCartao([
      entry({ tipo: 'entrada', valor: 300000, data: '2026-08-01' }),
      entry({ id: 'e2', valor: 30000, cardId: 'nubank', data: '2026-08-04' }),
      entry({ id: 'e3', valor: 20000, cardId: 'nubank', data: '2026-08-09' }),
      entry({ id: 'e4', valor: 5000, data: '2026-08-09' }), // à vista
    ])

    expect(a.cartoes).toEqual([
      {
        cardId: 'nubank',
        nome: 'nubank',
        limite: 100000,
        gasto: 50000,
        restante: 50000,
        acimaDoLimite: false,
      },
    ])
  })

  it('gastar no cartão sai do livre no dia da compra, como qualquer saída', () => {
    const entrada = entry({ tipo: 'entrada', valor: 300000, data: '2026-08-01' })
    const compra = entry({ id: 'e2', valor: 30000, data: '2026-08-04' })

    const aVista = comCartao([entrada, compra])
    const noCartao = comCartao([entrada, { ...compra, cardId: 'nubank' }])

    expect(noCartao.livre).toBe(aVista.livre)
    expect(noCartao.gastoLivre).toBe(aVista.gastoLivre)
  })

  it('marca o estouro do teto sem mexer no livre', () => {
    const a = comCartao([
      entry({ tipo: 'entrada', valor: 300000, data: '2026-08-01' }),
      entry({ id: 'e2', valor: 120000, cardId: 'nubank', data: '2026-08-04' }),
    ])

    expect(a.cartoes[0]).toMatchObject({
      gasto: 120000,
      restante: -20000,
      acimaDoLimite: true,
    })
    expect(a.livre).toBe(180000)
  })

  it('cartão sem teto só acompanha o gasto', () => {
    const a = comCartao(
      [entry({ id: 'e2', valor: 40000, cardId: 'outro', data: '2026-08-04' })],
      [semTeto],
    )
    expect(a.cartoes[0]).toMatchObject({
      gasto: 40000,
      restante: 0,
      acimaDoLimite: false,
    })
  })

  it('conta a saída em categoria fixa que passou no cartão', () => {
    const a = comCartao(
      [
        entry({ tipo: 'entrada', valor: 300000, data: '2026-08-01' }),
        entry({ id: 'e2', valor: 80000, categoryId: 'energia', cardId: 'nubank' }),
      ],
      [nubank],
      [cat({ id: 'energia', tipo: 'fixa', valorPrevisto: 80000 })],
    )

    expect(a.cartoes[0].gasto).toBe(80000)
    expect(a.pagoFixas).toBe(80000)
    expect(a.gastoLivre).toBe(0) // o cartão não muda para onde a saída vai
  })

  it('recorrência no cartão conta em cada mês que ela cai', () => {
    const a = comCartao([
      entry({
        id: 'e2',
        valor: 9990,
        cardId: 'nubank',
        data: '2026-05-12',
        recorrencia: 'mensal',
      }),
    ])
    expect(a.cartoes[0].gasto).toBe(9990)
  })

  it('cartão sem lançamento no mês aparece zerado', () => {
    const a = comCartao([])
    expect(a.cartoes[0]).toMatchObject({ gasto: 0, restante: 100000 })
  })
})

describe('conta fixa de valor variável', () => {
  const energia = cat({
    id: 'energia',
    tipo: 'fixa',
    valorPrevisto: 20000,
    valorEstimado: true,
    diaVencimento: 12,
  })
  const entrada = entry({ tipo: 'entrada', valor: 200000, data: '2026-08-01' })

  it('reserva a estimativa enquanto ninguém pagou', () => {
    const a = alocar([entrada], [energia])
    expect(a.pendenteFixas).toBe(20000)
    expect(a.livre).toBe(180000)
    expect(a.fixas[0]).toMatchObject({ pendente: 20000, estimado: true })
  })

  it('pagar menos que a estimativa fecha a conta e devolve a diferença', () => {
    const a = alocar(
      [entrada, entry({ id: 'e2', valor: 15000, categoryId: 'energia' })],
      [energia],
    )
    expect(a.pagoFixas).toBe(15000)
    expect(a.pendenteFixas).toBe(0) // não segura os 50 que não vão sair
    expect(a.livre).toBe(185000)
    expect(a.fixas[0].pendente).toBe(0)
  })

  it('pagar mais que a estimativa desconta o valor real', () => {
    const a = alocar(
      [entrada, entry({ id: 'e2', valor: 26000, categoryId: 'energia' })],
      [energia],
    )
    expect(a.pendenteFixas).toBe(0)
    expect(a.livre).toBe(174000)
  })

  it('conta de valor exato continua cobrando a diferença', () => {
    const exata = cat({ ...energia, valorEstimado: false })
    const a = alocar(
      [entrada, entry({ id: 'e2', valor: 15000, categoryId: 'energia' })],
      [exata],
    )
    expect(a.pendenteFixas).toBe(5000)
    expect(a.livre).toBe(180000)
  })
})

describe('saldo de partida é âncora com data', () => {
  // R$ 1.000 no começo do dia 10/08
  const ancora: Settings = {
    saldoInicial: 100000,
    saldoRef: '2026-08-10',
    updatedAt: '2026-08-10T00:00:00Z',
  }

  const comAncora = (entries: Entry[], month = MES) =>
    allocateMonth({
      settings: ancora,
      categories: [],
      cards: [],
      entries,
      month,
      today: HOJE,
    })

  it('sem lançamento entre as datas, a âncora vale igual em qualquer mês', () => {
    expect(comAncora([]).saldoAbertura).toBe(100000)
    expect(comAncora([], new Date(2026, 8, 15)).saldoAbertura).toBe(100000)
    expect(comAncora([], new Date(2026, 6, 15)).saldoAbertura).toBe(100000)
  })

  it('no mês da âncora, desconta o que se moveu antes dela', () => {
    // os 300 do dia 3 já estão dentro dos 1.000 informados no dia 10
    const a = comAncora([
      entry({ tipo: 'entrada', valor: 30000, data: '2026-08-03' }),
    ])
    expect(a.saldoAbertura).toBe(70000)
    // e o mês soma os 300 de volta: a entrada conta uma vez só
    expect(a.livre).toBe(100000)
  })

  it('o dia da âncora conta normalmente: o saldo é do começo do dia', () => {
    const a = comAncora([
      entry({ tipo: 'entrada', valor: 5000, data: '2026-08-10' }),
    ])
    expect(a.saldoAbertura).toBe(100000)
    expect(a.livre).toBe(105000)
  })

  it('o mês seguinte abre com o que sobrou, não com a âncora de novo', () => {
    const setembro = comAncora(
      [
        entry({ tipo: 'entrada', valor: 50000, data: '2026-08-20' }),
        entry({ id: 'e2', valor: 20000, data: '2026-08-25' }),
      ],
      new Date(2026, 8, 15),
    )
    expect(setembro.saldoAbertura).toBe(130000)
  })

  it('o mês anterior volta atrás pelos lançamentos', () => {
    // a entrada de julho já está dentro da âncora de agosto
    const julho = comAncora(
      [entry({ tipo: 'entrada', valor: 40000, data: '2026-07-28' })],
      new Date(2026, 6, 15),
    )
    expect(julho.saldoAbertura).toBe(60000)
  })

  it('guardado sai do saldo: é dinheiro que deixou a conta', () => {
    const setembro = comAncora(
      [entry({ id: 'g1', tipo: 'guardado', valor: 30000, data: '2026-08-15' })],
      new Date(2026, 8, 15),
    )
    expect(setembro.saldoAbertura).toBe(70000)
  })

  it('recorrência entre as datas conta em cada ocorrência', () => {
    // mensal de 100 a partir de 10/08: ago, set e out caem antes de novembro
    const novembro = comAncora(
      [entry({ valor: 10000, data: '2026-08-10', recorrencia: 'mensal' })],
      new Date(2026, 10, 15),
    )
    expect(novembro.saldoAbertura).toBe(70000)
  })
})

describe('recorrência encerrada', () => {
  const netflix = entry({
    valor: 5990,
    data: '2026-01-15',
    recorrencia: 'mensal',
    dataFim: '2026-08-31',
  })

  it('gera até a data de fim e para depois dela', () => {
    const dentro = expandEntries(
      [netflix],
      new Date(2026, 7, 1),
      new Date(2026, 7, 31),
    )
    expect(dentro.map((o) => o.data)).toEqual(['2026-08-15'])

    const depois = expandEntries(
      [netflix],
      new Date(2026, 8, 1),
      new Date(2026, 8, 30),
    )
    expect(depois).toHaveLength(0)
  })

  it('o passado continua de pé: encerrar não reescreve mês fechado', () => {
    const antes = expandEntries(
      [netflix],
      new Date(2026, 0, 1),
      new Date(2026, 6, 31),
    )
    // jan a jul, sete ocorrências
    expect(antes).toHaveLength(7)
  })

  it('sai da alocação do mês seguinte ao fim, mas fica na do mês do fim', () => {
    const agosto = alocar([netflix])
    expect(agosto.gastoLivre).toBe(5990)

    const setembro = allocateMonth({
      settings,
      categories: [],
      cards: [],
      entries: [netflix],
      month: new Date(2026, 8, 15),
      today: HOJE,
    })
    expect(setembro.gastoLivre).toBe(0)
  })

  it('encerrar no meio do mês corta a partir do dia', () => {
    const diaria = entry({
      valor: 1000,
      data: '2026-08-01',
      recorrencia: 'diaria',
      dataFim: '2026-08-05',
    })
    const occ = expandEntries(
      [diaria],
      new Date(2026, 7, 1),
      new Date(2026, 7, 31),
    )
    expect(occ.map((o) => o.data)).toEqual([
      '2026-08-01',
      '2026-08-02',
      '2026-08-03',
      '2026-08-04',
      '2026-08-05',
    ])
  })

  it('sem data de fim, segue infinita', () => {
    const semFim = entry({ valor: 5990, data: '2026-01-15', recorrencia: 'mensal' })
    const longe = expandEntries(
      [semFim],
      new Date(2029, 0, 1),
      new Date(2029, 0, 31),
    )
    expect(longe).toHaveLength(1)
  })
})
