import type { AttemptMarker, CompletedSession, DataQualityIssue, SessionFilters, SessionItem, SessionResult, ValidatedCompletedData } from './types'
import { normalizeSession, stableStringify, validateCompletedSession } from './validation'

export interface PerformanceRepository {
  complete(value: CompletedSession): Promise<void>
  getCompletedSessions(filters?: SessionFilters): Promise<SessionResult[]>
  getSession(sessionId: string): Promise<CompletedSession | null>
  getCompletedData(filters?: SessionFilters): Promise<CompletedSession[]>
  getValidatedCompletedData(filters?: SessionFilters): Promise<ValidatedCompletedData>
  startAttempt(attempt: AttemptMarker): Promise<void>
  getAttempts(): Promise<AttemptMarker[]>
}

function matches(session: SessionResult, filters: SessionFilters) {
  return (!filters.gameId || session.gameId === filters.gameId)
    && (!filters.from || session.completedAt >= filters.from)
    && (!filters.to || session.completedAt <= filters.to)
}

export class InMemoryPerformanceRepository implements PerformanceRepository {
  private readonly data = new Map<string, CompletedSession>()
  private readonly attempts = new Map<string, AttemptMarker>()
  async complete(value: CompletedSession) {
    validateCompletedSession(value)
    const existing = this.data.get(value.session.sessionId)
    if (existing) {
      if (stableStringify(existing) !== stableStringify(value)) throw new Error('Performance integrity conflict')
      return
    }
    this.data.set(value.session.sessionId, structuredClone(value))
    const attempt = this.attempts.get(value.session.sessionId); this.attempts.set(value.session.sessionId, attempt ? { ...attempt, state: 'completed' } : { sessionId: value.session.sessionId, gameId: value.session.gameId, startedAt: value.session.startedAt, difficulty: value.session.difficulty, config: value.session.config, plannedDurationMs: value.session.plannedDurationMs, plannedItemCount: value.session.plannedItemCount, state: 'completed' })
  }
  async startAttempt(attempt: AttemptMarker) { if (!this.attempts.has(attempt.sessionId)) this.attempts.set(attempt.sessionId, structuredClone(attempt)) }
  async getAttempts() { return [...this.attempts.values()].map(attempt => structuredClone(attempt)) }
  async getCompletedSessions(filters: SessionFilters = {}) {
    return [...this.data.values()].map(value => value.session).filter(session => matches(session, filters)).sort((a, b) => b.completedAt.localeCompare(a.completedAt)).map(session => structuredClone(session))
  }
  async getSession(sessionId: string) { const value = this.data.get(sessionId); return value ? structuredClone(value) : null }
  async getCompletedData(filters: SessionFilters = {}) { return [...this.data.values()].filter(value => matches(value.session, filters)).sort((a, b) => b.session.completedAt.localeCompare(a.session.completedAt)).map(value => structuredClone(value)) }
  async getValidatedCompletedData(filters: SessionFilters = {}) { return { validSessions: await this.getCompletedData(filters), issues: [] } }
}

const DB_NAME = 'quantapit-performance'
const DB_VERSION = 5
const SESSIONS = 'sessions'; const ITEMS = 'sessionItems'; const METADATA = 'metadata'; const ATTEMPTS = 'attempts'

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error) })
}
function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => { transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error); transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted')) })
}
function ensureIndex(store: IDBObjectStore, name: string, keyPath: string | string[]) { if (!store.indexNames.contains(name)) store.createIndex(name, keyPath) }
export function openPerformanceDatabase(name = DB_NAME): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result; const tx = request.transaction!
      const sessions = db.objectStoreNames.contains(SESSIONS) ? tx.objectStore(SESSIONS) : db.createObjectStore(SESSIONS, { keyPath: 'sessionId' })
      ensureIndex(sessions, 'gameId', 'gameId'); ensureIndex(sessions, 'completedAt', 'completedAt'); ensureIndex(sessions, 'gameIdCompletedAt', ['gameId', 'completedAt']); ensureIndex(sessions, 'status', 'status')
      const items = db.objectStoreNames.contains(ITEMS) ? tx.objectStore(ITEMS) : db.createObjectStore(ITEMS, { keyPath: ['sessionId', 'index'] })
      ensureIndex(items, 'sessionId', 'sessionId'); ensureIndex(items, 'gameId', 'gameId'); ensureIndex(items, 'status', 'status')
      const metadata = db.objectStoreNames.contains(METADATA) ? tx.objectStore(METADATA) : db.createObjectStore(METADATA, { keyPath: 'key' }); metadata.put({ key: 'schemaVersion', value: 1 })
      const attempts = db.objectStoreNames.contains(ATTEMPTS) ? tx.objectStore(ATTEMPTS) : db.createObjectStore(ATTEMPTS, { keyPath: 'sessionId' }); ensureIndex(attempts, 'gameId', 'gameId'); ensureIndex(attempts, 'state', 'state'); ensureIndex(attempts, 'startedAt', 'startedAt')
    }
    request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result) }; request.onerror = () => reject(request.error); request.onblocked = () => reject(new Error('Performance storage upgrade blocked'))
  })
}

export class IndexedDbPerformanceRepository implements PerformanceRepository {
  private database?: Promise<IDBDatabase>
  constructor(private readonly databaseName = DB_NAME) {}
  private db() { return this.database ??= openPerformanceDatabase(this.databaseName) }
  async startAttempt(attempt: AttemptMarker) { const db = await this.db(); const tx = db.transaction(ATTEMPTS, 'readwrite'); const store = tx.objectStore(ATTEMPTS); const existing = await requestResult(store.get(attempt.sessionId) as IDBRequest<AttemptMarker | undefined>); if (!existing) store.add(attempt); await transactionDone(tx) }
  async getAttempts() { const db = await this.db(); const read = db.transaction(ATTEMPTS, 'readonly'); const attempts = await requestResult(read.objectStore(ATTEMPTS).getAll() as IDBRequest<AttemptMarker[]>); await transactionDone(read); const cutoff = Date.now() - 2 * 60 * 60 * 1000; const stale = attempts.filter(attempt => attempt.state === 'active' && Date.parse(attempt.startedAt) <= cutoff); const abandoned = new Set<string>(); if (stale.length) { const write = db.transaction(ATTEMPTS, 'readwrite'); const store = write.objectStore(ATTEMPTS); for (const snapshot of stale) { const current = await requestResult(store.get(snapshot.sessionId) as IDBRequest<AttemptMarker | undefined>); if (current?.state === 'active') { store.put({ ...current, state: 'abandoned' }); abandoned.add(current.sessionId) } } await transactionDone(write) } return attempts.map(attempt => abandoned.has(attempt.sessionId) ? { ...attempt, state: 'abandoned' as const } : attempt).sort((a, b) => b.startedAt.localeCompare(a.startedAt)) }
  async complete(value: CompletedSession) {
    validateCompletedSession(value)
    const db = await this.db(); const tx = db.transaction([SESSIONS, ITEMS, ATTEMPTS], 'readwrite'); const store = tx.objectStore(SESSIONS)
    const existing = await requestResult(store.get(value.session.sessionId) as IDBRequest<SessionResult | undefined>)
    if (existing) {
      const existingItems = await requestResult(tx.objectStore(ITEMS).index('sessionId').getAll(value.session.sessionId) as IDBRequest<SessionItem[]>)
      if (stableStringify({ session: existing, items: existingItems }) !== stableStringify(value)) { tx.abort(); throw new Error('Performance integrity conflict') }
    } else {
      store.add(value.session); value.items.forEach(item => tx.objectStore(ITEMS).add(item))
    }
    const attemptStore = tx.objectStore(ATTEMPTS); const attempt = await requestResult(attemptStore.get(value.session.sessionId) as IDBRequest<AttemptMarker | undefined>); attemptStore.put(attempt ? { ...attempt, state: 'completed' } : { sessionId: value.session.sessionId, gameId: value.session.gameId, startedAt: value.session.startedAt, difficulty: value.session.difficulty, config: value.session.config, plannedDurationMs: value.session.plannedDurationMs, plannedItemCount: value.session.plannedItemCount, state: 'completed' })
    await transactionDone(tx)
  }
  async getCompletedSessions(filters: SessionFilters = {}) {
    const db = await this.db(); const tx = db.transaction(SESSIONS, 'readonly'); const sessions = await requestResult(tx.objectStore(SESSIONS).getAll() as IDBRequest<SessionResult[]>); await transactionDone(tx)
    return sessions.map(normalizeSession).filter(session => matches(session, filters)).sort((a, b) => b.completedAt.localeCompare(a.completedAt))
  }
  async getValidatedCompletedData(filters: SessionFilters = {}) {
    const db = await this.db(); const tx = db.transaction([SESSIONS, ITEMS], 'readonly')
    const rawSessions = await requestResult(tx.objectStore(SESSIONS).getAll() as IDBRequest<SessionResult[]>)
    const items = await requestResult(tx.objectStore(ITEMS).getAll() as IDBRequest<SessionItem[]>); await transactionDone(tx)
    const grouped = new Map<string, SessionItem[]>(); items.forEach(item => grouped.set(item.sessionId, [...(grouped.get(item.sessionId) ?? []), item]))
    const validSessions: CompletedSession[] = []; const issues: DataQualityIssue[] = []; const known = new Set(rawSessions.map(session => session.sessionId))
    for (const raw of rawSessions) {
      try {
        const session = normalizeSession(raw); if (!matches(session, filters)) continue
        const completed = { session, items: (grouped.get(session.sessionId) ?? []).sort((a, b) => a.index - b.index) }
        validateCompletedSession(completed); validSessions.push(completed)
      } catch (error) { issues.push({ sessionId: raw.sessionId, code: 'invalid-session', message: error instanceof Error ? error.message : 'Invalid local session' }) }
    }
    const orphanIds = [...new Set(items.filter(item => !known.has(item.sessionId)).map(item => item.sessionId))]
    orphanIds.forEach(sessionId => issues.push({ sessionId, code: 'orphan-items', message: 'Session items have no parent session.' }))
    return { validSessions: validSessions.sort((a, b) => b.session.completedAt.localeCompare(a.session.completedAt)), issues }
  }
  async getCompletedData(filters: SessionFilters = {}) { return (await this.getValidatedCompletedData(filters)).validSessions }
  async getSession(sessionId: string) {
    const db = await this.db(); const tx = db.transaction([SESSIONS, ITEMS], 'readonly'); const session = await requestResult(tx.objectStore(SESSIONS).get(sessionId) as IDBRequest<SessionResult | undefined>); if (!session) { await transactionDone(tx); return null }
    const normalizedSession = normalizeSession(session)
    const items = await requestResult(tx.objectStore(ITEMS).index('sessionId').getAll(sessionId) as IDBRequest<SessionItem[]>); await transactionDone(tx); return { session: normalizedSession, items }
  }
}

let repository: PerformanceRepository | undefined
export function performanceRepository(): PerformanceRepository {
  if (!repository) repository = new IndexedDbPerformanceRepository()
  return repository
}
