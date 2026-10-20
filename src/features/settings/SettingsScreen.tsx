import { useRef, useState, type ReactNode } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Cloud,
  Database,
  Download,
  FileSpreadsheet,
  Globe,
  Info,
  LogOut,
  Smartphone,
  Upload,
  Wallet,
} from 'lucide-react'
import { useAuth, useRepository, useSettings, type Lang } from '../../app/providers'
import { downloadTextFile, visitsToCsv } from '../../lib/csv'
import { formatAmount, formatKs, todayKey } from '../../lib/format'
import { T, useI18n, type TKey } from '../../lib/i18n'
import { Field, inputCls } from '../../components/Field'
import { parseVisits } from '../../data/validation'

const LANG_OPTIONS: { value: Lang; label: string }[] = [
  { value: 'my', label: 'မြန်မာ' },
  { value: 'bi', label: 'မြန်မာ + English' },
  { value: 'en', label: 'English' },
]

const POPULAR_FEE_PRESETS = [5000, 10000, 15000, 20000, 30000]

function SettingCard({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Globe
  title: TKey
  children: ReactNode
}) {
  return (
    <section className="setting-card rounded-3xl border border-line bg-surface p-4 card-shadow md:p-5">
      <div className="mb-3.5 flex items-center gap-2 border-b border-line/60 pb-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <Icon size={16} />
        </span>
        <T
          k={title}
          className="text-sm font-bold text-ink"
          subClassName="ml-1.5 text-xs text-muted font-normal"
        />
      </div>
      {children}
    </section>
  )
}

export default function SettingsScreen() {
  const { lang, defaultFee, setLang, setDefaultFee } = useSettings()
  const auth = useAuth()
  const repo = useRepository()
  const t = useI18n()
  const [feeInput, setFeeInput] = useState(defaultFee != null ? String(defaultFee) : '')
  const [busy, setBusy] = useState(false)
  const [restoreStatus, setRestoreStatus] = useState<{ ok: boolean; msg: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function backupJson() {
    setBusy(true)
    try {
      const all = await repo.exportAll()
      downloadTextFile(
        `la-min-backup-${todayKey()}.json`,
        JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), visits: all }, null, 2),
        'application/json',
      )
    } catch (cause) {
      setRestoreStatus({ ok: false, msg: cause instanceof Error ? cause.message : String(cause) })
    } finally {
      setBusy(false)
    }
  }

  async function exportAllCsv() {
    setBusy(true)
    try {
      const all = await repo.exportAll()
      downloadTextFile(
        `la-min-all-records-${todayKey()}.csv`,
        '\uFEFF' + visitsToCsv(all),
        'text/csv',
      )
    } catch (cause) {
      setRestoreStatus({ ok: false, msg: cause instanceof Error ? cause.message : String(cause) })
    } finally {
      setBusy(false)
    }
  }

  function handleRestoreFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string
        const parsed = JSON.parse(content) as { visits?: unknown[] }
        if (parsed && Array.isArray(parsed.visits)) {
          const visits = parseVisits(parsed.visits)
          const count = parsed.visits.length
          const confirmed = window.confirm(
            `${t('restoreConfirm').primary.text} (${count} records)`,
          )
          if (confirmed) {
            setBusy(true)
            if (!repo.importAll) throw new Error('Restore is unavailable')
            const imported = await repo.importAll(visits)
            setRestoreStatus({
              ok: true,
              msg: `${t('restoreSuccess').primary.text} (${imported} records)`,
            })
          }
        } else {
          setRestoreStatus({ ok: false, msg: t('restoreError').primary.text })
        }
      } catch {
        setRestoreStatus({ ok: false, msg: t('restoreError').primary.text })
      } finally {
        setBusy(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }
    reader.onerror = () => {
      setRestoreStatus({ ok: false, msg: t('restoreError').primary.text })
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
    reader.readAsText(file)
  }

  function commitFee(valueToCommit = feeInput) {
    const trimmed = valueToCommit.trim()
    if (trimmed === '') {
      setDefaultFee(null)
      return
    }
    const value = Number(trimmed)
    if (Number.isFinite(value) && value >= 0) {
      setDefaultFee(Math.round(value))
      setFeeInput(String(Math.round(value)))
    } else {
      setFeeInput(defaultFee != null ? String(defaultFee) : '')
    }
  }

  const feeNumber = Number(feeInput)
  const showFeePreview = feeInput.trim() !== '' && Number.isFinite(feeNumber)

  return (
    <div className="screen settings-screen">
      {/* Settings Header */}
      <div className="screen-heading">
        <h1>
        <T
          k="settings"
          className="text-xl font-bold tracking-tight text-ink md:text-2xl"
          subClassName="ml-2 text-xs text-muted font-normal"
        />
        </h1>
      </div>

      {/* Clinic Identity Card */}
      <div className="mb-4 flex items-center gap-3.5 rounded-3xl border border-line bg-surface p-4 card-shadow md:p-5">
        <img src="/logo-glass.webp" alt="" className="h-12 w-12 rounded-2xl shadow-xs" />
        <div className="min-w-0">
          <T
            k="appName"
            className="text-[16px] font-bold tracking-tight text-ink"
            subClassName="block text-xs text-muted"
          />
          <T
            k="city"
            className="mm text-xs text-muted"
            subClassName="ml-1.5 text-[10px] text-muted/70"
          />
        </div>
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
        {/* Language Selection */}
        <SettingCard icon={Globe} title="language">
          <div className="grid grid-cols-3 gap-1 rounded-2xl border border-line bg-surface-soft p-1.5">
            {LANG_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={lang === option.value}
                onClick={() => setLang(option.value)}
                className={`rounded-xl py-2.5 text-xs font-semibold transition-all ${
                  lang === option.value
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-muted hover:bg-surface hover:text-ink active:scale-95'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </SettingCard>

        {/* Default Fee */}
        <SettingCard icon={Wallet} title="defaultFee">
          <div className="max-w-xs">
            <Field k="fee">
              <div className="relative">
                <input
                  className={`${inputCls} tnum pr-14 font-semibold`}
                  value={feeInput}
                  inputMode="numeric"
                  placeholder="0"
                  onChange={(event) => setFeeInput(event.target.value.replace(/[^0-9]/g, ''))}
                  onBlur={() => commitFee()}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') (event.target as HTMLInputElement).blur()
                  }}
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted">
                  Ks
                </span>
              </div>
            </Field>
          </div>

          {/* Quick presets for default fee */}
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {POPULAR_FEE_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setFeeInput(String(preset))
                  commitFee(String(preset))
                }}
                className={`tnum rounded-xl border px-2.5 py-1 text-xs font-semibold transition ${
                  feeInput === String(preset)
                    ? 'border-primary bg-primary text-white'
                    : 'border-line bg-surface-soft text-ink hover:border-line-strong'
                }`}
              >
                {formatAmount(preset)}
              </button>
            ))}
          </div>

          {showFeePreview && (
            <div className="tnum mt-1.5 text-[11px] font-semibold text-primary">
              {formatKs(feeNumber)}
            </div>
          )}
          <div className="mt-2 text-xs leading-relaxed text-muted">
            <T k="defaultFeeHint" subClassName="hidden" />
          </div>
        </SettingCard>

        {/* Data & Backup Management */}
        <SettingCard icon={Database} title="data">
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => void backupJson()}
              disabled={busy}
              className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface-soft px-4 py-3 text-left transition hover:border-line-strong hover:bg-surface active:scale-98 disabled:opacity-60"
            >
              <Download size={18} className="shrink-0 text-primary" />
              <div className="flex-1">
                <T
                  k="backupJson"
                  className="text-sm font-semibold text-ink"
                  subClassName="block text-[11px] text-muted"
                />
              </div>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface-soft px-4 py-3 text-left transition hover:border-line-strong hover:bg-surface active:scale-98 disabled:opacity-60"
            >
              <Upload size={18} className="shrink-0 text-primary" />
              <div className="flex-1">
                <T
                  k="restoreJson"
                  className="text-sm font-semibold text-ink"
                  subClassName="block text-[11px] text-muted"
                />
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleRestoreFile}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => void exportAllCsv()}
              disabled={busy}
              className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface-soft px-4 py-3 text-left transition hover:border-line-strong hover:bg-surface active:scale-98 disabled:opacity-60"
            >
              <FileSpreadsheet size={18} className="shrink-0 text-primary" />
              <div className="flex-1">
                <T
                  k="allRecordsCsv"
                  className="text-sm font-semibold text-ink"
                  subClassName="block text-[11px] text-muted"
                />
              </div>
            </button>

            {restoreStatus && (
              <div
                role="status"
                className={`flex items-center gap-2 rounded-2xl p-3 text-xs font-semibold ${
                  restoreStatus.ok
                    ? 'border border-primary/20 bg-primary-soft text-primary'
                    : 'border border-danger/20 bg-danger-soft text-danger'
                }`}
              >
                {restoreStatus.ok ? (
                  <CheckCircle2 size={16} className="shrink-0" />
                ) : (
                  <AlertCircle size={16} className="shrink-0" />
                )}
                <span>{restoreStatus.msg}</span>
              </div>
            )}

            <p className="px-1 text-[11px] text-muted">
              <T k="backupHint" subClassName="hidden" />
            </p>
          </div>
        </SettingCard>

        {/* Cloud Sync & Account */}
        <SettingCard icon={Cloud} title="account">
          {auth.mode === 'supabase' ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary-soft/60 p-3.5">
                <Cloud size={20} className="shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <T k="cloudSyncOn" className="text-sm font-bold text-primary" subClassName="hidden" />
                  <div className="truncate text-xs text-muted">{auth.user?.email ?? ''}</div>
                </div>
              </div>
              <div className="text-xs text-muted">
                <T k="syncCloudHint" subClassName="hidden" />
              </div>
              <button
                type="button"
                onClick={() => void auth.signOut().catch((cause: unknown) => setRestoreStatus({ ok: false, msg: String(cause) }))}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-danger/30 bg-surface py-2.5 text-xs font-bold text-danger transition hover:bg-danger-soft active:scale-98"
              >
                <LogOut size={15} />
                {t('logout').primary.text}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface-soft p-3.5">
                <Database size={20} className="shrink-0 text-primary" />
                <div className="min-w-0">
                  <T k="localOnly" className="text-sm font-bold text-ink" subClassName="hidden" />
                  <div className="text-xs text-muted">
                    <T k="syncCloudHint" subClassName="hidden" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </SettingCard>

        {/* Install on Device */}
        <SettingCard icon={Smartphone} title="installTitle">
          <div className="flex items-start gap-3 rounded-2xl border border-line/80 bg-surface-soft p-3.5">
            <Smartphone size={20} className="mt-0.5 shrink-0 text-primary" />
            <T k="installHint" className="text-xs leading-relaxed text-muted" subClassName="hidden" />
          </div>
        </SettingCard>

        {/* About & Version */}
        <SettingCard icon={Info} title="about">
          <div className="space-y-1">
            <T k="appName" className="text-sm font-bold text-ink" subClassName="hidden" />
            <div className="text-xs text-muted">
              {t('version').primary.text} 1.0.0 · Mandalay, Myanmar
            </div>
          </div>
        </SettingCard>
      </div>

      <div className="h-10" />
    </div>
  )
}
