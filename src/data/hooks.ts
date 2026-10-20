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
  const repo = useRepository()
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick((value) => value + 1), [])

  useEffect(() => {
    let cancelled = false
    repo
      .listByDateRange(`${monthKey}-01`, daysOfMonth(monthKey).at(-1)!)
      .then((visits) => {
        if (!cancelled) setLoaded({ key: monthKey, visits, error: null })
      })
      .catch((cause: unknown) => {
        if (!cancelled) setLoaded({ key: monthKey, visits: [], error: toMessage(cause) })
      })
    return () => {
      cancelled = true
    }
  }, [repo, monthKey, tick])

  const current = loaded?.key === monthKey ? loaded : null
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

export function useRecentNames(sinceDate: string): RecentNamesState {
  const repo = useRepository()
  const [names, setNames] = useState<RecentName[]>([])

  useEffect(() => {
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
  }, [repo, sinceDate])

  return { names }
}
