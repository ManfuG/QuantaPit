export type HiddenSpreadDifficulty = 'Easy' | 'Medium' | 'Hard'
export type PlayerId = 'user' | 'bot-1' | 'bot-2' | 'bot-3' | 'bot-4'
export type TradeSide = 'buy' | 'sell'
export type Card = { value: number; label: string }
export type Event = { id: string; name: string; description: string; multiplier: number }
export type Quote = { bid: number; ask: number }
export type Trade = { playerId: PlayerId; side: TradeSide; price: number; quantity: number; value: number }
export type Player = { id: PlayerId; name: string; budget: number }
export type Round = { cards: Card[]; hiddenIndexes: number[]; event: Event; marketMaker: PlayerId; quote: Quote }

export const STARTING_BUDGET = 10_000
export const ROUND_COUNT = 5
export const TRADER_SECONDS = 60
export const MARKET_MAKER_SECONDS = 30
export const RANKS = Array.from({ length: 13 }, (_, i) => i + 2)
export const rankLabel = (value: number) => value >= 11 ? ({ 11: 'J', 12: 'Q', 13: 'K', 14: 'A' } as Record<number, string>)[value] : String(value)
export const cardFromValue = (value: number): Card => ({ value, label: rankLabel(value) })

const NEUTRAL: Event = { id: 'neutral', name: 'Calm market', description: 'No market event.', multiplier: 1 }
const MEDIUM_EVENTS: readonly Event[] = [
  { id: 'demand-surge', name: 'Demand surge', description: 'Buy interest is rising.', multiplier: 1.15 },
  { id: 'demand-drop', name: 'Demand drop', description: 'Buy interest is fading.', multiplier: 0.85 },
]
const HARD_EVENTS: readonly Event[] = [...MEDIUM_EVENTS,
  { id: 'positive-momentum', name: 'Positive momentum', description: 'Recent prices support a stronger bid.', multiplier: 1.25 },
  { id: 'negative-momentum', name: 'Negative momentum', description: 'Recent prices pressure valuations.', multiplier: 0.75 },
  { id: 'volatility-shock', name: 'Volatility shock', description: 'The market is repricing quickly.', multiplier: 1.4 },
]
export const eventsFor = (difficulty: HiddenSpreadDifficulty): readonly Event[] => difficulty === 'Easy' ? [NEUTRAL] : difficulty === 'Medium' ? MEDIUM_EVENTS : HARD_EVENTS
export const difficultyCardCount = (difficulty: HiddenSpreadDifficulty) => ({ Easy: 3, Medium: 5, Hard: 7 }[difficulty])
export const randomInt = (max: number, random = Math.random) => Math.floor(Math.max(0, Math.min(.999999, random())) * max)
export function generateCards(difficulty: HiddenSpreadDifficulty, random = Math.random): Card[] { return Array.from({ length: difficultyCardCount(difficulty) }, () => cardFromValue(2 + randomInt(13, random))) }
export function chooseHiddenIndexes(count: number, random = Math.random): number[] { const hiddenCount = 1 + randomInt(Math.min(3, count), random); return Array.from({ length: count }, (_, i) => i).sort(() => random() - .5).slice(0, hiddenCount).sort((a, b) => a - b) }
export function chooseEvent(difficulty: HiddenSpreadDifficulty, random = Math.random): Event { const choices = eventsFor(difficulty); return choices[randomInt(choices.length, random)] }
export function basePrice(cards: readonly Card[]) { return cards.reduce((sum, card) => sum + card.value, 0) }
export function truePrice(cards: readonly Card[], event: Event) { return basePrice(cards) * event.multiplier }
export function visibleExpectedPrice(cards: readonly Card[], hiddenIndexes: readonly number[], event: Event) { const hidden = new Set(hiddenIndexes); const visible = cards.filter((_, i) => !hidden.has(i)); return (visible.reduce((sum, card) => sum + card.value, 0) + hiddenIndexes.length * 8) * event.multiplier }
export function createPlayers(): Player[] { return [{ id: 'user', name: 'You', budget: STARTING_BUDGET }, ...(['bot-1', 'bot-2', 'bot-3', 'bot-4'] as PlayerId[]).map((id, i) => ({ id, name: `Bot ${i + 1}`, budget: STARTING_BUDGET }))] }
export function randomOrder(random = Math.random): PlayerId[] { return (['user', 'bot-1', 'bot-2', 'bot-3', 'bot-4'] as PlayerId[]).sort(() => random() - .5) }
export function createQuote(expected: number, difficulty: HiddenSpreadDifficulty, random = Math.random): Quote { const width = Math.min(6, Math.max(1, Math.round(expected * ({ Easy: .12, Medium: .16, Hard: .22 }[difficulty]) * (.8 + random() * .4)))); const mid = Math.max(width + 1, Math.round(expected * (.98 + random() * .04))); const bid = Math.max(1, mid - Math.ceil(width / 2)); return { bid, ask: bid + width } }
export function quoteOutsideValue(quote: Quote, value: number): Quote { const width = Math.min(6, Math.max(1, quote.ask - quote.bid)); const belowAsk = Math.floor(value) - 1; if (belowAsk - width >= 1) return { bid: belowAsk - width, ask: belowAsk }; const aboveBid = Math.ceil(value) + 1; return { bid: aboveBid, ask: aboveBid + width } }
export function validateQuote(quote: Quote) { return Number.isInteger(quote.bid) && Number.isInteger(quote.ask) && Number.isFinite(quote.bid) && Number.isFinite(quote.ask) && quote.bid > 0 && quote.ask > 0 && quote.bid < quote.ask && quote.ask - quote.bid <= 6 }
export function maxQuantity(budget: number, price: number) { return price > 0 && Number.isFinite(price) && budget > 0 ? Math.floor(budget / price) : 0 }
export function validateTrade(budget: number, side: TradeSide, price: number, quantity: number) { return (side === 'buy' || side === 'sell') && Number.isFinite(price) && price > 0 && Number.isInteger(quantity) && quantity > 0 && price * quantity <= budget + 1e-9 }
export function applyTrade(player: Player, side: TradeSide, price: number, quantity: number): Player { if (!validateTrade(player.budget, side, price, quantity)) return player; return { ...player, budget: Number((player.budget + (side === 'sell' ? 1 : -1) * price * quantity).toFixed(2)) } }
export function botTrade(player: Player, quote: Quote, expected: number, random = Math.random): Trade | null { if (!validateQuote(quote)) return null; const buyEdge = expected - quote.ask; const sellEdge = quote.bid - expected; const side = buyEdge > sellEdge && buyEdge > 0 ? 'buy' : sellEdge > 0 ? 'sell' : null; if (!side) return null; const price = side === 'buy' ? quote.ask : quote.bid; const quantity = Math.min(maxQuantity(player.budget, price), 1 + randomInt(4, random)); return quantity > 0 ? { playerId: player.id, side, price, quantity, value: price * quantity } : null }
export function createRound(difficulty: HiddenSpreadDifficulty, marketMaker: PlayerId, random = Math.random): Round { const cards = generateCards(difficulty, random); const hiddenIndexes = chooseHiddenIndexes(cards.length, random); const event = chooseEvent(difficulty, random); return { cards, hiddenIndexes, event, marketMaker, quote: createQuote(visibleExpectedPrice(cards, hiddenIndexes, event), difficulty, random) } }
export function resolveUserTrade(player: Player, quote: Quote, side: TradeSide, quantity: number): { player: Player; trade: Trade | null } { const price = side === 'buy' ? quote.ask : quote.bid; if (!validateTrade(player.budget, side, price, quantity)) return { player, trade: null }; return { player: applyTrade(player, side, price, quantity), trade: { playerId: player.id, side, price, quantity, value: price * quantity } } }
export function resolveBotTrades(players: Player[], quote: Quote, expected: number, random = Math.random): { players: Player[]; trades: Trade[] } { const trades: Trade[] = []; let updated = players.map(player => ({ ...player })); for (const bot of updated.filter(player => player.id !== 'user')) { const candidate = botTrade(bot, quote, expected, random); if (!candidate) continue; const user = updated.find(player => player.id === 'user'); if (!user) continue; const userSide: TradeSide = candidate.side === 'buy' ? 'sell' : 'buy'; const quantity = Math.min(candidate.quantity, maxQuantity(user.budget, candidate.price)); if (quantity < 1) continue; const trade = { ...candidate, quantity, value: candidate.price * quantity }; updated = updated.map(player => player.id === bot.id ? applyTrade(player, trade.side, trade.price, trade.quantity) : player.id === 'user' ? applyTrade(player, userSide, trade.price, trade.quantity) : player); trades.push(trade) } return { players: updated, trades } }
