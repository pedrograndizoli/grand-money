import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'

/**
 * O app ocupa a viewport e não rola: quem rola é a região interna de cada
 * tela. Sem isso a tabela de saldos briga com a rolagem da página.
 */
export function AppShell() {
  return (
    <div className="flex h-svh overflow-hidden bg-white">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex min-h-0 flex-1 flex-col lg:mx-auto lg:w-full lg:max-w-3xl">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </div>
  )
}
