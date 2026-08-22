import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SessionResult } from './types'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
const state = vi.hoisted(() => ({ sessions: [] as SessionResult[] }))
vi.mock('./repository', () => ({ performanceRepository: () => ({ getCompletedSessions: async () => state.sessions }) }))
import { Statistics } from '../App'

function session(index: number, gameId: SessionResult['gameId'] = 'quick-math', metric = index + 1): SessionResult {
  const date = new Date(Date.UTC(2025, 0, index + 1)).toISOString()
  return { schemaVersion: 1, sessionId: `${gameId}-${index}`, gameId, startedAt: date, completedAt: date, status: 'completed', terminationReason: 'rounds-completed', config: {}, actualDurationMs: 1000, completedItemCount: 1, itemCount: 1, summary: { accuracy: metric, correctCount: metric > 50 ? 1 : 0, answeredCount: 1 } }
}

let container: HTMLDivElement | undefined
async function render(path = '/statistics') {
  container = document.createElement('div'); document.body.append(container); const root = createRoot(container)
  await act(async () => { root.render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/statistics" element={<Statistics />} /><Route path="/statistics/:gameId" element={<Statistics />} /></Routes></MemoryRouter>); await Promise.resolve() })
  return { text: container.textContent ?? '', root }
}
afterEach(() => { container?.remove(); container = undefined; state.sessions = [] })

describe('Statistics UI', () => {
  it('renders an honest empty state', async () => { const { text, root } = await render(); expect(text).toContain('No performance is estimated'); await act(async () => root.unmount()) })
  it('shows the consecutive-day streak and removes redundant overview cards', async () => { state.sessions = [session(0), session(1)]; const { text, root } = await render(); expect(text).toContain('Consecutive days'); expect(text).toContain('2'); expect(text).not.toContain('Games practiced'); expect(text).not.toContain('Latest activity'); await act(async () => root.unmount()) })
  it('shows one real session without a conclusive trend and N/D where absent', async () => { state.sessions = [session(0, 'quick-math', 50)]; const { text, root } = await render('/statistics/quick-math'); expect(text).toContain('N/D'); expect(text).toContain('First session'); await act(async () => root.unmount()) })
  it('shows an initial sample trend for four sessions', async () => { state.sessions = Array.from({ length: 4 }, (_, index) => session(index, 'quick-math', index + 1)).reverse(); const { text, root } = await render('/statistics/quick-math'); expect(text).toContain('Initial sample (4)'); await act(async () => root.unmount()) })
  it('shows the five-session median', async () => { state.sessions = Array.from({ length: 5 }, (_, index) => session(index, 'quick-math', index + 1)).reverse(); const { text, root } = await render('/statistics/quick-math'); expect(text).toContain('Last-5 median 3.0'); await act(async () => root.unmount()) })
  it('compares two robust windows at ten sessions and filters by game', async () => { state.sessions = [...Array.from({ length: 10 }, (_, index) => session(index, 'quick-math', index + 1)).reverse(), session(11, 'venue-gap', 90)]; const { text, root } = await render('/statistics/quick-math'); expect(text).toContain('5.0 vs previous 5'); expect(text).not.toContain('Venue Gap'); await act(async () => root.unmount()) })
})
