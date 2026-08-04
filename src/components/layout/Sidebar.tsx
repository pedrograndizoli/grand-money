import { NavLink, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { NAV, NEW_ENTRY } from './nav'
import { Button } from '../ui/Button'
import { APP } from '../../config/app'
import { cn } from '../../lib/cn'

export function Sidebar() {
  const navigate = useNavigate()

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-ink-300/70 bg-surface px-5 py-7 lg:flex">
      <p className="px-2 text-sm font-semibold tracking-[0.18em] text-ink-600 uppercase">
        {APP.name}
      </p>

      <Button
        size="md"
        full
        className="mt-6"
        onClick={() => navigate(NEW_ENTRY)}
      >
        <Plus className="size-5" strokeWidth={2.5} />
        novo
      </Button>

      <nav aria-label="navegação principal" className="mt-8">
        <ul className="flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-full px-4 py-2.5 text-base font-medium lowercase transition-colors',
                    isActive
                      ? 'bg-accent-500/10 text-accent-600'
                      : 'text-ink-900 hover:bg-ink-900/5',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className="size-5"
                      strokeWidth={isActive ? 2.25 : 1.9}
                    />
                    {label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
