import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { CircleAlert, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../app/providers'
import { T, useI18n } from '../../lib/i18n'
import { Field, inputCls } from '../../components/Field'

export default function LoginScreen() {
  const auth = useAuth()
  const t = useI18n()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const from = (location.state as { from?: string } | null)?.from ?? '/admin'

  if (auth.ready && auth.user) return <Navigate to={from} replace />

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!email.trim() || !password || busy) return
    setBusy(true)
    setError(null)
    try {
      await auth.signIn(email, password)
    } catch (err) {
      const message = err instanceof Error ? err.message : t('loginError').primary.text
      setError(message)
      setBusy(false)
    }
  }

  return (
    <div className="login-screen flex min-h-dvh w-full items-center justify-center px-5 py-12">
      <div className="w-full max-w-md rounded-3xl border border-line bg-surface p-6 card-shadow md:p-8">
        {/* Branding */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-soft text-primary shadow-xs">
            <img src="/logo.svg" alt="" className="h-10 w-10 rounded-xl" />
          </div>
          <T
            k="appName"
            className="mt-4 text-2xl font-bold tracking-tight text-ink"
            subClassName="block text-xs text-muted"
          />
          <T
            k="city"
            className="mm mt-1 text-xs text-muted"
            subClassName="ml-1.5 text-[10px] text-muted/70"
          />
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <Field k="email">
            <div className="relative">
              <input
                type="email"
                autoComplete="email"
                inputMode="email"
                autoCapitalize="none"
                placeholder="doctor@laminclinic.com"
                className={inputCls}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
          </Field>

          <Field k="password">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                className={`${inputCls} pr-12`}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted transition hover:text-ink"
                title={t(showPassword ? 'hidePassword' : 'showPassword').primary.text}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </Field>

          {error && (
            <div className="flex items-center gap-2 rounded-2xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
              <CircleAlert size={16} className="shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-2xl bg-primary py-3.5 text-white shadow-md shadow-primary/20 transition hover:bg-primary-strong active:scale-95 disabled:opacity-60"
          >
            <T
              k={busy ? 'signingIn' : 'signIn'}
              className="text-[15px] font-bold"
              subClassName="block text-[10px] font-normal text-white/80"
            />
          </button>
        </form>

        <div className="mt-6 border-t border-line/60 pt-4 text-center">
          <T
            k="syncCloudHint"
            className="text-xs leading-relaxed text-muted"
            subClassName="hidden"
          />
        </div>
      </div>
    </div>
  )
}
