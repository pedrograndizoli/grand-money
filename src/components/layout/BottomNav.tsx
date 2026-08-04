import { NavLink } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { NAV } from './nav'
import { cn } from '../../lib/cn'

export function BottomNav({ onNovo }: { onNovo: () => void }) {
  const [hoje, saldos, gastos, totais, menu] = NAV

  return (
    <nav
      aria-label="navegação principal"
      className="shrink-0 border-t border-ink-300/70 bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="grid grid-cols-6 items-stretch">
        {[hoje, saldos].map((item) => (
          <NavItemMobile key={item.to} {...item} />
        ))}

        <li className="grid place-items-center">
          <button
            type="button"
            onClick={onNovo}
            aria-label="novo lançamento"
            className="grid size-14 place-items-center rounded-full bg-solid text-on-solid transition-transform duration-150 active:scale-95"
          >
            <Plus className="size-7" strokeWidth={2.5} />
          </button>
        </li>

        {[gastos, totais, menu].map((item) => (
          <NavItemMobile key={item.to} {...item} />
        ))}
      </ul>
    </nav>
  )
}

function NavItemMobile({ to, label, icon: Icon }: (typeof NAV)[number]) {
  return (
    <li>
      <NavLink
        to={to}
        end={to === '/'}
        className={({ isActive }) =>
          cn(
            'relative flex h-full flex-col items-center justify-center gap-1 py-2.5',
            isActive ? 'text-accent-500' : 'text-ink-900',
          )
        }
      >
        {({ isActive }) => (
          <>
            {isActive && (
              <span
                aria-hidden
                className="absolute inset-x-4 top-0 h-[3px] bg-accent-500"
              />
            )}
            <Icon className="size-6" strokeWidth={isActive ? 2.25 : 1.9} />
            <span className="text-xs font-semibold lowercase">{label}</span>
          </>
        )}
      </NavLink>
    </li>
  )
}
