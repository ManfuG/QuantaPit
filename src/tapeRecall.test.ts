import { describe, expect, it } from 'vitest'
import { generateTapeRecallQuestion, getTapeRecallLength, getTapeRecallModes, isTapeRecallAnswerCorrect, isValidTapeRecallAnswer, tapeRecallModeLabel, transformTapeSequence, type TapeRecallQuestion } from './tapeRecall'

describe('Tape Recall configuration', () => {
  it.each([['Easy', 5], ['Medium', 7], ['Hard', 9]] as const)('uses %s length %d', (difficulty, length) => {
    expect(getTapeRecallLength(difficulty)).toBe(length)
  })
  it('limits modes by difficulty', () => {
    expect(getTapeRecallModes('Easy')).toEqual(['original'])
    expect(getTapeRecallModes('Medium')).toEqual(['original', 'reverse'])
    expect(getTapeRecallModes('Hard')).toEqual(['original', 'reverse', 'alternate'])
  })
})

describe('Tape Recall generation', () => {
  it('generates the requested length and valid mode for every difficulty', () => {
    for (const difficulty of ['Easy', 'Medium', 'Hard'] as const) {
      for (let index = 0; index < 20; index += 1) {
        const question = generateTapeRecallQuestion(difficulty)
        expect(question.sequence).toMatch(new RegExp(`^\\d{${getTapeRecallLength(difficulty)}}$`))
        expect(getTapeRecallModes(difficulty)).toContain(question.mode)
        expect(question.expected).toBe(transformTapeSequence(question.sequence, question.mode))
      }
    }
  })
})

describe('Tape Recall transformations', () => {
  it('supports original, reverse and alternate positions', () => {
    expect(transformTapeSequence('12345', 'original')).toBe('12345')
    expect(transformTapeSequence('12345', 'reverse')).toBe('54321')
    expect(transformTapeSequence('123456', 'alternate')).toBe('135246')
  })
  it('preserves repeated digits and leading zeroes', () => {
    expect(transformTapeSequence('00100', 'reverse')).toBe('00100')
    const question: TapeRecallQuestion = { difficulty: 'Easy', length: 5, mode: 'original', sequence: '00100', expected: '00100' }
    expect(isTapeRecallAnswerCorrect('00100', question)).toBe(true)
  })
})

describe('Tape Recall input validation', () => {
  it.each(['', '1234', '123456', '12 34', '12,34', '12a45', '+12345'])('rejects invalid answer %j', value => {
    expect(isValidTapeRecallAnswer(value, 5)).toBe(false)
  })
  it('accepts exactly the requested digit count', () => {
    expect(isValidTapeRecallAnswer('00123', 5)).toBe(true)
    expect(isValidTapeRecallAnswer('0012300', 7)).toBe(true)
    expect(isValidTapeRecallAnswer('001230045', 9)).toBe(true)
  })
  it('labels every supported mode', () => {
    expect(tapeRecallModeLabel('original')).toBe('Original order')
    expect(tapeRecallModeLabel('reverse')).toBe('Reverse order')
    expect(tapeRecallModeLabel('alternate')).toBe('Alternate positions')
  })
})
