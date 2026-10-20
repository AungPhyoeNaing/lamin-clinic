import { CircleDollarSign, Users } from 'lucide-react'
import { useRangeVisits } from '../../data/hooks'
import { formatDateShort, formatKs } from '../../lib/format'
import { T, useI18n } from '../../lib/i18n'
import { dashboardPeriods, summarizePeriod } from '../../lib/summary'

export default function PeriodSummary({ dateKey }: { dateKey: string }) {
  const periods = dashboardPeriods(dateKey)
  const { visits, loading, error, refresh } = useRangeVisits(periods.from, periods.to)
  const t = useI18n()
  const summaries = [
    { key: 'week', title: 'weeklySummary', incomeLabel: 'weeklyIncome', patientsLabel: 'weeklyPatients', from: periods.weekStart, to: periods.weekEnd },
    { key: 'month', title: 'monthlySummary', incomeLabel: 'monthlyIncome', patientsLabel: 'monthlyPatients', from: periods.monthStart, to: periods.monthEnd },
  ] as const

  return (
    <div className="mt-4">
      <div className="grid gap-3 md:grid-cols-2">
        {summaries.map(({ key, title, incomeLabel, patientsLabel, from, to }) => {
          const summary = summarizePeriod(visits, from, to)
          return (
            <section key={key} aria-label={t(title).primary.text} aria-busy={loading} className="min-w-0 rounded-2xl border border-line bg-surface p-4">
              <h2 className="text-sm font-semibold text-ink"><T k={title} subClassName="ml-2 text-sm font-normal text-muted" /></h2>
              <p className="mt-1 text-sm text-muted">{formatDateShort(from)} – {formatDateShort(to)}</p>
              <dl className="mt-4 space-y-3">
                <div>
                  <dt className="flex items-center gap-2 text-sm text-muted"><CircleDollarSign size={15} aria-hidden="true" /><T k={incomeLabel} subClassName="hidden" /></dt>
                  <dd className="tnum mt-1 break-words text-2xl font-semibold text-primary">{loading || error ? '—' : formatKs(summary.income)}</dd>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                  <dt className="flex items-center gap-2 text-sm text-muted"><Users size={15} aria-hidden="true" /><T k={patientsLabel} subClassName="hidden" /></dt>
                  <dd className="tnum text-xl font-semibold text-ink">{loading || error ? '—' : summary.patients.toLocaleString('en-US')}</dd>
                </div>
              </dl>
            </section>
          )
        })}
      </div>
      {error && (
        <div role="alert" className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
          <span className="min-w-0 break-words">{error}</span>
          <button type="button" onClick={refresh} className="min-h-11 shrink-0 rounded-xl bg-danger px-3 text-sm font-semibold text-white">{t('retry').primary.text}</button>
        </div>
      )}
      <p className="mt-2 text-sm text-muted"><T k="patientCountHint" subClassName="block" /></p>
    </div>
  )
}
