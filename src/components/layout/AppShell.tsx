import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { ThemeToggle } from './ThemeToggle'
import { NewEntrySheet } from '../../features/entry-form/NewEntrySheet'

/**
 * O app ocupa a viewport e não rola: quem rola é a região interna de cada
 * tela. Sem isso a tabela de saldos briga com a rolagem da página.
 */
export function AppShell() {
  // o FAB e o botão da sidebar abrem a mesma pergunta: o estado mora aqui,
  // que é quem enxerga os dois
  const [adicionando, setAdicionando] = useState(false)

  return (
    <div className="flex h-svh overflow-hidden bg-surface">
      <Sidebar onNovo={() => setAdicionando(true)} />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* largura de tela cheia até 6xl: cada tela decide o quanto usa disso.
            Um max-w-3xl aqui espremia o painel de hoje numa tira com scroll
            próprio no meio de um monitor vazio. */}
        <main className="relative flex min-h-0 flex-1 flex-col lg:mx-auto lg:w-full lg:max-w-6xl">
          {/* mora aqui e não em cada header: uma tela nova já nasce com ele */}
          <ThemeToggle className="absolute top-2.5 right-2 z-30 lg:right-3" />
          <Outlet />
        </main>
        <BottomNav onNovo={() => setAdicionando(true)} />
      </div>

      <NewEntrySheet
        open={adicionando}
        onClose={() => setAdicionando(false)}
      />
    </div>
  )
}
