import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GAME_IDS, GAME_NAMES, type SessionResult } from './types'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
const state = vi.hoisted(() => ({ sessions: [] as SessionResult[] }))
vi.mock('./repository', () => ({ performanceRepository: () => ({ getCompletedSessions: async () => state.sessions }) }))
import { Statistics } from '../App'

function session(index: number, gameId: SessionResult['gameId'] = 'quick-math', metric = index + 1): SessionResult {
  const date = new Date(Date.UTC(2025, 0, index + 1)).toISOString()
  return { schemaVersion: 1, sessionId: `${gameId}-${index}`, gameId, startedAt: date, completedAt: date, status: 'completed', terminationReason: 'rounds-completed', config: {}, actualDurationMs: 1000, completedItemCount: 1, itemCount: 1, summary: { accuracy: metric, primaryScore: metric, correctCount: metric > 50 ? 1 : 0, answeredCount: 1 } }
}

let container: HTMLDivElement
let root: Root
async function render(path = '/statistics') {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(async () => {
    root.render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/statistics" element={<Statistics />} /><Route path="/statistics/:gameId" element={<Statistics />} /></Routes></MemoryRouter>)
  })
  return container
}
afterEach(async () => { if (root) await act(async () => root.unmount()); container?.remove(); state.sessions = [] })

describe('Statistics UI', () => {
  it('keeps the empty overview linked to playable games without estimated values', async () => {
    await render()
    expect([...container.querySelectorAll('a')].map(link => link.getAttribute('href'))).toEqual(['/logic-and-math-games', '/market-games'])
    expect(container.querySelector('.statistics-overview')).toBeNull()
  })
  it('shows the consecutive-day streak rather than duplicate activity cards', async () => {
    state.sessions = [session(0), session(1)]
    await render()
    const cards = [...container.querySelectorAll('.statistics-overview > div')]
    expect(cards.map(card => card.querySelector('span')?.textContent)).toEqual(['Completed sessions', 'Consecutive days'])
    expect(cards.map(card => card.querySelector('strong')?.textContent)).toEqual(['2', '2'])
  })
  it.each(GAME_IDS)('provides an honest empty detail and correct play route for %s', async gameId => {
    state.sessions = [session(0, gameId === 'quick-math' ? 'venue-gap' : 'quick-math')]
    await render(`/statistics/${gameId}`)
    expect(container.querySelector('h1')?.textContent).toBe(GAME_NAMES[gameId])
    expect(container.querySelector('[role="img"]')).toBeNull()
    const market = ['hidden-spread', 'basket-edge', 'venue-gap', 'delta-shield'].includes(gameId)
    expect(container.querySelector('.statistics-empty a')?.getAttribute('href')).toBe(`/${market ? 'market-games' : 'logic-and-math-games'}/${gameId}`)
    expect(container.querySelector('details')).toBeNull()
  })
  it.each(GAME_IDS)('renders a correctly labelled single-session chart for %s', async gameId => {
    state.sessions = [session(0, gameId, 50)]
    await render(`/statistics/${gameId}`)
    const metric = ['hidden-spread', 'basket-edge', 'venue-gap'].includes(gameId) ? 'P&L' : ['magnitude-forge', 'delta-shield'].includes(gameId) ? 'Score' : 'Accuracy'
    const chart = container.querySelector('[role="img"]')
    expect(chart?.getAttribute('aria-label')).toContain(`${GAME_NAMES[gameId]} ${metric}`)
    expect(chart?.getAttribute('aria-label')).toContain(metric === 'P&L' ? '50.0 units' : metric === 'Score' ? '50.0 / 100' : '50.0%')
    expect(container.querySelector('.statistics-chart-note')?.textContent).toContain('No comparison')
    expect(container.querySelector('details')?.open).toBe(false)
  })
  it('orders and limits visible sessions without mixing games or losing all-time counts', async () => {
    state.sessions = [...Array.from({ length: 12 }, (_, index) => session(index, 'quick-math', index * 5)), session(20, 'venue-gap', 99)]
    await render('/statistics/quick-math')
    const label = container.querySelector('[role="img"]')!.getAttribute('aria-label')!
    expect(label.indexOf('10.0%')).toBeLessThan(label.indexOf('55.0%'))
    expect(label).not.toContain('99.0')
    expect(container.querySelectorAll('details')).toHaveLength(10)
    expect(container.querySelector('summary strong')?.textContent).toBe('55.0%')
    expect(container.querySelector('.statistics-metrics strong')?.textContent).toBe('12')
    expect(container.textContent).not.toContain('Venue Gap')
  })
  it('makes session insights available on expansion, including partial completion', async () => {
    const value = session(0, 'basket-edge', 80)
    value.summary = { pnl: -25, accuracy: 80, medianResponseTimeMs: 1250 }
    value.plannedItemCount = 5
    value.completedItemCount = 3
    state.sessions = [value]
    await render('/statistics/basket-edge')
    const details = container.querySelector('details')!
    await act(async () => details.querySelector('summary')!.click())
    expect(details.open).toBe(true)
    const facts = Object.fromEntries([...details.querySelectorAll('dl > div')].map(fact => [fact.querySelector('dt')?.textContent, fact.querySelector('dd')?.textContent]))
    expect(facts).toMatchObject({ Accuracy: '80.0%', 'Median response': '1.25 s', 'Items / target': '3 / 5', Completion: '60%' })
    expect(details.querySelector('strong')?.textContent).toBe('-25.0 units')
  })
  it('distinguishes an unavailable metric from a real zero and keeps missing response and target honest', async () => {
    const absent = session(1)
    absent.summary = {}
    state.sessions = [absent, session(0, 'quick-math', 0)]
    await render('/statistics/quick-math')
    const label = container.querySelector('[role="img"]')!.getAttribute('aria-label')!
    expect(label).toContain('0.0%')
    expect(label).toContain('N/D')
    expect(container.querySelector('.statistics-metrics > div:last-child strong')?.textContent).toBe('N/D')
    const missing = container.querySelector('details')!
    expect([...missing.querySelectorAll('dd')].map(value => value.textContent)).toEqual(['N/D', '1 / N/D', 'N/D', '1 s'])
  })
  it('does not invent a chart when completed sessions have no primary metric', async () => {
    const value = session(0, 'hidden-spread')
    value.summary = { accuracy: 90 }
    state.sessions = [value]
    await render('/statistics/hidden-spread')
    expect(container.querySelector('[role="img"]')).toBeNull()
    expect(container.querySelector('.statistics-chart-empty')?.textContent).toContain('No recorded')
    expect(container.querySelectorAll('details')).toHaveLength(1)
  })
  it('compares recent median windows in the game metric, not secondary accuracy', async () => {
    state.sessions = Array.from({ length: 10 }, (_, index) => ({ ...session(index, 'venue-gap'), summary: { pnl: index * 10, accuracy: 100 - index } }))
    await render('/statistics/venue-gap')
    expect(container.querySelector('figcaption')?.textContent).toContain('50.0 vs previous 5')
  })
})
