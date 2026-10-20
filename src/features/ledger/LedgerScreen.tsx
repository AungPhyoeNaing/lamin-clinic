import { useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronRightIcon,
  CircleDollarSign,
  Plus,
  Search,
  Users,
  X,
} from 'lucide-react'
import { useDayVisits } from '../../data/hooks'
import type { Visit } from '../../data/types'
import {
  addDays,
  formatDateMy,
  formatDateShort,
  formatKs,
  formatWeekdayMy,
  todayKey,
} from '../../lib/format'
import { T, useI18n, useText } from '../../lib/i18n'
import { totalFees } from '../../lib/summary'
import VisitSheet from './VisitSheet'
import PeriodSummary from './PeriodSummary'
import { isDateKey } from '../../data/validation'

export default function LedgerScreen() {
  const [searchParams] = useSearchParams()
  const [dateKey, setDateKey] = useState(() => {
    const requested = searchParams.get('date')
    return isDateKey(requested) ? requested : todayKey()
  })
  const { visits, loading, error, refresh } = useDayVisits(dateKey)
  const [summaryRevision, setSummaryRevision] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [sheet, setSheet] = useState<{ open: boolean; editing: Visit | null }>({
    open: false,
    editing: null,
  })
  const t = useI18n()
  const addLabel = useText('addVisit')
  const ageUnit = useText('ageUnit')

  const total = useMemo(() => totalFees(visits), [visits])
  const visitNumbers = useMemo(() => new Map(visits.map((visit, index) => [visit.id, index + 1])), [visits])
  const isToday = dateKey === todayKey()

  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const filteredVisits = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return visits
    return visits.filter(
      (v) =>
        v.patientName.toLowerCase().includes(q) ||
        (v.diagnosis && v.diagnosis.toLowerCase().includes(q)),
    )
  }, [visits, searchQuery])

  function changeDay(delta: number) {
    setDateKey((current) => addDays(current, delta))
    setSearchQuery('')
  }

  function openAdd() {
    setSheet({ open: true, editing: null })
  }

  function openEdit(visit: Visit) {
    setSheet({ open: true, editing: visit })
  }

  function closeSheet() {
    setSheet({ open: false, editing: null })
  }

  function handleSaved() {
    closeSheet()
    refresh()
    setSummaryRevision((revision) => revision + 1)
  }

  return (
    <div className="screen ledger-screen">
      <div className="screen-heading">
        <h1><T k="ledger" subClassName="ml-2 text-sm font-normal text-muted" /></h1>
        <span className="text-xs text-muted"><T k="city" subClassName="hidden" /></span>
      </div>

      <header className="ledger-overview">
        <div className="date-navigation">
          <button type="button" onClick={() => changeDay(-1)} aria-label={t('prevDay').primary.text} className="date-arrow"><ChevronLeft size={20} /></button>
          <div className="date-picker-wrap">
            <div className="flex items-center justify-center gap-2">
              <CalendarDays size={16} className="text-primary" aria-hidden="true" />
              <span className="tnum text-base font-bold">{formatDateShort(dateKey)}</span>
            </div>
            <span className="mm block text-center text-xs text-muted">{formatWeekdayMy(dateKey)} · {formatDateMy(dateKey)}</span>
            <input type="date" value={dateKey} onChange={(event) => { if (isDateKey(event.target.value)) setDateKey(event.target.value) }} aria-label={t('pickDate').primary.text} className="date-picker-input" />
          </div>
          <button type="button" onClick={() => changeDay(1)} aria-label={t('nextDay').primary.text} className="date-arrow"><ChevronRight size={20} /></button>
        </div>
        <div className="daily-summary" aria-busy={loading}>
          <div className="daily-summary-main">
            <div className="flex items-center gap-2 text-sm text-white/85"><CircleDollarSign size={16} aria-hidden="true" /><T k="total" subClassName="ml-2 text-xs text-white/65" /></div>
            <div className="daily-total tnum">{loading || error ? '—' : formatKs(total)}</div>
            <button type="button" onClick={() => setDateKey(todayKey())} disabled={isToday} className="summary-today">{t('today').primary.text}{isToday && <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-[#cadfc9]" />}</button>
          </div>
          <div className="daily-count">
            <Users size={19} aria-hidden="true" />
            <span className="tnum text-3xl font-semibold">{loading || error ? '—' : visits.length}</span>
            <T k="visits" className="text-xs text-white/85" subClassName="block text-[11px] text-white/65" />
          </div>
        </div>
        <PeriodSummary key={summaryRevision} dateKey={dateKey} />
        {/* Search & Filter Bar */}
        {visits.length > 0 && (
          <div className="relative mt-4">
            <Search
              size={17}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type="search"
              aria-label={t('searchPatients').primary.text}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchPlaceholder').primary.text}
              className="w-full rounded-2xl border border-line bg-surface py-2.5 pl-10 pr-10 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted/60"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted transition hover:bg-bg hover:text-ink"
                title={t('clearSearch').primary.text}
              >
                <X size={15} />
              </button>
            )}
          </div>
        )}
      </header>

      {/* Swipeable Daily Visits Section */}
      <section
        key={dateKey}
        className="visit-list-section mt-6 flex-1"
        onTouchStart={(event) => {
          const touch = event.touches[0]
          touchStart.current = { x: touch.clientX, y: touch.clientY }
        }}
        onTouchEnd={(event) => {
          const start = touchStart.current
          touchStart.current = null
          if (!start) return
          const touch = event.changedTouches[0]
          const dx = touch.clientX - start.x
          const dy = touch.clientY - start.y
          if (Math.abs(dx) > 70 && Math.abs(dy) < 60) {
            changeDay(dx < 0 ? 1 : -1)
          }
        }}
      >
        {error && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
            <span className="min-w-0 break-words font-medium">{error}</span>
            <button
              type="button"
              onClick={refresh}
              className="shrink-0 rounded-xl bg-danger px-3.5 py-1.5 text-xs font-semibold text-white transition active:scale-95"
            >
              {t('retry').primary.text}
            </button>
          </div>
        )}

        {loading && !error && (
          <ul className="space-y-3">
            {[0, 1, 2].map((index) => (
              <li
                key={index}
                className="animate-pulse rounded-2xl border border-line bg-surface p-4 card-shadow"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-line" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/3 rounded bg-line" />
                    <div className="h-3 w-1/2 rounded bg-line/60" />
                  </div>
                  <div className="h-5 w-20 rounded bg-line" />
                </div>
              </li>
            ))}
          </ul>
        )}

        {!loading && !error && visits.length === 0 && (
          <div className="empty-ledger">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-soft text-primary shadow-xs">
              <img src="/logo-mark.svg" alt="" width="44" height="44" />
            </div>
            <T
              k="noVisitsTitle"
              className="mt-4 text-base font-bold text-ink"
              subClassName="block text-xs text-muted"
            />
            <T
              k="noVisitsHint"
              className="mt-1 max-w-xs text-xs text-muted"
              subClassName="block text-[11px] text-muted/80"
            />
          </div>
        )}

        {!loading && visits.length > 0 && filteredVisits.length === 0 && (
          <div className="my-8 rounded-2xl border border-line bg-surface p-8 text-center card-shadow">
            <Search size={28} className="mx-auto text-muted/60" />
            <T
              k="noSearchResults"
              className="mt-3 block text-sm font-semibold text-ink"
              subClassName="hidden"
            />
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-3 rounded-xl bg-primary-soft px-3.5 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary hover:text-white"
            >
              {t('clearSearch').primary.text}
            </button>
          </div>
        )}

        {!loading && filteredVisits.length > 0 && (
          <ul className="visit-list">
            {filteredVisits.map((visit) => (
              <li key={visit.id}>
                <button
                  type="button"
                  onClick={() => openEdit(visit)}
                  className="visit-row group"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {/* Patient Queue / Order Avatar */}
                    <div className="visit-number tnum">
                      {visitNumbers.get(visit.id)}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="mm break-words text-[16px] font-semibold text-ink">
                          {visit.patientName}
                        </span>
                        {visit.age != null && (
                          <span className="mm shrink-0 rounded-full bg-surface-hover border border-line px-2 py-0.5 text-[11px] font-medium text-muted">
                            {visit.age} {ageUnit}
                          </span>
                        )}
                      </div>
                      {visit.diagnosis && (
                        <div className="mm mt-1 line-clamp-2 text-[13px] text-muted">
                          {visit.diagnosis}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <div className="tnum text-[15px] font-bold text-ink md:text-base">
                      {formatKs(visit.fee)}
                    </div>
                    <ChevronRightIcon
                      size={16}
                      className="text-muted/40 transition group-hover:translate-x-0.5 group-hover:text-primary"
                    />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Floating Action Button (FAB) */}
      <button
        type="button"
        onClick={openAdd}
        aria-label={addLabel}
        title={addLabel}
        className="add-visit-button no-print"
      >
        <Plus size={24} strokeWidth={2.4} />
        <span className="text-sm font-semibold">{addLabel}</span>
      </button>

      {/* Visit Edit / Create Bottom Sheet or Modal */}
      {sheet.open && (
        <VisitSheet
          dateKey={dateKey}
          existing={sheet.editing}
          onClose={closeSheet}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
