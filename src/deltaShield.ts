export type DeltaShieldDifficulty = 'Easy' | 'Medium' | 'Hard'
export type Difficulty = DeltaShieldDifficulty
export type HedgeSide = 'buy' | 'sell'
export type DeltaShieldAction = 'hedge' | 'skip' | 'timeout'
export type RoundAction = DeltaShieldAction

/** A signed position and its per-unit P&L for the round's market shock. */
export interface Position {
  id: string
  quantity: number
  shock: number
}

export interface HedgeTrade {
  /** A signed quantity: positive buys the hedge, negative sells it. */
  quantity: number
  side?: HedgeSide
}

export interface DeltaShieldRound {
  roundIndex: number
  difficulty: DeltaShieldDifficulty
  positions: Position[]
  /** The shocks shown for the positions, in the same order as positions. */
  shocks: number[]
  hedgeShock: number
  initialExposure: number
  balanced: boolean
}

export interface DeltaShieldPlayer {
  hedgeQuantity: number
}

export interface DeltaShieldResolution {
  action: DeltaShieldAction
  player: DeltaShieldPlayer
  trade: HedgeTrade | null
  exposure: number
  score: number
}

export interface OptimalHedgeSolution {
  quantity: number
  exposure: number
  score: number
  candidatesChecked: number
}

export const DELTA_SHIELD_ROUNDS = 5
export const ROUND_COUNT = DELTA_SHIELD_ROUNDS
export const DELTA_SHIELD_SECONDS = 60
export const DELTA_SHIELD_STARTING_HEDGE = 0
export const BALANCED_ROUND_INDEX = 2
export const MAX_HEDGE_QUANTITY = 500
export const MAX_SCORE = 100

export const positionCountFor = (difficulty: DeltaShieldDifficulty): number => ({ Easy: 3, Medium: 5, Hard: 7 })[difficulty]
export const difficultyPositionCount = positionCountFor
export const positionsForDifficulty = positionCountFor

const clampRandom = (sample: number): number => Number.isFinite(sample) ? Math.max(0, Math.min(0.999999999, sample)) : 0
const randomInt = (max: number, random: () => number): number => Math.floor(clampRandom(random()) * max)
const signedInt = (max: number, random: () => number): number => (randomInt(2, random) === 0 ? -1 : 1) * (1 + randomInt(max, random))

function signedQuantity(position: Position): number {
  return position.quantity
}

function positionExposure(position: Position): number {
  return signedQuantity(position) * position.shock
}

function normalizedQuantity(trade: HedgeTrade | number): number {
  if (typeof trade === 'number') return trade
  const quantity = Math.abs(trade.quantity)
  return trade.side === 'sell' ? -quantity : trade.side === 'buy' ? quantity : trade.quantity
}

export function calculatePositionExposure(position: Position): number {
  return positionExposure(position)
}

/** Sum signed position × shock exposure. */
export function calculateExposure(positions: readonly Position[]): number
export function calculateExposure(positions: readonly Position[], hedge: HedgeTrade | number, hedgeShock?: number): number
export function calculateExposure(positions: readonly Position[], hedge: HedgeTrade | number = 0, hedgeShock = 1): number {
  return positions.reduce((sum, position) => sum + positionExposure(position), 0) + normalizedQuantity(hedge) * hedgeShock
}

export const portfolioExposure = calculateExposure
export const totalExposure = calculateExposure

/** Calculate exposure for several market-shock multipliers. */
export function calculateScenarioExposures(positions: readonly Position[], shocks: readonly number[], hedgeQuantity = 0, hedgeShock = 1): number[] {
  const positionDelta = positions.reduce((sum, position) => sum + position.quantity * position.shock, 0)
  return shocks.map(shock => positionDelta * shock + hedgeQuantity * hedgeShock * shock)
}

export const exposuresForShocks = calculateScenarioExposures
export const calculateExposures = calculateScenarioExposures

export function exposureAfterHedge(exposure: number, hedge: HedgeTrade | number, hedgeShock = 1): number {
  return exposure + normalizedQuantity(hedge) * hedgeShock
}

export function maxHedgeQuantity(round?: Pick<DeltaShieldRound, 'initialExposure'> | number): number {
  if (round === undefined) return MAX_HEDGE_QUANTITY
  const exposure = typeof round === 'number' ? round : round.initialExposure
  return Math.max(MAX_HEDGE_QUANTITY, Math.ceil(Math.abs(exposure)) + 1)
}

function validSignedQuantity(quantity: number, limit: number): boolean {
  return Number.isInteger(quantity) && Number.isFinite(quantity) && Math.abs(quantity) <= limit
}

export function validateHedgeTrade(trade: HedgeTrade, limit?: number): boolean
export function validateHedgeTrade(exposure: number, quantity: number, limit?: number): boolean
export function validateHedgeTrade(round: Pick<DeltaShieldRound, 'initialExposure'>, trade: HedgeTrade): boolean
export function validateHedgeTrade(first: HedgeTrade | number | Pick<DeltaShieldRound, 'initialExposure'>, second?: number | HedgeTrade, third?: number): boolean {
  if (typeof first === 'number') return typeof second === 'number' && validSignedQuantity(second, third ?? MAX_HEDGE_QUANTITY)
  if ('quantity' in first) return validSignedQuantity(normalizedQuantity(first), typeof second === 'number' ? second : MAX_HEDGE_QUANTITY)
  if (second === undefined || typeof second === 'number') return false
  return validSignedQuantity(normalizedQuantity(second), third ?? maxHedgeQuantity(first))
}

/** Apply a signed hedge quantity to an already calculated exposure. */
export function applyHedgeTrade(exposure: number, trade: HedgeTrade | number, hedgeShock = 1): number {
  if (!Number.isFinite(exposure) || !Number.isFinite(hedgeShock)) return exposure
  return exposureAfterHedge(exposure, trade, hedgeShock)
}

export const applyHedge = applyHedgeTrade

export function hedgeQuantityFor(trade: HedgeTrade): number {
  return normalizedQuantity(trade)
}

/** The score rewards reduction in absolute exposure; an exact hedge scores 100. */
export function scoreHedge(initialExposure: number, hedge: HedgeTrade | number, hedgeShock = 1): number {
  if (!Number.isFinite(initialExposure) || !Number.isFinite(hedgeShock)) return 0
  const residual = Math.abs(exposureAfterHedge(initialExposure, hedge, hedgeShock))
  if (Math.abs(initialExposure) === 0) return residual === 0 ? MAX_SCORE : 0
  return Math.max(0, Math.min(MAX_SCORE, MAX_SCORE * (1 - residual / Math.abs(initialExposure))))
}

export const scoreExposure = scoreHedge
export const scoreSolution = scoreHedge

/** Exhaustively inspect every integer hedge in the permitted range. */
export function findOptimalSolution(initialExposure: number, hedgeShock?: number, limit?: number): OptimalHedgeSolution
export function findOptimalSolution(round: Pick<DeltaShieldRound, 'initialExposure' | 'hedgeShock'>): OptimalHedgeSolution
export function findOptimalSolution(first: number | Pick<DeltaShieldRound, 'initialExposure' | 'hedgeShock'>, second = 1, third?: number): OptimalHedgeSolution {
  const initialExposure = typeof first === 'number' ? first : first.initialExposure
  const hedgeShock = typeof first === 'number' ? second : first.hedgeShock
  const limit = Math.max(0, Math.ceil(third ?? maxHedgeQuantity(initialExposure)))
  let bestQuantity = 0
  let bestExposure = exposureAfterHedge(initialExposure, 0, hedgeShock)
  let bestResidual = Math.abs(bestExposure)
  let candidatesChecked = 0
  for (let quantity = -limit; quantity <= limit; quantity += 1) {
    candidatesChecked += 1
    const exposure = exposureAfterHedge(initialExposure, quantity, hedgeShock)
    const residual = Math.abs(exposure)
    if (residual < bestResidual || (residual === bestResidual && Math.abs(quantity) < Math.abs(bestQuantity))) {
      bestQuantity = quantity
      bestExposure = exposure
      bestResidual = residual
    }
  }
  return { quantity: bestQuantity, exposure: bestExposure, score: scoreHedge(initialExposure, bestQuantity, hedgeShock), candidatesChecked }
}

/** Return the best integer hedge quantity, using exhaustive search. */
export function findOptimalHedge(initialExposure: number, hedgeShock?: number, limit?: number): number
export function findOptimalHedge(round: Pick<DeltaShieldRound, 'initialExposure' | 'hedgeShock'>): number
export function findOptimalHedge(first: number | Pick<DeltaShieldRound, 'initialExposure' | 'hedgeShock'>, second = 1, third?: number): number {
  return findOptimalSolution(first as never, second, third).quantity
}

export const optimalHedgeQuantity = findOptimalHedge
export const solveOptimalHedge = findOptimalSolution

export function scoreRound(round: Pick<DeltaShieldRound, 'initialExposure' | 'hedgeShock'>, action: DeltaShieldAction | HedgeTrade | number): number {
  if (action === 'skip' || action === 'timeout' || action === 'hedge') return 0
  return scoreHedge(round.initialExposure, action, round.hedgeShock)
}

export function resolveAction(action: DeltaShieldAction, round: Pick<DeltaShieldRound, 'initialExposure' | 'hedgeShock'>, trade?: HedgeTrade): DeltaShieldResolution {
  const player = { hedgeQuantity: 0 }
  if (action === 'skip' || action === 'timeout') return { action, player, trade: null, exposure: round.initialExposure, score: 0 }
  if (!trade || !validateHedgeTrade(round, trade)) return { action, player, trade: null, exposure: round.initialExposure, score: 0 }
  const quantity = normalizedQuantity(trade)
  return { action, player: { hedgeQuantity: quantity }, trade: { ...trade, quantity }, exposure: exposureAfterHedge(round.initialExposure, quantity, round.hedgeShock), score: scoreRound(round, quantity) }
}

export const resolveHedgeAction = resolveAction

function makeBalancedPositions(count: number, random: () => number): Position[] {
  const positions: Position[] = []
  const pairs = Math.floor(count / 2)
  for (let index = 0; index < pairs; index += 1) {
    const quantity = 1 + randomInt(6, random)
    const shock = 1 + randomInt(4, random)
    positions.push({ id: `position-${index * 2 + 1}`, quantity, shock })
    positions.push({ id: `position-${index * 2 + 2}`, quantity: -quantity, shock })
  }
  if (count % 2) positions.push({ id: `position-${count}`, quantity: 1, shock: 0 })
  return positions
}

export function generateRound(difficulty: DeltaShieldDifficulty, roundIndex = 0, random = Math.random): DeltaShieldRound {
  const count = positionCountFor(difficulty)
  const balanced = roundIndex === BALANCED_ROUND_INDEX
  let positions = balanced
    ? makeBalancedPositions(count, random)
    : Array.from({ length: count }, (_, index) => ({ id: `position-${index + 1}`, quantity: signedInt(6, random), shock: signedInt(4, random) }))
  if (!balanced && calculateExposure(positions) === 0) positions = positions.map((position, index) => index === positions.length - 1 ? { ...position, shock: position.shock + 1 } : position)
  const shocks = positions.map(position => position.shock)
  const initialExposure = calculateExposure(positions)
  return { roundIndex, difficulty, positions, shocks, hedgeShock: 1, initialExposure, balanced }
}

export const createRound = generateRound

export function generateRounds(difficulty: DeltaShieldDifficulty, random = Math.random): DeltaShieldRound[] {
  return Array.from({ length: DELTA_SHIELD_ROUNDS }, (_, index) => generateRound(difficulty, index, random))
}

export const createRounds = generateRounds

export function averageScores(scores: readonly number[]): number {
  return scores.length === 0 ? 0 : scores.reduce((sum, score) => sum + score, 0) / scores.length
}

export const averageRoundScores = averageScores
