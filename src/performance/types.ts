export const GAME_IDS = ['quick-math', 'sequences', 'radix-rush', 'tape-recall', 'foldsight', 'magnitude-forge', 'hidden-spread', 'basket-edge', 'venue-gap', 'delta-shield'] as const
export type GameId = typeof GAME_IDS[number]
export type Difficulty = 'Easy' | 'Medium' | 'Hard'
export type TerminationReason = 'completed' | 'time-limit' | 'user-finished' | 'rounds-completed'
export type ItemStatus = 'answered' | 'skipped' | 'timed-out' | 'not-completed'
export type ItemOutcome = 'correct' | 'incorrect' | 'partial' | 'profitable' | 'unprofitable' | 'neutral'
export type JsonObject = Record<string, unknown>

interface SessionItemBase {
  sessionId: string
  index: number
  payloadVersion: 1
  startedAt?: string
  completedAt?: string
  responseTimeMs?: number
  status: ItemStatus
  outcome?: ItemOutcome
}
type AnswerPayload = JsonObject & { question: unknown; given: string; correct: boolean; responseTimeMs: number }
export interface GamePayloadMap {
  'quick-math': AnswerPayload
  sequences: AnswerPayload
  'radix-rush': AnswerPayload
  'tape-recall': AnswerPayload
  foldsight: AnswerPayload
  'magnitude-forge': JsonObject & { question: unknown; minimum: number | null; maximum: number | null; score: number; timedOut: boolean; responseTimeMs: number }
  'hidden-spread': JsonObject & { maker: string; userRole: string; quote: unknown; trades: unknown; budgetBefore: number; userBudget: number; responseTimeMs: number }
  'basket-edge': JsonObject & { fairValue: number; quote: unknown; opportunity: string; action: string; budgetBefore: number; budget: number; responseTimeMs: number }
  'venue-gap': JsonObject & { round: unknown; action: string; trade: unknown; budgetBefore: number; budget: number; responseTimeMs: number }
  'delta-shield': JsonObject & { round: unknown; action: string; initial: number; residual: number; cost: number; score: number; exposureReductionScore: number; responseTimeMs: number }
}
export type SessionItem = { [G in GameId]: SessionItemBase & { gameId: G; payload: GamePayloadMap[G] } }[GameId]

export interface SessionSummary extends JsonObject {
  accuracy?: number
  primaryScore?: number
  medianResponseTimeMs?: number
}

export interface SessionResult {
  schemaVersion: 1
  sessionId: string
  gameId: GameId
  startedAt: string
  completedAt: string
  status: 'completed'
  terminationReason: TerminationReason
  config: JsonObject
  difficulty?: Difficulty
  mode?: string
  plannedDurationMs?: number
  actualDurationMs: number
  plannedItemCount?: number
  completedItemCount: number
  itemCount: number
  score?: number
  summary: SessionSummary
}

export interface CompletedSession {
  session: SessionResult
  items: SessionItem[]
}

export interface AttemptMarker {
  sessionId: string
  gameId: GameId
  startedAt: string
  difficulty?: Difficulty
  config: JsonObject
  plannedDurationMs?: number
  plannedItemCount?: number
  state: 'active' | 'completed' | 'abandoned'
}

export interface SessionFilters {
  gameId?: GameId
  from?: string
  to?: string
}

export interface DataQualityIssue {
  sessionId?: string
  code: 'invalid-session' | 'invalid-items' | 'orphan-items'
  message: string
}
export interface ValidatedCompletedData {
  validSessions: CompletedSession[]
  issues: DataQualityIssue[]
}

export const GAME_NAMES: Record<GameId, string> = {
  'quick-math': 'Quick Math', sequences: 'Sequences', 'radix-rush': 'Radix Rush',
  'tape-recall': 'Tape Recall', foldsight: 'FoldSight', 'magnitude-forge': 'Magnitude Forge',
  'hidden-spread': 'Hidden Spread', 'basket-edge': 'Basket Edge', 'venue-gap': 'Venue Gap',
  'delta-shield': 'Delta Shield',
}
