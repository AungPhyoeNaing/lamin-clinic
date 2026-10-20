import { ArrowUpRight, ChartColumn, NotebookPen, Settings } from 'lucide-react'
import { useLayoutEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { T, useText, type TKey } from '../lib/i18n'
import { SyncBadge } from '../components/SyncBadge'

const tabs: { to: string; k: TKey; Icon: typeof NotebookPen }[] = [
  { to: '/admin', k: 'ledger', Icon: NotebookPen },
  { to: '/admin/reports', k: 'reports', Icon: ChartColumn },
  { to: '/admin/settings', k: 'settings', Icon: Settings },
]

export default function AppShell() {
  const feedLabel = useText('feed')
  const { pathname } = useLocation()
  useLayoutEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }) }, [pathname])
  return (
    <div className="clinic-shell mx-auto flex min-h-dvh w-full max-w-5xl flex-col">
      <a href="#main-content" className="skip-link">Skip to content / အကြောင်းအရာသို့</a>
      <header className="clinic-header no-print">
        <div className="flex min-w-0 items-center gap-3">
          <img src="/logo.svg" width="42" height="42" alt="" className="rounded-2xl" />
          <div className="min-w-0">
            <T k="appName" className="block text-[16px] font-bold text-ink" subClassName="block text-[11px] font-medium text-muted" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SyncBadge />
          <Link to="/" aria-label={feedLabel} title={feedLabel} className="header-feed-link">
            <ArrowUpRight size={20} aria-hidden="true" />
          </Link>
        </div>
      </header>
      <nav aria-label="Desktop primary" className="no-print hidden gap-2 border-b border-line px-6 py-3 md:flex">
        {tabs.map(({ to, k, Icon }) => (
          <NavLink key={to} to={to} end={to === '/admin'} className={({ isActive }) => `flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold ${isActive ? 'bg-primary text-white' : 'text-muted hover:bg-primary-soft'}`}>
            <Icon size={18} aria-hidden="true" /><T k={k} subClassName="hidden" />
          </NavLink>
        ))}
      </nav>
      <main id="main-content" tabIndex={-1} className="clinic-main flex-1"><Outlet /></main>
      <nav aria-label="Primary" className="clinic-bottom-nav no-print md:hidden">
        {tabs.map(({ to, k, Icon }) => (
          <NavLink key={to} to={to} end={to === '/admin'} className={({ isActive }) => `clinic-tab ${isActive ? 'clinic-tab-active' : ''}`}>
            <Icon size={22} aria-hidden="true" />
            <T k={k} className="text-center text-[12px] font-semibold" subClassName="block text-[10px] font-normal text-muted" />
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
