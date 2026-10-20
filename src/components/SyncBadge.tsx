import { useEffect, useState } from 'react'
import { Cloud, Smartphone, WifiOff } from 'lucide-react'
import { useAuth } from '../app/providers'
import { useI18n } from '../lib/i18n'

export function SyncBadge() {
  const { mode } = useAuth()
  const t = useI18n()
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  )

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  const label = mode === 'local' ? t('localOnly') : online ? t('cloudSyncOn') : t('offline')
  const chipClass =
    mode === 'supabase' && !online
      ? 'border border-danger/20 bg-danger-soft text-danger'
      : mode === 'local'
        ? 'border border-line bg-surface text-muted shadow-xs'
        : 'border border-primary/20 bg-primary-soft text-primary shadow-xs'

  const dotClass =
    mode === 'supabase' && !online
      ? 'bg-danger'
      : mode === 'local'
        ? 'bg-muted/60'
        : 'bg-primary'

  const Icon = mode === 'local' ? Smartphone : online ? Cloud : WifiOff

  return (
    <span
      title={label.secondary ? `${label.primary.text} / ${label.secondary.text}` : label.primary.text}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all ${chipClass}`}
    >
      <span className="relative flex h-2 w-2">
        <span className={`relative inline-flex h-2 w-2 rounded-full ${dotClass}`} />
      </span>
      <Icon size={13} strokeWidth={2.2} className="shrink-0" aria-hidden="true" />
      <span className="hidden sm:inline">{label.primary.text}</span>
      <span className="sm:hidden">{mode === 'local' ? 'Local' : online ? 'Cloud' : 'Offline'}</span>
    </span>
  )
}
