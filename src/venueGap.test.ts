import { describe, expect, it } from 'vitest'
import { calculateTrade, createRound, feeRatesFor, findBestOpportunity, maxTradeQuantity, resolveAction, resolveTrade, VENUE_GAP_ROUNDS, venueCountFor, validateVenueQuote } from './venueGap'
const quote = (id: string, bid: number, ask: number, feeRate = 0, liquidity = 5) => ({ venueId: id, name: id, bid, ask, bidQuantity: liquidity, askQuantity: liquidity, feeRate })
describe('Venue Gap domain', () => {
  it('uses 2, 3 and 4 venues with the requested fee levels', () => { expect(venueCountFor('Easy')).toBe(2); expect(venueCountFor('Medium')).toBe(3); expect(venueCountFor('Hard')).toBe(4); expect(feeRatesFor('Easy')).toEqual([0, 0]); expect(feeRatesFor('Medium').some(rate => rate > 0)).toBe(true); expect(feeRatesFor('Hard').some(rate => rate > 0)).toBe(true) })
  it('validates positive quotes and quantities', () => { expect(validateVenueQuote(quote('a', 10, 11))).toBe(true); expect(validateVenueQuote(quote('a', 11, 10))).toBe(false) })
  it('calculates both fees and net profit', () => { const trade = calculateTrade(quote('a', 9, 10, .01), quote('b', 14, 15, .02), 2)!; expect(trade.buyFee).toBe(.2); expect(trade.sellFee).toBe(.56); expect(trade.netProfit).toBe(7.24) })
  it('limits quantity by both liquidity and budget', () => { const buy = quote('a', 9, 10, .1, 8); const sell = quote('b', 14, 15, 0, 3); expect(maxTradeQuantity(25, buy, sell)).toBe(2); expect(calculateTrade(buy, sell, 4)).toBeNull() })
  it('rejects same venue and resolves skip without changing budget', () => { const player = { budget: 100 }; expect(resolveAction('skip', player, null, null, 1)).toEqual({ player, trade: null }); expect(resolveTrade(player, quote('a', 9, 10), quote('a', 9, 10), 1).trade).toBeNull() })
  it('finds opportunities and generates both positive and empty rounds', () => { expect(findBestOpportunity([quote('a', 9, 10), quote('b', 14, 15)])?.netProfit).toBe(20); expect(createRound('Easy', 0, () => 0).hasOpportunity).toBe(true); expect(createRound('Easy', 1, () => 0).hasOpportunity).toBe(false) })
  it('keeps exactly five rounds', () => { expect(VENUE_GAP_ROUNDS).toBe(5) })
})
