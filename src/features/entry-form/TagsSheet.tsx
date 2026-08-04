import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { Sheet } from '../../components/ui/Sheet'
import { Button } from '../../components/ui/Button'

interface TagsSheetProps {
  open: boolean
  onClose: () => void
  value: string[]
  onChange: (tags: string[]) => void
  /** tags já usadas em outros lançamentos, para reaproveitar */
  suggestions: string[]
}

export function TagsSheet({
  open,
  onClose,
  value,
  onChange,
  suggestions,
}: TagsSheetProps) {
  const [draft, setDraft] = useState('')

  function add(tag: string) {
    const clean = tag.trim().toLowerCase()
    if (!clean || value.includes(clean)) return
    onChange([...value, clean])
    setDraft('')
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    add(draft)
  }

  const livres = suggestions.filter((s) => !value.includes(s))

  return (
    <Sheet open={open} onClose={onClose} title="tags" tone="dark">
      <div className="px-6 py-5">
        <form onSubmit={submit}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="nova tag"
            autoComplete="off"
            aria-label="nova tag"
            className="w-full border-b border-line-dark bg-transparent py-2 text-lg lowercase outline-none placeholder:text-white/30 focus:border-white/40"
          />
        </form>

        {value.length > 0 && (
          <ul className="mt-5 flex flex-wrap gap-2">
            {value.map((tag) => (
              <li key={tag}>
                <button
                  type="button"
                  onClick={() => onChange(value.filter((t) => t !== tag))}
                  aria-label={`remover ${tag}`}
                  className="flex items-center gap-1.5 rounded-full bg-white/12 py-1.5 pr-2 pl-3.5 text-sm font-medium lowercase transition-colors hover:bg-white/20"
                >
                  {tag}
                  <X className="size-4" strokeWidth={2.5} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {livres.length > 0 && (
          <>
            <p className="mt-7 text-sm text-white/40 lowercase">já usadas</p>
            <ul className="mt-2.5 flex flex-wrap gap-2">
              {livres.map((tag) => (
                <li key={tag}>
                  <button
                    type="button"
                    onClick={() => add(tag)}
                    className="rounded-full border border-line-dark px-3.5 py-1.5 text-sm lowercase transition-colors hover:border-white/40"
                  >
                    {tag}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        <Button variant="outline" full className="mt-8" onClick={onClose}>
          pronto
        </Button>
      </div>
    </Sheet>
  )
}
