// Public entry point for the equity-research trading bot.
//
// Given a company's accounting data, the current share price, and a batch of
// tweets, `analyzeCompany` runs the full pipeline and returns one report:
//
//   tweets ─▶ sentiment ─┐
//                        ├─▶ recommendation ─▶ report
//   financials ─▶ DCF ───┤
//              └▶ ratios ─┘

import { valuate, computeRatios, scoreHealth } from './financial-model';
import { recommend } from './recommendation';
import { analyzeTweets } from './sentiment';
import {
  AnalysisReport,
  CompanyFinancials,
  DEFAULT_ASSUMPTIONS,
  Result,
  Tweet,
  ValuationAssumptions,
} from './types';

export interface AnalyzeInput {
  financials: CompanyFinancials;
  currentPrice: number;
  tweets?: Tweet[];
  assumptions?: ValuationAssumptions;
}

/** Validate inputs then run the valuation + sentiment + recommendation pipeline. */
export function analyzeCompany(input: AnalyzeInput): Result<AnalysisReport, string> {
  const { financials, currentPrice, tweets = [], assumptions = DEFAULT_ASSUMPTIONS } = input;

  if (!financials || !financials.years || financials.years.length === 0) {
    return { ok: false, error: 'financials.years must contain at least one year of data' };
  }
  if (!(currentPrice > 0)) {
    return { ok: false, error: 'currentPrice must be a positive number' };
  }

  // Ensure years are oldest-first so growth math is oriented correctly.
  const sorted = {
    ...financials,
    years: [...financials.years].sort((a, b) => a.year - b.year),
  };
  const latest = sorted.years[sorted.years.length - 1];

  const valuation = valuate(sorted, currentPrice, assumptions);
  const ratios = computeRatios(sorted, currentPrice);
  const health = scoreHealth(ratios, latest);
  const sentiment = analyzeTweets(tweets);
  const recommendation = recommend(valuation, health, sentiment);

  return {
    ok: true,
    value: {
      ticker: financials.ticker,
      name: financials.name,
      currentPrice,
      valuation,
      ratios,
      health,
      sentiment,
      recommendation,
    },
  };
}

export * from './types';
export { valuate, computeRatios, scoreHealth, estimateGrowthRate, cagr } from './financial-model';
export { analyzeTweets, scoreTweet, tokenize } from './sentiment';
export { recommend } from './recommendation';
