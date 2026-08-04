import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  throw new Error(
    'faltam VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em .env.local',
  )
}

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // o magic link volta com o token na URL
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
})

export async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  const id = data.session?.user.id
  if (!id) throw new Error('sem sessão')
  return id
}
