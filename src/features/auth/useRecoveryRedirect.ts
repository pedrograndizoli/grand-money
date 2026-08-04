import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

/**
 * Rede de segurança do link de redefinição. O caminho normal é o `redirectTo`
 * levar direto para `/nova-senha`; quando essa URL não está na lista de
 * redirects do Supabase, ele ignora e joga na Site URL — o usuário cairia
 * logado na tela de hoje, sem nunca ver o campo de senha nova.
 *
 * O evento `PASSWORD_RECOVERY` é o que distingue esse acesso de um login
 * comum.
 */
export function useRecoveryRedirect(): void {
  const navigate = useNavigate()

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        void navigate('/nova-senha', { replace: true })
      }
    })

    return () => data.subscription.unsubscribe()
  }, [navigate])
}
