import { useNavigate } from 'react-router-dom'
import {
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  Receipt,
  Wallet,
} from 'lucide-react'
import { Sheet } from '../../components/ui/Sheet'
import { NEW_ENTRY } from '../../components/layout/nav'
import { cn } from '../../lib/cn'

interface Opcao {
  label: string
  descricao: string
  /** query do formulário: tipo do lançamento e, se for o caso, o sheet que abre junto */
  query: string
  icone: React.ReactNode
  cor: string
}

/**
 * Os cinco caminhos são os três tipos de lançamento mais dois atalhos de saída:
 * a conta fixa já abre a lista de categorias, e o gasto no cartão já abre a de
 * cartões. Não existe um quarto tipo escondido aqui — o que muda é por onde o
 * formulário começa.
 */
const OPCOES: readonly Opcao[] = [
  {
    label: 'entrada',
    descricao: 'salário, freela, o que caiu na conta',
    query: 'tipo=entrada',
    icone: <ArrowDownLeft className="size-4" strokeWidth={3} />,
    cor: 'bg-income-600 text-white',
  },
  {
    label: 'conta fixa',
    descricao: 'aluguel, boleto, o que vence todo mês',
    query: 'tipo=saida&abrir=categoria',
    icone: <Receipt className="size-4" strokeWidth={2.5} />,
    cor: 'bg-accent-600 text-white',
  },
  {
    label: 'gasto livre',
    descricao: 'mercado, rolê, o dia a dia',
    query: 'tipo=saida',
    icone: <ArrowUpRight className="size-4" strokeWidth={3} />,
    cor: 'bg-accent-500 text-white',
  },
  {
    label: 'guardado',
    descricao: 'sai do bolo livre para uma meta e não volta',
    query: 'tipo=guardado',
    icone: <Wallet className="size-4" strokeWidth={2.5} />,
    cor: 'bg-badge text-white',
  },
  {
    label: 'gasto no cartão',
    descricao: 'saída que passou no cartão de crédito',
    query: 'tipo=saida&abrir=cartao',
    icone: <CreditCard className="size-4" strokeWidth={2.5} />,
    cor: 'bg-white text-ink-900',
  },
]

/** Pergunta o que vai ser lançado antes de abrir o formulário já preparado. */
export function NewEntrySheet({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const navigate = useNavigate()

  return (
    <Sheet open={open} onClose={onClose} title="adicionar" tone="dark">
      <ul>
        {OPCOES.map((o) => (
          <li key={o.label}>
            <button
              type="button"
              onClick={() => {
                onClose()
                navigate(`${NEW_ENTRY}?${o.query}`)
              }}
              className={cn(
                'flex w-full items-center gap-4 border-b border-line-dark px-6 py-4 text-left',
                'transition-colors last:border-b-0 hover:bg-white/5',
              )}
            >
              <span
                className={cn(
                  'grid size-9 shrink-0 place-items-center rounded-full',
                  o.cor,
                )}
                aria-hidden
              >
                {o.icone}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-lg font-semibold lowercase">
                  {o.label}
                </span>
                <span className="block truncate text-sm text-white/45 lowercase">
                  {o.descricao}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}
