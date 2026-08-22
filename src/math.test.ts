import { describe, expect, it } from 'vitest'
import { formatNumber, generateQuestion, isCorrect, parseAnswer } from './math'

describe('answer parsing', () => {
  it('accepts decimal comma and equivalent fractions', () => {
    expect(parseAnswer(' 1,25 ')).toBe(1.25)
    expect(isCorrect('2/4', 0.5)).toBe(true)
    expect(isCorrect('0.51', 0.5)).toBe(false)
  })
  it('rejects invalid and zero-denominator answers', () => {
    expect(parseAnswer('')).toBeNull()
    expect(parseAnswer('1/0')).toBeNull()
    expect(isCorrect('hello', 1)).toBe(false)
  })
  it('formats whole and decimal values', () => {
    expect(formatNumber(8)).toBe('8')
    expect(formatNumber(1.5)).toBe('1.5')
  })
})

describe('question generation', () => {
  it('generates finite answers at every difficulty', () => {
    for (const difficulty of ['Easy', 'Medium', 'Hard'] as const) {
      for (let index = 0; index < 30; index += 1) {
        const question = generateQuestion(difficulty)
        expect(Number.isFinite(question.answer)).toBe(true)
        expect(question.text).not.toContain('÷ 0')
      }
    }
  })
})
