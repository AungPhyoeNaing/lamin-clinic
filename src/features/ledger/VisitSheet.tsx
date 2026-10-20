import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { AlertCircle, Clock, Sparkles, X } from 'lucide-react'
import { useRepository, useSettings } from '../../app/providers'
import { useRecentNames } from '../../data/hooks'
import type { Visit, VisitDraft } from '../../data/types'
import { addDays, formatAmount, formatDateMy, formatDateShort, formatKs } from '../../lib/format'
import { T, useI18n } from '../../lib/i18n'
import { Field, inputCls } from '../../components/Field'

interface VisitSheetProps {
  dateKey: string
  existing: Visit | null
  onClose: () => void
  onSaved: (action: 'saved' | 'deleted') => void
  deleteOnly?: boolean
}

const COMMON_FEE_PRESETS = [5000, 10000, 15000, 20000, 30000]

export default function VisitSheet({ dateKey, existing, onClose, onSaved, deleteOnly = false }: VisitSheetProps) {
  const repo = useRepository()
  const { defaultFee } = useSettings()
  const t = useI18n()

  const [name, setName] = useState(existing?.patientName ?? '')
  const [age, setAge] = useState(existing?.age != null ? String(existing.age) : '')
  const [diagnosis, setDiagnosis] = useState(existing?.diagnosis ?? '')
  const [fee, setFee] = useState(
    existing ? String(existing.fee) : defaultFee != null ? String(defaultFee) : '',
  )
  const [nameError, setNameError] = useState<string | null>(null)
  const [ageError, setAgeError] = useState<string | null>(null)
  const [feeError, setFeeError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(deleteOnly)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [confirmingDiscard, setConfirmingDiscard] = useState(false)
  const initialFee = existing ? String(existing.fee) : defaultFee != null ? String(defaultFee) : ''
  const dirty = !deleteOnly && (name !== (existing?.patientName ?? '') || age !== (existing?.age != null ? String(existing.age) : '') || diagnosis !== (existing?.diagnosis ?? '') || fee !== initialFee)
  const requestClose = useCallback(() => {
    if (saving) return
    if (confirmingDiscard) setConfirmingDiscard(false)
    else if (dirty) setConfirmingDiscard(true)
    else onClose()
  }, [saving, confirmingDiscard, dirty, onClose])

  const sinceDate = useMemo(() => addDays(dateKey, -90), [dateKey])
  const { names } = useRecentNames(sinceDate, !deleteOnly)

  const suggestions = useMemo(() => {
    const query = name.trim().toLowerCase()
    if (!query) return []
    return names
      .filter((item) => item.name.toLowerCase().includes(query) && item.name.toLowerCase() !== query)
      .slice(0, 5)
  }, [names, name])

  const nameInputRef = useRef<HTMLInputElement>(null)
  const ageInputRef = useRef<HTMLInputElement>(null)
  const feeInputRef = useRef<HTMLInputElement>(null)
  const keepEditingRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    if (window.matchMedia('(pointer: fine)').matches && nameInputRef.current) nameInputRef.current.focus()
    else dialogRef.current?.focus()
    return () => previous?.focus()
  }, [])

  useEffect(() => {
    if (confirmingDiscard) keepEditingRef.current?.focus()
    else if (window.matchMedia('(pointer: fine)').matches) nameInputRef.current?.focus()
  }, [confirmingDiscard])

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  useEffect(() => {
    const viewport = window.visualViewport
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const resize = () => {
      if (!overlayRef.current) return
      overlayRef.current.style.height = `${viewport?.height ?? window.innerHeight}px`
      overlayRef.current.style.top = `${viewport?.offsetTop ?? 0}px`
    }
    resize()
    viewport?.addEventListener('resize', resize)
    viewport?.addEventListener('scroll', resize)
    window.addEventListener('resize', resize)
    return () => {
      document.body.style.overflow = previousOverflow
      viewport?.removeEventListener('resize', resize)
      viewport?.removeEventListener('scroll', resize)
      window.removeEventListener('resize', resize)
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); requestClose() }
      if (event.key === 'Tab') {
        const fields = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), [tabindex="0"]')
        if (!fields?.length) { event.preventDefault(); return }
        const first = fields[0]
        const last = fields[fields.length - 1]
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { event.preventDefault(); last.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [requestClose])

  const quickPresets = useMemo(() => {
    const list = defaultFee != null && !COMMON_FEE_PRESETS.includes(defaultFee)
      ? [defaultFee, ...COMMON_FEE_PRESETS]
      : COMMON_FEE_PRESETS
    return list
  }, [defaultFee])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    const trimmedName = name.trim()
    const parsedAge = age.trim() === '' ? null : Number(age)
    const parsedFee = Number(fee)

    let invalid = false
    if (!trimmedName) {
      setNameError(t('required').primary.text)
      invalid = true
    } else {
      setNameError(null)
    }
    if (parsedAge != null && (!Number.isInteger(parsedAge) || parsedAge < 0 || parsedAge > 130)) {
      setAgeError(t('invalidAge').primary.text)
      invalid = true
    } else {
      setAgeError(null)
    }
    if (fee.trim() === '' || !Number.isFinite(parsedFee) || parsedFee < 0) {
      setFeeError(t('invalidAmount').primary.text)
      invalid = true
    } else {
      setFeeError(null)
    }
    if (invalid) {
      if (!trimmedName) nameInputRef.current?.focus()
      else if (parsedAge != null && (!Number.isInteger(parsedAge) || parsedAge < 0 || parsedAge > 130)) ageInputRef.current?.focus()
      else feeInputRef.current?.focus()
      return
    }

    setSaving(true)
    setSaveError(null)
    try {
      const draft: VisitDraft = {
        date: dateKey,
        patientName: trimmedName,
        age: parsedAge,
        diagnosis,
        fee: parsedFee,
      }
      await repo.saveVisit(draft, existing ?? undefined)
      onSaved('saved')
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : String(cause))
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!existing || saving) return
    if (!confirmingDelete) {
      setConfirmingDelete(true)
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      await repo.deleteVisit(existing.id)
      onSaved('deleted')
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : String(cause))
      setSaving(false)
      setConfirmingDelete(deleteOnly)
    }
  }

  const feeNumber = Number(fee)
  const showFeePreview = fee.trim() !== '' && Number.isFinite(feeNumber)

  return (
    <div ref={overlayRef} className="visit-overlay no-print">
      {/* Backdrop */}
      <div
        className="animate-fade-in absolute inset-0 bg-ink/40 backdrop-blur-xs transition-opacity"
        onClick={requestClose}
        aria-hidden="true"
      />

      {/* Sheet on mobile, centered modal on desktop */}
      <div
        role="dialog"
        ref={dialogRef}
        tabIndex={-1}
        aria-label={t(confirmingDiscard ? 'discardTitle' : deleteOnly ? 'deleteRecord' : existing ? 'editVisit' : 'addVisit').primary.text}
        aria-modal="true"
        aria-busy={saving}
        className="visit-sheet animate-sheet-up md:animate-scale-up"
      >
        {/* Mobile drag handle indicator */}
        <div className="mx-auto h-1.5 w-12 rounded-full bg-line md:hidden" />

        {/* Dialog Header */}
        <div className="sheet-heading flex items-center justify-between gap-3">
          <div>
            <T
              k={confirmingDiscard ? 'discardTitle' : deleteOnly ? 'deleteRecord' : existing ? 'editVisit' : 'addVisit'}
              className="text-lg font-bold tracking-tight text-ink md:text-xl"
              subClassName="block text-sm text-muted"
            />
          </div>
          <button
            type="button"
            onClick={requestClose}
            disabled={saving}
            aria-label={t('close').primary.text}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-line bg-surface text-muted transition hover:bg-surface-hover hover:text-ink active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        {confirmingDiscard ? (
          <div className="mt-5 space-y-5">
            <p className="text-base leading-relaxed text-ink"><T k="discardHint" subClassName="block mt-2 text-sm text-muted" /></p>
            <div className="grid gap-3 sm:grid-cols-2">
              <button ref={keepEditingRef} type="button" onClick={() => setConfirmingDiscard(false)} className="min-h-12 rounded-xl bg-primary px-4 py-3 font-semibold text-white">{t('keepEditing').primary.text}</button>
              <button type="button" onClick={onClose} className="min-h-12 rounded-xl border border-danger/30 px-4 py-3 font-semibold text-danger">{t('discardChanges').primary.text}</button>
            </div>
          </div>
        ) : deleteOnly ? (
          <div className="mt-5 space-y-4">
            <p className="mm break-words text-lg font-semibold text-ink">{existing?.patientName}</p>
            <p className="tnum text-sm text-muted">{formatDateShort(dateKey)} · {formatKs(existing?.fee ?? 0)}</p>
            <p className="text-sm text-danger"><T k="confirmDelete" subClassName="block mt-1 text-xs" /></p>
            {saveError && <p role="alert" className="break-words rounded-xl bg-danger-soft p-3 text-sm text-danger">{saveError}</p>}
            <div className="flex flex-wrap gap-3">
              <button type="button" disabled={saving} onClick={onClose} className="min-h-11 flex-1 rounded-xl border border-line bg-surface px-4 py-3 text-sm font-semibold disabled:opacity-60">{t('cancel').primary.text}</button>
              <button type="button" disabled={saving} onClick={() => void handleDelete()} className="min-h-11 flex-1 rounded-xl bg-danger px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{t(saving ? 'deleting' : 'confirmDeleteAction').primary.text}</button>
            </div>
          </div>
        ) : <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <fieldset disabled={saving} className="min-w-0 space-y-4">
          <div className="record-date-note"><T k="recordDate" subClassName="hidden" /><strong>{formatDateShort(dateKey)}</strong><span className="mm">{formatDateMy(dateKey)}</span></div>
          <p className="text-sm text-muted"><T k="requiredFields" subClassName="hidden" /></p>
          {/* Patient Name with Auto-complete */}
          <div className="relative">
            <Field k="patientName" error={nameError}>
              <input
                ref={nameInputRef}
                name="patientName"
                aria-required="true"
                aria-invalid={!!nameError}
                className={inputCls}
                value={name}
                placeholder={t('patientPlaceholder').primary.text}
                autoComplete="off"
                enterKeyHint="next"
                onChange={(event) => {
                  setName(event.target.value)
                  setShowSuggestions(true)
                  if (nameError) setNameError(null)
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => {
                  window.setTimeout(() => setShowSuggestions(false), 200)
                }}
              />
            </Field>

            {/* Suggestions Popover */}
            {showSuggestions && suggestions.length > 0 && (
              <ul className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-2xl border border-line bg-surface shadow-xl">
                <li className="border-b border-line/60 bg-surface-soft px-3.5 py-1.5 text-[10px] font-semibold text-muted">
                  <span className="flex items-center gap-1.5">
                    <Clock size={11} />
                    <span>{t('recentPatients').primary.text}</span>
                  </span>
                </li>
                {suggestions.map((suggestion) => (
                  <li key={suggestion.name}>
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setName(suggestion.name)
                        if (suggestion.age != null && age.trim() === '') {
                          setAge(String(suggestion.age))
                        }
                        setShowSuggestions(false)
                      }}
                      className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm transition hover:bg-primary-soft/60"
                    >
                      <span className="mm truncate font-medium text-ink">{suggestion.name}</span>
                      {suggestion.age != null && (
                        <span className="tnum shrink-0 rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-primary border border-line">
                          {suggestion.age} {t('ageUnit').primary.text}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Age & Fee Inputs */}
          <div className="visit-fields-row grid grid-cols-2 gap-3">
            <Field k="age" error={ageError} optional>
              <input
                className={`${inputCls} tnum`}
                ref={ageInputRef}
                name="age"
                autoComplete="off"
                aria-invalid={!!ageError}
                value={age}
                inputMode="numeric"
                placeholder="—"
                onChange={(event) => {
                  setAge(event.target.value.replace(/[^0-9]/g, ''))
                  if (ageError) setAgeError(null)
                }}
              />
            </Field>

            <div>
              <Field k="fee" error={feeError}>
                <div className="relative">
                  <input
                    className={`${inputCls} tnum pr-14 font-semibold`}
                    ref={feeInputRef}
                    name="fee"
                    autoComplete="off"
                    aria-required="true"
                    aria-invalid={!!feeError}
                    value={fee}
                    inputMode="numeric"
                    placeholder="0"
                    onChange={(event) => {
                      setFee(event.target.value.replace(/[^0-9]/g, ''))
                      if (feeError) setFeeError(null)
                    }}
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted">
                    Ks
                  </span>
                </div>
              </Field>
              {showFeePreview && (
                <div className="tnum mt-1 text-right text-[11px] font-semibold text-primary">
                  {formatKs(feeNumber)}
                </div>
              )}
            </div>
          </div>

          {/* Quick Fee Presets */}
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-muted">
              <Sparkles size={12} className="text-primary" />
              <T k="quickFeePresets" subClassName="hidden" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {quickPresets.map((preset) => {
                const isSelected = fee === String(preset)
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setFee(String(preset))
                      setFeeError(null)
                    }}
                    className={`tnum rounded-xl border px-2.5 py-1 text-xs font-semibold transition-all ${
                      isSelected
                        ? 'border-primary bg-primary text-white shadow-xs'
                        : 'border-line bg-surface text-ink hover:border-line-strong hover:bg-surface-hover'
                    }`}
                  >
                    {formatAmount(preset)}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Diagnosis / Notes */}
          <Field k="diagnosis" optional>
            <textarea
              className={`${inputCls} resize-none`}
              name="diagnosis"
              autoComplete="off"
              rows={2}
              value={diagnosis}
              placeholder={t('diagnosisPlaceholder').primary.text}
              onChange={(event) => setDiagnosis(event.target.value)}
            />
          </Field>

          {/* Error Message */}
          {saveError && (
            <div role="alert" className="flex items-center gap-2 rounded-2xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
              <AlertCircle size={16} className="shrink-0" />
              <span className="min-w-0 break-words font-medium">{saveError}</span>
            </div>
          )}

          {/* Save Button */}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-2xl bg-primary py-3.5 text-white shadow-md shadow-primary/20 transition hover:bg-primary-strong active:scale-95 disabled:opacity-60"
          >
            <T
              k={saving ? 'saving' : 'saveRecord'}
              className="text-[15px] font-bold"
              subClassName="block text-[10px] font-normal text-white/80"
            />
          </button>

          {/* Delete Button / Confirmation */}
          {existing && (
            <div className="pt-1">
              {confirmingDelete ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    className="flex-1 rounded-2xl border border-line bg-surface py-2.5 text-xs font-semibold text-ink transition hover:bg-surface-hover"
                  >
                    {t('cancel').primary.text}
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={saving}
                    className="flex-1 rounded-2xl bg-danger py-2.5 text-xs font-semibold text-white shadow-xs transition hover:opacity-90 disabled:opacity-60"
                  >
                    {t('confirmDeleteAction').primary.text}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  disabled={saving}
                  className="w-full rounded-2xl py-2.5 text-center text-xs font-semibold text-danger transition hover:bg-danger-soft"
                >
                  {t('delete').primary.text}
                </button>
              )}
            </div>
          )}
          </fieldset>
        </form>}
      </div>
    </div>
  )
}
