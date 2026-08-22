import type { Difficulty } from './math'

export type SequenceDifficulty = Difficulty

export type SequenceRuleFamily = 'arithmetic' | 'geometric' | 'alternating' | 'recursive'

export const SEQUENCE_RULE_FAMILIES: readonly SequenceRuleFamily[] = [
  'arithmetic',
  'geometric',
  'alternating',
  'recursive',
] as const

export interface SequenceRuleMetadata {
  family: SequenceRuleFamily
  variant: string
  difficulty: SequenceDifficulty
}

export interface SequenceQuestion {
  /** The sequence shown to the player, including the missing next-term marker. */
  text: string
  /** Alias for consumers that refer to the prompt as a sequence. */
  sequence: string
  /** The unique next term for the generated rule. */
  answer: number
  rule: SequenceRuleMetadata
  /** Convenient access to the rule family without exposing its implementation. */
  ruleFamily: SequenceRuleFamily
  difficulty: SequenceDifficulty
}

const DISPLAYED_TERMS = 5
const MAX_ABS_TERM = 100_000
const familyIndexes: Record<SequenceDifficulty, number> = { Easy: 0, Medium: 0, Hard: 0 }

const randomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min
const pick = <T>(items: readonly T[]): T => items[randomInt(0, items.length - 1)]
const signedChoice = (magnitude: number): number => (Math.random() < 0.5 ? -magnitude : magnitude)

const isReasonableInteger = (value: number): boolean =>
  Number.isSafeInteger(value) && Math.abs(value) <= MAX_ABS_TERM

const ensureSequence = (values: number[]): number[] => {
  if (values.length !== DISPLAYED_TERMS + 1 || values.some(value => !isReasonableInteger(value))) {
    throw new Error('Sequence generator produced an invalid term.')
  }
  if (new Set(values).size === 1 || values[values.length - 1] === values[values.length - 2]) {
    throw new Error('Sequence generator produced a degenerate rule.')
  }
  return values
}

const arithmeticSequence = (difficulty: SequenceDifficulty): { values: number[]; variant: string } => {
  const start = randomInt(-24, 24)
  if (difficulty === 'Easy') {
    const difference = signedChoice(randomInt(1, 8))
    return {
      values: Array.from({ length: DISPLAYED_TERMS + 1 }, (_, index) => start + difference * index),
      variant: 'constant-difference',
    }
  }

  if (difficulty === 'Medium') {
    const secondDifference = signedChoice(pick([2, 4, 6]))
    const initialDifference = signedChoice(randomInt(1, 8))
    const values = [start]
    let difference = initialDifference
    for (let index = 0; index < DISPLAYED_TERMS; index += 1) {
      values.push(values[index] + difference)
      difference += secondDifference
    }
    return { values, variant: 'changing-difference' }
  }

  const thirdDifference = signedChoice(pick([2, 3, 4]))
  const initialDifference = signedChoice(randomInt(2, 10))
  const secondDifference = signedChoice(randomInt(1, 5))
  const values = [start]
  let difference = initialDifference
  let change = secondDifference
  for (let index = 0; index < DISPLAYED_TERMS; index += 1) {
    values.push(values[index] + difference)
    difference += change
    change += thirdDifference
  }
  return { values, variant: 'cubic-difference' }
}

const geometricSequence = (difficulty: SequenceDifficulty): { values: number[]; variant: string } => {
  if (difficulty === 'Easy') {
    const ratio = pick([2, 3])
    const start = randomInt(1, 8)
    return {
      values: Array.from({ length: DISPLAYED_TERMS + 1 }, (_, index) => start * ratio ** index),
      variant: 'constant-multiplier',
    }
  }

  if (difficulty === 'Medium') {
    // Starting at a multiple of 2^6 keeps every displayed division integral.
    const start = randomInt(1, 4) * 2 ** DISPLAYED_TERMS
    return {
      values: Array.from({ length: DISPLAYED_TERMS + 1 }, (_, index) => start / 2 ** index),
      variant: 'constant-divisor',
    }
  }

  const first = pick([2, 3])
  const second = pick([2, 3])
  const start = randomInt(1, 4)
  const values = [start]
  for (let index = 0; index < DISPLAYED_TERMS; index += 1) {
    values.push(values[index] * (index % 2 === 0 ? first : second))
  }
  return { values, variant: 'alternating-multipliers' }
}

const alternatingSequence = (difficulty: SequenceDifficulty): { values: number[]; variant: string } => {
  if (difficulty === 'Easy') {
    const firstChange = signedChoice(randomInt(1, 7))
    let secondChange = signedChoice(randomInt(1, 7))
    while (secondChange === firstChange) secondChange = signedChoice(randomInt(1, 7))
    const values = [randomInt(-12, 12)]
    for (let index = 0; index < DISPLAYED_TERMS; index += 1) {
      values.push(values[index] + (index % 2 === 0 ? firstChange : secondChange))
    }
    return { values, variant: 'two-alternating-differences' }
  }

  if (difficulty === 'Medium') {
    const addition = signedChoice(randomInt(1, 6))
    const multiplier = pick([2, 3])
    const values = [randomInt(1, 8)]
    for (let index = 0; index < DISPLAYED_TERMS; index += 1) {
      values.push(index % 2 === 0 ? values[index] + addition : values[index] * multiplier)
    }
    return { values, variant: 'alternating-addition-and-multiplication' }
  }

  // Two independent arithmetic subsequences are interleaved. The next term
  // continues the odd-position subsequence, making the rule deterministic.
  const evenStart = randomInt(-20, 20)
  const oddStart = randomInt(-20, 20)
  const evenDifference = signedChoice(randomInt(2, 10))
  const oddDifference = signedChoice(randomInt(2, 10))
  const values = Array.from({ length: DISPLAYED_TERMS + 1 }, (_, index) => {
    const position = Math.floor(index / 2)
    return index % 2 === 0 ? evenStart + position * evenDifference : oddStart + position * oddDifference
  })
  return { values, variant: 'interleaved-arithmetic-subsequences' }
}

const recursiveSequence = (difficulty: SequenceDifficulty): { values: number[]; variant: string } => {
  const coefficients = difficulty === 'Easy'
    ? [1, 1]
    : difficulty === 'Medium'
      ? [pick([1, 1, 2]), pick([1, -1])]
      : [pick([1, 2]), pick([1, 2, -1])]
  const first = randomInt(1, 5)
  const second = randomInt(1, 5)
  const values = [first, second]
  for (let index = 2; index < DISPLAYED_TERMS + 1; index += 1) {
    values.push(coefficients[0] * values[index - 1] + coefficients[1] * values[index - 2])
  }
  return {
    values,
    variant: difficulty === 'Easy' ? 'fibonacci-recurrence' : 'coefficient-recurrence',
  }
}

const generateValues = (family: SequenceRuleFamily, difficulty: SequenceDifficulty) => {
  switch (family) {
    case 'arithmetic': return arithmeticSequence(difficulty)
    case 'geometric': return geometricSequence(difficulty)
    case 'alternating': return alternatingSequence(difficulty)
    case 'recursive': return recursiveSequence(difficulty)
  }
}

export function generateSequenceQuestion(difficulty: SequenceDifficulty): SequenceQuestion {
  const familyIndex = familyIndexes[difficulty] % SEQUENCE_RULE_FAMILIES.length
  familyIndexes[difficulty] += 1
  const family = SEQUENCE_RULE_FAMILIES[familyIndex]
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const generated = generateValues(family, difficulty)
      const values = ensureSequence(generated.values)
      const text = `${values.slice(0, DISPLAYED_TERMS).join(', ')}, …`
      const rule = { family, variant: generated.variant, difficulty }
      return { text, sequence: text, answer: values[DISPLAYED_TERMS], rule, ruleFamily: family, difficulty }
    } catch {
      // Retry the same family with fresh parameters if a random rule degenerates.
    }
  }
  throw new Error('Unable to generate a valid sequence.')
}

/** Compatibility alias matching the arithmetic generator's public API. */
export const generateQuestion = generateSequenceQuestion

export function parseIntegerAnswer(value: string): number | null {
  const normalized = value.trim()
  if (!/^[+-]?\d+$/.test(normalized)) return null
  const answer = Number(normalized)
  return Number.isSafeInteger(answer) ? answer : null
}

export function isSequenceAnswerCorrect(value: string, expected: number): boolean {
  const actual = parseIntegerAnswer(value)
  return actual !== null && actual === expected
}
