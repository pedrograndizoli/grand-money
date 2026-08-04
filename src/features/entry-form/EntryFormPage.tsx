import { useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  CalendarSync,
  Pencil,
  Tag,
  Trash2,
  Wallet,
  X,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { MoneyInput } from '../../components/ui/MoneyInput'
import { NumericKeypad } from '../../components/ui/NumericKeypad'
import { Sheet, SheetOption } from '../../components/ui/Sheet'
import { formatBRL, popDigit, pushDigit, splitCents } from '../../domain/money'
import type { Entry, EntryType, Recurrence } from '../../domain/types'
import {
  useCreateEntry,
  useDeleteEntry,
  useEntries,
  useUpdateEntry,
} from '../../hooks/useEntries'
import { useCategories } from '../../hooks/useCategories'
import { todayISO } from '../../lib/date'
import { cn } from '../../lib/cn'
import { errorMessage } from '../../lib/errors'
import { RECURRENCES, recurrenceLabel } from './recurrence'
import { TagsSheet } from './TagsSheet'

type OpenSheet = 'tipo' | 'categoria' | 'repeticao' | 'tags' | 'apagar' | null

const TIPOS: ReadonlyArray<{
  value: EntryType
  label: string
  description: string
}> = [
  { value: 'saida', label: 'saída', description: 'dinheiro saindo da conta' },
  { value: 'entrada', label: 'entrada', description: 'dinheiro entrando na conta' },
  {
    value: 'guardado',
    label: 'guardado',
    description: 'sai do bolo livre para uma meta e não volta',
  },
]

/** `/lancamento/novo` cria; `/lancamento/:id` edita o lançamento existente. */
export function EntryFormPage() {
  const { id } = useParams()
  const entries = useEntries()

  if (!id) return <EntryForm />

  if (entries.isPending) {
    return <div className="h-svh bg-surface-dark" />
  }

  const entry = entries.data?.find((e) => e.id === id)
  if (!entry) return <Navigate to="/" replace />

  return <EntryForm key={entry.id} entry={entry} />
}

function EntryForm({ entry }: { entry?: Entry }) {
  const navigate = useNavigate()
  const create = useCreateEntry()
  const update = useUpdateEntry()
  const remove = useDeleteEntry()
  const entries = useEntries()

  const editando = entry !== undefined

  const [valor, setValor] = useState(entry?.valor ?? 0)
  const [tipo, setTipo] = useState<EntryType>(entry?.tipo ?? 'saida')
  const [descricao, setDescricao] = useState(entry?.descricao ?? '')
  const [data, setData] = useState(entry?.data ?? todayISO())
  const [recorrencia, setRecorrencia] = useState<Recurrence>(
    entry?.recorrencia ?? 'nenhuma',
  )
  const [parcelas, setParcelas] = useState(entry?.parcelas ?? 2)
  const [tags, setTags] = useState<string[]>(entry?.tags ?? [])
  const [categoryId, setCategoryId] = useState<string | null>(
    entry?.categoryId ?? null,
  )
  const [sheet, setSheet] = useState<OpenSheet>(null)
  const dateInput = useRef<HTMLInputElement>(null)

  const categories = useCategories()

  // guardado só faz sentido em meta; saída, em fixa ou flexível
  const disponiveis = (categories.data ?? []).filter((c) =>
    tipo === 'guardado' ? c.tipo === 'meta' : c.tipo !== 'meta',
  )
  const categoriaAtual = disponiveis.find((c) => c.id === categoryId) ?? null

  function trocarTipo(novo: EntryType) {
    setTipo(novo)
    // uma categoria de meta não sobrevive a virar saída, e vice-versa
    setCategoryId(null)
    setSheet(null)
  }

  /** tocar em qualquer ponto da linha abre o calendário, não só no ícone nativo */
  function abrirCalendario(e: React.MouseEvent) {
    const el = dateInput.current
    if (!el || e.target === el) return
    try {
      el.showPicker()
    } catch {
      el.focus() // navegador sem showPicker: dá pra digitar a data
    }
  }

  const sugestoes = useMemo(() => {
    const all = (entries.data ?? []).flatMap((e) => e.tags)
    return [...new Set(all)].sort()
  }, [entries.data])

  const saida = tipo === 'saida'
  const salvando = create.isPending || update.isPending
  const erro = create.error ?? update.error ?? remove.error

  async function submit() {
    if (valor <= 0 || salvando) return
    const draft = {
      tipo,
      valor,
      descricao: descricao.trim() || null,
      data,
      // entrada não tem categoria: o que entrou é só "recebido"
      categoryId: tipo === 'entrada' ? null : categoryId,
      recorrencia,
      parcelas: recorrencia === 'parcelado' ? parcelas : null,
      tags,
    }
    try {
      if (entry) await update.mutateAsync({ id: entry.id, draft })
      else await create.mutateAsync(draft)
    } catch (e) {
      console.error('[grand money] falha ao salvar lançamento', e)
      return
    }
    navigate('/', { replace: true })
  }

  async function apagar() {
    if (!entry || remove.isPending) return
    try {
      await remove.mutateAsync(entry.id)
    } catch (e) {
      console.error('[grand money] falha ao apagar lançamento', e)
      setSheet(null)
      return
    }
    navigate('/', { replace: true })
  }

  return (
    <div className="flex h-svh flex-col bg-surface-dark text-white [color-scheme:dark]">
      <header className="flex shrink-0 items-center justify-between px-3 pt-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="cancelar"
          className="grid size-10 place-items-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="size-6" strokeWidth={2.25} />
        </button>

        {editando && (
          <button
            type="button"
            onClick={() => setSheet('apagar')}
            aria-label="apagar lançamento"
            className="grid size-10 place-items-center rounded-full text-white/60 transition-colors hover:bg-accent-600/25 hover:text-accent-500"
          >
            <Trash2 className="size-5" strokeWidth={2} />
          </button>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="border-b border-line-dark px-5 pt-2 pb-6">
          <MoneyInput
            value={valor}
            onChange={setValor}
            label="valor"
            tone="dark"
            size="xl"
            autoFocus
          />
        </div>

        <Field
          tone="dark"
          icon={
            <span
              className={cn(
                'grid size-7 place-items-center rounded-full text-white',
                tipo === 'saida' && 'bg-accent-600',
                tipo === 'entrada' && 'bg-income-600',
                tipo === 'guardado' && 'bg-badge',
              )}
            >
              {tipo === 'saida' && (
                <ArrowUpRight className="size-4" strokeWidth={3} />
              )}
              {tipo === 'entrada' && (
                <ArrowDownLeft className="size-4" strokeWidth={3} />
              )}
              {tipo === 'guardado' && (
                <Wallet className="size-4" strokeWidth={2.5} />
              )}
            </span>
          }
          label={TIPOS.find((t) => t.value === tipo)!.label}
          chevron
          onClick={() => setSheet('tipo')}
        />

        {tipo !== 'entrada' && (
          <Field
            tone="dark"
            icon={<Tag className="size-5" strokeWidth={2} />}
            label={categoriaAtual?.nome ?? 'sem categoria'}
            muted={!categoriaAtual}
            chevron
            onClick={() => setSheet('categoria')}
          />
        )}

        <Field
          tone="dark"
          icon={<Pencil className="size-5" strokeWidth={2} />}
          label="descrição"
          muted={!descricao}
        >
          <input
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="descrição"
            aria-label="descrição"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-lg lowercase outline-none placeholder:text-white/35"
          />
        </Field>

        {/* o input fica visível de propósito: um date input transparente não
            abre o calendário no desktop, só o ícone nativo abre */}
        <div
          onClick={abrirCalendario}
          className="flex w-full cursor-pointer items-center gap-4 border-b border-line-dark px-5 py-5 transition-colors hover:bg-white/4"
        >
          <span className="grid size-7 shrink-0 place-items-center">
            <Calendar className="size-5" strokeWidth={2} />
          </span>
          <label
            htmlFor="data-lancamento"
            className="min-w-0 flex-1 cursor-pointer text-lg font-medium lowercase"
          >
            data
          </label>
          <input
            id="data-lancamento"
            ref={dateInput}
            type="date"
            value={data}
            onChange={(e) => e.target.value && setData(e.target.value)}
            className="num shrink-0 cursor-pointer bg-transparent text-lg text-white/70 outline-none focus-visible:text-white"
          />
        </div>

        <Field
          tone="dark"
          icon={<CalendarSync className="size-5" strokeWidth={2} />}
          label={recurrenceLabel(recorrencia)}
          muted={recorrencia === 'nenhuma'}
          chevron
          onClick={() => setSheet('repeticao')}
        />

        {recorrencia === 'parcelado' && (
          <div className="flex items-center gap-4 border-b border-line-dark px-5 py-5">
            <span className="grid size-7 shrink-0 place-items-center text-white/35">
              ×
            </span>
            <label className="flex-1 text-lg lowercase" htmlFor="parcelas">
              parcelas
            </label>
            <input
              id="parcelas"
              type="number"
              min={2}
              max={48}
              value={parcelas}
              onChange={(e) =>
                setParcelas(
                  Math.min(48, Math.max(2, Number(e.target.value) || 2)),
                )
              }
              className="num w-14 rounded-lg bg-white/10 py-1.5 text-center text-lg outline-none focus:bg-white/16"
            />
          </div>
        )}

        <Field
          tone="dark"
          icon={<Tag className="size-5" strokeWidth={2} />}
          label={tags.length ? tags.join(', ') : 'tags'}
          muted={tags.length === 0}
          chevron
          onClick={() => setSheet('tags')}
        />

        <div className="px-5 pt-8 pb-6">
          {recorrencia === 'parcelado' && valor > 0 && (
            <p className="mb-4 text-center text-sm text-white/45 lowercase">
              {parcelas}× de{' '}
              <span className="num">
                {formatBRL(splitCents(valor, parcelas)[1] ?? 0)}
              </span>
              , a primeira de{' '}
              <span className="num">
                {formatBRL(splitCents(valor, parcelas)[0])}
              </span>
            </p>
          )}

          {editando && recorrencia !== 'nenhuma' && (
            <p className="mb-4 text-center text-sm text-white/45 lowercase">
              esse lançamento se repete — a alteração vale para todas as
              ocorrências.
            </p>
          )}

          <Button
            variant="accent"
            full
            onClick={() => void submit()}
            disabled={valor <= 0 || salvando}
            className={cn(!saida && 'bg-income-600 hover:bg-income-500')}
          >
            {salvando
              ? 'salvando…'
              : editando
                ? 'salvar alterações'
                : saida
                  ? 'adicionar saída'
                  : 'adicionar entrada'}
          </Button>

          {erro && (
            <pre
              role="alert"
              className="mt-4 overflow-x-auto text-sm whitespace-pre-wrap text-accent-500"
            >
              {errorMessage(erro)}
            </pre>
          )}
        </div>
      </div>

      <NumericKeypad
        tone="dark"
        onDigit={(d) => setValor((v) => pushDigit(v, d))}
        onBackspace={() => setValor(popDigit)}
      />

      <Sheet
        open={sheet === 'tipo'}
        onClose={() => setSheet(null)}
        title="tipo"
        tone="dark"
      >
        {TIPOS.map((t) => (
          <SheetOption
            key={t.value}
            tone="dark"
            title={t.label}
            description={t.description}
            selected={tipo === t.value}
            onClick={() => trocarTipo(t.value)}
          />
        ))}
      </Sheet>

      <Sheet
        open={sheet === 'categoria'}
        onClose={() => setSheet(null)}
        title="categoria"
        tone="dark"
      >
        <SheetOption
          tone="dark"
          title="sem categoria"
          description={
            tipo === 'guardado'
              ? 'guardado solto, fora de qualquer meta'
              : 'conta como gasto livre'
          }
          selected={categoryId === null}
          onClick={() => {
            setCategoryId(null)
            setSheet(null)
          }}
        />
        {disponiveis.map((c) => (
          <SheetOption
            key={c.id}
            tone="dark"
            title={c.nome}
            description={
              c.tipo === 'fixa'
                ? `conta fixa · ${formatBRL(c.valorPrevisto)}`
                : c.tipo === 'flexivel'
                  ? `teto do mês · ${formatBRL(c.valorPrevisto)}`
                  : `meta · ${formatBRL(c.valorPrevisto)} por mês`
            }
            selected={categoryId === c.id}
            onClick={() => {
              setCategoryId(c.id)
              setSheet(null)
            }}
          />
        ))}
        {disponiveis.length === 0 && (
          <p className="px-6 py-6 text-base text-white/50 lowercase">
            {tipo === 'guardado'
              ? 'você ainda não tem nenhuma meta.'
              : 'você ainda não tem categorias.'}
          </p>
        )}
      </Sheet>

      <Sheet
        open={sheet === 'repeticao'}
        onClose={() => setSheet(null)}
        title="repetir"
        tone="dark"
      >
        {RECURRENCES.map((r) => (
          <SheetOption
            key={r.value}
            tone="dark"
            title={r.label}
            description={r.description}
            selected={recorrencia === r.value}
            onClick={() => {
              setRecorrencia(r.value)
              setSheet(null)
            }}
          />
        ))}
      </Sheet>

      <TagsSheet
        open={sheet === 'tags'}
        onClose={() => setSheet(null)}
        value={tags}
        onChange={setTags}
        suggestions={sugestoes}
      />

      <Sheet
        open={sheet === 'apagar'}
        onClose={() => setSheet(null)}
        title="apagar lançamento?"
        tone="dark"
      >
        <div className="px-6 py-6">
          <p className="text-base leading-snug text-white/70 lowercase">
            {recorrencia === 'parcelado'
              ? `isso apaga as ${parcelas} parcelas, não só a deste mês.`
              : recorrencia !== 'nenhuma'
                ? 'isso apaga a repetição inteira, em todos os meses.'
                : 'essa ação não tem volta.'}
          </p>

          <div className="mt-7 flex flex-col gap-3">
            <Button
              variant="accent"
              full
              onClick={() => void apagar()}
              disabled={remove.isPending}
            >
              {remove.isPending ? 'apagando…' : 'apagar'}
            </Button>
            <Button variant="outline" full onClick={() => setSheet(null)}>
              cancelar
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  )
}
