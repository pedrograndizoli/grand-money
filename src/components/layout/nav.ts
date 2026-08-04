import {
  Calculator,
  Gauge,
  Menu,
  Receipt,
  Rows3,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

/**
 * Cinco itens no rodapé é o teto: o FAB ocupa uma coluna e o botão não cabe em
 * coluna mais estreita. `tags` saiu daqui para o menu quando `gastos` entrou.
 */
export const NAV: readonly NavItem[] = [
  { to: '/', label: 'hoje', icon: Gauge },
  { to: '/saldos', label: 'saldos', icon: Rows3 },
  { to: '/gastos', label: 'gastos', icon: Receipt },
  { to: '/totais', label: 'totais', icon: Calculator },
  { to: '/menu', label: 'menu', icon: Menu },
]

export const NEW_ENTRY = '/lancamento/novo'
