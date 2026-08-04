import { describe, expect, it } from 'vitest'
import { allocateMonth, expandEntries } from './projection'
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
    diaVencimento: null,
    metaTotal: null,
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
    recorrencia: 'nenhuma',
    parcelas: null,
    tags: [],
    createdAt: '2026-08-01T00:00:00Z',
    ...over,
  }
}

function alocar(entries: Entry[], categories: Category[] = [], s = settings) {
  return allocateMonth({
    settings: s,
    categories,
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
  const reserva = cat({ id: 'reserva', tipo: 'meta', valorPrevisto: 50000 })

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
      entries: [],
      month: new Date(2026, 8, 15),
      today: HOJE,
    })
    expect(futuro.diasRestantes).toBe(30)

    const passado = allocateMonth({
      settings,
      categories: [],
      entries: [entry({ tipo: 'entrada', valor: 50000, data: '2026-07-05' })],
      month: new Date(2026, 6, 15),
      today: HOJE,
    })
    expect(passado.diasRestantes).toBe(0)
    if (passado.status === 'ok') expect(passado.diario).toBe(0)
  })
})
