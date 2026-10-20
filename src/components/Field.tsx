import type { ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { T, type TKey } from '../lib/i18n'

export const inputCls =
  'w-full min-h-12 rounded-xl border border-line bg-surface px-4 py-3 text-base text-ink outline-none transition-colors duration-150 focus:border-primary focus:ring-3 focus:ring-primary/15 placeholder:text-muted/70 hover:border-line-strong'

interface FieldProps {
  k: TKey
  children: ReactNode
  error?: string | null
}

export function Field({ k, children, error }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline gap-1.5">
        <T k={k} className="text-sm font-medium text-ink" subClassName="text-[11px] text-muted" />
      </span>
      {children}
      {error && (
        <span className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-danger">
          <AlertCircle size={13} className="shrink-0" />
          <span>{error}</span>
        </span>
      )}
    </label>
  )
}
