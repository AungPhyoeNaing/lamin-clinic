import { useCallback, useEffect, useState } from 'react'
import { useRepository } from '../app/providers'
import type { RecentName, Visit } from './types'
import { daysOfMonth } from '../lib/format'

export interface VisitsState {
  visits: Visit[]
  loading: boolean
  error: string | null
  refresh: () => void
}

interface Loaded {
  key: string
  visits: Visit[]
  error: string | null
}

function toMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause)
}

export function useDayVisits(date: string): VisitsState {
  const repo = useRepository()
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick((value) => value + 1), [])

  useEffect(() => {
    let cancelled = false
    repo
      .listByDate(date)
      .then((visits) => {
        if (!cancelled) setLoaded({ key: date, visits, error: null })
      })
      .catch((cause: unknown) => {
        if (!cancelled) setLoaded({ key: date, visits: [], error: toMessage(cause) })
      })
    return () => {
      cancelled = true
    }
  }, [repo, date, tick])

  const current = loaded?.key === date ? loaded : null
  return {
    visits: current?.visits ?? [],
    loading: current === null,
    error: current?.error ?? null,
    refresh,
  }
}

export function useMonthVisits(monthKey: string): VisitsState {
  return useRangeVisits(`${monthKey}-01`, daysOfMonth(monthKey).at(-1)!)
}

export function useRangeVisits(from: string, to: string): VisitsState {
  const repo = useRepository()
  const rangeKey = `${from}/${to}`
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick((value) => value + 1), [])

  useEffect(() => {
    let cancelled = false
    repo
      .listByDateRange(from, to)
      .then((visits) => {
        if (!cancelled) setLoaded({ key: rangeKey, visits, error: null })
      })
      .catch((cause: unknown) => {
        if (!cancelled) setLoaded({ key: rangeKey, visits: [], error: toMessage(cause) })
      })
    return () => {
      cancelled = true
    }
  }, [repo, from, to, rangeKey, tick])

  const current = loaded?.key === rangeKey ? loaded : null
  return {
    visits: current?.visits ?? [],
    loading: current === null,
    error: current?.error ?? null,
    refresh,
  }
}

export interface RecentNamesState {
  names: RecentName[]
}

export function useRecentNames(sinceDate: string, enabled = true): RecentNamesState {
  const repo = useRepository()
  const [names, setNames] = useState<RecentName[]>([])

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    repo
      .listRecentNames(sinceDate)
      .then((result) => {
        if (!cancelled) setNames(result)
      })
      .catch(() => {
        // suggestions are a convenience — ignore failures
      })
    return () => {
      cancelled = true
    }
  }, [repo, sinceDate, enabled])

  return { names }
}
