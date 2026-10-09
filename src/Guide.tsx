import { NavLink } from 'react-router-dom'
import { GAME_NAMES, type GameId } from './performance/types'

type GuideEntry = {
  id: GameId
  group: 'logic' | 'market'
  route: string
  objective: string
  settings: string
  controls: string
  ending: string
  feedback: string
}

const entries: GuideEntry[] = [
  {
    id: 'quick-math', group: 'logic', route: '/logic-and-math-games/quick-math',
    objective: 'Solve the arithmetic expression on screen. Work accurately first, then build speed.',
    settings: 'Choose a session duration, question count and difficulty. Easy uses addition, subtraction, multiplication and division; higher difficulties also include fraction and decimal problems. Presets and custom duration/count fields are available.',
    controls: 'Type your answer and press Enter or Submit. Decimal points, decimal commas and fractions such as 3/4 are accepted. Answers within 0.01 of the expected value count as correct.',
    ending: 'Each valid submission briefly shows feedback, then advances automatically. The session ends when the question count is reached or the overall timer expires.',
    feedback: 'The answer field indicates correct or incorrect. Results show accuracy, answers per minute and correct/incorrect totals; completed sessions are saved in Statistics.',
  },
  {
    id: 'sequences', group: 'logic', route: '/logic-and-math-games/sequences',
    objective: 'Find the next number in the displayed sequence. Try differences, ratios, alternating patterns and rules that combine earlier terms.',
    settings: 'Choose duration, question count and difficulty, using presets or custom duration/count values. Difficulty changes the complexity of the generated patterns.',
    controls: 'Enter a signed whole number and press Enter or Submit. A decimal or fraction is not a valid submission; the next term must match exactly.',
    ending: 'Feedback appears briefly before the next sequence loads. Answer the configured question count before the overall session timer runs out; either limit ends the session.',
    feedback: 'Correct/incorrect feedback appears at each answer. Results show accuracy, answers per minute and answer totals, with a completed-session record in Statistics.',
  },
  {
    id: 'radix-rush', group: 'logic', route: '/logic-and-math-games/radix-rush',
    objective: 'Convert the displayed fraction to a decimal, rounded to the precision requested on screen.',
    settings: 'Choose duration, question count and difficulty. Easy requires 3 decimal places, Medium 4 and Hard 5. Duration and question count also accept custom values.',
    controls: 'Type exactly the requested number of digits after a decimal point or comma, including trailing zeros, then press Enter or Submit. Round to nearest, with halfway cases rounded up; do not truncate.',
    ending: 'A valid answer triggers brief feedback and automatic progression. The session stops at the configured question count or when the overall timer expires.',
    feedback: 'An incorrectly formatted decimal produces a validation message rather than consuming a question. Submitted answers are checked against the rounded value. Results show accuracy, speed and totals and are saved in Statistics.',
  },
  {
    id: 'tape-recall', group: 'logic', route: '/logic-and-math-games/tape-recall',
    objective: 'Memorize the digits shown one at a time, then reproduce the sequence in the order requested after the display finishes.',
    settings: 'Choose duration, question count and difficulty. Easy shows 5 digits in original order; Medium shows 7 digits and may request original or reverse order; Hard shows 9 digits and may also request Alternate positions.',
    controls: 'Wait for the answer screen and read its order instruction. For Alternate positions, enter positions 1, 3, 5, … first, followed by positions 2, 4, 6, …, retaining order within each group. Type all digits, including leading zeros, without spaces; press Enter or Submit.',
    ending: 'The overall timer includes memorization and answering. Brief feedback leads to the next sequence; reaching the question count or running out of session time ends play.',
    feedback: 'The answer must contain exactly the sequence length to be submitted and match the requested ordering exactly. Results show accuracy, answers per minute and totals; completed sessions appear in Statistics.',
  },
  {
    id: 'foldsight', group: 'logic', route: '/logic-and-math-games/foldsight',
    objective: 'Mentally fold the flat cube net and choose the cube view matching it. Track which faces will be adjacent and which will be opposite.',
    settings: 'Choose the session duration and question count with presets or custom values. There is no difficulty selector for this game.',
    controls: 'Click or tap one of the cube options to submit it immediately. You can also focus an option with Tab and activate it with Enter or Space. Compare the colored symbols on the top, front and right: all three must be distinct neighboring faces, not a repeated face or an opposite pair.',
    ending: 'A choice locks the options while the matching view is highlighted, then the next net loads automatically. The session ends at the question count or overall time limit.',
    feedback: 'The chosen option and correct option are highlighted. Results show accuracy, answers per minute and totals; completed sessions are saved in Statistics.',
  },
  {
    id: 'magnitude-forge', group: 'logic', route: '/logic-and-math-games/magnitude-forge',
    objective: 'Estimate a real-world quantity by giving a narrow interval that contains the reference value. Check the unit before choosing your bounds.',
    settings: 'Choose the number of distinct questions from the available bank and seconds per question. Both have preset and custom fields; the timer resets for each new question.',
    controls: 'Enter positive Minimum and Maximum values with Minimum ≤ Maximum, then press Enter or Submit. Decimal points, commas and scientific notation such as 1e3 are accepted. Break the estimate into simpler factors before narrowing the interval.',
    ending: 'A submission briefly reports whether the reference is covered before advancing automatically. If the per-question timer expires, that question scores zero and play advances. The session ends after all selected questions.',
    feedback: 'A missed interval scores zero. A covered interval scores 100 / (1 + log10(Maximum / Minimum)), so narrower covered intervals earn more. Results show the average score, coverage and timeout counts, plus your bounds and each reference value; completed sessions are saved in Statistics.',
  },
  {
    id: 'hidden-spread', group: 'market', route: '/market-games/hidden-spread',
    objective: 'Estimate an unseen card-hand value and decide how to quote or trade around it. You and four bots take turns as market maker in a shuffled order that repeats every five rounds.',
    settings: 'Choose difficulty, rounds, seconds to trade and seconds to quote, with preset or custom values. Difficulty changes hand size and market events. The timer resets each round using the limit for your current role.',
    controls: 'Card ranks are 2–10, J = 11, Q = 12, K = 13 and A = 14. True value is the sum of all ranks times the displayed event multiplier; a useful estimate substitutes 8 for each hidden card. As market maker, enter positive integer bid and ask with bid < ask and spread at most 6, then Publish quote. Bots compare your quote with the visible-information estimate. As trader, choose Buy ask or Sell bid, enter a positive integer quantity and Send trade, or Skip round. Both buy and sell quantities are limited by your current budget divided by the execution price.',
    ending: 'Publishing a quote lets the bots act; sending a trade, skipping as trader or timing out resolves the round. Hidden cards, true value and executed trades are revealed before the next round loads automatically. The market closes after the configured rounds.',
    feedback: 'Review the revealed value against your estimate and quote. Results show final budgets, your budget change and traded volume. Budgets track trade cash flows: purchases deduct cash and sales add cash; there is no automatic settlement of holdings at the revealed true value. Completed sessions are saved in Statistics.',
  },
  {
    id: 'basket-edge', group: 'market', route: '/market-games/basket-edge',
    objective: 'Add the visible component stock prices to find the ETF basket fair value, then compare it with the ETF bid and ask.',
    settings: 'Choose difficulty, rounds and seconds per round with presets or custom round/time values. Difficulty changes the number of component stocks; each round has a fresh timer.',
    controls: 'If basket value is above the ask, the decision target is Buy ETF. If it is below the bid, choose Sell ETF. Otherwise Skip round, including when value equals a quote boundary. Enter a positive integer quantity; both buys and sells must fit the current budget at their execution price.',
    ending: 'Buy ETF, Sell ETF, Skip round or timer expiry resolves one round. Brief trade feedback is followed by the next basket automatically. The session ends after the configured rounds.',
    feedback: 'Round feedback identifies the executed trade or skip. Results show final budget, budget change, action counts and each basket/quote. Statistics also tracks decision accuracy. The displayed profit/loss is the cash-budget change: buys deduct ask × quantity and sells add bid × quantity; the basket is not automatically settled at fair value.',
  },
  {
    id: 'venue-gap', group: 'market', route: '/market-games/venue-gap',
    objective: 'Find a profitable simultaneous buy and sell of the same asset on different venues, after both transaction fees.',
    settings: 'Choose difficulty, rounds and seconds per round. Difficulty changes venue count and fees; round/time fields accept preset or custom values, and each round has a fresh timer.',
    controls: 'Select a Buy on venue and a different Sell on venue, enter a positive integer quantity and Execute arbitrage. Buy at the chosen ask and sell at the chosen bid. Net profit per unit is sell bid × (1 − sell fee rate) − buy ask × (1 + buy fee rate). Quantity cannot exceed the buy venue’s ask liquidity, the sell venue’s bid liquidity or your budget including the purchase fee. Skip round when no pair is profitable.',
    ending: 'Executing, skipping or timing out resolves the round and briefly displays feedback before advancing automatically. Timer expiry acts as a skip. The market closes after the configured rounds.',
    feedback: 'Executed trades show fees, net profit and updated budget; skipped rounds report whether an opportunity was missed. Unlike the cash-only trading games, both legs settle together and only net profit/loss changes your budget. Results show budget, profit/loss, accuracy and missed/incorrect decisions; completed sessions appear in Statistics.',
  },
  {
    id: 'delta-shield', group: 'market', route: '/market-games/delta-shield',
    objective: 'Reduce the absolute Current portfolio exposure using one affordable hedge. Sum signed position quantity × exposure per unit, then look for a hedge that brings the total towards zero.',
    settings: 'Choose difficulty, rounds and seconds per round, with preset or custom round/time values. Difficulty changes the portfolio and hedge choices. The timer resets each round; your remaining budget carries forward.',
    controls: 'Choose Buy or Sell, a hedge instrument and a positive integer quantity, then Hedge. A buy adds quantity × the instrument’s signed exposure; a sell subtracts it. Both sides cost instrument price × quantity and are constrained by its quantity cap and your budget. Use the displayed current exposure for this calculation; the market-shock factor and Impact are context, not an extra multiplier on the selected instrument’s exposure. Skip when already balanced.',
    ending: 'Only one hedge can be submitted in a round. Hedging, skipping or timer expiry reveals residual exposure, cost, score and the best feasible hedge, then advances automatically. The session ends after the configured rounds.',
    feedback: 'Score rewards reducing absolute exposure and penalizes hedge cost, clipped to 0–100. A skip or timeout earns zero score even on a balanced round, although leaving a balanced portfolio alone counts as a correct round in the results. Results show average score, remaining budget, total coverage cost and missed/suboptimal rounds; a non-balanced round needs a score of at least 70 to count as correct there. Completed sessions are saved in Statistics.',
  },
]

export function Guide() {
  return <section className="page guide-page">
    <p className="eyebrow">QUANTAPIT / GUIDE</p>
    <h1>How to play</h1>
    <p className="section-intro">Know the objective, set your pace, and understand what each result means. Choose a game below or start with untimed interview practice.</p>
    <nav className="guide-index" aria-label="Guide contents">
      {entries.map(entry => <a key={entry.id} href={`#guide-${entry.id}`}>{GAME_NAMES[entry.id]}</a>)}
      <a href="#guide-questions">Questions</a>
    </nav>
    {([{ id: 'logic', title: 'Logic and math games' }, { id: 'market', title: 'Market games' }] as const).map(group => <section className="guide-section" key={group.id} aria-labelledby={`guide-${group.id}`}>
      <h2 id={`guide-${group.id}`}>{group.title}</h2>
      <div className="guide-grid">{entries.filter(entry => entry.group === group.id).map(entry => <article className="guide-entry" id={`guide-${entry.id}`} key={entry.id} aria-labelledby={`guide-title-${entry.id}`}>
        <h3 id={`guide-title-${entry.id}`}>{GAME_NAMES[entry.id]}</h3>
        <p>{entry.objective}</p>
        <dl>
          <dt>Set up</dt><dd>{entry.settings}</dd>
          <dt>Play &amp; controls</dt><dd>{entry.controls}</dd>
          <dt>Round &amp; session ending</dt><dd>{entry.ending}</dd>
          <dt>Score &amp; feedback</dt><dd>{entry.feedback}</dd>
        </dl>
        <NavLink to={entry.route}>Play {GAME_NAMES[entry.id]} <span aria-hidden="true">↗</span></NavLink>
      </article>)}</div>
    </section>)}
    <section className="guide-section" aria-labelledby="guide-interview">
      <h2 id="guide-interview">Interview practice</h2>
      <article className="guide-entry" id="guide-questions" aria-labelledby="guide-title-questions">
        <h3 id="guide-title-questions">Questions</h3>
        <p>Practice explaining your reasoning, not just finding a number. Work through each prompt aloud or on paper before comparing it with the supplied answer.</p>
        <dl>
          <dt>Set up</dt><dd>Choose a category with Mode, or Mixed for all categories. Choose a difficulty or Mixed, then a whole-number question count within the displayed available bank. Bank entries are sampled without replacement; different entries may share a prompt.</dd>
          <dt>Play &amp; controls</dt><dd>There is no timer and no answer input. Think through the assumptions and steps, then select Show answer. Compare your reasoning before selecting Next question; advancing is only available after revealing the answer.</dd>
          <dt>Session ending &amp; feedback</dt><dd>Select Finish session after revealing the last answer. The summary lists the prompts you practiced, their categories and difficulties; New session returns to setup. This is self-review, not automatic grading, and interview question sessions are not recorded in game Statistics.</dd>
        </dl>
        <NavLink to="/open-questions">Practice Questions <span aria-hidden="true">↗</span></NavLink>
      </article>
    </section>
    <p className="guide-note">Completed game sessions stay in this browser. Visit <NavLink to="/statistics">Statistics</NavLink> to review your history, export a backup or import sessions in another browser. Finish a game session to record it; leaving partway through does not create a completed result.</p>
  </section>
}
