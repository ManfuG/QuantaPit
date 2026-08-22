import type { Difficulty } from './math'

export type TapeRecallMode = 'original' | 'reverse' | 'alternate'
export type TapeRecallSequence = Difficulty

export interface TapeRecallQuestion {
  difficulty: Difficulty
  length: 5 | 7 | 9
  mode: TapeRecallMode
  sequence: string
  expected: string
}

export const TAPE_RECALL_LENGTHS: Readonly<Record<Difficulty, 5 | 7 | 9>> = {
  Easy: 5,
  Medium: 7,
  Hard: 9,
}

export const TAPE_RECALL_MODES: Readonly<Record<Difficulty, readonly TapeRecallMode[]>> = {
  Easy: ['original'],
  Medium: ['original', 'reverse'],
  Hard: ['original', 'reverse', 'alternate'],
}

const randomDigit = () => String(Math.floor(Math.random() * 10))
const randomItem = <T,>(values: readonly T[]) => values[Math.floor(Math.random() * values.length)]

export function transformTapeSequence(sequence: string, mode: TapeRecallMode): string {
  if (!/^\d+$/.test(sequence)) throw new Error('Tape sequences must contain digits only.')
  if (mode === 'original') return sequence
  if (mode === 'reverse') return [...sequence].reverse().join('')
  return [...sequence].filter((_, index) => index % 2 === 0).concat([...sequence].filter((_, index) => index % 2 === 1)).join('')
}

export function getTapeRecallLength(difficulty: Difficulty): 5 | 7 | 9 {
  return TAPE_RECALL_LENGTHS[difficulty]
}

export function getTapeRecallModes(difficulty: Difficulty): readonly TapeRecallMode[] {
  return TAPE_RECALL_MODES[difficulty]
}

export function generateTapeRecallQuestion(difficulty: Difficulty): TapeRecallQuestion {
  const length = getTapeRecallLength(difficulty)
  const sequence = Array.from({ length }, randomDigit).join('')
  const mode = randomItem(getTapeRecallModes(difficulty))
  return { difficulty, length, mode, sequence, expected: transformTapeSequence(sequence, mode) }
}

export function isValidTapeRecallAnswer(value: string, length: number): boolean {
  return Number.isInteger(length) && length > 0 && new RegExp(`^\\d{${length}}$`).test(value)
}

export function isTapeRecallAnswerCorrect(value: string, question: TapeRecallQuestion): boolean {
  return isValidTapeRecallAnswer(value, question.length) && value === question.expected
}

export function tapeRecallModeLabel(mode: TapeRecallMode): string {
  if (mode === 'original') return 'Original order'
  if (mode === 'reverse') return 'Reverse order'
  return 'Alternate positions'
}
