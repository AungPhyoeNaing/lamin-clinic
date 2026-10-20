import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  FileSpreadsheet,
  Printer,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useMonthVisits } from '../../data/hooks'
import { downloadTextFile, visitsToCsv } from '../../lib/csv'
import {
  addMonths,
  daysOfMonth,
  formatDateShort,
  formatDayShortEn,
  formatKs,
  formatMonthEn,
  formatMonthMy,
  todayKey,
} from '../../lib/format'
import { T, useI18n } from '../../lib/i18n'
import { summarizeByDay, totalFees } from '../../lib/summary'

export default function ReportsScreen() {
  const [monthKey, setMonthKey] = useState(() => todayKey().slice(0, 7))
  const [hoveredDay, setHoveredDay] = useState<string | null>(null)
  const { visits, loading, error, refresh } = useMonthVisits(monthKey)
  const navigate = useNavigate()
  const t = useI18n()

  const days = useMemo(() => daysOfMonth(monthKey), [monthKey])
  const byDay = useMemo(() => summarizeByDay(visits), [visits])
  const dayMap = useMemo(() => new Map(byDay.map((day) => [day.date, day])), [byDay])
  const total = useMemo(() => totalFees(visits), [visits])
  const maxTotal = useMemo(() => Math.max(1, ...byDay.map((day) => day.total)), [byDay])
  const avg = visits.length > 0 ? Math.round(total / visits.length) : 0
  const currentMonth = todayKey().slice(0, 7)
  const today = todayKey()

  function exportCsv() {
    downloadTextFile(
      `la-min-clinic-${monthKey}.csv`,
      '\uFEFF' + visitsToCsv(visits),
      'text/csv',
    )
  }

  const activeSummary = hoveredDay ? dayMap.get(hoveredDay) : null

  return (
    <div className="screen reports-screen">
      <div className="no-print">
        {/* Header with Title and Month Controls */}
        <header className="rounded-3xl border border-line bg-surface p-4 card-shadow md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1>
              <T
                k="reports"
                className="text-xl font-bold tracking-tight text-ink md:text-2xl"
                subClassName="block text-xs text-muted"
              />
              </h1>
            </div>

            {/* Month Navigation Control */}
            <div className="month-control flex items-center gap-1.5 rounded-2xl border border-line bg-surface-soft p-1">
              <button
                type="button"
                onClick={() => setMonthKey((current) => addMonths(current, -1))}
                aria-label={t('prevMonth').primary.text}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-muted transition hover:bg-surface hover:text-ink active:scale-95"
              >
                <ChevronLeft size={18} />
              </button>

              <button
                type="button"
                onClick={() => setMonthKey(currentMonth)}
                title={t('today').primary.text}
                className="flex flex-col items-center rounded-xl px-4 py-1 text-center transition hover:bg-surface"
              >
                <span className="text-sm font-bold text-ink">{formatMonthEn(monthKey)}</span>
                <span className="mm text-sm leading-tight text-muted">
                  {formatMonthMy(monthKey)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setMonthKey((current) => addMonths(current, 1))}
                aria-label={t('nextMonth').primary.text}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-muted transition hover:bg-surface hover:text-ink active:scale-95"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
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

          {/* 4-Metric Stats Grid */}
          <div className="report-metrics mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4 md:gap-3">
            <div className="report-metric-total rounded-2xl border border-line/80 bg-surface-soft p-3.5">
              <div className="flex items-center justify-between text-muted">
                <span className="text-sm font-medium">
                  <T k="monthTotal" subClassName="hidden" />
                </span>
                <CircleDollarSign size={16} className="text-primary" />
              </div>
              <div className="tnum mt-1 text-xl font-bold tracking-tight text-primary-strong md:text-2xl">
                {loading || error ? '—' : formatKs(total)}
              </div>
            </div>

            <div className="rounded-2xl border border-line/80 bg-surface-soft p-3.5">
              <div className="flex items-center justify-between text-muted">
                <span className="text-sm font-medium">
                  <T k="selectedDayVisits" subClassName="hidden" />
                </span>
                <Users size={16} className="text-primary" />
              </div>
              <div className="tnum mt-1 text-xl font-bold tracking-tight text-ink md:text-2xl">
                {loading || error ? '—' : visits.length}
              </div>
            </div>

            <div className="rounded-2xl border border-line/80 bg-surface-soft p-3.5">
              <div className="flex items-center justify-between text-muted">
                <span className="text-sm font-medium">
                  <T k="activeDays" subClassName="hidden" />
                </span>
                <CalendarCheck size={16} className="text-primary" />
              </div>
              <div className="tnum mt-1 text-xl font-bold tracking-tight text-ink md:text-2xl">
                {loading || error ? '—' : byDay.length}
              </div>
            </div>

            <div className="rounded-2xl border border-line/80 bg-surface-soft p-3.5">
              <div className="flex items-center justify-between text-muted">
                <span className="text-sm font-medium">
                  <T k="avgPerVisit" subClassName="hidden" />
                </span>
                <TrendingUp size={16} className="text-primary" />
              </div>
              <div className="tnum mt-1 text-xl font-bold tracking-tight text-ink md:text-2xl">
                {loading || error ? '—' : formatKs(avg)}
              </div>
            </div>
          </div>

          {/* Interactive Daily Revenue Chart */}
          {!loading && !error && <details className="report-chart mt-4 rounded-2xl border border-line bg-surface p-4">
            <summary className="cursor-pointer text-sm font-semibold text-primary"><T k="dailyRevenue" subClassName="hidden" /></summary>
            <div className="flex flex-col items-start gap-2 pb-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs font-semibold text-muted">
                {t('dailyRevenue').primary.text} ({formatMonthEn(monthKey)})
              </span>
              {activeSummary ? (
                <span className="tnum rounded-lg bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">
                  {formatDateShort(activeSummary.date)}: {formatKs(activeSummary.total)} ({activeSummary.count} visits)
                </span>
              ) : (
                <span className="text-xs text-muted">{t('openDay').primary.text}</span>
              )}
            </div>

            <div className="overflow-x-auto pb-2">
            <div className="report-bars flex h-28 items-end gap-[3px] pt-2" style={{ minWidth: days.length * 32 }}>
              {days.map((day) => {
                const summary = dayMap.get(day)
                const height = summary ? Math.max(8, Math.round((summary.total / maxTotal) * 100)) : 0
                const isSelected = hoveredDay === day
                const isCurrent = day === today

                return (
                  <button
                    key={day}
                    type="button"
                    aria-label={`${formatDateShort(day)}: ${formatKs(summary?.total ?? 0)}`}
                    onFocus={() => setHoveredDay(day)}
                    onBlur={() => setHoveredDay(null)}
                    onMouseEnter={() => setHoveredDay(day)}
                    onMouseLeave={() => setHoveredDay(null)}
                    onClick={() => navigate(`/admin?date=${day}`)}
                    className="group relative flex h-full min-w-0 flex-1 flex-col justify-end"
                  >
                    <div
                      className={`w-full rounded-t-md transition-colors duration-150 ${
                        summary
                          ? isSelected
                            ? 'bg-primary-strong ring-2 ring-primary/40'
                            : isCurrent
                              ? 'bg-primary'
                              : 'bg-primary/75 hover:bg-primary'
                          : 'bg-line hover:bg-line-strong'
                      }`}
                      style={{ height: summary ? `${height}%` : '4px' }}
                    />
                  </button>
                )
              })}
            </div>
            </div>

            <div className="tnum mt-2.5 flex justify-between border-t border-line/60 pt-2 text-[10px] font-medium text-muted">
              <span>{t('dayOfMonth').primary.text} 1</span>
              <span>{t('dayOfMonth').primary.text} {Math.round(days.length / 2)}</span>
              <span>{t('dayOfMonth').primary.text} {days.length}</span>
            </div>
          </details>}

          {/* Action Export and Print Buttons */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={exportCsv}
              disabled={loading || !!error}
              className="flex items-center justify-center gap-2 rounded-2xl border border-line bg-surface px-3 py-3 text-sm font-semibold text-ink transition-colors hover:border-line-strong hover:bg-surface-hover disabled:opacity-50"
            >
              <FileSpreadsheet size={17} className="text-primary" />
              <T k="exportCsv" className="text-sm font-semibold" subClassName="hidden" />
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              disabled={loading || !!error}
              className="flex items-center justify-center gap-2 rounded-2xl border border-line bg-surface py-3 text-sm font-semibold text-ink shadow-xs transition hover:border-line-strong hover:bg-surface-hover active:scale-95"
            >
              <Printer size={17} className="text-primary" />
              <T k="print" className="text-sm font-semibold" subClassName="hidden" />
            </button>
          </div>
        </header>

        {/* Daily Breakdown List */}
        <section className="mt-5">
          {loading && (
            <div className="space-y-2.5">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className="h-14 animate-pulse rounded-2xl border border-line bg-surface card-shadow"
                />
              ))}
            </div>
          )}

          {!loading && !error && byDay.length === 0 && (
            <div className="rounded-3xl border border-line bg-surface p-10 text-center card-shadow">
              <Calendar size={28} className="mx-auto text-muted/60" />
              <T
                k="noDataMonth"
                className="mt-3 block text-sm font-semibold text-muted"
                subClassName="hidden"
              />
            </div>
          )}

          {!loading && !error && byDay.length > 0 && (
            <div className="overflow-hidden rounded-3xl border border-line bg-surface card-shadow">
              <div className="border-b border-line bg-surface-soft px-4 py-3 text-xs font-semibold text-muted">
                {t('dailyBreakdown').primary.text} ({byDay.length} {t('activeDays').primary.text})
              </div>
              <ul className="divide-y divide-line">
                {[...byDay].reverse().map((day) => (
                  <li key={day.date}>
                    <button
                      type="button"
                      onClick={() => navigate(`/admin?date=${day.date}`)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-surface-hover active:bg-surface-hover"
                    >
                      <div className="flex items-center gap-3">
                        <span className="tnum text-sm font-bold text-ink">
                          {formatDayShortEn(day.date)}
                        </span>
                        <span className="rounded-full bg-surface-soft px-2.5 py-0.5 text-sm font-medium text-muted border border-line">
                          {day.count} {t('entries').primary.text}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="tnum text-sm font-bold text-ink md:text-base">
                          {formatKs(day.total)}
                        </span>
                        <ChevronRight size={16} className="text-muted/40" />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      {/* Print Paper Summary (Visible Only When Printing) */}
      <div className="print-only px-2 py-4">
        <h1 className="text-xl font-bold">La Min Clinic — လမင်း ဆေးခန်း</h1>
        <p className="mm text-sm text-muted">မန္တလေး · Mandalay</p>
        <h2 className="mt-5 text-base font-semibold">
          {formatMonthEn(monthKey)} — Monthly report
        </h2>
        <p className="mt-1 text-sm">
          Total: {formatKs(total)} · Visits: {visits.length} · Active days: {byDay.length}
        </p>

        <table className="print-table mt-3">
          <thead>
            <tr>
              <th>Date</th>
              <th>Visits</th>
              <th>Total (Ks)</th>
            </tr>
          </thead>
          <tbody>
            {byDay.map((day) => (
              <tr key={day.date}>
                <td>{formatDateShort(day.date)}</td>
                <td>{day.count}</td>
                <td>{day.total.toLocaleString('en-US')}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3 className="mt-5 text-sm font-semibold">All entries</h3>
        <table className="print-table mt-2">
          <thead>
            <tr>
              <th>Date</th>
              <th>Patient</th>
              <th>Age</th>
              <th>Diagnosis</th>
              <th>Fee (Ks)</th>
            </tr>
          </thead>
          <tbody>
            {visits.map((visit) => (
              <tr key={visit.id}>
                <td>{formatDateShort(visit.date)}</td>
                <td>{visit.patientName}</td>
                <td>{visit.age ?? ''}</td>
                <td>{visit.diagnosis}</td>
                <td>{visit.fee.toLocaleString('en-US')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
