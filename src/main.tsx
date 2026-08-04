import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import '@fontsource-variable/outfit'
import '@fontsource-variable/inter'
import './index.css'
import { queryClient } from './lib/queryClient'
import { SessionProvider } from './features/auth/session'
import { ErrorBoundary } from './components/layout/ErrorBoundary'
import { AppRoutes } from './routes'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </SessionProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
