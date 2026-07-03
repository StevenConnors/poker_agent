# Trading Bot — Equity Research & Recommendation

A small, dependency-light equity-research bot. It takes two kinds of input —
**social chatter (tweets)** and **company accounting data (financial
statements)** — builds a financial model of the company, estimates the worth of
its equity, and emits a **BUY / HOLD / AVOID** recommendation.

```
tweets ─────▶ sentiment ──────┐
                              ├─▶ recommendation ─▶ report
financials ─▶ DCF valuation ──┤
           └▶ health & ratios ┘
```

This is intentionally a *basic* model: it is deterministic, has no external API
calls or paid data feeds, and every number it produces is explainable. It is a
decision-support tool and an educational scaffold — **not** investment advice.

## Quick start

```bash
pnpm install

# Analyze the bundled ACME sample company
pnpm bot

# Analyze your own data
pnpm bot --financials path/to/financials.json --tweets path/to/tweets.json --price 42.50
```

## How it works

### 1. Sentiment (`sentiment.ts`)
Lexicon-based scoring of tweets on a −1 (bearish) … +1 (bullish) scale.
Handles **negation** ("not strong" → bearish) and **intensifiers** ("very
strong" → more bullish), then weights each tweet by the author's reach
(followers) and engagement (likes + retweets) so a viral post from a large
account moves the aggregate more than an ignored one.

### 2. Financial model (`financial-model.ts`)
- **Growth estimation** — blends historical free-cash-flow and revenue CAGR,
  then fades toward the terminal growth rate and clamps to sane bounds so a hot
  streak isn't extrapolated forever.
- **DCF valuation** — projects free cash flow for N years, adds a Gordon-growth
  terminal value, discounts everything to today for an *enterprise value*,
  subtracts *net debt* to get *equity value*, and divides by shares for an
  **intrinsic value per share**. `upside = (intrinsic − price) / price`.
- **Ratios & health** — margins, ROE, debt/equity, current ratio, P/E, P/FCF,
  and a 0–100 fundamental-health score with human-readable notes.

### 3. Recommendation (`recommendation.ts`)
A weighted composite — **valuation 55% / health 30% / sentiment 15%** — mapped
to BUY / HOLD / AVOID. Two guardrails reflect a value-investing bias:
- A structurally weak company (health < 30) is never a BUY even if cheap
  (value-trap guard).
- A stock trading far above intrinsic value is never a BUY, and one at a steep
  premium is an outright AVOID, regardless of hype (overvaluation guard).

## Programmatic use

```ts
import { analyzeCompany } from './trading-bot';

const result = analyzeCompany({
  financials,      // CompanyFinancials: historical yearly line items
  currentPrice,    // number
  tweets,          // Tweet[] (optional)
  // assumptions,  // optional DCF overrides (discount rate, terminal growth, …)
});

if (result.ok) {
  const { recommendation, valuation } = result.value;
  console.log(recommendation.action, valuation.intrinsicValuePerShare);
}
```

## Input shapes

See `types.ts` for the full definitions. Minimal examples live in `data/`:
`sample-financials.json` (accounting data + `currentPrice`) and
`sample-tweets.json`.

## Tests

```bash
pnpm test              # whole repo
npx jest trading-bot   # this module only
```

Covers sentiment (negation, intensifiers, engagement weighting, aggregation),
the DCF math and ratios, the health score, and the end-to-end recommendation —
including the value-trap and overvaluation guardrails.

## Limitations & next steps

- The lexicon is small; a production bot would use a trained classifier and
  filter spam/bots.
- Tweets are treated as a static batch — no live Twitter/X ingestion.
- Financial statements are hand-entered JSON — no PDF/XBRL 10-K parsing yet.
- Single-scenario DCF; no sensitivity analysis or comparables cross-check.
