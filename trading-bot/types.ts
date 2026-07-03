// Domain types for the equity-research trading bot.
//
// The bot ingests two kinds of input — social chatter (tweets) and company
// accounting data (financial statements) — and produces a valuation plus a
// buy / hold / avoid recommendation.

/** A single social-media post about a company. */
export interface Tweet {
  id: string;
  text: string;
  author?: string;
  /** Follower count of the author, used to weight influence. */
  followers?: number;
  /** Likes + retweets are folded into an engagement weight. */
  likes?: number;
  retweets?: number;
  createdAt?: string; // ISO date
}

/**
 * One fiscal year of accounting data, in the reporting currency (e.g. USD).
 * These are the line items a "basic" model needs; everything else is derived.
 */
export interface FinancialYear {
  year: number;
  revenue: number;
  netIncome: number;
  /** Free cash flow = operating cash flow − capital expenditure. */
  freeCashFlow: number;
  totalDebt: number;
  cashAndEquivalents: number;
  shareholdersEquity: number;
  /** Diluted shares outstanding at year end. */
  sharesOutstanding: number;
  /** Optional balance-sheet detail used for liquidity ratios. */
  currentAssets?: number;
  currentLiabilities?: number;
}

/** The complete accounting picture handed to the model. */
export interface CompanyFinancials {
  ticker: string;
  name: string;
  currency?: string;
  /** Historical years, oldest first. At least one year is required. */
  years: FinancialYear[];
}

/** Tunable assumptions for the discounted-cash-flow valuation. */
export interface ValuationAssumptions {
  /** Discount rate / WACC, e.g. 0.10 for 10%. */
  discountRate: number;
  /** Perpetual growth rate used for the terminal value, e.g. 0.025. */
  terminalGrowthRate: number;
  /** Number of years to project explicitly before the terminal value. */
  projectionYears: number;
  /** Hard cap on the estimated FCF growth rate, e.g. 0.20. */
  maxGrowthRate: number;
  /** Floor on the estimated FCF growth rate, e.g. -0.05. */
  minGrowthRate: number;
}

export const DEFAULT_ASSUMPTIONS: ValuationAssumptions = {
  discountRate: 0.1,
  terminalGrowthRate: 0.025,
  projectionYears: 5,
  maxGrowthRate: 0.2,
  minGrowthRate: -0.05,
};

/** Sentiment of a single tweet, on a −1 (bearish) … +1 (bullish) scale. */
export interface TweetSentiment {
  tweet: Tweet;
  score: number;
  /** Influence weight derived from followers + engagement. */
  weight: number;
  matchedTerms: string[];
}

/** Aggregate social sentiment across a batch of tweets. */
export interface SentimentResult {
  /** Engagement-weighted mean score, −1 … +1. */
  score: number;
  label: 'bullish' | 'neutral' | 'bearish';
  tweetsAnalyzed: number;
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  perTweet: TweetSentiment[];
}

/** Key ratios derived from the financials and the current market price. */
export interface FinancialRatios {
  revenueCagr: number;
  fcfCagr: number;
  netMargin: number;
  returnOnEquity: number;
  debtToEquity: number;
  currentRatio: number | null;
  priceToEarnings: number | null;
  priceToFcf: number | null;
}

/** Output of the DCF valuation. */
export interface Valuation {
  estimatedGrowthRate: number;
  projectedFreeCashFlows: number[];
  terminalValue: number;
  enterpriseValue: number;
  netDebt: number;
  equityValue: number;
  intrinsicValuePerShare: number;
  currentPrice: number;
  /** (intrinsic − price) / price. Positive means undervalued. */
  upside: number;
  assumptions: ValuationAssumptions;
}

/** A 0–100 fundamental-health score plus the reasons behind it. */
export interface HealthScore {
  score: number;
  notes: string[];
}

export type RecommendationAction = 'buy' | 'hold' | 'avoid';

export interface Recommendation {
  action: RecommendationAction;
  /** 0–1 confidence in the call. */
  confidence: number;
  /** Composite score, −1 … +1, that drove the decision. */
  compositeScore: number;
  rationale: string[];
}

/** The full report the bot emits for one company. */
export interface AnalysisReport {
  ticker: string;
  name: string;
  currentPrice: number;
  valuation: Valuation;
  ratios: FinancialRatios;
  health: HealthScore;
  sentiment: SentimentResult;
  recommendation: Recommendation;
}

export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };
