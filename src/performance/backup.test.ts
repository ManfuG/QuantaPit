import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { exportPerformanceData, importPerformanceData } from './backup'
import { IndexedDbPerformanceRepository, InMemoryPerformanceRepository, openPerformanceDatabase, type PerformanceRepository } from './repository'
import { GAME_IDS, type CompletedSession, type GameId, type SessionItem } from './types'

const timestamp = '2025-01-02T03:04:05.000Z'
let databaseNumber = 0
beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory())
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2025-01-02T03:05:00.000Z'))
  databaseNumber = 0
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

function payload(gameId: GameId): Record<string, unknown> {
  const responseTimeMs = 500
  if (['quick-math', 'sequences', 'radix-rush', 'tape-recall', 'foldsight'].includes(gameId)) return { question: { prompt: '1 + 1', operands: [1, 1] }, given: '2', correct: true, responseTimeMs }
  if (gameId === 'magnitude-forge') return { question: { unit: 'meters', target: 1.5 }, minimum: 1, maximum: 2, score: 50, timedOut: false, responseTimeMs }
  if (gameId === 'hidden-spread') return { maker: 'user', userRole: 'market-maker', quote: { bid: 10, ask: 12 }, trades: [{ quantity: 2 }], budgetBefore: 10000, userBudget: 10001, responseTimeMs }
  if (gameId === 'basket-edge') return { fairValue: 10, quote: { bid: 9, ask: 11 }, opportunity: 'buy', action: 'buy', budgetBefore: 10000, budget: 10001, responseTimeMs }
  if (gameId === 'venue-gap') return { round: { venues: ['A', 'B'] }, action: 'skip', trade: null, budgetBefore: 10000, budget: 10000, responseTimeMs }
  return { round: { exposure: 10 }, action: 'hedge', initial: 10, residual: 1, cost: 20, score: 80, exposureReductionScore: 90, responseTimeMs }
}

function fixture(sessionId: string, gameId: GameId = 'quick-math'): CompletedSession {
  const config = gameId === 'magnitude-forge' ? { questions: 2, secondsPerQuestion: 60 }
    : gameId === 'hidden-spread' ? { rounds: 2, traderSeconds: 60, marketMakerSeconds: 30 }
      : ['basket-edge', 'venue-gap', 'delta-shield'].includes(gameId) ? { rounds: 2, secondsPerRound: 60 }
        : { duration: 2, questions: 2 }
  return {
    session: { schemaVersion: 1, sessionId, gameId, startedAt: timestamp, completedAt: '2025-01-02T03:04:07.000Z', status: 'completed', terminationReason: 'rounds-completed', difficulty: 'Easy', mode: 'practice', config, plannedDurationMs: gameId === 'hidden-spread' ? undefined : 120000, plannedItemCount: 2, actualDurationMs: 2000, completedItemCount: 2, itemCount: 2, score: 50, summary: { accuracy: 100, primaryScore: 50, medianResponseTimeMs: 500, detail: { attempts: [1, 2] } } },
    items: [0, 1].map(index => ({ sessionId, gameId, index, payloadVersion: 1, startedAt: timestamp, completedAt: '2025-01-02T03:04:06.000Z', status: 'answered', outcome: 'correct', responseTimeMs: 500, payload: payload(gameId) } as SessionItem)),
  }
}

function backup(sessions: unknown[]): string {
  return JSON.stringify({ format: 'quantapit-performance', version: 1, exportedAt: timestamp, sessions })
}

const repositories: [string, () => PerformanceRepository][] = [
  ['memory', () => new InMemoryPerformanceRepository()],
  ['IndexedDB', () => new IndexedDbPerformanceRepository(`backup-${++databaseNumber}`)],
]

describe.each(repositories)('session backup with %s', (_, createRepository) => {
  it('roundtrips every game with configuration, summaries and granular payloads, preserving unrelated data', async () => {
    const source = createRepository()
    const target = createRepository()
    const values = GAME_IDS.map(gameId => fixture(gameId, gameId))
    for (const value of values) await source.complete(value)
    const unrelated = fixture('unrelated')
    await target.complete(unrelated)
    const text = await exportPerformanceData(source)
    expect(JSON.parse(text)).toMatchObject({ format: 'quantapit-performance', version: 1, exportedAt: expect.any(String) })
    expect(await importPerformanceData(target, text)).toEqual({ imported: 10, skipped: 0 })
    for (const value of values) expect(await target.getSession(value.session.sessionId)).toEqual(value)
    expect(await target.getSession('unrelated')).toEqual(unrelated)
    expect((await target.getAttempts()).map(attempt => [attempt.sessionId, attempt.state]).sort()).toEqual([...values, unrelated].map(value => [value.session.sessionId, 'completed']).sort())
  })

  it('exports and imports empty history without changing existing records', async () => {
    const source = createRepository()
    const target = createRepository()
    const existing = fixture('existing')
    await target.complete(existing)
    const text = await exportPerformanceData(source)
    expect(JSON.parse(text).sessions).toEqual([])
    expect(await importPerformanceData(target, text)).toEqual({ imported: 0, skipped: 0 })
    expect(await target.getCompletedData()).toEqual([existing])
  })

  it('counts duplicates within a backup and in existing storage', async () => {
    const repo = createRepository()
    const existing = fixture('existing')
    const added = fixture('added')
    await repo.complete(existing)
    expect(await importPerformanceData(repo, backup([existing, existing, added, added]))).toEqual({ imported: 1, skipped: 3 })
    expect(await repo.getSession('existing')).toEqual(existing)
    expect(await repo.getSession('added')).toEqual(added)
    expect(await importPerformanceData(repo, backup([existing, added]))).toEqual({ imported: 0, skipped: 2 })
  })

  it('ignores item ordering and JSON-omitted optional properties without mutating input', async () => {
    const repo = createRepository()
    const value = fixture('idempotent')
    value.session.mode = undefined
    value.session.config.optional = undefined
    value.session.summary.optional = undefined
    value.session.summary.detail = { items: [{ score: 0, optional: undefined }] }
    value.items[0].outcome = undefined
    value.items[0].payload.optional = undefined
    value.items.reverse()
    const before = structuredClone(value)
    expect(await repo.importCompletedData([value])).toEqual({ imported: 1, skipped: 0 })
    const roundtrip = JSON.parse(JSON.stringify(value)) as CompletedSession
    roundtrip.items.reverse()
    expect(await importPerformanceData(repo, backup([roundtrip, value]))).toEqual({ imported: 0, skipped: 2 })
    expect(value).toEqual(before)
    expect((await repo.getSession('idempotent'))?.items.map(item => item.index).sort()).toEqual([0, 1])
  })

  it.each(['file', 'storage'])('rejects conflicting duplicate IDs in %s before writing unrelated new sessions', async source => {
    const repo = createRepository()
    const existing = fixture('conflict')
    const preserved = fixture('preserved')
    const changed = structuredClone(existing)
    changed.items[0].payload.responseTimeMs = 700
    await repo.complete(preserved)
    if (source === 'storage') await repo.complete(existing)
    const sessions = source === 'file' ? [fixture('new'), existing, changed] : [fixture('new'), changed]
    await expect(importPerformanceData(repo, backup(sessions))).rejects.toThrow('conflict')
    expect(await repo.getSession('new')).toBeNull()
    expect(await repo.getSession('preserved')).toEqual(preserved)
    expect(await repo.getSession('conflict')).toEqual(source === 'storage' ? existing : null)
    expect((await repo.getAttempts()).map(attempt => attempt.sessionId).sort()).toEqual(source === 'storage' ? ['conflict', 'preserved'] : ['preserved'])
  })

  it.each(['active', 'abandoned'] as const)('does not overwrite %s attempt markers', async state => {
    const repo = createRepository()
    const blocked = fixture('blocked')
    const attempt = { sessionId: 'blocked', gameId: blocked.session.gameId, startedAt: timestamp, config: { source: 'original' }, state }
    await repo.startAttempt(attempt)
    await expect(importPerformanceData(repo, backup([fixture('new'), blocked]))).rejects.toThrow('attempt')
    expect(await repo.getSession('new')).toBeNull()
    expect(await repo.getSession('blocked')).toBeNull()
    expect(await repo.getAttempts()).toMatchObject([{ sessionId: 'blocked', config: attempt.config, state }])
  })

  it.each([
    ['malformed JSON', '{'],
    ['null root', 'null'],
    ['array root', '[]'],
    ['wrong format', JSON.stringify({ format: 'other', version: 1, exportedAt: timestamp, sessions: [] })],
    ['unsupported version', JSON.stringify({ format: 'quantapit-performance', version: 2, exportedAt: timestamp, sessions: [] })],
    ['version type', JSON.stringify({ format: 'quantapit-performance', version: '1', exportedAt: timestamp, sessions: [] })],
    ['missing date', JSON.stringify({ format: 'quantapit-performance', version: 1, sessions: [] })],
    ['invalid date', JSON.stringify({ format: 'quantapit-performance', version: 1, exportedAt: 'yesterday', sessions: [] })],
    ['missing sessions', JSON.stringify({ format: 'quantapit-performance', version: 1, exportedAt: timestamp })],
    ['sessions object', JSON.stringify({ format: 'quantapit-performance', version: 1, exportedAt: timestamp, sessions: {} })],
  ])('rejects %s without touching existing history', async (_, text) => {
    const repo = createRepository()
    const existing = fixture('existing')
    await repo.complete(existing)
    await expect(importPerformanceData(repo, text)).rejects.toThrow()
    expect(await repo.getCompletedData()).toEqual([existing])
  })

  const invalidCases: [string, (value: CompletedSession) => void][] = [
    ['unsupported session schema', value => { value.session.schemaVersion = 2 as never }],
    ['unsupported payload version', value => { value.items[0].payloadVersion = 2 as never }],
    ['null session', value => { value.session = null as never }],
    ['array config', value => { value.session.config = [] as never }],
    ['null summary', value => { value.session.summary = null as never }],
    ['numeric ID', value => { value.session.sessionId = 12 as never }],
    ['empty ID', value => { value.session.sessionId = '' }],
    ['unknown game', value => { value.session.gameId = 'other' as never }],
    ['invalid timestamp', value => { value.session.startedAt = '123' }],
    ['impossible calendar date', value => { value.session.startedAt = '2025-02-30T03:04:05.000Z' }],
    ['completion before start', value => { value.session.completedAt = '2024-01-01T00:00:00.000Z' }],
    ['invalid duration', value => { value.session.actualDurationMs = -1 }],
    ['fractional counts', value => { value.session.completedItemCount = 1.5 }],
    ['count mismatch', value => { value.session.itemCount = 3 }],
    ['completed count mismatch', value => { value.items[0].status = 'not-completed' }],
    ['non-completed session', value => { value.session.status = 'active' as never }],
    ['invalid termination', value => { value.session.terminationReason = 'unknown' as never }],
    ['invalid difficulty', value => { value.session.difficulty = 'unknown' as never }],
    ['invalid mode shape', value => { value.session.mode = {} as never }],
    ['invalid accuracy', value => { value.session.summary.accuracy = 101 }],
    ['invalid summary type', value => { value.session.summary.primaryScore = '50' as never }],
    ['invalid configuration', value => { value.session.config.duration = 0 }],
    ['contradictory plan', value => { value.session.plannedItemCount = 3 }],
    ['null items', value => { value.items = null as never }],
    ['null item', value => { value.items[0] = null as never }],
    ['array payload', value => { value.items[0].payload = [] as never }],
    ['null payload', value => { value.items[0].payload = null as never }],
    ['negative index', value => { value.items[0].index = -1 }],
    ['duplicate item index', value => { value.items[1].index = 0 }],
    ['wrong session reference', value => { value.items[0].sessionId = 'another' }],
    ['wrong game reference', value => { value.items[0].gameId = 'sequences' }],
    ['invalid item status', value => { value.items[0].status = 'unknown' as never }],
    ['invalid outcome', value => { value.items[0].outcome = 'unknown' as never }],
    ['negative response time', value => { value.items[0].responseTimeMs = -1 }],
    ['invalid item timestamp', value => { value.items[0].startedAt = 'yesterday' }],
    ['missing payload field', value => { delete (value.items[0].payload as Record<string, unknown>).question }],
    ['wrong payload primitive', value => { (value.items[0].payload as Record<string, unknown>).correct = 'yes' }],
    ['wrong payload response type', value => { value.items[0].payload.responseTimeMs = 'fast' as never }],
  ]
  it.each(invalidCases)('rejects %s in a batch without partial writes', async (_, mutate) => {
    const repo = createRepository()
    const existing = fixture('existing')
    await repo.complete(existing)
    const invalid = fixture('invalid')
    mutate(invalid)
    await expect(importPerformanceData(repo, backup([fixture('new'), invalid]))).rejects.toThrow()
    expect(await repo.getCompletedData()).toEqual([existing])
    expect((await repo.getAttempts()).map(attempt => attempt.sessionId)).toEqual(['existing'])
  })

  it.each(GAME_IDS)('rejects malformed required payload types for %s', async gameId => {
    const repo = createRepository()
    const value = fixture('invalid', gameId)
    const malformedField = ['quick-math', 'sequences', 'radix-rush', 'tape-recall', 'foldsight'].includes(gameId) ? 'correct'
      : gameId === 'magnitude-forge' ? 'timedOut'
        : gameId === 'hidden-spread' ? 'userBudget'
          : gameId === 'basket-edge' ? 'fairValue'
            : gameId === 'venue-gap' ? 'budget' : 'residual'
    value.items[0].payload[malformedField] = {}
    await expect(importPerformanceData(repo, backup([fixture('new'), value]))).rejects.toThrow()
    expect(await repo.getSession('new')).toBeNull()
    expect(await repo.getSession('invalid')).toBeNull()
  })

  it('validates direct repository batches and snapshots inputs before asynchronous storage work', async () => {
    const repo = createRepository()
    const value = fixture('snapshot')
    const original = structuredClone(value)
    const result = repo.importCompletedData([value])
    value.session.summary.primaryScore = 999
    value.items[0].payload.responseTimeMs = 999
    expect(await result).toEqual({ imported: 1, skipped: 0 })
    expect(await repo.getSession('snapshot')).toEqual(original)
    const invalid = fixture('invalid')
    invalid.session.actualDurationMs = Number.NaN
    await expect(repo.importCompletedData([fixture('new'), invalid])).rejects.toThrow()
    expect(await repo.getSession('new')).toBeNull()
  })

  it('refuses export when typed semantic validation alone would miss malformed payload primitives', async () => {
    const repo = createRepository()
    const value = fixture('corrupt-payload')
    value.items[0].payload.correct = 'yes'
    await repo.complete(value)
    await expect(exportPerformanceData(repo)).rejects.toThrow('correct must be a boolean')
    expect((await repo.getSession('corrupt-payload'))?.items[0].payload.correct).toBe('yes')
  })
})

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error); tx.onerror = () => reject(tx.error) })
}

describe('IndexedDB backup integrity', () => {
  it.each(['invalid-session', 'orphan-items'])('refuses export containing %s rather than silently dropping rows', async corruption => {
    const name = 'corrupt-export'
    const db = await openPerformanceDatabase(name)
    const value = fixture('corrupt')
    const tx = db.transaction(['sessions', 'sessionItems'], 'readwrite')
    const done = transactionDone(tx)
    if (corruption === 'invalid-session') {
      value.session.summary.accuracy = 150
      tx.objectStore('sessions').add(value.session)
    }
    value.items.forEach(item => tx.objectStore('sessionItems').add(item))
    await done
    db.close()
    await expect(exportPerformanceData(new IndexedDbPerformanceRepository(name))).rejects.toThrow('Cannot export invalid')
  })

  it('rejects orphan item collisions and preserves those rows and unrelated sessions', async () => {
    const name = 'orphan-collision'
    const db = await openPerformanceDatabase(name)
    const orphan = fixture('orphan')
    const tx = db.transaction('sessionItems', 'readwrite')
    const done = transactionDone(tx)
    tx.objectStore('sessionItems').add(orphan.items[0])
    await done
    const repo = new IndexedDbPerformanceRepository(name)
    const existing = fixture('existing')
    await repo.complete(existing)
    await expect(importPerformanceData(repo, backup([fixture('new'), orphan]))).rejects.toThrow('orphan')
    expect(await repo.getSession('new')).toBeNull()
    expect(await repo.getSession('existing')).toEqual(existing)
    const read = db.transaction('sessionItems', 'readonly')
    const readDone = transactionDone(read)
    const request = read.objectStore('sessionItems').get(['orphan', 0])
    const stored = await new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error) })
    await readDone
    expect(stored).toEqual(orphan.items[0])
    db.close()
  })

  it('rolls back all stores when a queued IndexedDB write fails', async () => {
    const repo = new IndexedDbPerformanceRepository('write-rollback')
    const existing = fixture('existing')
    await repo.complete(existing)
    const add = IDBObjectStore.prototype.add
    vi.spyOn(IDBObjectStore.prototype, 'add').mockImplementation(function (this: IDBObjectStore, value: unknown, key?: IDBValidKey) {
      if (this.name === 'sessions' && value !== null && typeof value === 'object' && 'sessionId' in value && value.sessionId === 'second') {
        return add.call(this, { ...value, sessionId: 'first' }, key)
      }
      return add.call(this, value, key)
    })
    await expect(importPerformanceData(repo, backup([fixture('first'), fixture('second')]))).rejects.toThrow()
    expect(await repo.getCompletedData()).toEqual([existing])
    expect((await repo.getAttempts()).map(attempt => attempt.sessionId)).toEqual(['existing'])
    expect((await repo.getValidatedCompletedData()).issues).toEqual([])
  })

  it('skips an exported legacy session without rewriting its existing storage row', async () => {
    const name = 'legacy-roundtrip'
    const db = await openPerformanceDatabase(name)
    const value = fixture('legacy')
    const tx = db.transaction(['sessions', 'sessionItems'], 'readwrite')
    const done = transactionDone(tx)
    tx.objectStore('sessions').add({ ...value.session, schemaVersion: 0, itemCount: undefined })
    value.items.forEach(item => tx.objectStore('sessionItems').add(item))
    await done
    const repo = new IndexedDbPerformanceRepository(name)
    const exported = await exportPerformanceData(repo)
    expect(await importPerformanceData(repo, exported)).toEqual({ imported: 0, skipped: 1 })
    expect(await repo.getSession('legacy')).toEqual(value)
    const read = db.transaction('sessions', 'readonly')
    const readDone = transactionDone(read)
    const request = read.objectStore('sessions').get('legacy')
    const stored = await new Promise<unknown>((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error) })
    await readDone
    expect(stored).toMatchObject({ schemaVersion: 0, itemCount: undefined })
    db.close()
  })

  it('serializes identical concurrent imports across connections', async () => {
    const first = new IndexedDbPerformanceRepository('equal-race')
    const second = new IndexedDbPerformanceRepository('equal-race')
    const value = fixture('same')
    const results = await Promise.all([importPerformanceData(first, backup([value])), importPerformanceData(second, backup([value]))])
    expect(results.map(result => result.imported).sort()).toEqual([0, 1])
    expect(results.map(result => result.skipped).sort()).toEqual([0, 1])
    expect(await first.getCompletedData()).toEqual([value])
  })

  it('serializes attempt creation against import without replacing an active attempt', async () => {
    const importer = new IndexedDbPerformanceRepository('attempt-race')
    const writer = new IndexedDbPerformanceRepository('attempt-race')
    const value = fixture('same')
    const results = await Promise.allSettled([
      writer.startAttempt({ sessionId: 'same', gameId: value.session.gameId, startedAt: timestamp, config: {}, state: 'active' }),
      importPerformanceData(importer, backup([fixture('new'), value])),
    ])
    expect(results[0].status).toBe('fulfilled')
    const imported = results[1].status === 'fulfilled'
    expect(await importer.getSession('same')).toEqual(imported ? value : null)
    expect(await importer.getSession('new')).toEqual(imported ? fixture('new') : null)
    expect((await importer.getAttempts()).map(attempt => [attempt.sessionId, attempt.state]).sort()).toEqual(imported
      ? [['new', 'completed'], ['same', 'completed']]
      : [['same', 'active']])
  })

  it('serializes conflicting concurrent batches without leaking the losing batch', async () => {
    const first = new IndexedDbPerformanceRepository('conflict-race')
    const second = new IndexedDbPerformanceRepository('conflict-race')
    const value = fixture('same')
    const changed = structuredClone(value)
    changed.session.score = 99
    const results = await Promise.allSettled([
      importPerformanceData(first, backup([fixture('first-only'), value])),
      importPerformanceData(second, backup([fixture('second-only'), changed])),
    ])
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(1)
    const firstWon = results[0].status === 'fulfilled'
    expect(await first.getSession('same')).toEqual(firstWon ? value : changed)
    expect(await first.getSession(firstWon ? 'first-only' : 'second-only')).toEqual(fixture(firstWon ? 'first-only' : 'second-only'))
    expect(await first.getSession(firstWon ? 'second-only' : 'first-only')).toBeNull()
    expect((await first.getAttempts()).map(attempt => attempt.sessionId).sort()).toEqual([firstWon ? 'first-only' : 'second-only', 'same'].sort())
  })
})

