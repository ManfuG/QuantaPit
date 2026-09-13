import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import App from './App'
import { MAGNITUDE_QUESTIONS } from './magnitudeForge'
import * as repositoryModule from './performance/repository'
import type { GameId } from './performance/types'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root | undefined
let repository: repositoryModule.IndexedDbPerformanceRepository
let completion: MockInstance<repositoryModule.PerformanceRepository['complete']>

const drills = ['quick-math', 'sequences', 'radix-rush', 'tape-recall'] as const
const markets = ['basket-edge', 'venue-gap', 'delta-shield'] as const
const logicPath = (game: string) => `/logic-and-math-games/${game}`
const marketPath = (game: string) => `/market-games/${game}`

beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory())
  repository = new repositoryModule.IndexedDbPerformanceRepository()
  vi.spyOn(repositoryModule, 'performanceRepository').mockReturnValue(repository)
  completion = vi.spyOn(repository, 'complete')
  // IndexedDB's asynchronous task queue stays real; only game clocks are controlled.
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
  vi.setSystemTime(new Date('2026-01-01T12:00:00Z'))
  let seed = 123456789
  vi.spyOn(Math, 'random').mockImplementation(() => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  })
})

afterEach(async () => {
  if (root) await act(async () => root!.unmount())
  root = undefined
  container?.remove()
  await Promise.all(completion.mock.results.map(result => result.value).filter(Boolean))
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function render(path: string) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(async () => root!.render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>))
}

function element<T extends Element = HTMLElement>(selector: string): T {
  const found = container.querySelector<T>(selector)
  if (!found) throw new Error(`Missing ${selector}`)
  return found
}

function input(name: string): HTMLInputElement {
  const found = [...container.querySelectorAll('input')].find(candidate =>
    candidate.getAttribute('aria-label') === name || [...(candidate.labels ?? [])].some(label => label.textContent?.trim() === name),
  )
  if (!found) throw new Error(`Missing input ${name}`)
  return found
}

async function fill(name: string, value: string) {
  const field = input(name)
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(field, value)
    field.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function click(selector: string) {
  await act(async () => element<HTMLElement>(selector).click())
}

async function tick(milliseconds: number) {
  await act(async () => { await vi.advanceTimersByTimeAsync(milliseconds) })
}

async function saved(gameId: GameId) {
  // Wait on actual writes, not a mock echo, before reading the validated consumer API.
  expect(completion).toHaveBeenCalledTimes(1)
  await act(async () => { await Promise.all(completion.mock.results.map(result => result.value)) })
  const data = await repository.getValidatedCompletedData({ gameId })
  expect(data.issues).toEqual([])
  expect(data.validSessions).toHaveLength(1)
  expect(container.querySelector('[role="timer"]')).toBeNull()
  expect(container.querySelector('.session-config')).not.toBeNull()
  return data.validSessions[0]
}

function progress(current: number, total: number) {
  const text = element('[class*="progress"]').textContent?.replace(/\s/g, '')
  expect(text).toContain(`${current}/${total}`)
}

async function answerDrill(game: typeof drills[number]) {
  if (game === 'tape-recall') {
    // Each digit's effect schedules the next one after React commits.
    for (let digit = 0; digit < 7; digit += 1) {
      await tick(500)
      if (digit < 6) await tick(120)
    }
  }
  await fill('Your answer', game === 'radix-rush' ? '0.0000' : game === 'tape-recall' ? '0000000' : '0')
  await click('button[type="submit"]')
  await tick(700)
}

describe('configuration rejects invalid sessions before creating an attempt', () => {
  const setups = [
    ...drills.map(game => ({ path: logicPath(game), count: 'Custom Questions', time: 'Custom Duration (min)', fractionalTime: '0.001' })),
    { path: logicPath('foldsight'), count: 'Custom Questions', time: 'Custom Duration (min)', fractionalTime: '0.001' },
    { path: logicPath('magnitude-forge'), count: 'Custom Questions', time: 'Custom Seconds per question', fractionalTime: '1.5' },
    ...markets.map(game => ({ path: marketPath(game), count: 'Custom Rounds', time: 'Custom Seconds per round', fractionalTime: '1.5' })),
    { path: marketPath('hidden-spread'), count: 'Custom Rounds', time: 'Custom Seconds to trade', fractionalTime: '1.5' },
  ]

  it.each(setups)('$path refuses invalid count and time without leaving setup', async ({ path, count, time, fractionalTime }) => {
    await render(path)
    if (path.endsWith('foldsight')) await act(async () => input('Limit questions').click())
    for (const value of ['', '0', '1.5', '9007199254740992']) {
      await fill(count, value)
      await click('.start-button')
      expect(container.querySelector('[role="alert"]')).not.toBeNull()
      expect(container.querySelector('[role="timer"]')).toBeNull()
    }
    await fill(count, '2')
    for (const value of ['', '0', fractionalTime]) {
      await fill(time, value)
      await click('.start-button')
      expect(container.querySelector('[role="alert"]')).not.toBeNull()
      expect(container.querySelector('[role="timer"]')).toBeNull()
    }
    expect(await repository.getAttempts()).toEqual([])
    expect(await repository.getCompletedSessions()).toEqual([])
  })

  it('rejects an invalid Hidden Spread maker clock independently of the trader clock', async () => {
    await render(marketPath('hidden-spread'))
    for (const value of ['', '0', '1.5']) {
      await fill('Custom Seconds to quote', value)
      await click('.start-button')
      expect(container.querySelector('[role="alert"]')).not.toBeNull()
      expect(container.querySelector('[role="timer"]')).toBeNull()
    }
    expect(await repository.getAttempts()).toEqual([])
  })
})

describe('timed drill limits', () => {
  it.each(drills)('%s ends at a custom question target before its custom timer', async game => {
    await render(logicPath(game))
    await fill('Custom Duration (min)', '0.5')
    await fill('Custom Questions', '2')
    await click('.start-button')
    progress(1, 2)
    expect(element('[role="timer"]').getAttribute('aria-label')).toBe('30 seconds remaining')
    await answerDrill(game)
    progress(2, 2)
    expect(await repository.getCompletedSessions()).toEqual([])
    await answerDrill(game)
    const { session, items } = await saved(game)
    expect(session).toMatchObject({ plannedDurationMs: 30000, plannedItemCount: 2, completedItemCount: 2, terminationReason: 'rounds-completed' })
    expect(session.actualDurationMs).toBeLessThan(30000)
    expect(items.map(item => item.status)).toEqual(['answered', 'answered'])
    expect(element('.score-line').textContent).toMatch(/Total\s*2/)
    expect(element('.session-config').textContent).toMatch(/2\s*questions/i)
  })

  it.each(drills)('%s starts a large target without allocating the entire session', async game => {
    await render(logicPath(game))
    await fill('Custom Questions', String(Number.MAX_SAFE_INTEGER))
    await fill('Custom Duration (min)', '0.02')
    await click('.start-button')
    progress(1, Number.MAX_SAFE_INTEGER)
    await tick(1200)
    expect((await saved(game)).session).toMatchObject({ plannedItemCount: Number.MAX_SAFE_INTEGER, completedItemCount: 0, terminationReason: 'time-limit' })
  })

  it.each(drills)('%s expires during the first question at a fractional-minute limit', async game => {
    await render(logicPath(game))
    await fill('Custom Duration (min)', '0.02')
    await fill('Custom Questions', '3')
    await click('.start-button')
    progress(1, 3)
    await tick(1100)
    expect(container.querySelector('[role="timer"]')).not.toBeNull()
    expect(await repository.getCompletedSessions()).toEqual([])
    await tick(100)
    const { session, items } = await saved(game)
    expect(session).toMatchObject({ plannedDurationMs: 1200, plannedItemCount: 3, actualDurationMs: 1200, completedItemCount: 0, terminationReason: 'time-limit' })
    expect(items).toEqual([])
    expect(element('.score-line').textContent).toMatch(/Total\s*0/)
  })

  it('keeps the default Quick Math session active until its one-minute deadline', async () => {
    await render(logicPath('quick-math'))
    await click('.start-button')
    progress(1, 10)
    await tick(59900)
    expect(element('[role="timer"]').getAttribute('aria-label')).toBe('1 seconds remaining')
    expect(await repository.getCompletedSessions()).toEqual([])
    await tick(100)
    expect((await saved('quick-math')).session).toMatchObject({ plannedDurationMs: 60000, plannedItemCount: 10, actualDurationMs: 60000, terminationReason: 'time-limit' })
  })
})

describe('FoldSight optional question limit', () => {
  it('ends after the selected answer count without generating another question', async () => {
    await render(logicPath('foldsight'))
    await fill('Custom Duration (min)', '0.5')
    await act(async () => input('Limit questions').click())
    await fill('Custom Questions', '2')
    await click('.start-button')
    await click('.cube-option')
    await tick(700)
    expect(element<HTMLButtonElement>('.cube-option').disabled).toBe(false)
    expect(await repository.getCompletedSessions()).toEqual([])
    await click('.cube-option')
    await tick(700)
    const { session, items } = await saved('foldsight')
    expect(session).toMatchObject({ plannedDurationMs: 30000, plannedItemCount: 2, completedItemCount: 2, terminationReason: 'rounds-completed' })
    expect(items).toHaveLength(2)
    expect(element('.score-line').textContent).toMatch(/Total\s*2/)
    await click('.actions button')
    expect(input('Limit questions').checked).toBe(true)
    await act(async () => input('Limit questions').click())
    await fill('Custom Duration (min)', '0.02')
    await click('.start-button')
    await tick(1200)
    await act(async () => { await Promise.all(completion.mock.results.map(result => result.value)) })
    const sessions = await repository.getCompletedSessions()
    const timerOnly = sessions.find(value => value.terminationReason === 'time-limit')!
    expect(timerOnly.plannedItemCount).toBeUndefined()
    expect(timerOnly.config.questions).toBeUndefined()
  })

  it('lets time win over an unfinished answer target, including active feedback', async () => {
    await render(logicPath('foldsight'))
    await fill('Custom Duration (min)', '0.02')
    await act(async () => input('Limit questions').click())
    await fill('Custom Questions', '3')
    await click('.start-button')
    await tick(1000)
    await click('.cube-option')
    await tick(200)
    await tick(500)
    const { session } = await saved('foldsight')
    expect(session).toMatchObject({ plannedDurationMs: 1200, plannedItemCount: 3, actualDurationMs: 1200, completedItemCount: 1, terminationReason: 'time-limit' })
  })

  it('defaults to timer-only play and continues after answers until one minute', async () => {
    await render(logicPath('foldsight'))
    await click('.start-button')
    await click('.cube-option')
    await tick(700)
    expect(element<HTMLButtonElement>('.cube-option').disabled).toBe(false)
    await tick(59300)
    const { session } = await saved('foldsight')
    expect(session).toMatchObject({ plannedDurationMs: 60000, actualDurationMs: 60000, completedItemCount: 1, terminationReason: 'time-limit' })
    expect(session.plannedItemCount).toBeUndefined()
  })
})

describe('Magnitude Forge bank and per-question limits', () => {
  it('rejects requests beyond the bank but accepts the complete bank', async () => {
    await render(logicPath('magnitude-forge'))
    await fill('Custom Questions', String(MAGNITUDE_QUESTIONS.length + 1))
    await click('.start-button')
    expect(container.querySelector('[role="alert"]')).not.toBeNull()
    expect(await repository.getAttempts()).toEqual([])
    await fill('Custom Questions', String(MAGNITUDE_QUESTIONS.length))
    await click('.start-button')
    progress(1, MAGNITUDE_QUESTIONS.length)
    expect(container.querySelector('[role="alert"]')).toBeNull()
  })

  it('resets a custom per-question clock and saves exactly the selected timed-out questions', async () => {
    await render(logicPath('magnitude-forge'))
    await fill('Custom Questions', '2')
    await fill('Custom Seconds per question', '2')
    await click('.start-button')
    progress(1, 2)
    await tick(1900)
    progress(1, 2)
    await tick(100)
    progress(2, 2)
    expect(element('[role="timer"]').textContent).toBe('2s')
    await tick(2000)
    const { session, items } = await saved('magnitude-forge')
    expect(session).toMatchObject({ plannedDurationMs: 4000, plannedItemCount: 2, completedItemCount: 2, summary: { timeoutCount: 2, primaryScore: 0 } })
    expect(items.map(item => [item.status, item.responseTimeMs])).toEqual([['timed-out', 2000], ['timed-out', 2000]])
    expect(container.querySelectorAll('.magnitude-summary > div')).toHaveLength(2)
    expect(element('.score-line').textContent).toMatch(/Timed out\s*2/)
  })

  it('retains five separate one-minute questions when started without changes', async () => {
    await render(logicPath('magnitude-forge'))
    await click('.start-button')
    for (let question = 1; question <= 5; question += 1) {
      progress(question, 5)
      await tick(59900)
      progress(question, 5)
      await tick(100)
    }
    expect((await saved('magnitude-forge')).session).toMatchObject({ plannedDurationMs: 300000, plannedItemCount: 5, completedItemCount: 5, summary: { timeoutCount: 5 } })
  })
})

describe('market round and clock configuration', () => {
  it.each(markets)('%s resets its custom clock for each selected round and persists terminal outcomes', async game => {
    await render(marketPath(game))
    await fill('Custom Rounds', '2')
    await fill('Custom Seconds per round', '2')
    await click('.start-button')
    for (let round = 1; round <= 2; round += 1) {
      progress(round, 2)
      expect(element('[role="timer"]').textContent).toBe('2s')
      await tick(1000)
      expect(element('[role="timer"]').textContent).toBe('1s')
      await tick(1000)
      await tick(game === 'basket-edge' ? 1000 : 1100)
    }
    const { session, items } = await saved(game)
    expect(session).toMatchObject({ plannedDurationMs: 4000, plannedItemCount: 2, completedItemCount: 2, terminationReason: 'rounds-completed', summary: { finalBudget: 10000 } })
    expect(items.map(item => [item.status, item.responseTimeMs])).toEqual([['timed-out', 2000], ['timed-out', 2000]])
    expect(element('.session-config').textContent).toMatch(/2\s*rounds/i)
    expect(container.textContent).toMatch(/Round 2/)
    expect(container.textContent).not.toMatch(/Round 3/)
  })

  it.each(markets)('%s retains five rounds with a one-minute clock when unchanged', async game => {
    await render(marketPath(game))
    await click('.start-button')
    for (let round = 1; round <= 5; round += 1) {
      progress(round, 5)
      expect(element('[role="timer"]').textContent).toBe('60s')
      await click('.skip')
      await tick(game === 'basket-edge' ? 1000 : 1100)
    }
    const { session, items } = await saved(game)
    expect(session).toMatchObject({ plannedItemCount: 5, completedItemCount: 5, terminationReason: 'rounds-completed' })
    expect(items.map(item => item.status)).toEqual(Array(5).fill('skipped'))
  })

  it('rotates all five Hidden Spread makers again beyond round five using each role clock', async () => {
    await render(marketPath('hidden-spread'))
    await fill('Custom Rounds', '7')
    await fill('Custom Seconds to trade', '2')
    await fill('Custom Seconds to quote', '1')
    await click('.start-button')
    const roles: string[] = []
    const responseTimes: number[] = []
    for (let round = 1; round <= 7; round += 1) {
      progress(round, 7)
      const role = element('.hidden-progress').textContent!.split('·')[1].trim()
      expect(role).toMatch(/^(You are market maker|Bot [1-4] is quoting)$/)
      roles.push(role)
      const seconds = role === 'You are market maker' ? 1 : 2
      responseTimes.push(seconds * 1000)
      expect(element('[role="timer"]').textContent).toBe(`${seconds}s`)
      for (let second = 0; second < seconds; second += 1) await tick(1000)
      await tick(1100)
    }
    expect(new Set(roles.slice(0, 5)).size).toBe(5)
    expect(roles.slice(5)).toEqual(roles.slice(0, 2))
    const { session, items } = await saved('hidden-spread')
    expect(session).toMatchObject({ plannedItemCount: 7, plannedDurationMs: responseTimes.reduce((sum, time) => sum + time, 0), completedItemCount: 7, terminationReason: 'rounds-completed', summary: { finalBudget: 10000 } })
    expect(items.map(item => item.responseTimeMs)).toEqual(responseTimes)
    expect(items.map(item => item.status)).toEqual(Array(7).fill('timed-out'))
    expect(container.querySelectorAll('.hidden-round-list > div')).toHaveLength(7)
    expect(element('.session-config').textContent).toMatch(/7\s*rounds/i)
  })

  it('retains five Hidden Spread rounds with distinct default maker and trader clocks', async () => {
    await render(marketPath('hidden-spread'))
    await click('.start-button')
    for (let round = 1; round <= 5; round += 1) {
      progress(round, 5)
      const maker = element('.hidden-progress').textContent!.includes('You are market maker')
      expect(element('[role="timer"]').textContent).toBe(maker ? '30s' : '60s')
      if (maker) {
        await fill('Bid', '1')
        await fill('Ask', '2')
        await click('button[type="submit"]')
      } else {
        await click('.hidden-skip')
      }
      await tick(1100)
    }
    const { session, items } = await saved('hidden-spread')
    expect(session).toMatchObject({ plannedDurationMs: 270000, plannedItemCount: 5, completedItemCount: 5, terminationReason: 'rounds-completed' })
    expect(items.filter(item => item.status === 'answered')).toHaveLength(1)
    expect(items.filter(item => item.status === 'skipped')).toHaveLength(4)
    expect(container.querySelectorAll('.hidden-round-list > div')).toHaveLength(5)
  })
})
