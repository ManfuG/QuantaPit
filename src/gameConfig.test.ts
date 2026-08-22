import { describe, expect, it } from 'vitest'
import { GAME_DURATIONS, GAME_QUESTION_COUNTS } from './gameConfig'

describe('game configuration', () => {
  it('exposes the requested shared options', () => {
    expect(GAME_DURATIONS).toEqual([1, 5, 8])
    expect(GAME_QUESTION_COUNTS).toEqual([10, 50, 80])
  })
})
