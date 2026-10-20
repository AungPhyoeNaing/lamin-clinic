import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './providers'
import { useText } from '../lib/i18n'
import FeedScreen from '../features/feed/FeedScreen'

const AppShell = lazy(() => import('./AppShell'))
const LedgerScreen = lazy(() => import('../features/ledger/LedgerScreen'))
const ReportsScreen = lazy(() => import('../features/reports/ReportsScreen'))
const SettingsScreen = lazy(() => import('../features/settings/SettingsScreen'))
const LoginScreen = lazy(() => import('../features/auth/LoginScreen'))
const ArticleScreen = lazy(() => import('../features/feed/ArticleScreen'))
const ComposerScreen = lazy(() => import('../features/feed/ComposerScreen'))

function SplashScreen() {
  const label = useText('loading')
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
      <img src="/logo.svg" alt="" className="h-16 w-16 rounded-2xl" />
      <div className="h-1 w-24 overflow-hidden rounded-full bg-line">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
      </div>
      <p className="mm text-sm text-muted">{label}</p>
    </div>
  )
}

function RequireAuth() {
  const auth = useAuth()
  const location = useLocation()

  if (!auth.ready) return <SplashScreen />
  if (!auth.user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<SplashScreen />}>
      <Routes>
        <Route path="/" element={<FeedScreen />} />
        <Route path="/posts/:id" element={<ArticleScreen />} />
        <Route element={<RequireAuth />}>
          <Route path="/posts/new" element={<ComposerScreen />} />
          <Route path="/posts/:id/edit" element={<ComposerScreen />} />
        </Route>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/admin" element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route index element={<LedgerScreen />} />
            <Route path="reports" element={<ReportsScreen />} />
            <Route path="settings" element={<SettingsScreen />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
