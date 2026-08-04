import { useState } from 'react'
import { Sheet } from '../../components/ui/Sheet'
import { cn } from '../../lib/cn'

const SWATCHES = [
  'bg-positive',
  'bg-positive',
  'bg-negative',
  'bg-positive',
  'bg-negative',
  'bg-negative',
  'bg-positive',
  'bg-negative',
  'bg-positive',
]

export function LegendButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="legenda de cores"
        className="grid size-9 shrink-0 grid-cols-3 gap-px overflow-hidden rounded-md transition-opacity hover:opacity-75"
      >
        {SWATCHES.map((c, i) => (
          <span key={i} className={cn('block', c)} aria-hidden />
        ))}
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="legenda">
        <ul className="px-6 py-2">
          <LegendRow swatch={<span className="size-6 rounded bg-positive" />}>
            ainda sobra livre depois do diário daquele dia
          </LegendRow>
          <LegendRow swatch={<span className="size-6 rounded bg-negative" />}>
            o livre acabou — daí em diante o mês está no vermelho
          </LegendRow>
          <LegendRow
            swatch={
              <span className="grid size-6 place-items-center rounded-full bg-badge text-[11px] font-bold text-white">
                D
              </span>
            }
          >
            o diário reservado para aquele dia
          </LegendRow>
          <LegendRow
            swatch={
              <span className="num grid size-6 place-items-center rounded bg-solid text-[11px] font-bold text-on-solid">
                7
              </span>
            }
          >
            hoje
          </LegendRow>
        </ul>

        <p className="px-6 pt-2 pb-6 text-sm leading-snug text-ink-600 lowercase">
          dia que já passou não tem projeção: mostra só o que aconteceu. e
          lançamento marcado para os próximos dias já está descontado do livre —
          ele aparece na linha do dia, mas não desconta de novo.
        </p>
      </Sheet>
    </>
  )
}

function LegendRow({
  swatch,
  children,
}: {
  swatch: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <li className="flex items-center gap-4 border-b border-ink-300/60 py-4 last:border-b-0">
      <span className="grid size-6 shrink-0 place-items-center">{swatch}</span>
      <span className="text-base lowercase">{children}</span>
    </li>
  )
}
