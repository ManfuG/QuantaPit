import { describe, expect, it } from 'vitest'
import { GAME_DURATIONS, GAME_QUESTION_COUNTS, numericSettingError, roundConfigError, sessionConfigError } from './gameConfig'

describe('numeric settings', () => {
  it('accepts positive safe integers including both inclusive bounds', () => {
    expect(numericSettingError(1, 'Questions')).toBe('')
    expect(numericSettingError(37, 'Questions')).toBe('')
    expect(numericSettingError(Number.MAX_SAFE_INTEGER, 'Questions')).toBe('')
    expect(numericSettingError(0, 'Questions')).not.toBe('')
    expect(numericSettingError(Number.MAX_SAFE_INTEGER + 1, 'Questions')).not.toBe('')
  })

  it('rejects nonfinite values and fractional counts', () => {
    for (const value of [NaN, Infinity, -Infinity, 1.5]) {
      expect(numericSettingError(value, 'Questions')).not.toBe('')
    }
  })

  it('describes the invalid field, integer requirement, and allowed inclusive range', () => {
    const error = numericSettingError(2.5, 'Custom Rounds', 2, 17)
    expect(error).toContain('Custom Rounds')
    expect(error).toMatch(/whole number/i)
    expect(error).toContain('2')
    expect(error).toContain('17')
    expect(error).toMatch(/inclusive/i)
  })

  it('allows fractional values only when requested and still enforces bounds', () => {
    expect(numericSettingError(0.25, 'Duration', 0.25, 2.5, false)).toBe('')
    expect(numericSettingError(2.5, 'Duration', 0.25, 2.5, false)).toBe('')
    expect(numericSettingError(0.24, 'Duration', 0.25, 2.5, false)).not.toBe('')
    expect(numericSettingError(2.51, 'Duration', 0.25, 2.5, false)).not.toBe('')
    expect(numericSettingError(NaN, 'Duration', 0.25, 2.5, false)).not.toBe('')
  })
})

describe('timed session configuration', () => {
  it('accepts nonpreset duration and count choices and timer-only sessions', () => {
    expect(sessionConfigError(2.5, 37)).toBe('')
    expect(sessionConfigError(0.5)).toBe('')
  })

  it('accepts one second and rejects durations below it', () => {
    expect(sessionConfigError(1 / 60, 1)).toBe('')
    expect(sessionConfigError(0.999 / 60, 1)).not.toBe('')
    expect(sessionConfigError(0, 1)).not.toBe('')
    expect(sessionConfigError(-1, 1)).not.toBe('')
  })

  it('accepts the maximum safe minute duration but not the next minute', () => {
    const maxMinutes = Math.floor(Number.MAX_SAFE_INTEGER / 60_000)
    expect(sessionConfigError(maxMinutes)).toBe('')
    expect(sessionConfigError(maxMinutes + 1)).not.toBe('')
  })

  it('rejects nonfinite durations and requires a positive safe integer target when supplied', () => {
    for (const duration of [NaN, Infinity, -Infinity]) {
      expect(sessionConfigError(duration)).not.toBe('')
    }
    for (const questions of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      expect(sessionConfigError(1, questions)).not.toBe('')
    }
    expect(sessionConfigError(1, Number.MAX_SAFE_INTEGER)).toBe('')
  })

  it('keeps all existing duration and question presets valid', () => {
    for (const duration of GAME_DURATIONS) {
      for (const questions of GAME_QUESTION_COUNTS) {
        expect(sessionConfigError(duration, questions)).toBe('')
      }
    }
  })
})

describe('round configuration', () => {
  it('accepts nonpreset round and timer choices and existing game defaults', () => {
    expect(roundConfigError(13, 47, undefined, 19)).toBe('')
    expect(roundConfigError(1, 1, undefined, 1)).toBe('')
    expect(roundConfigError(5, 60)).toBe('')
    expect(roundConfigError(5, 60, undefined, 30)).toBe('')
  })

  it('enforces the inclusive question-bank bound', () => {
    expect(roundConfigError(17, 60, 17)).toBe('')
    expect(roundConfigError(18, 60, 17)).not.toBe('')
  })

  it('requires positive integer rounds and seconds in both timer fields', () => {
    for (const value of [0, -1, 1.5, NaN, Infinity, -Infinity]) {
      expect(roundConfigError(value, 1)).not.toBe('')
      expect(roundConfigError(1, value)).not.toBe('')
      expect(roundConfigError(1, 1, undefined, value)).not.toBe('')
    }
    expect(roundConfigError(Number.MAX_SAFE_INTEGER + 1, 1)).not.toBe('')
  })

  it('accepts the inclusive seconds limit but not the next second in either field', () => {
    const maxSeconds = Math.floor(Number.MAX_SAFE_INTEGER / 1000)
    expect(roundConfigError(1, maxSeconds)).toBe('')
    expect(roundConfigError(1, maxSeconds + 1)).not.toBe('')
    expect(roundConfigError(1, 1, undefined, maxSeconds)).toBe('')
    expect(roundConfigError(1, 1, undefined, maxSeconds + 1)).not.toBe('')
  })

  it('bounds aggregate milliseconds using the longer trading or quoting timer', () => {
    const maxRounds = Math.floor(Number.MAX_SAFE_INTEGER / 7000)
    expect(roundConfigError(maxRounds, 7)).toBe('')
    expect(roundConfigError(maxRounds, 1, undefined, 7)).toBe('')
    expect(roundConfigError(maxRounds, 7, undefined, 1)).toBe('')
    for (const error of [
      roundConfigError(maxRounds + 1, 7),
      roundConfigError(maxRounds + 1, 1, undefined, 7),
      roundConfigError(maxRounds + 1, 7, undefined, 1),
    ]) {
      expect(error).toMatch(/reduce rounds or time/i)
    }
  })
})
