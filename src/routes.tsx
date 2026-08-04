import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { RequireAuth, RequireOnboarding } from './features/auth/RequireAuth'
import { LoginPage } from './features/auth/LoginPage'
import { WelcomePage } from './features/onboarding/WelcomePage'
import { OnboardingPage } from './features/onboarding/OnboardingPage'
import { BalancesPage } from './features/balances/BalancesPage'
import { EntryFormPage } from './features/entry-form/EntryFormPage'
import { TotalsPage } from './features/totals/TotalsPage'
import { TagsPage } from './features/tags/TagsPage'
import { MenuPage } from './features/menu/MenuPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/entrar" element={<LoginPage />} />

      <Route element={<RequireAuth />}>
        <Route path="/bem-vindo" element={<WelcomePage />} />
        <Route path="/onboarding/:step" element={<OnboardingPage />} />

        <Route element={<RequireOnboarding />}>
          <Route path="/lancamento/novo" element={<EntryFormPage />} />
          <Route path="/lancamento/:id" element={<EntryFormPage />} />

          <Route element={<AppShell />}>
            <Route index element={<BalancesPage />} />
            <Route path="/totais" element={<TotalsPage />} />
            <Route path="/tags" element={<TagsPage />} />
            <Route path="/menu" element={<MenuPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
