import type { PerformanceRepository } from './repository'
import type { CompletedSession, ImportResult } from './types'
import { isIsoTimestamp, validateCompletedSessionShape } from './validation'

export interface PerformanceBackup {
  format: 'quantapit-performance'
  version: 1
  exportedAt: string
  sessions: CompletedSession[]
}

export async function exportPerformanceData(repository: PerformanceRepository): Promise<string> {
  const data = await repository.getValidatedCompletedData()
  if (data.issues.length) throw new Error('Cannot export invalid local performance data. Existing sessions and items must be repaired first.')
  data.validSessions.forEach(validateCompletedSessionShape)
  const backup: PerformanceBackup = {
    format: 'quantapit-performance',
    version: 1,
    exportedAt: new Date().toISOString(),
    sessions: data.validSessions,
  }
  return JSON.stringify(backup, null, 2)
}

export async function importPerformanceData(repository: PerformanceRepository, text: string): Promise<ImportResult> {
  let value: unknown
  try { value = JSON.parse(text) } catch { throw new Error('Invalid backup: the file is not valid JSON.') }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid backup: expected an object.')
  const backup = value as Record<string, unknown>
  if (backup.format !== 'quantapit-performance') throw new Error('Invalid backup: unsupported file format.')
  if (backup.version !== 1) throw new Error('Invalid backup: unsupported backup version.')
  if (!isIsoTimestamp(backup.exportedAt)) throw new Error('Invalid backup: exportedAt must be an ISO date.')
  if (!Array.isArray(backup.sessions)) throw new Error('Invalid backup: sessions must be an array.')
  return repository.importCompletedData(backup.sessions as CompletedSession[])
}
