import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { queryClient } from '../../lib/queryClient'
import { SessionContext } from './sessionContext'

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next)
      setLoading(false)
      // dados financeiros de outra conta não podem sobrar no cache
      if (event === 'SIGNED_OUT') queryClient.clear()
    })

    return () => data.subscription.unsubscribe()
  }, [])

  const value = useMemo(() => ({ session, loading }), [session, loading])

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  )
}
