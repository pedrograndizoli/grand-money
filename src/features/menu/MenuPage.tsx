import { useNavigate } from 'react-router-dom'
import { ChevronRight, LogOut, Sigma, Wallet } from 'lucide-react'
import { fromISO } from '../../domain/projection'
import { useCategories } from '../../hooks/useCategories'
import { useSettings } from '../../hooks/useSettings'
import { useSession } from '../auth/sessionContext'
import { supabase } from '../../lib/supabase'
import { APP } from '../../config/app'
import { shortDate } from '../../lib/date'

export function MenuPage() {
  const navigate = useNavigate()
  const { session } = useSession()
  const { data: settings } = useSettings()
  const { data: categories } = useCategories()

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 border-b border-ink-300/70 px-5 py-4 lg:px-8">
        <h1 className="text-2xl font-bold tracking-tight lowercase">menu</h1>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="border-b border-ink-300/50 px-5 py-5 lg:px-8">
          <p className="text-sm text-ink-600 lowercase">conectado como</p>
          <p className="mt-0.5 truncate text-base font-medium">
            {session?.user.email}
          </p>
        </div>

        <Item
          icon={<Sigma className="size-5" strokeWidth={2} />}
          label="categorias"
          value={categories ? `${categories.length}` : undefined}
          onClick={() => navigate('/')}
        />
        <Item
          icon={<Wallet className="size-5" strokeWidth={2} />}
          label="atualizar meu saldo"
          value={settings ? shortDate(fromISO(settings.saldoRef)) : undefined}
          onClick={() => navigate('/onboarding/1')}
        />
        <Item
          icon={<LogOut className="size-5" strokeWidth={2} />}
          label="sair"
          onClick={() => {
            void supabase.auth.signOut()
          }}
        />

        <p className="px-5 py-8 text-sm text-ink-300 lowercase lg:px-8">
          {APP.name}
        </p>
      </div>
    </div>
  )
}

function Item({
  icon,
  label,
  value,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  value?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 border-b border-ink-300/50 px-5 py-4 text-left transition-colors hover:bg-ink-900/3 lg:px-8"
    >
      <span className="grid size-7 shrink-0 place-items-center text-ink-600">
        {icon}
      </span>
      <span className="flex-1 text-base lowercase">{label}</span>
      {value && <span className="num text-base text-ink-600">{value}</span>}
      <ChevronRight className="size-5 shrink-0 text-ink-300" strokeWidth={2.25} />
    </button>
  )
}
