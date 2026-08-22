import type { GameId, SessionResult } from './types'
import { median } from './session'

export type Trend = { state: 'empty' | 'initial' | 'limited' | 'baseline' | 'comparison'; current?: number; previous?: number; delta?: number; sample: number }

export function primaryMetric(session: SessionResult): number | undefined {
  return typeof session.summary.primaryScore === 'number' ? session.summary.primaryScore
    : typeof session.summary.accuracy === 'number' ? session.summary.accuracy : session.score
}

export function trendFor(sessions: SessionResult[]): Trend {
  const values = sessions.map(primaryMetric).filter((value): value is number => value !== undefined)
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

export function itemWeightedAccuracy(sessions: SessionResult[]): number | undefined {
  const usable = sessions.filter(session => typeof session.summary.correctCount === 'number' && typeof session.summary.answeredCount === 'number')
  const answered = usable.reduce((sum, session) => sum + Number(session.summary.answeredCount), 0)
  return answered ? usable.reduce((sum, session) => sum + Number(session.summary.correctCount), 0) / answered * 100 : undefined
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
