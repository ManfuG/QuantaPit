import { useId, useRef, useState, type ChangeEvent } from 'react'
import { exportPerformanceData, importPerformanceData } from './backup'
import { performanceRepository } from './repository'
import './SessionTransfer.css'

export function SessionTransfer({ onImported }: { onImported: () => void }) {
  const id = useId()
  const busy = useRef(false)
  const [action, setAction] = useState<'export' | 'import' | null>(null)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  async function exportSessions() {
    if (busy.current) return
    busy.current = true
    setAction('export')
    setStatus('')
    setError('')
    try {
      const text = await exportPerformanceData(performanceRepository())
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
      const link = document.createElement('a')
      try {
        link.href = url
        link.download = `quantapit-sessions-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
        document.body.appendChild(link)
        link.click()
      } finally {
        link.remove()
        // Let the browser start consuming the download before releasing its URL.
        window.setTimeout(() => URL.revokeObjectURL(url), 0)
      }
      setStatus('Session backup download started. Keep the JSON file to restore it on another browser or device.')
    } catch (cause) {
      setError(`Export failed. ${cause instanceof Error ? cause.message : 'The local session backup could not be downloaded.'}`)
    } finally {
      busy.current = false
      setAction(null)
    }
  }

  async function importSessions(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file || busy.current) {
      input.value = ''
      return
    }
    busy.current = true
    setAction('import')
    setStatus('')
    setError('')
    try {
      const text = await file.text()
      const result = await importPerformanceData(performanceRepository(), text)
      setStatus(`Import complete. Sessions imported: ${result.imported}. Identical duplicates skipped: ${result.skipped}.`)
      try {
        onImported()
      } catch {
        setError('The import succeeded, but statistics could not be refreshed. Your imported sessions are saved locally.')
      }
    } catch (cause) {
      setError(`Import failed. ${cause instanceof Error ? cause.message : 'The selected file could not be read or imported.'}`)
    } finally {
      input.value = ''
      busy.current = false
      setAction(null)
    }
  }

  return <section className="session-transfer" aria-labelledby={`${id}-title`}>
    <h2 id={`${id}-title`}>Session backup</h2>
    <p id={`${id}-help`} className="session-transfer-help">Download completed sessions and their items as JSON, then import the file on another browser or device. Everything stays local; no account or upload is needed. Imports add sessions without replacing existing data. Identical duplicates are skipped; invalid or incompatible files and conflicting session IDs are rejected without changes.</p>
    <div className="session-transfer-controls" aria-busy={action !== null}>
      <button type="button" disabled={action !== null} onClick={() => void exportSessions()}>{action === 'export' ? 'Exporting sessions…' : 'Export sessions'}</button>
      <div className="session-transfer-file">
        <label htmlFor={`${id}-file`}>Import sessions</label>
        <input id={`${id}-file`} type="file" accept=".json,application/json" disabled={action !== null} aria-describedby={`${id}-help`} onChange={event => void importSessions(event)} />
      </div>
    </div>
    <p className="session-transfer-status" role="status" aria-atomic="true">{action === 'import' ? 'Importing sessions…' : status}</p>
    {error && <p className="session-transfer-error" role="alert">{error}</p>}
  </section>
}
