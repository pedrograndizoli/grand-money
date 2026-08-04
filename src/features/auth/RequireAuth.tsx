import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSession } from './sessionContext'
import { useSettings } from '../../hooks/useSettings'
import { Splash } from '../../components/layout/Splash'
import { errorMessage } from '../../lib/errors'

export function RequireAuth() {
  const { session, loading } = useSession()
  const location = useLocation()

  if (loading) return <Splash />
  if (!session) {
    return <Navigate to="/entrar" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}

/** settings ausente = o usuário nunca terminou o onboarding. */
export function RequireOnboarding() {
  const { data, isPending, isError, error, refetch } = useSettings()

  if (isPending) return <Splash />

  if (isError) {
    return (
      <div className="grid min-h-svh place-items-center bg-white px-6">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold tracking-tight lowercase">
            não consegui ler seus dados
          </h1>
          <pre className="mt-4 overflow-x-auto rounded-2xl bg-ink-900/5 p-4 text-xs whitespace-pre-wrap">
            {errorMessage(error)}
          </pre>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-6 h-12 w-full rounded-full bg-ink-900 px-6 font-semibold text-white"
          >
            tentar de novo
          </button>
        </div>
      </div>
    )
  }

  if (!data) return <Navigate to="/bem-vindo" replace />
  return <Outlet />
}
