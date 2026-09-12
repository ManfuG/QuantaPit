import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { consecutiveDayStreak, gameInsights, statisticsByGame, trendFor } from './metrics'
import { IndexedDbPerformanceRepository, InMemoryPerformanceRepository, openPerformanceDatabase, performanceRepository } from './repository'
import { completeSession, type SessionDraft } from './session'
import { GAME_IDS, type CompletedSession, type GameId, type SessionItem } from './types'
import { normalizeSession, validateCompletedSession } from './validation'

function payload(gameId: GameId): Record<string, unknown> {
  if (['quick-math', 'sequences', 'radix-rush', 'tape-recall', 'foldsight'].includes(gameId)) return { question: {}, given: '1', correct: true, responseTimeMs: 500 }
  if (gameId === 'magnitude-forge') return { question: {}, minimum: 1, maximum: 2, score: 50, timedOut: false, responseTimeMs: 500 }
  if (gameId === 'hidden-spread') return { maker: 'user', userRole: 'market-maker', quote: {}, trades: [], budgetBefore: 10000, userBudget: 10001, responseTimeMs: 500 }
  if (gameId === 'basket-edge') return { fairValue: 10, quote: {}, opportunity: 'buy', action: 'buy', budgetBefore: 10000, budget: 10001, responseTimeMs: 500 }
  if (gameId === 'venue-gap') return { round: {}, action: 'skip', trade: null, budgetBefore: 10000, budget: 10000, responseTimeMs: 500 }
  return { round: {}, action: 'hedge', initial: 10, residual: 1, cost: 20, score: 80, exposureReductionScore: 90, responseTimeMs: 500 }
}
function fixture(gameId: GameId, index = 0, sessionId = `${gameId}-${index}`): CompletedSession {
  const completedAt = new Date(Date.UTC(2025, 0, index + 1)).toISOString()
  return {
    session: { schemaVersion: 1, sessionId, gameId, startedAt: completedAt, completedAt, status: 'completed', terminationReason: 'rounds-completed', config: {}, actualDurationMs: 1000, completedItemCount: 1, itemCount: 1, summary: { accuracy: 50 + index, primaryScore: 50 + index, correctCount: 1, answeredCount: 1 } },
    items: [{ sessionId, gameId, index: 0, payloadVersion: 1, status: 'answered', outcome: 'correct', responseTimeMs: 500, payload: payload(gameId) } as unknown as SessionItem],
  }
}

describe('performance schema', () => {
  it('accepts representative granular data for all ten games', () => { GAME_IDS.forEach(gameId => expect(() => validateCompletedSession(fixture(gameId))).not.toThrow()) })
  it('normalizes a legacy additive fixture without losing fields', () => { const current = fixture('sequences').session; const legacy = { ...current, schemaVersion: 0, itemCount: undefined }; const normalized = normalizeSession(legacy); expect(normalized).toMatchObject({ schemaVersion: 1, sessionId: current.sessionId, completedItemCount: 1, itemCount: 1 }) })
  it('rejects malformed game-specific payloads and enums', () => { const value = fixture('delta-shield'); value.items[0].payload = { responseTimeMs: 1 } as never; expect(() => validateCompletedSession(value)).toThrow('payload'); const status = fixture('quick-math'); status.items[0].status = 'unknown' as never; expect(() => validateCompletedSession(status)).toThrow('status') })
  it('rejects semantic range and current configuration defects', () => { const accuracy = fixture('quick-math'); accuracy.session.summary.accuracy = 101; expect(() => validateCompletedSession(accuracy)).toThrow('accuracy'); const config = fixture('quick-math'); config.session.config = { duration: 2, questions: 10, difficulty: 'Easy' }; config.session.difficulty = 'Easy'; expect(() => validateCompletedSession(config)).toThrow('duration'); const market = fixture('basket-edge'); market.session.config = { rounds: 5 }; market.session.difficulty = 'Easy'; expect(() => validateCompletedSession(market)).toThrow('five terminal') })
  it.each([
    ['NaN', (value: CompletedSession) => { value.session.actualDurationMs = Number.NaN }],
    ['negative duration', (value: CompletedSession) => { value.session.actualDurationMs = -1 }],
    ['count mismatch', (value: CompletedSession) => { value.session.itemCount = 2 }],
    ['completed count mismatch', (value: CompletedSession) => { value.items[0].status = 'not-completed'; value.session.completedItemCount = 1 }],
    ['duplicate index', (value: CompletedSession) => { value.items.push({ ...value.items[0] }); value.session.itemCount = 2; value.session.completedItemCount = 2 }],
  ])('rejects %s', (_, mutate) => { const value = fixture('quick-math'); mutate(value); expect(() => validateCompletedSession(value)).toThrow() })
})

describe('performance repository', () => {
  it('tracks attempts and closes the marker with the completed result', async () => { const repo = new InMemoryPerformanceRepository(); const value = fixture('quick-math'); await repo.startAttempt({ sessionId: value.session.sessionId, gameId: 'quick-math', startedAt: value.session.startedAt, config: {}, state: 'active' }); await repo.complete(value); expect(await repo.getAttempts()).toMatchObject([{ sessionId: value.session.sessionId, state: 'completed' }]) })
  it('stores and filters completed sessions with granular items', async () => { const repo = new InMemoryPerformanceRepository(); await repo.complete(fixture('quick-math')); await repo.complete(fixture('sequences')); expect(await repo.getCompletedSessions({ gameId: 'quick-math' })).toHaveLength(1); expect((await repo.getSession('quick-math-0'))?.items).toHaveLength(1) })
  it('is idempotent for equal writes and rejects conflicts', async () => { const repo = new InMemoryPerformanceRepository(); const value = fixture('quick-math'); await repo.complete(value); await repo.complete(structuredClone(value)); expect(await repo.getCompletedSessions()).toHaveLength(1); const conflict = structuredClone(value); conflict.session.summary.primaryScore = 0; await expect(repo.complete(conflict)).rejects.toThrow('integrity') })
  it('does not expose invalid or incomplete sessions', async () => { const repo = new InMemoryPerformanceRepository(); const value = fixture('quick-math'); value.session.status = 'incomplete' as 'completed'; await expect(repo.complete(value)).rejects.toThrow(); expect(await repo.getCompletedSessions()).toHaveLength(0) })
  it('preserves v1 sessions while adding only managed IndexedDB stores', async () => { const name = 'quantapit-migration-test'; const open = indexedDB.open(name, 1); await new Promise<void>((resolve, reject) => { open.onupgradeneeded = () => open.result.createObjectStore('sessions', { keyPath: 'sessionId' }).put({ ...fixture('sequences', 0, 'legacy-db').session, schemaVersion: 0, itemCount: undefined }); open.onsuccess = () => { open.result.close(); resolve() }; open.onerror = () => reject(open.error) }); const repo = new IndexedDbPerformanceRepository(name); const sessions = await repo.getCompletedSessions(); expect(sessions[0]).toMatchObject({ sessionId: 'legacy-db', schemaVersion: 1, itemCount: 1 }); const migrated = await openPerformanceDatabase(name); expect([...migrated.objectStoreNames]).toEqual(expect.arrayContaining(['sessions','sessionItems','metadata','attempts'])); migrated.close() })
  it('never downgrades a completed stale marker to abandoned', async () => { const repo = new IndexedDbPerformanceRepository('quantapit-attempt-complete-test'); const value = fixture('foldsight', 0, 'old-completed'); value.session.startedAt = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(); value.session.completedAt = new Date().toISOString(); await repo.startAttempt({ sessionId: value.session.sessionId, gameId: 'foldsight', startedAt: value.session.startedAt, config: {}, state: 'active' }); await repo.complete(value); expect(await repo.getAttempts()).toMatchObject([{ sessionId: value.session.sessionId, state: 'completed' }]) })
  it('marks stale active attempts abandoned without assigning a score', async () => { const repo = new IndexedDbPerformanceRepository('quantapit-attempt-test'); await repo.startAttempt({ sessionId: 'stale', gameId: 'foldsight', startedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), config: {}, state: 'active' }); expect(await repo.getAttempts()).toMatchObject([{ sessionId: 'stale', state: 'abandoned' }]) })
  it('writes and reads an atomic session through native IndexedDB', async () => { const repo = new IndexedDbPerformanceRepository('quantapit-repository-test'); const value = fixture('foldsight', 0, 'indexed-foldsight'); await repo.complete(value); await repo.complete(structuredClone(value)); expect((await repo.getSession(value.session.sessionId))?.items[0].responseTimeMs).toBe(500); expect(await repo.getCompletedSessions({ gameId: 'foldsight' })).toHaveLength(1) })
  it('isolates a corrupt local row instead of breaking all statistics', async () => { const name = `quantapit-quality-${crypto.randomUUID()}`; const db = await openPerformanceDatabase(name); const valid = fixture('quick-math', 0, 'valid-quality'); const invalid = fixture('quick-math', 0, 'invalid-quality'); invalid.session.summary.accuracy = 150; const tx = db.transaction(['sessions','sessionItems'], 'readwrite'); tx.objectStore('sessions').put(valid.session); valid.items.forEach(item => tx.objectStore('sessionItems').put(item)); tx.objectStore('sessions').put(invalid.session); invalid.items.forEach(item => tx.objectStore('sessionItems').put(item)); await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error) }); db.close(); const result = await new IndexedDbPerformanceRepository(name).getValidatedCompletedData(); expect(result.validSessions.map(value => value.session.sessionId)).toEqual(['valid-quality']); expect(result.issues).toMatchObject([{ sessionId: 'invalid-quality', code: 'invalid-session' }]) })
})

describe('session lifecycle', () => {
  it('reuses the frozen completion snapshot on duplicate completion calls', async () => { const draft: SessionDraft = { sessionId: 'duplicate-lifecycle', gameId: 'quick-math', startedAt: Date.now(), config: {} }; const raw = [{ payload: payload('quick-math'), responseTimeMs: 500, outcome: 'correct' as const }]; const options = { terminationReason: 'rounds-completed' as const, summary: { accuracy: 100, correctCount: 1, answeredCount: 1 } }; await completeSession(draft, raw, options); const first = await performanceRepository().getSession(draft.sessionId); await completeSession(draft, raw, options); const second = await performanceRepository().getSession(draft.sessionId); expect(second).toEqual(first) })
  it('keeps accuracy unavailable when no answer exists', async () => { const draft: SessionDraft = { sessionId: 'zero-answer', gameId: 'quick-math', startedAt: Date.now(), config: {} }; await completeSession(draft, [], { terminationReason: 'time-limit', summary: { correctCount: 0, answeredCount: 0 } }); expect((await performanceRepository().getSession(draft.sessionId))?.session.summary.accuracy).toBeUndefined() })
})

describe('statistics selectors', () => {
  const sessions = (count: number) => Array.from({ length: count }, (_, index) => fixture('quick-math', index).session).reverse()
  it('handles empty, initial and low-data samples', () => { expect(trendFor([]).state).toBe('empty'); expect(trendFor(sessions(1)).state).toBe('initial'); expect(trendFor(sessions(4)).state).toBe('limited') })
  it('uses the last-five median and compares two windows at ten', () => { expect(trendFor(sessions(5))).toMatchObject({ state: 'baseline', current: 52 }); expect(trendFor(sessions(10))).toMatchObject({ state: 'comparison', current: 57, previous: 52, delta: 5 }) })
  it('counts consecutive calendar days once per day', () => { const values = [fixture('quick-math', 0).session, fixture('quick-math', 1).session, fixture('sequences', 1, 'duplicate-day').session, fixture('quick-math', 2).session]; expect(consecutiveDayStreak(values)).toBe(3); expect(consecutiveDayStreak([fixture('quick-math', 0).session, fixture('quick-math', 2).session])).toBe(1); expect(consecutiveDayStreak([])).toBe(0) })
  it('groups games without creating a cross-game score', () => { const result = statisticsByGame([fixture('quick-math').session, fixture('venue-gap').session]); expect(result.map(value => value.gameId)).toEqual(['quick-math', 'venue-gap']) })
  it('keeps game history chronological, bounded and independent of repository ordering', () => {
    const values = Array.from({ length: 12 }, (_, index) => fixture('quick-math', index).session)
    const input = [values[8], fixture('venue-gap').session, ...values.filter((_, index) => index !== 8)]
    const original = input.slice()
    const result = gameInsights('quick-math', input)
    expect(result.recent.map(row => row.session.sessionId)).toEqual(values.slice(2).reverse().map(value => value.sessionId))
    expect(result.sessions).toBe(12)
    expect(result.items).toBe(12)
    expect(result.trend).toMatchObject({ state: 'comparison', current: 59, previous: 54, delta: 5 })
    expect(input).toEqual(original)
  })
  it('preserves losses and zeros without substituting secondary accuracy for missing P&L', () => {
    const values = Array.from({ length: 4 }, (_, index) => fixture('basket-edge', index).session)
    values[0].summary = { pnl: -40, primaryScore: 100, accuracy: 90 }
    values[1].summary = { primaryScore: 0, accuracy: 90 }
    values[2].summary = { accuracy: 90 }
    values[3].summary = { pnl: Number.NaN, primaryScore: Number.POSITIVE_INFINITY }
    const result = gameInsights('basket-edge', values)
    expect(result.recent.map(row => row.value)).toEqual([undefined, undefined, 0, -40])
    expect(result.trend).toMatchObject({ state: 'limited', current: 0, previous: -40, sample: 2 })
  })
  it('uses score rather than accuracy and supports stored score-only results', () => {
    const first = fixture('delta-shield').session
    first.summary = { primaryScore: 72, accuracy: 100 }
    const second = fixture('delta-shield', 1).session
    second.summary = {}
    second.score = 0
    expect(gameInsights('delta-shield', [first, second]).recent.map(row => row.value)).toEqual([0, 72])
  })
  it('calculates completion against the planned target, not the recorded item count or elapsed time', () => {
    const partial = fixture('quick-math').session
    partial.plannedItemCount = 10
    partial.completedItemCount = 3
    partial.itemCount = 3
    partial.summary.medianResponseTimeMs = 1200
    const timed = fixture('foldsight').session
    timed.plannedDurationMs = timed.actualDurationMs
    expect(gameInsights('quick-math', [partial]).recent[0]).toMatchObject({ completionRate: 30, responseTimeMs: 1200 })
    expect(gameInsights('foldsight', [timed]).recent[0].completionRate).toBeUndefined()
    partial.completedItemCount = 0
    expect(gameInsights('quick-math', [partial]).recent[0].completionRate).toBe(0)
    partial.plannedItemCount = 0
    expect(gameInsights('quick-math', [partial]).recent[0].completionRate).toBeUndefined()
  })
  it('does not turn absent or invalid measurements into zero performance', () => {
    const value = fixture('quick-math').session
    value.summary = { accuracy: Number.NaN, medianResponseTimeMs: -1 }
    const result = gameInsights('quick-math', [value])
    expect(result.recent[0].value).toBeUndefined()
    expect(result.recent[0].responseTimeMs).toBeUndefined()
    expect(result.trend).toEqual({ state: 'empty', sample: 0 })
    expect(gameInsights('sequences', [value])).toMatchObject({ sessions: 0, items: 0, recent: [], trend: { state: 'empty', sample: 0 } })
  })
})
