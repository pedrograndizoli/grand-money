import { Calculator, Menu, Rows3, Tag, type LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

export const NAV: readonly NavItem[] = [
  { to: '/', label: 'saldos', icon: Rows3 },
  { to: '/totais', label: 'totais', icon: Calculator },
  { to: '/tags', label: 'tags', icon: Tag },
  { to: '/menu', label: 'menu', icon: Menu },
]

export const NEW_ENTRY = '/lancamento/novo'
