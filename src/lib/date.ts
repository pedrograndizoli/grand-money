import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

/** "ago/26" — o pt-BR abrevia com ponto, que polui o topo da tela. */
export function monthLabel(date: Date): string {
  const mes = format(date, 'MMM', { locale: ptBR }).replace('.', '').toLowerCase()
  return `${mes}/${format(date, 'yy')}`
}

/** "terça-feira, 4 de agosto" */
export function dayLabel(date: Date): string {
  return format(date, "EEEE, d 'de' MMMM", { locale: ptBR }).toLowerCase()
}

/** "3/8/2026" */
export function shortDate(date: Date): string {
  return format(date, 'd/M/yyyy')
}

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}
