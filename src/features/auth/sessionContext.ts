import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'

export interface SessionValue {
  session: Session | null
  loading: boolean
}

export const SessionContext = createContext<SessionValue>({
  session: null,
  loading: true,
})

export function useSession(): SessionValue {
  return useContext(SessionContext)
}
