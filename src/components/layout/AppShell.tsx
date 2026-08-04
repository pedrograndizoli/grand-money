import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { ThemeToggle } from './ThemeToggle'

/**
 * O app ocupa a viewport e não rola: quem rola é a região interna de cada
 * tela. Sem isso a tabela de saldos briga com a rolagem da página.
 */
export function AppShell() {
  return (
    <div className="flex h-svh overflow-hidden bg-surface">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="relative flex min-h-0 flex-1 flex-col lg:mx-auto lg:w-full lg:max-w-3xl">
          {/* mora aqui e não em cada header: uma tela nova já nasce com ele */}
          <ThemeToggle className="absolute top-2.5 right-2 z-30 lg:right-3" />
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </div>
  )
}
