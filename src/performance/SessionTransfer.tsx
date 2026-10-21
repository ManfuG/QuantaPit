import { useId, useRef, useState, type ChangeEvent } from 'react'
import { exportPerformanceData, importPerformanceData } from './backup'
import { performanceRepository } from './repository'
import { exportSessionFile } from '../platform'
import { Capacitor } from '@capacitor/core'
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
      const saved = await exportSessionFile(text)
      if (saved) {
        setStatus(Capacitor.getPlatform() === 'android'
          ? 'Session backup saved. Keep the JSON file to restore it on another browser or device.'
          : 'Session backup download started. Keep the JSON file to restore it on another browser or device.')
      }
    } catch (cause) {
      setError(`Export failed. ${cause instanceof Error ? cause.message : 'The local session backup could not be saved.'}`)
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
    <p id={`${id}-help`} className="session-transfer-help">Save completed sessions and their items as JSON, then import the file on another browser or device. Everything stays local; no account or upload is needed. Imports add sessions without replacing existing data. Identical duplicates are skipped; invalid or incompatible files and conflicting session IDs are rejected without changes.</p>
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
