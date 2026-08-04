import type { CategoryType } from '../../domain/types'

export type StepKey = 'saldo' | 'fixas' | 'flexiveis' | 'meta'

interface BaseStep {
  key: StepKey
  question: string
  help: string
}

export interface SaldoStep extends BaseStep {
  kind: 'saldo'
  key: 'saldo'
}

export interface CategoryStep extends BaseStep {
  kind: 'categorias'
  tipo: CategoryType
  /** o mesmo campo de valor significa outra coisa em cada tipo */
  valorLabel: string
  addLabel: string
  /** nomes comuns como chip: ninguém precisa digitar "aluguel" na mão */
  sugestoes: readonly string[]
  /** passo que pode terminar vazio, com botão de pular */
  opcional?: boolean
}

export type OnboardingStep = SaldoStep | CategoryStep

/**
 * Quatro passos: o saldo de hoje e as categorias iniciais, uma tela por tipo.
 * A renda não é estimada aqui — ela chega em lançamentos de entrada.
 */
export const STEPS: readonly OnboardingStep[] = [
  {
    kind: 'saldo',
    key: 'saldo',
    question: 'quanto você tem hoje?',
    help: 'o que está na conta agora. daqui pra frente é o que entrar que manda no seu diário.',
  },
  {
    kind: 'categorias',
    key: 'fixas',
    tipo: 'fixa',
    question: 'quais contas você paga todo mês?',
    help: 'as que chegam sempre, com data. esse dinheiro fica separado antes de virar diário.',
    valorLabel: 'valor da conta',
    addLabel: 'adicionar outra',
    sugestoes: ['aluguel', 'energia', 'água', 'internet', 'celular', 'transporte'],
  },
  {
    kind: 'categorias',
    key: 'flexiveis',
    tipo: 'flexivel',
    question: 'onde você quer um teto de gasto?',
    help: 'um limite pro mês. teto não reserva dinheiro, só te avisa quando você passa dele.',
    valorLabel: 'teto do mês',
    addLabel: 'adicionar outro',
    sugestoes: ['mercado', 'lazer', 'delivery', 'farmácia', 'roupas'],
  },
  {
    kind: 'categorias',
    key: 'meta',
    tipo: 'meta',
    question: 'quer juntar dinheiro pra algo?',
    help: 'diga quanto e até quando: o app divide pelos meses que faltam e separa esse tanto do diário. se não for a hora, pule — dá pra criar depois.',
    valorLabel: 'valor da meta',
    addLabel: 'adicionar outra',
    sugestoes: ['reserva', 'viagem', 'equipamento', 'curso'],
    opcional: true,
  },
]
