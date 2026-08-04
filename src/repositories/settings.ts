import { supabase, requireUserId } from '../lib/supabase'
import type { Settings } from '../domain/types'

interface SettingsRow {
  user_id: string
  saldo_inicial: number
  saldo_ref: string
  updated_at: string
}

function toDomain(row: SettingsRow): Settings {
  return {
    saldoInicial: row.saldo_inicial,
    saldoRef: row.saldo_ref,
    updatedAt: row.updated_at,
  }
}

/** null = o usuário ainda não passou pelo onboarding. */
export async function getSettings(): Promise<Settings | null> {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .maybeSingle<SettingsRow>()

  if (error) throw error
  return data ? toDomain(data) : null
}

export async function saveSettings(
  patch: Partial<Omit<Settings, 'updatedAt'>>,
): Promise<Settings> {
  const userId = await requireUserId()

  const row: Record<string, unknown> = {
    user_id: userId,
    updated_at: new Date().toISOString(),
  }
  if (patch.saldoInicial !== undefined) row.saldo_inicial = patch.saldoInicial
  if (patch.saldoRef !== undefined) row.saldo_ref = patch.saldoRef

  const { data, error } = await supabase
    .from('settings')
    .upsert(row, { onConflict: 'user_id' })
    .select()
    .single<SettingsRow>()

  if (error) throw error
  return toDomain(data)
}
