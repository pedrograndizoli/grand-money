import { supabase, requireUserId } from '../lib/supabase'
import type { Entry, EntryDraft, Recurrence, EntryType } from '../domain/types'

interface EntryRow {
  id: string
  user_id: string
  tipo: EntryType
  valor: number
  descricao: string | null
  data: string
  category_id: string | null
  card_id: string | null
  recorrencia: Recurrence
  parcelas: number | null
  tags: string[] | null
  created_at: string
}

function toDomain(row: EntryRow): Entry {
  return {
    id: row.id,
    tipo: row.tipo,
    valor: row.valor,
    descricao: row.descricao,
    data: row.data,
    categoryId: row.category_id,
    cardId: row.card_id ?? null,
    recorrencia: row.recorrencia,
    parcelas: row.parcelas,
    tags: row.tags ?? [],
    createdAt: row.created_at,
  }
}

function toRow(draft: EntryDraft) {
  return {
    tipo: draft.tipo,
    valor: Math.abs(Math.round(draft.valor)),
    descricao: draft.descricao?.trim() || null,
    data: draft.data,
    category_id: draft.categoryId,
    // só saída passa em cartão: entrada e guardado não têm forma de pagamento
    card_id: draft.tipo === 'saida' ? draft.cardId : null,
    recorrencia: draft.recorrencia,
    parcelas: draft.recorrencia === 'parcelado' ? draft.parcelas : null,
    tags: draft.tags,
  }
}

/**
 * Traz tudo. A recorrência de um lançamento antigo alcança qualquer mês
 * futuro, então recortar por data no banco esconderia lançamentos válidos —
 * e o volume aqui é de uso pessoal, não de contabilidade.
 */
export async function listEntries(): Promise<Entry[]> {
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .order('data', { ascending: true })
    .returns<EntryRow[]>()

  if (error) throw error
  return data.map(toDomain)
}

export async function createEntry(draft: EntryDraft): Promise<Entry> {
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from('entries')
    .insert({ ...toRow(draft), user_id: userId })
    .select()
    .single<EntryRow>()

  if (error) throw error
  return toDomain(data)
}

export async function updateEntry(
  id: string,
  draft: EntryDraft,
): Promise<Entry> {
  const { data, error } = await supabase
    .from('entries')
    .update(toRow(draft))
    .eq('id', id)
    .select()
    .single<EntryRow>()

  if (error) throw error
  return toDomain(data)
}

export async function deleteEntry(id: string): Promise<void> {
  const { error } = await supabase.from('entries').delete().eq('id', id)
  if (error) throw error
}
