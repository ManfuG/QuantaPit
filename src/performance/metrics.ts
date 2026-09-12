import type { Difficulty, GameId, SessionResult } from './types'
import { median } from './session'

export type Trend = { state: 'empty' | 'initial' | 'limited' | 'baseline' | 'comparison'; current?: number; previous?: number; delta?: number; sample: number }

export function primaryMetric(session: SessionResult): number | undefined {
  return typeof session.summary.primaryScore === 'number' ? session.summary.primaryScore
    : typeof session.summary.accuracy === 'number' ? session.summary.accuracy : session.score
}

export function trendFor(sessions: SessionResult[], metric = primaryMetric): Trend {
  const values = sessions.map(metric).filter((value): value is number => value !== undefined && Number.isFinite(value))
  if (!values.length) return { state: 'empty', sample: 0 }
  if (values.length === 1) return { state: 'initial', current: values[0], sample: 1 }
  if (values.length < 5) return { state: 'limited', current: values[0], previous: values[values.length - 1], sample: values.length }
  const current = median(values.slice(0, 5))!
  if (values.length < 10) return { state: 'baseline', current, sample: values.length }
  const previous = median(values.slice(5, 10))!
  return { state: 'comparison', current, previous, delta: current - previous, sample: values.length }
}

export interface GameStatistics {
  gameId: GameId
  sessions: number
  items: number
  latest: SessionResult
  metric?: number
  trend: Trend
}

export function statisticsByGame(sessions: SessionResult[]): GameStatistics[] {
  const groups = new Map<GameId, SessionResult[]>()
  sessions.forEach(session => groups.set(session.gameId, [...(groups.get(session.gameId) ?? []), session]))
  return [...groups.entries()].map(([gameId, values]) => ({ gameId, sessions: values.length, items: values.reduce((sum, value) => sum + value.completedItemCount, 0), latest: values[0], metric: primaryMetric(values[0]), trend: trendFor(values) }))
}

function localDayKey(date: Date) { return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}` }

export function consecutiveDayStreak(sessions: SessionResult[]): number {
  const dates = sessions.map(session => new Date(session.completedAt)).filter(date => !Number.isNaN(date.getTime()))
  const uniqueDays = new Set(dates.map(localDayKey))
  if (!dates.length) return 0
  const latest = new Date(Math.max(...dates.map(date => date.getTime())))
  let streak = 1
  while (true) {
    latest.setDate(latest.getDate() - 1)
    if (!uniqueDays.has(localDayKey(latest))) return streak
    streak += 1
  }
}

export type PerformanceMetric = 'accuracy' | 'score' | 'pnl'

const GAME_METRICS: Record<GameId, PerformanceMetric> = {
  'quick-math': 'accuracy', sequences: 'accuracy', 'radix-rush': 'accuracy',
  'tape-recall': 'accuracy', foldsight: 'accuracy', 'magnitude-forge': 'score',
  'hidden-spread': 'pnl', 'basket-edge': 'pnl', 'venue-gap': 'pnl', 'delta-shield': 'score',
}

export interface SessionInsight {
  session: SessionResult
  value?: number
  accuracy?: number
  responseTimeMs?: number
  completionRate?: number
}

function finite(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function percentage(value: unknown): number | undefined {
  const number = finite(value)
  return number !== undefined && number >= 0 && number <= 100 ? number : undefined
}

export function gameInsights(gameId: GameId, sessions: SessionResult[], difficulty?: Difficulty | 'Unspecified') {
  const metric = GAME_METRICS[gameId]
  const selected = sessions.filter(session => session.gameId === gameId && (difficulty === undefined || (difficulty === 'Unspecified' ? session.difficulty === undefined : session.difficulty === difficulty)))
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
  const valueFor = (session: SessionResult) => {
    if (metric === 'accuracy') return percentage(session.summary.accuracy)
    if (metric === 'pnl') return finite(session.summary.pnl) ?? finite(session.summary.primaryScore) ?? finite(session.score)
    return percentage(session.summary.primaryScore) ?? percentage(session.score)
  }
  const recent: SessionInsight[] = selected.slice(0, 20).map(session => {
    const response = finite(session.summary.medianResponseTimeMs)
    const target = session.plannedItemCount
    return {
      session, value: valueFor(session), accuracy: percentage(session.summary.accuracy),
      responseTimeMs: response !== undefined && response >= 0 ? response : undefined,
      completionRate: target !== undefined && target > 0
        ? percentage(session.completedItemCount / target * 100) : undefined,
    }
  })
  return {
    metric, recent, trend: trendFor(selected.slice(0, 10), valueFor), sessions: selected.length,
    items: selected.reduce((sum, session) => sum + session.completedItemCount, 0),
  }
}
