/** The three supported Radix Rush difficulty levels. */
export type RadixDifficulty = 'Easy' | 'Medium' | 'Hard'

/** The only precisions used by Radix Rush. */
export type RadixPrecision = 3 | 4 | 5

export interface RadixFraction {
  numerator: number
  denominator: number
}

export interface RadixQuestion {
  difficulty: RadixDifficulty
  precision: RadixPrecision
  fraction: RadixFraction
  numerator: number
  denominator: number
  text: string
  /** The answer as an integer scaled by 10 ** precision. */
  answer: number
  expectedScaled: number
  /** The answer formatted for display, including all decimal places. */
  answerText: string
}

export const RADIX_PRECISION_BY_DIFFICULTY: Readonly<Record<RadixDifficulty, RadixPrecision>> = {
  Easy: 3,
  Medium: 4,
  Hard: 5,
}

const MIN_DENOMINATOR = 2
const MAX_DENOMINATOR = 99

const isSupportedPrecision = (precision: number): precision is RadixPrecision =>
  precision === 3 || precision === 4 || precision === 5

function requirePrecision(precision: number): asserts precision is RadixPrecision {
  if (!isSupportedPrecision(precision)) {
    throw new RangeError('Radix precision must be 3, 4, or 5.')
  }
}

const requireProperFraction = (numerator: number, denominator: number): void => {
  if (
    !Number.isSafeInteger(numerator) ||
    !Number.isSafeInteger(denominator) ||
    numerator <= 0 ||
    denominator <= 0 ||
    numerator >= denominator
  ) {
    throw new RangeError('Radix fractions must have positive integers with numerator < denominator.')
  }
}

/** Return the number of decimal places for a Radix Rush difficulty. */
export function getRadixPrecision(difficulty: RadixDifficulty): RadixPrecision {
  const precision = RADIX_PRECISION_BY_DIFFICULTY[difficulty]
  if (precision === undefined) {
    throw new RangeError('Unknown Radix Rush difficulty.')
  }
  return precision
}

/** Compatibility-friendly name for the difficulty-to-precision mapping. */
export const precisionForDifficulty = getRadixPrecision

/**
 * Round a proper fraction to a fixed number of decimal places without using
 * floating point arithmetic. The rule is round-half-up: after scaling the
 * numerator by 10 ** precision, a remainder at least half the denominator
 * increments the integer quotient.
 *
 * The result is the decimal answer multiplied by 10 ** precision. For
 * example, 1/8 at precision 3 returns 125, which formats as "0.125".
 */
export function roundFractionToScaled(
  numerator: number,
  denominator: number,
  precision: number,
): number {
  requirePrecision(precision)
  requireProperFraction(numerator, denominator)

  const scale = 10 ** precision
  const scaledNumerator = numerator * scale
  const quotient = Math.floor(scaledNumerator / denominator)
  const remainder = scaledNumerator % denominator
  return quotient + (remainder * 2 >= denominator ? 1 : 0)
}

/** Short alias for the integer-scaled fraction rounding operation. */
export const roundFraction = roundFractionToScaled

/**
 * Parse a submitted decimal into its integer-scaled representation.
 * Leading/trailing whitespace is ignored; the decimal separator may be a
 * dot or comma, but the fractional part must contain exactly `precision`
 * digits. Invalid input returns null.
 */
export function parseRadixAnswer(value: string, precision: number): number | null {
  requirePrecision(precision)
  const normalized = value.trim().replace(',', '.')
  const match = new RegExp(`^(\\d+)\\.(\\d{${precision}})$`).exec(normalized)
  if (!match) return null

  const whole = Number(match[1])
  const fractional = Number(match[2])
  if (!Number.isSafeInteger(whole)) return null

  const scale = 10 ** precision
  const scaled = whole * scale + fractional
  return Number.isSafeInteger(scaled) ? scaled : null
}

/** Short alias matching the other pure question modules' answer API. */
export const parseAnswer = parseRadixAnswer

/** Format an integer-scaled answer, retaining exactly `precision` decimals. */
export function formatRadixAnswer(scaledAnswer: number, precision: number): string {
  requirePrecision(precision)
  if (!Number.isSafeInteger(scaledAnswer) || scaledAnswer < 0) {
    throw new RangeError('Radix answers must be non-negative safe integers.')
  }

  const scale = 10 ** precision
  const whole = Math.floor(scaledAnswer / scale)
  const fractional = String(scaledAnswer % scale).padStart(precision, '0')
  return `${whole}.${fractional}`
}

/** Short alias matching the other pure question modules' formatting API. */
export const formatNumber = formatRadixAnswer

/** Compare scaled integers exactly; no floating-point tolerance is applied. */
export function isRadixAnswerCorrect(
  value: string,
  expectedScaled: number,
  precision: number,
): boolean {
  requirePrecision(precision)
  if (!Number.isSafeInteger(expectedScaled) || expectedScaled < 0) return false
  return parseRadixAnswer(value, precision) === expectedScaled
}

/** Short alias matching the other pure question modules' validation API. */
export const isCorrect = isRadixAnswerCorrect

const randomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min

/** Generate a positive proper fraction and its deterministically rounded answer. */
export function generateRadixQuestion(difficulty: RadixDifficulty): RadixQuestion {
  const precision = getRadixPrecision(difficulty)
  const denominator = randomInt(MIN_DENOMINATOR, MAX_DENOMINATOR)
  const numerator = randomInt(1, denominator - 1)
  const answer = roundFractionToScaled(numerator, denominator, precision)

  return {
    difficulty,
    precision,
    fraction: { numerator, denominator },
    numerator,
    denominator,
    text: `${numerator}/${denominator}`,
    answer,
    expectedScaled: answer,
    answerText: formatRadixAnswer(answer, precision),
  }
}

/** Compatibility alias matching the existing question generators. */
export const generateQuestion = generateRadixQuestion
