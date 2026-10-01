import { GAME_IDS, type CompletedSession, type GameId, type SessionItem, type SessionResult } from './types'
import { roundConfigError, sessionConfigError } from '../gameConfig'
import { MAGNITUDE_QUESTIONS } from '../magnitudeForge'

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
  const config = session.config
  let target: number | undefined
  let plannedDuration: number | undefined
  if (['quick-math', 'sequences', 'radix-rush', 'tape-recall', 'foldsight'].includes(session.gameId)) {
    const duration = numberField(config.duration, 'duration')
    target = session.gameId === 'foldsight' && config.questions === undefined ? undefined : numberField(config.questions, 'questions')
    const error = sessionConfigError(duration, target)
    assert(!error, error)
    plannedDuration = duration * 60_000
    if (target !== undefined) assert(session.itemCount <= target, 'items exceed configured question target')
  } else if (session.gameId === 'magnitude-forge') {
    target = numberField(config.questions, 'questions')
    const seconds = numberField(config.secondsPerQuestion, 'secondsPerQuestion')
    const error = roundConfigError(target, seconds, MAGNITUDE_QUESTIONS.length)
    assert(!error, error)
    plannedDuration = target * seconds * 1000
    assert(session.itemCount === target && session.completedItemCount === target, 'Magnitude Forge requires the configured terminal item count')
  } else {
    target = numberField(config.rounds, 'rounds')
    // Existing market records omitted clocks; their original five-round defaults remain readable.
    const originalClocks = config.secondsPerRound === undefined && config.traderSeconds === undefined && config.marketMakerSeconds === undefined && target === 5
    const hidden = session.gameId === 'hidden-spread'
    const seconds = originalClocks ? 60 : numberField(hidden ? config.traderSeconds : config.secondsPerRound, 'round seconds')
    const quoteSeconds = hidden ? originalClocks ? 30 : numberField(config.marketMakerSeconds, 'quote seconds') : undefined
    const error = roundConfigError(target, seconds, Number.MAX_SAFE_INTEGER, quoteSeconds)
    assert(!error, error)
    if (!hidden) plannedDuration = target * seconds * 1000
    assert(session.itemCount === target && session.completedItemCount === target, 'market sessions require the configured terminal item count')
  }
  if (session.plannedItemCount !== undefined) assert(session.plannedItemCount === target, 'planned item count differs from configuration')
  if (session.plannedDurationMs !== undefined && plannedDuration !== undefined) assert(session.plannedDurationMs === plannedDuration, 'planned duration differs from configuration')
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

function record(value: unknown, path: string): asserts value is Record<string, unknown> {
  assert(value !== null && typeof value === 'object' && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null), `${path} must be an object`)
}

function jsonShape(value: unknown, path: string, ancestors = new Set<object>()): void {
  if (value !== null && typeof value === 'object') {
    assert(!ancestors.has(value), `${path} must not contain cycles`)
    ancestors.add(value)
    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index++) {
        assert(value[index] !== undefined, `${path}[${index}] must be a JSON value`)
        jsonShape(value[index], `${path}[${index}]`, ancestors)
      }
    } else {
      record(value, path)
      Object.entries(value).forEach(([key, entry]) => jsonShape(entry, `${path}.${key}`, ancestors))
    }
    ancestors.delete(value)
  } else checkValue(value, path)
}

function fieldType(value: Record<string, unknown>, name: string, type: 'string' | 'number' | 'boolean', optional = false): void {
  if (optional && value[name] === undefined) return
  assert(typeof value[name] === type, `${name} must be a ${type}`)
  if (type === 'number') assert(Number.isFinite(value[name]), `${name} must be finite`)
}

export function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const match = /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.exec(value)
  if (!match || !Number.isFinite(Date.parse(value))) return false
  const year = Number(match[1]); const month = Number(match[2]); const day = Number(match[3])
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const days = month === 2 ? leapYear ? 29 : 28 : [4, 6, 9, 11].includes(month) ? 30 : 31
  return month >= 1 && month <= 12 && day >= 1 && day <= days && value.slice(11, 13) !== '24'
}

// Check untrusted backup shapes before the existing typed semantic validators.
export function validateCompletedSessionShape(value: unknown): asserts value is CompletedSession {
  record(value, 'completed session')
  record(value.session, 'session')
  assert(Array.isArray(value.items), 'items must be an array')
  jsonShape(value, 'completed session')
  const session = value.session
  for (const name of ['sessionId', 'gameId', 'startedAt', 'completedAt', 'status', 'terminationReason']) fieldType(session, name, 'string')
  for (const name of ['schemaVersion', 'actualDurationMs', 'completedItemCount', 'itemCount']) fieldType(session, name, 'number')
  for (const name of ['difficulty', 'mode']) fieldType(session, name, 'string', true)
  for (const name of ['plannedDurationMs', 'plannedItemCount', 'score']) fieldType(session, name, 'number', true)
  record(session.config, 'config')
  record(session.summary, 'summary')
  for (const name of ['accuracy', 'primaryScore', 'medianResponseTimeMs']) fieldType(session.summary, name, 'number', true)
  assert(isIsoTimestamp(session.startedAt) && isIsoTimestamp(session.completedAt), 'timestamps must be ISO dates')
  for (const item of value.items) {
    record(item, 'item')
    for (const name of ['sessionId', 'gameId', 'status']) fieldType(item, name, 'string')
    for (const name of ['index', 'payloadVersion']) fieldType(item, name, 'number')
    fieldType(item, 'outcome', 'string', true)
    fieldType(item, 'responseTimeMs', 'number', true)
    for (const name of ['startedAt', 'completedAt']) {
      if (item[name] !== undefined) assert(isIsoTimestamp(item[name]), `${name} must be an ISO date`)
    }
    assert(GAME_IDS.includes(item.gameId as GameId), 'unknown item gameId')
    record(item.payload, 'payload')
    const payload = item.payload
    fieldType(payload, 'responseTimeMs', 'number')
    assert((payload.responseTimeMs as number) >= 0, 'payload response time must be non-negative')
    const gameId = item.gameId as GameId
    if (['quick-math', 'sequences', 'radix-rush', 'tape-recall', 'foldsight'].includes(gameId)) {
      fieldType(payload, 'given', 'string')
      fieldType(payload, 'correct', 'boolean')
    } else if (gameId === 'magnitude-forge') {
      for (const name of ['minimum', 'maximum']) if (payload[name] !== null) fieldType(payload, name, 'number')
      fieldType(payload, 'score', 'number')
      fieldType(payload, 'timedOut', 'boolean')
    } else {
      const stringFields = gameId === 'hidden-spread' ? ['maker', 'userRole']
        : gameId === 'basket-edge' ? ['opportunity', 'action'] : ['action']
      const numberFields = gameId === 'hidden-spread' ? ['budgetBefore', 'userBudget']
        : gameId === 'basket-edge' ? ['fairValue', 'budgetBefore', 'budget']
          : gameId === 'venue-gap' ? ['budgetBefore', 'budget']
            : ['initial', 'residual', 'cost', 'score', 'exposureReductionScore']
      stringFields.forEach(name => fieldType(payload, name, 'string'))
      numberFields.forEach(name => fieldType(payload, name, 'number'))
    }
    for (const name of REQUIRED_PAYLOAD_FIELDS[gameId]) assert(payload[name] !== undefined, `${gameId} payload is missing ${name}`)
  }
  validateCompletedSession(value as unknown as CompletedSession)
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
  if (value && typeof value === 'object') return `{${Object.entries(value).filter(([, entry]) => entry !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`).join(',')}}`
  return JSON.stringify(value)
}
