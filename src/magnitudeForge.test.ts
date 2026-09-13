import { describe, expect, it } from 'vitest'
import {
  averageFiveScores,
  averageScores,
  chooseMagnitudeQuestions,
  MAGNITUDE_QUESTIONS,
  parsePositiveInput,
  scoreQuestion,
  validateBounds,
} from './magnitudeForge'

describe('MagnitudeForge question bank', () => {
  it('contains 200 original questions with unique ids', () => {
    expect(MAGNITUDE_QUESTIONS).toHaveLength(200)
    expect(new Set(MAGNITUDE_QUESTIONS.map(question => question.id)).size).toBe(MAGNITUDE_QUESTIONS.length)
    for (const question of MAGNITUDE_QUESTIONS) {
      expect(question.text.length).toBeGreaterThan(0)
      expect(question.unit.length).toBeGreaterThan(0)
      expect(question.referenceValue).toBeGreaterThan(0)
      expect(question.note.length).toBeGreaterThan(0)
    }
  })

  it('covers every requested category', () => {
    expect(new Set(MAGNITUDE_QUESTIONS.map(question => question.category))).toEqual(new Set([
      'daily-life',
      'consumption/housing',
      'transport',
      'population/cities',
      'commerce/technology',
      'time/human activity',
    ]))
  })
})

describe('MagnitudeForge inputs and scoring', () => {
  it('parses positive decimals, decimal commas, and scientific notation', () => {
    expect(parsePositiveInput(' 1,25 ')).toBe(1.25)
    expect(parsePositiveInput('2.5e3')).toBe(2500)
    expect(parsePositiveInput('.75')).toBe(0.75)
    expect(parsePositiveInput('0')).toBeNull()
    expect(parsePositiveInput('-2')).toBeNull()
    expect(parsePositiveInput('not a number')).toBeNull()
  })

  it('validates positive ordered bounds', () => {
    expect(validateBounds(2, 10)).toBe(true)
    expect(validateBounds(10, 2)).toBe(false)
    expect(validateBounds(4, 4)).toBe(true)
    expect(validateBounds(0, 4)).toBe(false)
  })

  it('scores covered ranges using the width formula and misses as zero', () => {
    const question = MAGNITUDE_QUESTIONS[0]
    expect(scoreQuestion(question, question.referenceValue, question.referenceValue)).toBe(100)
    expect(scoreQuestion(question, 1, 10)).toBe(0)
    expect(scoreQuestion(question, 1, 10)).toBe(0)
    expect(scoreQuestion(question, 100, 10000)).toBeCloseTo(100 / 3)
  })

  it('averages five scores', () => {
    expect(averageScores([100, 80, 60, 40, 20])).toBe(60)
    expect(averageFiveScores([100, 80, 60, 40, 20])).toBe(60)
    expect(averageScores([])).toBe(0)
  })
})

describe('MagnitudeForge selection', () => {
  it('chooses five distinct questions', () => {
    const selected = chooseMagnitudeQuestions(5, () => 0.25)
    expect(selected).toHaveLength(5)
    expect(new Set(selected.map(question => question.id)).size).toBe(5)
    expect(selected.every(question => MAGNITUDE_QUESTIONS.includes(question))).toBe(true)
  })
  it('supports the entire bank without repeats and rejects invalid counts', () => {
    const selected = chooseMagnitudeQuestions(MAGNITUDE_QUESTIONS.length, () => 0.25)
    expect(new Set(selected.map(question => question.id))).toEqual(new Set(MAGNITUDE_QUESTIONS.map(question => question.id)))
    for (const count of [0, -1, 1.5, NaN, Infinity, MAGNITUDE_QUESTIONS.length + 1]) {
      expect(() => chooseMagnitudeQuestions(count)).toThrow(RangeError)
    }
  })
})
