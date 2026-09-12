import { useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { gameInsights, type PerformanceMetric, type SessionInsight, type Trend } from './metrics'
import { GAME_NAMES, type Difficulty, type GameId, type SessionResult } from './types'

const METRIC_LABELS: Record<PerformanceMetric, string> = { accuracy: 'Accuracy', score: 'Score', pnl: 'P&L' }

function metricText(value: number | undefined, metric: PerformanceMetric) {
  if (value === undefined) return 'N/D'
  return `${value.toFixed(1)}${metric === 'accuracy' ? '%' : metric === 'score' ? ' / 100' : ' units'}`
}

export function TrendLabel({ trend }: { trend: Trend }) {
  if (trend.state === 'empty') return <>N/D</>
  if (trend.state === 'initial') return <>First session</>
  if (trend.state === 'limited') return <>Initial sample ({trend.sample})</>
  if (trend.state === 'baseline') return <>Last-5 median {trend.current?.toFixed(1)}</>
  return <>{trend.delta! > 0 ? '↑' : trend.delta! < 0 ? '↓' : '→'} {Math.abs(trend.delta!).toFixed(1)} vs previous 5</>
}

function PerformanceChart({ recent, metric, name }: { recent: SessionInsight[]; metric: PerformanceMetric; name: string }) {
  const points = recent.slice().reverse()
  const values = points.flatMap(point => point.value === undefined ? [] : [point.value])
  if (!values.length) return <p className="statistics-chart-empty">No recorded {METRIC_LABELS[metric].toLowerCase()} yet.</p>
  const min = metric === 'pnl' ? Math.min(0, ...values) : 0
  const max = metric === 'pnl' ? Math.max(0, ...values) || (min < 0 ? 0 : 1) : 100
  const y = (value: number) => 12 + (max - value) / (max - min) * 156
  const ticks = Array.from({ length: 5 }, (_, index) => max - (max - min) * index / 4)
  const x = (index: number) => points.length === 1 ? 300 : 20 + index / (points.length - 1) * 560
  const line = points.map((point, index) => point.value === undefined ? '' : `${index === 0 || points[index - 1].value === undefined ? 'M' : 'L'}${x(index)},${y(point.value)}`).join(' ')
  const description = points.map(point => `${new Date(point.session.completedAt).toLocaleDateString()}: ${metricText(point.value, metric)}`).join('; ')
  return <>
    <div className="statistics-chart-plot">
    <div className="statistics-chart-scale">{ticks.map(value => <span key={value}>{metricText(value, metric)}</span>)}</div>
    <svg className="statistics-chart" viewBox="0 0 600 180" preserveAspectRatio="none" role="img" aria-label={`${name} ${METRIC_LABELS[metric]}, oldest to newest. ${description}`}>
      {ticks.map(value => <line key={value} x1="20" x2="580" y1={y(value)} y2={y(value)} className="statistics-chart-grid" />)}
      {[0, 1, 2, 3, 4].map(index => <line key={index} x1={20 + index * 140} x2={20 + index * 140} y1="12" y2="168" className="statistics-chart-grid" />)}
      <line x1="20" x2="580" y1={y(0)} y2={y(0)} className="statistics-chart-zero" />
      <path d={line} className="statistics-chart-line" />
      {points.map((point, index) => {
        if (point.value === undefined) return <text key={point.session.sessionId} x={x(index)} y="96" textAnchor="middle" className="statistics-chart-missing">—</text>
        return <g key={point.session.sessionId}>
          <title>{new Date(point.session.completedAt).toLocaleString()} · {metricText(point.value, metric)}</title>
          <circle cx={x(index)} cy={y(point.value)} r="3" className={point.value < 0 ? 'statistics-chart-negative' : undefined} />
        </g>
      })}
    </svg>
    </div>
    <div className="statistics-chart-dates"><span>{new Date(points[0].session.completedAt).toLocaleDateString()}</span>{points.length > 1 && <span>{new Date(points[points.length - 1].session.completedAt).toLocaleDateString()}</span>}</div>
    {(points.length === 1 || values.length < points.length) && <p className="statistics-chart-note">{points.length === 1 && 'One session. No comparison yet.'}{values.length < points.length && ' — Not recorded.'}</p>}
  </>
}

export function StatisticsDetail({ gameId, sessions }: { gameId: GameId; sessions: SessionResult[] }) {
  const fixed = gameId === 'foldsight' || gameId === 'magnitude-forge'
  const gameSessions = useMemo(() => sessions.filter(session => session.gameId === gameId), [gameId, sessions])
  const [difficulty, setDifficulty] = useState<Difficulty | 'Unspecified'>(() => {
    const latest = gameSessions.reduce<SessionResult | undefined>((current, session) => !current || session.completedAt > current.completedAt ? session : current, undefined)
    return latest ? latest.difficulty ?? 'Unspecified' : 'Easy'
  })
  const difficulties: (Difficulty | 'Unspecified')[] = ['Easy', 'Medium', 'Hard']
  if (gameSessions.some(session => session.difficulty === undefined)) difficulties.push('Unspecified')
  const insights = useMemo(() => gameInsights(gameId, gameSessions, fixed ? undefined : difficulty), [gameId, gameSessions, fixed, difficulty])
  const { recent, metric } = insights
  const name = GAME_NAMES[gameId]
  const market = ['hidden-spread', 'basket-edge', 'venue-gap', 'delta-shield'].includes(gameId)
  return <section className="page statistics-page statistics-detail">
    <p className="eyebrow">STATISTICS / GAME DETAIL</p><h1>{name}</h1>
    <NavLink className="statistics-back" to="/statistics">← Overview</NavLink>
    {!fixed && <div className="statistics-difficulties" role="group" aria-label="Session difficulty">{difficulties.map(value => <button key={value} type="button" aria-pressed={difficulty === value} onClick={() => setDifficulty(value)}>{value}</button>)}</div>}
    {!recent.length ? <div className="statistics-empty"><p>{fixed ? 'No completed sessions yet.' : `No ${difficulty.toLowerCase()} sessions yet.`}</p><NavLink to={`/${market ? 'market-games' : 'logic-and-math-games'}/${gameId}`}>Play {name}</NavLink></div> : <>
      <div className="statistics-metrics">
        <div><span>Sessions</span><strong>{insights.sessions}</strong></div>
        <div><span>Items / rounds</span><strong>{insights.items}</strong></div>
        <div><span>Latest {METRIC_LABELS[metric].toLowerCase()}</span><strong>{metricText(recent[0].value, metric)}</strong></div>
      </div>
      <figure className="statistics-figure">
        <figcaption><h2>{METRIC_LABELS[metric]} by session</h2><span>Last {recent.length} · <TrendLabel trend={insights.trend} /></span></figcaption>
        <PerformanceChart recent={recent} metric={metric} name={fixed ? name : `${name} ${difficulty}`} />
      </figure>
      <h2>Recent sessions</h2>
      <div className="statistics-history">
        {recent.map(({ session, value, accuracy, responseTimeMs, completionRate }) => <details key={session.sessionId}>
          <summary><span>{new Date(session.completedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span><span>{session.difficulty ?? (gameId === 'foldsight' || gameId === 'magnitude-forge' ? 'Fixed' : 'N/D')}</span><strong>{metricText(value, metric)}</strong></summary>
          <dl className="statistics-session-facts">
            {metric !== 'accuracy' && accuracy !== undefined && <div><dt>Accuracy</dt><dd>{accuracy.toFixed(1)}%</dd></div>}
            <div><dt>Median response</dt><dd>{responseTimeMs === undefined ? 'N/D' : `${(responseTimeMs / 1000).toFixed(2)} s`}</dd></div>
            <div><dt>Items / target</dt><dd>{session.completedItemCount} / {session.plannedItemCount ?? 'N/D'}</dd></div>
            <div><dt title="Recorded items / planned items, including skipped and timed-out rounds">Completion</dt><dd>{completionRate === undefined ? 'N/D' : `${completionRate.toFixed(0)}%`}</dd></div>
            <div><dt>Duration</dt><dd>{(session.actualDurationMs / 1000).toFixed(0)} s</dd></div>
          </dl>
          <p className="statistics-session-note">Completion counts skipped and timed-out rounds. N/D: not recorded or not applicable.</p>
        </details>)}
      </div>
    </>}
  </section>
}
