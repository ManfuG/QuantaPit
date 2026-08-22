export type BasketDifficulty = 'Easy' | 'Medium' | 'Hard'
export type QuoteCase = 'below-bid' | 'above-ask' | 'inside'
export type TradeSide = 'buy' | 'sell'
export type RoundAction = TradeSide | 'skip' | 'timeout'

export interface Stock {
  ticker: number
  price: number
}

export interface Quote {
  bid: number
  ask: number
}

export interface Player {
  budget: number
}

export interface Trade {
  side: TradeSide
  price: number
  quantity: number
  value: number
}

export const BASKET_EDGE_ROUNDS = 5
export const ROUND_COUNT = BASKET_EDGE_ROUNDS

export const stockCountFor = (difficulty: BasketDifficulty): number => ({ Easy: 4, Medium: 6, Hard: 8 })[difficulty]

const randomInt = (max: number, random: () => number): number => {
  const sample = Math.max(0, Math.min(0.999999999, random()))
  return Math.floor(sample * max)
}

export function generateStocks(difficulty: BasketDifficulty, random = Math.random): Stock[] {
  return Array.from({ length: stockCountFor(difficulty) }, (_, index) => ({
    ticker: index + 1,
    price: 1 + randomInt(20, random),
  }))
}

export const basketFairValue = (stocks: readonly Stock[]): number => stocks.reduce((sum, stock) => sum + stock.price, 0)
export const fairValue = basketFairValue

export function validateQuote(quote: Quote): boolean {
  return Number.isInteger(quote.bid) && Number.isInteger(quote.ask) && quote.bid > 0 && quote.ask > 0 && quote.bid < quote.ask && quote.ask - quote.bid <= 6
}

/** Make a valid integer quote in the requested relation to fair value. */
export function createQuote(fairValue: number, relation: QuoteCase, random = Math.random): Quote {
  const spread = 1 + randomInt(6, random)
  const offset = 1 + randomInt(4, random)
  if (relation === 'below-bid') {
    const bid = Math.max(1, Math.floor(fairValue) + offset)
    return { bid, ask: bid + spread }
  }
  if (relation === 'above-ask') {
    const ask = Math.max(2, Math.ceil(fairValue) - offset)
    const bid = Math.max(1, ask - spread)
    return { bid, ask }
  }
  const bid = Math.max(1, Math.floor(fairValue) - Math.min(offset, 5))
  const ask = Math.max(fairValue + 1, bid + 1)
  return { bid, ask: Math.min(ask, bid + 6) }
}

export function randomQuoteCase(random = Math.random): QuoteCase {
  return (['below-bid', 'above-ask', 'inside'] as const)[randomInt(3, random)]
}

export function createRandomQuote(fairValue: number, random = Math.random): Quote {
  return createQuote(fairValue, randomQuoteCase(random), random)
}

export function validateTrade(budget: number, side: TradeSide, price: number, quantity: number): boolean {
  return (side === 'buy' || side === 'sell') && Number.isFinite(budget) && budget >= 0 && Number.isInteger(price) && price > 0 && Number.isInteger(quantity) && quantity > 0 && price * quantity <= budget
}

export function applyTrade(player: Player, side: TradeSide, price: number, quantity: number): Player {
  if (!validateTrade(player.budget, side, price, quantity)) return player
  const change = price * quantity * (side === 'buy' ? -1 : 1)
  return { ...player, budget: player.budget + change }
}

export function resolveTrade(player: Player, quote: Quote, side: TradeSide, quantity: number): { player: Player; trade: Trade | null } {
  if (!validateQuote(quote)) return { player, trade: null }
  const price = side === 'buy' ? quote.ask : side === 'sell' ? quote.bid : 0
  if (!validateTrade(player.budget, side, price, quantity)) return { player, trade: null }
  return { player: applyTrade(player, side, price, quantity), trade: { side, price, quantity, value: price * quantity } }
}

export function resolveAction(action: RoundAction, player: Player, quote: Quote, quantity: number): { player: Player; trade: Trade | null } {
  if (action === 'skip' || action === 'timeout') return { player, trade: null }
  return resolveTrade(player, quote, action, quantity)
}

export const maxQuantity = (budget: number, price: number): number => price > 0 && Number.isFinite(price) && budget >= 0 ? Math.floor(budget / price) : 0
