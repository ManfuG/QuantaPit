import { describe, expect, it } from 'vitest'
import { applyTrade, basketFairValue, BASKET_EDGE_ROUNDS, createQuote, generateStocks, maxQuantity, resolveAction, resolveTrade, ROUND_COUNT, stockCountFor, validateQuote, validateTrade } from './basketEdge'

describe('Basket Edge domain', () => {
  it('creates the requested positive integer-ticker basket sizes', () => {
    for (const [difficulty, count] of [['Easy', 4], ['Medium', 6], ['Hard', 8]] as const) {
      const stocks = generateStocks(difficulty, () => 0)
      expect(stockCountFor(difficulty)).toBe(count)
      expect(stocks).toHaveLength(count)
      expect(stocks.every(stock => Number.isInteger(stock.ticker) && stock.ticker > 0 && Number.isInteger(stock.price) && stock.price > 0)).toBe(true)
    }
  })

  it('sums basket fair value', () => {
    expect(basketFairValue([{ ticker: 1, price: 12 }, { ticker: 2, price: 7 }])).toBe(19)
  })

  it('produces valid deterministic quotes on each side of fair value', () => {
    const fair = 40
    const belowBid = createQuote(fair, 'below-bid', () => 0)
    const aboveAsk = createQuote(fair, 'above-ask', () => 0)
    const inside = createQuote(fair, 'inside', () => 0)
    expect(validateQuote(belowBid) && fair < belowBid.bid).toBe(true)
    expect(validateQuote(aboveAsk) && fair > aboveAsk.ask).toBe(true)
    expect(validateQuote(inside) && inside.bid < fair && fair < inside.ask).toBe(true)
  })

  it('validates and applies budget-symmetric trades', () => {
    expect(validateTrade(100, 'buy', 10, 10)).toBe(true)
    expect(validateTrade(100, 'sell', 10, 10)).toBe(true)
    expect(validateTrade(100, 'buy', 10, 11)).toBe(false)
    expect(applyTrade({ budget: 100 }, 'buy', 10, 3).budget).toBe(70)
    expect(applyTrade({ budget: 100 }, 'sell', 10, 3).budget).toBe(130)
    expect(maxQuantity(100, 11)).toBe(9)
  })

  it('treats skip and timeout as equivalent no-trade actions', () => {
    const player = { budget: 100 }
    const quote = { bid: 9, ask: 10 }
    expect(resolveAction('skip', player, quote, 1)).toEqual({ player, trade: null })
    expect(resolveAction('timeout', player, quote, 1)).toEqual({ player, trade: null })
    expect(resolveTrade(player, quote, 'buy', 2).trade?.value).toBe(20)
  })

  it('keeps exactly five rounds', () => {
    expect(BASKET_EDGE_ROUNDS).toBe(5)
    expect(ROUND_COUNT).toBe(5)
  })
})
