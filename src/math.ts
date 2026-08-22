export type Difficulty = 'Easy' | 'Medium' | 'Hard'
export type Operation = '+' | '−' | '×' | '÷' | 'fraction' | 'decimal'

export interface MathQuestion {
  text: string
  answer: number
  operation: Operation
}

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
const pick = <T,>(items: T[]) => items[randomInt(0, items.length - 1)]
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a))
const fraction = (value: number) => {
  const denominator = randomInt(2, value > 8 ? 12 : 8)
  const numerator = randomInt(1, denominator * 2)
  const divisor = gcd(numerator, denominator)
  return { text: `${numerator / divisor}/${denominator / divisor}`, value: numerator / denominator }
}

export function generateQuestion(difficulty: Difficulty): MathQuestion {
  const ranges = { Easy: [1, 20], Medium: [10, 75], Hard: [25, 250] } as const
  const [min, max] = ranges[difficulty]
  const available: Operation[] = difficulty === 'Easy' ? ['+', '−', '×', '÷'] : ['+', '−', '×', '÷', 'fraction', 'decimal']
  const operation = pick(available)
  if (operation === 'fraction') {
    const left = fraction(max)
    const right = fraction(max)
    return { text: `${left.text} + ${right.text}`, answer: left.value + right.value, operation }
  }
  if (operation === 'decimal') {
    const left = Number((Math.random() * (max - min) + min).toFixed(1))
    const right = Number((Math.random() * (max - min) + min).toFixed(1))
    return { text: `${left.toFixed(1)} × ${right.toFixed(1)}`, answer: left * right, operation }
  }
  let left = randomInt(min, max)
  let right = randomInt(min, max)
  if (operation === '÷') {
    right = randomInt(1, Math.max(1, Math.floor(max / 2)))
    left = right * randomInt(1, difficulty === 'Hard' ? 12 : 6)
  }
  const answer = operation === '+' ? left + right : operation === '−' ? left - right : operation === '×' ? left * right : left / right
  return { text: `${left} ${operation} ${right}`, answer, operation }
}

export function parseAnswer(value: string): number | null {
  const normalized = value.trim().replace(',', '.')
  if (!normalized) return null
  if (/^-?\d+(?:\.\d+)?\s*\/\s*-?\d+$/.test(normalized)) {
    const [numerator, denominator] = normalized.split('/').map(Number)
    return denominator === 0 ? null : numerator / denominator
  }
  const answer = Number(normalized)
  return Number.isFinite(answer) ? answer : null
}

export function isCorrect(value: string, expected: number): boolean {
  const actual = parseAnswer(value)
  return actual !== null && Math.abs(actual - expected) <= 0.01
}

export function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}
