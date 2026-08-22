import { GAME_IDS, type CompletedSession, type GameId, type SessionItem, type SessionResult } from './types'

const TERMINATIONS = ['completed', 'time-limit', 'user-finished', 'rounds-completed']
const DIFFICULTIES = ['Easy', 'Medium', 'Hard']
const ITEM_STATUSES = ['answered', 'skipped', 'timed-out', 'not-completed']
const OUTCOMES = ['correct', 'incorrect', 'partial', 'profitable', 'unprofitable', 'neutral']
const REQUIRED_PAYLOAD_FIELDS: Record<GameId, string[]> = {
  'quick-math': ['question', 'given', 'correct', 'responseTimeMs'], sequences: ['question', 'given', 'correct', 'responseTimeMs'],
  'radix-rush': ['question', 'given', 'correct', 'responseTimeMs'], 'tape-recall': ['question', 'given', 'correct', 'responseTimeMs'],
  foldsight: ['question', 'given', 'correct', 'responseTimeMs'],
  'magnitude-forge': ['question', 'minimum', 'maximum', 'score', 'timedOut', 'responseTimeMs'],
  'hidden-spread': ['maker', 'userRole', 'quote', 'trades', 'budgetBefore', 'userBudget', 'responseTimeMs'],
  'basket-edge': ['fairValue', 'quote', 'opportunity', 'action', 'budgetBefore', 'budget', 'responseTimeMs'],
  'venue-gap': ['round', 'action', 'trade', 'budgetBefore', 'budget', 'responseTimeMs'],
  'delta-shield': ['round', 'action', 'initial', 'residual', 'cost', 'score', 'exposureReductionScore', 'responseTimeMs'],
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invalid performance data: ${message}`)
}
function validIso(value: string) { return Number.isFinite(Date.parse(value)) }
function checkValue(value: unknown, path: string): void {
  if (typeof value === 'number') assert(Number.isFinite(value), `${path} must contain finite numbers`)
  else if (Array.isArray(value)) value.forEach((entry, index) => checkValue(entry, `${path}[${index}]`))
  else if (value && typeof value === 'object') Object.entries(value).forEach(([key, entry]) => checkValue(entry, `${path}.${key}`))
  else assert(value === null || ['string', 'boolean', 'undefined'].includes(typeof value), `${path} is not serializable`)
}

function numberField(value: unknown, name: string): number { assert(typeof value === 'number' && Number.isFinite(value), `${name} must be finite`); return value }
function validateGameConfiguration(session: SessionResult): void {
  // Historical v1 fixtures/sessions may predate config instrumentation. Preserve
  // read compatibility; every current game writer emits a non-empty config.
  if (!Object.keys(session.config).length) return
  const difficultyGames: GameId[] = ['quick-math', 'sequences', 'radix-rush', 'tape-recall', 'hidden-spread', 'basket-edge', 'venue-gap', 'delta-shield']
  if (difficultyGames.includes(session.gameId)) assert(session.difficulty !== undefined, `${session.gameId} difficulty is required`)
  if (['quick-math', 'sequences', 'radix-rush', 'tape-recall'].includes(session.gameId)) {
    assert([1, 5, 8].includes(numberField(session.config.duration, 'duration')), 'unsupported timed duration')
    assert([10, 50, 80].includes(numberField(session.config.questions, 'questions')), 'unsupported question count')
  } else if (session.gameId === 'foldsight') assert([1, 5, 8].includes(numberField(session.config.duration, 'duration')), 'unsupported FoldSight duration')
  else if (session.gameId === 'magnitude-forge') {
    assert(numberField(session.config.questions, 'questions') === 5 && numberField(session.config.secondsPerQuestion, 'secondsPerQuestion') === 60, 'unsupported Magnitude Forge config')
    assert(session.itemCount === 5 && session.completedItemCount === 5, 'Magnitude Forge requires five terminal items')
  } else {
    assert(numberField(session.config.rounds, 'rounds') === 5, 'market sessions require five rounds')
    assert(session.itemCount === 5 && session.completedItemCount === 5, 'market sessions require five terminal items')
  }
}

export function validateSession(session: SessionResult): void {
  assert(session.schemaVersion === 1, 'unsupported session schema')
  assert(session.sessionId.length > 0, 'sessionId is required')
  assert(GAME_IDS.includes(session.gameId), 'unknown gameId')
  assert(validIso(session.startedAt) && validIso(session.completedAt), 'timestamps must be ISO dates')
  assert(Date.parse(session.completedAt) >= Date.parse(session.startedAt), 'completion precedes start')
  assert(session.status === 'completed', 'only completed sessions can be stored')
  assert(TERMINATIONS.includes(session.terminationReason), 'unknown termination reason')
  if (session.difficulty !== undefined) assert(DIFFICULTIES.includes(session.difficulty), 'unknown difficulty')
  assert(Number.isFinite(session.actualDurationMs) && session.actualDurationMs >= 0, 'invalid duration')
  assert(Number.isInteger(session.completedItemCount) && session.completedItemCount >= 0, 'invalid completed count')
  assert(Number.isInteger(session.itemCount) && session.itemCount >= 0, 'invalid item count')
  assert(session.completedItemCount <= session.itemCount, 'completed count exceeds item count')
  if (session.plannedDurationMs !== undefined) assert(Number.isFinite(session.plannedDurationMs) && session.plannedDurationMs >= 0, 'invalid planned duration')
  if (session.plannedItemCount !== undefined) assert(Number.isInteger(session.plannedItemCount) && session.plannedItemCount >= session.itemCount, 'invalid planned item count')
  if (session.score !== undefined) assert(Number.isFinite(session.score), 'invalid score')
  if (session.summary.accuracy !== undefined) assert(Number.isFinite(session.summary.accuracy) && session.summary.accuracy >= 0 && session.summary.accuracy <= 100, 'accuracy must be between 0 and 100')
  checkValue(session.config, 'config'); checkValue(session.summary, 'summary')
  validateGameConfiguration(session)
}

export function validateItem(item: SessionItem): void {
  assert(item.payloadVersion === 1, 'unsupported payload version')
  assert(item.sessionId.length > 0, 'item sessionId is required')
  assert(GAME_IDS.includes(item.gameId), 'unknown item gameId')
  assert(Number.isInteger(item.index) && item.index >= 0, 'invalid item index')
  assert(ITEM_STATUSES.includes(item.status), 'unknown item status')
  if (item.outcome !== undefined) assert(OUTCOMES.includes(item.outcome), 'unknown item outcome')
  if (item.responseTimeMs !== undefined) assert(Number.isFinite(item.responseTimeMs) && item.responseTimeMs >= 0, 'invalid response time')
  if (item.startedAt !== undefined) assert(validIso(item.startedAt), 'invalid item start')
  if (item.completedAt !== undefined) assert(validIso(item.completedAt), 'invalid item completion')
  checkValue(item.payload, 'payload')
  REQUIRED_PAYLOAD_FIELDS[item.gameId].forEach(field => assert(Object.prototype.hasOwnProperty.call(item.payload, field), `${item.gameId} payload is missing ${field}`))
}

export function validateCompletedSession(value: CompletedSession): void {
  validateSession(value.session)
  assert(value.items.length === value.session.itemCount, 'item count mismatch')
  assert(value.items.filter(item => item.status !== 'not-completed').length === value.session.completedItemCount, 'completed item count mismatch')
  const indexes = new Set<number>()
  value.items.forEach(item => {
    validateItem(item)
    assert(item.sessionId === value.session.sessionId, 'item belongs to another session')
    assert(item.gameId === value.session.gameId, 'item belongs to another game')
    assert(!indexes.has(item.index), 'duplicate item index')
    indexes.add(item.index)
  })
}

export function normalizeSession(value: unknown): SessionResult {
  assert(Boolean(value && typeof value === 'object'), 'session must be an object')
  const raw = value as Partial<SessionResult> & { schemaVersion?: number }
  const normalized = raw.schemaVersion === 1 ? raw as SessionResult : {
    ...raw, schemaVersion: 1, status: 'completed', summary: raw.summary ?? {},
    itemCount: raw.itemCount ?? raw.completedItemCount ?? 0,
  } as SessionResult
  validateSession(normalized)
  return normalized
}

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`).join(',')}}`
  return JSON.stringify(value)
}
