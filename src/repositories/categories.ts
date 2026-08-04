import { supabase, requireUserId } from '../lib/supabase'
import type { Category, CategoryDraft, CategoryType } from '../domain/types'

interface CategoryRow {
  id: string
  user_id: string
  nome: string
  tipo: CategoryType
  valor_previsto: number
  valor_estimado: boolean | null
  dia_vencimento: number | null
  meta_total: number | null
  data_final: string | null
  cor: string | null
}

function toDomain(row: CategoryRow): Category {
  return {
    id: row.id,
    nome: row.nome,
    tipo: row.tipo,
    valorPrevisto: row.valor_previsto,
    valorEstimado: row.valor_estimado ?? false,
    diaVencimento: row.dia_vencimento,
    metaTotal: row.meta_total ?? null,
    // coluna ausente chega `undefined`, e `undefined` não é `null` na hora de
    // decidir se a meta tem plano
    dataFinal: row.data_final ?? null,
    cor: row.cor,
  }
}

function toRow(draft: CategoryDraft) {
  return {
    nome: draft.nome.trim(),
    tipo: draft.tipo,
    valor_previsto: Math.abs(Math.round(draft.valorPrevisto)),
    // campos que só existem em um tipo: zerados fora dele, para não sobrar
    // vencimento fantasma numa categoria que virou flexível
    valor_estimado: draft.tipo === 'fixa' ? draft.valorEstimado : false,
    dia_vencimento: draft.tipo === 'fixa' ? draft.diaVencimento : null,
    meta_total: draft.tipo === 'meta' ? draft.metaTotal : null,
    data_final: draft.tipo === 'meta' ? draft.dataFinal : null,
    cor: draft.cor,
  }
}

export async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('tipo', { ascending: true })
    .order('nome', { ascending: true })
    .returns<CategoryRow[]>()

  if (error) throw error
  return data.map(toDomain)
}

export async function createCategory(
  draft: CategoryDraft,
): Promise<Category> {
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from('categories')
    .insert({ ...toRow(draft), user_id: userId })
    .select()
    .single<CategoryRow>()

  if (error) throw error
  return toDomain(data)
}

/** Um insert só: o onboarding grava tudo de uma vez ou não grava nada. */
export async function createCategories(
  drafts: CategoryDraft[],
): Promise<Category[]> {
  if (drafts.length === 0) return []
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from('categories')
    .insert(drafts.map((draft) => ({ ...toRow(draft), user_id: userId })))
    .select()
    .returns<CategoryRow[]>()

  if (error) throw error
  return data.map(toDomain)
}

export async function updateCategory(
  id: string,
  draft: CategoryDraft,
): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .update(toRow(draft))
    .eq('id', id)
    .select()
    .single<CategoryRow>()

  if (error) throw error
  return toDomain(data)
}

/**
 * O que acontece com os lançamentos da categoria depende do `on delete` da FK
 * `entries.category_id` no banco — confirmar antes de expor isso na UI.
 */
export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) throw error
}
