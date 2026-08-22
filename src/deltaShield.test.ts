import { describe, expect, it } from 'vitest'
import {
  BALANCED_ROUND_INDEX,
  DELTA_SHIELD_ROUNDS,
  calculateExposure,
  calculateScenarioExposures,
  findOptimalHedge,
  findOptimalSolution,
  generateRound,
  generateRounds,
  positionCountFor,
  resolveAction,
  scoreHedge,
  validateHedgeTrade,
} from './deltaShield'

describe('Delta Shield domain', () => {
  it('uses three, five and seven positions by difficulty', () => {
    expect(positionCountFor('Easy')).toBe(3)
    expect(positionCountFor('Medium')).toBe(5)
    expect(positionCountFor('Hard')).toBe(7)
    expect(generateRound('Hard', 0, () => 0).positions).toHaveLength(7)
  })

  it('calculates signed position-shock exposure and scenario exposures', () => {
    const positions = [
      { id: 'a', quantity: 4, shock: -3 },
      { id: 'b', quantity: -2, shock: 5 },
    ]
    expect(calculateExposure(positions)).toBe(-22)
    expect(calculateScenarioExposures(positions, [1, -1])).toEqual([-22, 22])
  })

  it('validates and applies signed hedge trades', () => {
    expect(validateHedgeTrade({ quantity: 22 })).toBe(true)
    expect(validateHedgeTrade({ quantity: 501 })).toBe(false)
    expect(validateHedgeTrade({ quantity: 3, side: 'sell' })).toBe(true)
    expect(calculateExposure([{ id: 'a', quantity: 4, shock: -3 }], { quantity: 12 })).toBe(0)
  })

  it('finds the exact optimum by exhaustive integer search', () => {
    const solution = findOptimalSolution(-22)
    expect(solution.quantity).toBe(22)
    expect(solution.exposure).toBe(0)
    expect(solution.score).toBe(100)
    expect(solution.candidatesChecked).toBeGreaterThan(40)
    expect(findOptimalHedge(-22)).toBe(22)
  })

  it('gives skipped and timed-out rounds no score', () => {
    const round = generateRound('Easy', 0, () => 0)
    expect(resolveAction('skip', round)).toMatchObject({ trade: null, score: 0, exposure: round.initialExposure })
    expect(resolveAction('timeout', round)).toMatchObject({ trade: null, score: 0, exposure: round.initialExposure })
    expect(scoreHedge(round.initialExposure, findOptimalHedge(round))).toBe(100)
  })

  it('generates five deterministic rounds with a balanced round', () => {
    const first = generateRounds('Medium', () => 0.25)
    const second = generateRounds('Medium', () => 0.25)
    expect(first).toEqual(second)
    expect(first).toHaveLength(DELTA_SHIELD_ROUNDS)
    expect(first[BALANCED_ROUND_INDEX].balanced).toBe(true)
    expect(first[BALANCED_ROUND_INDEX].initialExposure).toBe(0)
  })
})
