export type StepKey = 'saldoInicial'

export interface OnboardingStep {
  key: StepKey
  question: string
  help: string
}

/**
 * Um passo só. A renda não é mais estimada aqui — ela chega em lançamentos de
 * entrada ao longo do mês, e as categorias são criadas depois, como entidade.
 */
export const STEPS: readonly OnboardingStep[] = [
  {
    key: 'saldoInicial',
    question: 'quanto você tem hoje?',
    help: 'o que está na conta agora. daqui pra frente é o que entrar que manda no seu diário.',
  },
]
