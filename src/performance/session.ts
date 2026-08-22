import { performanceRepository } from './repository'
import type { CompletedSession, Difficulty, GameId, ItemOutcome, ItemStatus, JsonObject, SessionItem, SessionSummary, TerminationReason } from './types'

export interface SessionDraft {
  sessionId: string
  gameId: GameId
  startedAt: number
  config: JsonObject
  difficulty?: Difficulty
  plannedDurationMs?: number
  plannedItemCount?: number
  completed?: CompletedSession
}

export function beginSession(gameId: GameId, config: JsonObject, options: { difficulty?: Difficulty; plannedDurationMs?: number; plannedItemCount?: number } = {}): SessionDraft {
  const draft = { sessionId: crypto.randomUUID(), gameId, startedAt: Date.now(), config, ...options }
  void performanceRepository().startAttempt({ sessionId: draft.sessionId, gameId, startedAt: new Date(draft.startedAt).toISOString(), config, difficulty: options.difficulty, plannedDurationMs: options.plannedDurationMs, plannedItemCount: options.plannedItemCount, state: 'active' }).catch(() => undefined)
  return draft
}

export interface RawItem {
  payload: unknown
  responseTimeMs?: number
  status?: ItemStatus
  outcome?: ItemOutcome
}

function jsonObject(value: unknown): JsonObject {
  const normalized = JSON.parse(JSON.stringify(value)) as unknown
  return normalized && typeof normalized === 'object' && !Array.isArray(normalized) ? normalized as JsonObject : { value: normalized }
}

export async function completeSession(draft: SessionDraft, rawItems: RawItem[], options: { terminationReason: TerminationReason; summary: SessionSummary; score?: number; actualDurationMs?: number }): Promise<void> {
  if (draft.completed) { await performanceRepository().complete(draft.completed); return }
  const completedAtMs = Date.now(); const completedAt = new Date(completedAtMs).toISOString()
  const items: SessionItem[] = rawItems.map((raw, index) => ({
    sessionId: draft.sessionId, gameId: draft.gameId, index, payloadVersion: 1,
    responseTimeMs: raw.responseTimeMs, status: raw.status ?? 'answered', outcome: raw.outcome,
    completedAt, payload: jsonObject(raw.payload),
  } as SessionItem))
  const value: CompletedSession = { session: {
    schemaVersion: 1, sessionId: draft.sessionId, gameId: draft.gameId,
    startedAt: new Date(draft.startedAt).toISOString(), completedAt, status: 'completed',
    terminationReason: options.terminationReason, config: draft.config, difficulty: draft.difficulty,
    plannedDurationMs: draft.plannedDurationMs, actualDurationMs: options.actualDurationMs ?? Math.max(0, completedAtMs - draft.startedAt),
    plannedItemCount: draft.plannedItemCount, completedItemCount: items.filter(item => item.status !== 'not-completed').length,
    itemCount: items.length, score: options.score, summary: options.summary,
  }, items }
  draft.completed = value
  await performanceRepository().complete(value)
}

export function median(values: number[]): number | undefined {
  if (!values.length) return undefined
  const sorted = [...values].sort((a, b) => a - b); const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

export function answerSummary(records: { correct: boolean; responseTimeMs?: number }[]): SessionSummary {
  const correctCount = records.filter(record => record.correct).length
  return {
    accuracy: records.length ? correctCount / records.length * 100 : undefined,
    correctCount, answeredCount: records.length,
    medianResponseTimeMs: median(records.map(record => record.responseTimeMs).filter((value): value is number => value !== undefined && value > 0)),
  }
}
