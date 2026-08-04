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
            saldo positivo naquele dia
          </LegendRow>
          <LegendRow swatch={<span className="size-6 rounded bg-negative" />}>
            saldo negativo — você passou do limite
          </LegendRow>
          <LegendRow
            swatch={
              <span className="grid size-6 place-items-center rounded-full bg-badge text-[11px] font-bold text-white">
                D
              </span>
            }
          >
            o diário foi descontado nesse dia
          </LegendRow>
          <LegendRow
            swatch={
              <span className="num grid size-6 place-items-center rounded bg-ink-900 text-[11px] font-bold text-white">
                7
              </span>
            }
          >
            hoje
          </LegendRow>
        </ul>
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
