export const GAME_DURATIONS = [1, 5, 8] as const
export const GAME_QUESTION_COUNTS = [10, 50, 80] as const

export function numericSettingError(value: number, label: string, min = 1, max = Number.MAX_SAFE_INTEGER, integer = true): string {
  if (Number.isFinite(value) && value >= min && value <= max && (!integer || Number.isInteger(value))) return ''
  return `${label} must be ${integer ? 'a whole number' : 'a number'} between ${min} and ${max} (inclusive).`
}

export function sessionConfigError(duration: number, questions?: number): string {
  return numericSettingError(duration, 'Duration (minutes)', 1 / 60, Math.floor(Number.MAX_SAFE_INTEGER / 60_000), false)
    || (questions === undefined ? '' : numericSettingError(questions, 'Questions'))
}

export function roundConfigError(rounds: number, seconds: number, maxRounds = Number.MAX_SAFE_INTEGER, quoteSeconds?: number): string {
  const maxSeconds = Math.floor(Number.MAX_SAFE_INTEGER / 1000)
  const error = numericSettingError(rounds, 'Rounds', 1, maxRounds)
    || numericSettingError(seconds, 'Seconds per round', 1, maxSeconds)
    || (quoteSeconds === undefined ? '' : numericSettingError(quoteSeconds, 'Seconds to quote', 1, maxSeconds))
  if (error) return error
  if (!Number.isSafeInteger(rounds * Math.max(seconds, quoteSeconds ?? seconds) * 1000)) {
    return 'Total duration exceeds the safe range. Reduce rounds or time per round.'
  }
  return ''
}
