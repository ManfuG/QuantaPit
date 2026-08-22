import { describe, expect, it } from 'vitest'
import {
  formatRadixAnswer,
  generateRadixQuestion,
  getRadixPrecision,
  isRadixAnswerCorrect,
  parseRadixAnswer,
  roundFractionToScaled,
  type RadixDifficulty,
} from './radix'

describe('Radix Rush precision', () => {
  it.each([
    ['Easy', 3],
    ['Medium', 4],
    ['Hard', 5],
  ] as const)('maps %s to %d decimal places', (difficulty, precision) => {
    expect(getRadixPrecision(difficulty)).toBe(precision)
  })

  it('rejects unsupported precision values', () => {
    expect(() => roundFractionToScaled(1, 3, 2)).toThrow(RangeError)
    expect(() => parseRadixAnswer('0.125', 6)).toThrow(RangeError)
    expect(() => formatRadixAnswer(125, 0)).toThrow(RangeError)
    expect(() => isRadixAnswerCorrect('0.125', 125, 1)).toThrow(RangeError)
  })
})

describe('Radix Rush generation', () => {
  const difficulties: RadixDifficulty[] = ['Easy', 'Medium', 'Hard']

  it('generates positive proper fractions and matching formatted answers', () => {
    for (const difficulty of difficulties) {
      for (let index = 0; index < 50; index += 1) {
        const question = generateRadixQuestion(difficulty)
        expect(question.numerator).toBeGreaterThan(0)
        expect(question.numerator).toBeLessThan(question.denominator)
        expect(question.fraction).toEqual({
          numerator: question.numerator,
          denominator: question.denominator,
        })
        expect(question.precision).toBe(getRadixPrecision(difficulty))
        expect(question.answerText).toHaveLength(question.precision + 2)
        expect(parseRadixAnswer(question.answerText, question.precision)).toBe(question.answer)
        expect(question.expectedScaled).toBe(question.answer)
        expect(question.text).toBe(`${question.numerator}/${question.denominator}`)
      }
    }
  })
})

describe('Radix Rush integer-scaled rounding', () => {
  it('rounds with exact integer arithmetic and round-half-up ties', () => {
    expect(roundFractionToScaled(1, 8, 3)).toBe(125)
    expect(roundFractionToScaled(1, 6, 3)).toBe(167)
    expect(roundFractionToScaled(1, 40, 3)).toBe(25)
    expect(roundFractionToScaled(1, 80, 3)).toBe(13)
    expect(roundFractionToScaled(999, 1000, 3)).toBe(999)
  })
})

describe('Radix Rush answer parsing and formatting', () => {
  it('accepts comma or dot with exactly the required decimal digits', () => {
    expect(parseRadixAnswer(' 0.125 ', 3)).toBe(125)
    expect(parseRadixAnswer('0,125', 3)).toBe(125)
    expect(parseRadixAnswer('1.2500', 3)).toBeNull()
    expect(parseRadixAnswer('1.25', 3)).toBeNull()
    expect(parseRadixAnswer('1,250', 3)).toBe(1250)
  })

  it.each(['', '   ', 'hello', 'NaN', '1e3', '.125', '0.', '0.12x', '0.1,25', '-0.125'])('rejects invalid input %j', input => {
    expect(parseRadixAnswer(input, 3)).toBeNull()
  })

  it('keeps trailing zeros when formatting scaled answers', () => {
    expect(formatRadixAnswer(5, 3)).toBe('0.005')
    expect(formatRadixAnswer(1250, 4)).toBe('0.1250')
    expect(formatRadixAnswer(1000, 3)).toBe('1.000')
    expect(formatRadixAnswer(0, 5)).toBe('0.00000')
  })

  it('validates exact scaled equality without tolerance', () => {
    expect(isRadixAnswerCorrect('0.125', 125, 3)).toBe(true)
    expect(isRadixAnswerCorrect('0,125', 125, 3)).toBe(true)
    expect(isRadixAnswerCorrect('0.126', 125, 3)).toBe(false)
    expect(isRadixAnswerCorrect('0.12', 125, 3)).toBe(false)
    expect(isRadixAnswerCorrect('', 125, 3)).toBe(false)
  })
})
