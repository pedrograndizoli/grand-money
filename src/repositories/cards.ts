import { supabase, requireUserId } from '../lib/supabase'
import type { Card, CardDraft } from '../domain/types'

interface CardRow {
  id: string
  user_id: string
  nome: string
  limite_mensal: number
  cor: string | null
}

function toDomain(row: CardRow): Card {
  return {
    id: row.id,
    nome: row.nome,
    limiteMensal: row.limite_mensal ?? 0,
    cor: row.cor,
  }
}

function toRow(draft: CardDraft) {
  return {
    nome: draft.nome.trim(),
    limite_mensal: Math.abs(Math.round(draft.limiteMensal)),
    cor: draft.cor,
  }
}

export async function listCards(): Promise<Card[]> {
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .order('nome', { ascending: true })
    .returns<CardRow[]>()

  if (error) throw error
  return data.map(toDomain)
}

export async function createCard(draft: CardDraft): Promise<Card> {
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from('cards')
    .insert({ ...toRow(draft), user_id: userId })
    .select()
    .single<CardRow>()

  if (error) throw error
  return toDomain(data)
}

export async function updateCard(id: string, draft: CardDraft): Promise<Card> {
  const { data, error } = await supabase
    .from('cards')
    .update(toRow(draft))
    .eq('id', id)
    .select()
    .single<CardRow>()

  if (error) throw error
  return toDomain(data)
}
