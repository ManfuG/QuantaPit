import { describe, expect, it } from 'vitest'
import {
  generateQuestion,
  generateSequenceQuestion,
  isSequenceAnswerCorrect,
  parseIntegerAnswer,
  SEQUENCE_RULE_FAMILIES,
  type SequenceDifficulty,
} from './sequences'

describe('integer answer validation', () => {
  it.each([
    ['0', 0],
    ['+17', 17],
    ['-17', -17],
    ['  42  ', 42],
    ['0008', 8],
  ])('parses %j as %j', (input, expected) => {
    expect(parseIntegerAnswer(input)).toBe(expected)
  })

  it.each(['', '   ', '+', '-', '1.0', '-2.5', '1e3', '1,000', '12 34', 'hello', 'Infinity', 'NaN'])('rejects %j', input => {
    expect(parseIntegerAnswer(input)).toBeNull()
  })

  it('accepts only an exact integer match', () => {
    expect(isSequenceAnswerCorrect('+12', 12)).toBe(true)
    expect(isSequenceAnswerCorrect('-12', -12)).toBe(true)
    expect(isSequenceAnswerCorrect('12.0', 12)).toBe(false)
    expect(isSequenceAnswerCorrect('13', 12)).toBe(false)
    expect(isSequenceAnswerCorrect('', 12)).toBe(false)
  })
})

describe('procedural sequence generation', () => {
  const difficulties: SequenceDifficulty[] = ['Easy', 'Medium', 'Hard']

  it('returns a typed, finite, integer, non-degenerate question at every difficulty', () => {
    for (const difficulty of difficulties) {
      for (let index = 0; index < 40; index += 1) {
        const question = generateSequenceQuestion(difficulty)
        const displayedTerms = question.text.replace(', …', '').split(', ').map(Number)

        expect(question.text).toMatch(/, …$/)
        expect(question.sequence).toBe(question.text)
        expect(displayedTerms).toHaveLength(5)
        expect(displayedTerms.every(Number.isSafeInteger)).toBe(true)
        expect(Number.isSafeInteger(question.answer)).toBe(true)
        expect(Math.abs(question.answer)).toBeLessThanOrEqual(100_000)
        expect(new Set([...displayedTerms, question.answer]).size).toBeGreaterThan(1)
        expect(question.difficulty).toBe(difficulty)
        expect(question.rule.difficulty).toBe(difficulty)
        expect(question.ruleFamily).toBe(question.rule.family)
        expect(SEQUENCE_RULE_FAMILIES).toContain(question.rule.family)
      }
    }
  })

  it('balances every rule family within each difficulty', () => {
    for (const difficulty of difficulties) {
      const families = new Set<SequenceQuestionFamily>()
      for (let index = 0; index < SEQUENCE_RULE_FAMILIES.length; index += 1) {
        families.add(generateSequenceQuestion(difficulty).rule.family)
      }
      expect(families).toEqual(new Set(SEQUENCE_RULE_FAMILIES))
    }
  })

  it.each(difficulties)('produces every family for %s', difficulty => {
    const seen = new Set<string>()
    for (let index = 0; index < SEQUENCE_RULE_FAMILIES.length; index += 1) {
      const question = generateSequenceQuestion(difficulty)
      seen.add(question.rule.family)
      expect(question.rule.variant).not.toBe('')
      expect(isSequenceAnswerCorrect(String(question.answer), question.answer)).toBe(true)
    }
    expect(seen).toEqual(new Set(SEQUENCE_RULE_FAMILIES))
  })

  it('exposes the same behavior through the compatibility generator name', () => {
    const question = generateQuestion('Medium')
    expect(question.answer).toEqual(expect.any(Number))
    expect(question.text).toContain('…')
  })
})

type SequenceQuestionFamily = (typeof SEQUENCE_RULE_FAMILIES)[number]
