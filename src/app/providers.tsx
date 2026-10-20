import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { VisitRepository } from '../data/types'
import type { ArticleRepository } from '../data/types'
import { createLocalRepository } from '../data/local'
import { createLocalArticleRepository } from '../data/local-articles'
import { readSupabaseConfig } from '../data/supabase-config'
import type { AuthUser } from '../data/supabase-auth'

export type Lang = 'bi' | 'my' | 'en'
export type DataMode = 'local' | 'supabase'

export interface SettingsState {
  lang: Lang
  defaultFee: number | null
  setLang: (lang: Lang) => void
  setDefaultFee: (fee: number | null) => void
}

export interface AuthState {
  mode: DataMode
  user: AuthUser | null
  ready: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const SettingsContext = createContext<SettingsState | null>(null)
const RepositoryContext = createContext<VisitRepository | null>(null)
const ArticleRepositoryContext = createContext<ArticleRepository | null>(null)
const AuthContext = createContext<AuthState | null>(null)

const SETTINGS_KEY = 'lamin.settings.v1'

interface PersistedSettings {
  lang: Lang
  defaultFee: number | null
}

function loadPersistedSettings(): PersistedSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedSettings>
      return {
        lang: parsed.lang === 'my' || parsed.lang === 'en' ? parsed.lang : 'bi',
        defaultFee: typeof parsed.defaultFee === 'number' ? parsed.defaultFee : null,
      }
    }
  } catch {
    // malformed settings — fall through to defaults
  }
  return { lang: 'bi', defaultFee: null }
}

type Services =
  | { mode: 'local'; repo: VisitRepository; articleRepo: ArticleRepository }
  | { mode: 'supabase'; repo: VisitRepository; articleRepo: ArticleRepository; client: SupabaseClient }

let servicesPromise: Promise<Services> | null = null

async function bootServices(): Promise<Services> {
  const config = readSupabaseConfig()
  if (!config) {
    return {
      mode: 'local',
      repo: createLocalRepository(localStorage),
      articleRepo: createLocalArticleRepository(localStorage),
    }
  }
  const [{ createSupabaseServices }, { createSupabaseRepository }, { createSupabaseArticleRepository }] =
    await Promise.all([
      import('../data/supabase'),
      import('../data/supabase-repo'),
      import('../data/supabase-articles'),
    ])
  const { client } = createSupabaseServices(config)
  return {
    mode: 'supabase',
    repo: createSupabaseRepository(client),
    articleRepo: createSupabaseArticleRepository(client),
    client,
  }
}

function getServices(): Promise<Services> {
  servicesPromise ??= bootServices()
  return servicesPromise
}

function ServicesLoading() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
      <img src="/logo.svg" alt="" className="h-16 w-16 rounded-2xl" />
      <div className="h-1 w-24 overflow-hidden rounded-full bg-line">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
      </div>
    </div>
  )
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PersistedSettings>(loadPersistedSettings)
  const [services, setServices] = useState<Services | null>(null)
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [bootError, setBootError] = useState<string | null>(null)
  const [settingsError, setSettingsError] = useState(false)

  useEffect(() => {
    let cancelled = false
    getServices().then((resolved) => {
      if (cancelled) return
      setServices(resolved)
      if (resolved.mode === 'local') {
        setAuthReady(true)
      }
    }).catch((cause: unknown) => {
      if (!cancelled) setBootError(cause instanceof Error ? cause.message : String(cause))
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (services?.mode !== 'supabase') return
    let cancelled = false
    let unsubscribe: (() => void) | null = null
    void import('../data/supabase-auth').then(({ subscribeAuth }) => {
      if (cancelled) return
      unsubscribe = subscribeAuth(services.client, (user) => {
        setAuthUser(user)
        setAuthReady(true)
      })
    }).catch((cause: unknown) => {
      if (!cancelled) setBootError(cause instanceof Error ? cause.message : String(cause))
    })
    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [services])

  const settingsValue = useMemo<SettingsState>(() => {
    const persist = (next: PersistedSettings) => {
      setSettings(next)
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
        setSettingsError(false)
      } catch {
        setSettingsError(true)
      }
    }
    return {
      lang: settings.lang,
      defaultFee: settings.defaultFee,
      setLang: (lang) => persist({ ...settings, lang }),
      setDefaultFee: (defaultFee) => persist({ ...settings, defaultFee }),
    }
  },
    [settings],
  )

  const authValue = useMemo<AuthState>(
    () => ({
      mode: services?.mode ?? 'local',
      user: authUser,
      ready: authReady,
      signIn: async (email, password) => {
        if (services?.mode === 'supabase') {
          const { signIn } = await import('../data/supabase-auth')
          await signIn(services.client, email, password)
        } else {
          setAuthUser({ email })
        }
      },
      signOut: async () => {
        if (services?.mode === 'supabase') {
          const { signOut } = await import('../data/supabase-auth')
          await signOut(services.client)
        } else {
          setAuthUser(null)
        }
      },
    }),
    [services, authUser, authReady],
  )

  if (bootError) return <div role="alert" className="p-6">{bootError}<button className="ml-4 underline" onClick={() => window.location.reload()}>Retry / ပြန်ကြိုးစားရန်</button></div>

  if (!services) {
    return <ServicesLoading />
  }

  return (
    <SettingsContext.Provider value={settingsValue}>
      <RepositoryContext.Provider value={services.repo}>
        <ArticleRepositoryContext.Provider value={services.articleRepo}>
          <AuthContext.Provider value={authValue}>
            {settingsError && <p role="alert" className="p-3 text-danger">Settings could not be saved on this device. / ဆက်တင်များ သိမ်းဆည်း၍ မရပါ။</p>}
            {children}
          </AuthContext.Provider>
        </ArticleRepositoryContext.Provider>
      </RepositoryContext.Provider>
    </SettingsContext.Provider>
  )
}

export function useSettings(): SettingsState {
  const context = useContext(SettingsContext)
  if (!context) throw new Error('useSettings must be used within AppProviders')
  return context
}

export function useRepository(): VisitRepository {
  const context = useContext(RepositoryContext)
  if (!context) throw new Error('useRepository must be used within AppProviders')
  return context
}

export function useArticleRepository(): ArticleRepository {
  const context = useContext(ArticleRepositoryContext)
  if (!context) throw new Error('useArticleRepository must be used within AppProviders')
  return context
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AppProviders')
  return context
}
