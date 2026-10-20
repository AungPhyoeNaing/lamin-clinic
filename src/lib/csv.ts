import type { Visit } from '../data/types'

function escapeCell(value: string): string {
  if (/^\s*[=+@-]|^[\t\r\n]/.test(value)) value = `'${value}`
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function visitsToCsv(visits: Visit[]): string {
  const lines = ['Date,Patient,Age,Diagnosis,Fee (Ks)']
  for (const visit of visits) {
    lines.push(
      [
        visit.date,
        escapeCell(visit.patientName),
        visit.age == null ? '' : String(visit.age),
        escapeCell(visit.diagnosis),
        String(visit.fee),
      ].join(','),
    )
  }
  return lines.join('\r\n')
}

export function downloadTextFile(filename: string, text: string, mimeType = 'text/plain'): void {
  const blob = new Blob([text], { type: `${mimeType};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
