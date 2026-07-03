// Financial model: turn raw accounting data into a valuation and health score.
//
// The valuation is a textbook discounted-cash-flow (DCF):
//   1. Estimate a forward free-cash-flow (FCF) growth rate from history.
//   2. Project FCF for `projectionYears`.
//   3. Add a Gordon-growth terminal value.
//   4. Discount everything to today → enterprise value.
//   5. Subtract net debt → equity value → intrinsic value per share.

import {
  CompanyFinancials,
  DEFAULT_ASSUMPTIONS,
  FinancialRatios,
  FinancialYear,
  HealthScore,
  ValuationAssumptions,
  Valuation,
} from './types';

/** Compound annual growth rate between the first and last of a series. */
export function cagr(first: number, last: number, periods: number): number {
  if (periods <= 0 || first <= 0 || last <= 0) return 0;
  return (last / first) ** (1 / periods) - 1;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Estimate a forward FCF growth rate from history, blended toward a
 * conservative midpoint and clamped to the configured bounds.
 */
export function estimateGrowthRate(
  financials: CompanyFinancials,
  assumptions: ValuationAssumptions,
): number {
  const years = financials.years;
  if (years.length < 2) {
    // No history to extrapolate from: assume terminal growth.
    return assumptions.terminalGrowthRate;
  }

  const first = years[0];
  const last = years[years.length - 1];
  const periods = years.length - 1;

  const fcfGrowth = cagr(first.freeCashFlow, last.freeCashFlow, periods);
  const revenueGrowth = cagr(first.revenue, last.revenue, periods);

  // Blend FCF and revenue growth (FCF is noisier), then fade toward terminal
  // growth to avoid over-extrapolating a hot streak.
  const blended = 0.6 * fcfGrowth + 0.4 * revenueGrowth;
  const faded = 0.7 * blended + 0.3 * assumptions.terminalGrowthRate;

  return clamp(faded, assumptions.minGrowthRate, assumptions.maxGrowthRate);
}

/** Run the DCF and return a full valuation given the latest financials + price. */
export function valuate(
  financials: CompanyFinancials,
  currentPrice: number,
  assumptions: ValuationAssumptions = DEFAULT_ASSUMPTIONS,
): Valuation {
  const latest = financials.years[financials.years.length - 1];
  const growth = estimateGrowthRate(financials, assumptions);
  const { discountRate: r, terminalGrowthRate: g, projectionYears: n } = assumptions;

  const projectedFreeCashFlows: number[] = [];
  let pvOfFlows = 0;
  let projectedFcf = latest.freeCashFlow;

  for (let t = 1; t <= n; t += 1) {
    projectedFcf *= 1 + growth;
    projectedFreeCashFlows.push(projectedFcf);
    pvOfFlows += projectedFcf / (1 + r) ** t;
  }

  // Gordon-growth terminal value at year n, then discounted back to today.
  // Guard against the degenerate r ≤ g case.
  const safeSpread = r - g > 0.005 ? r - g : 0.005;
  const terminalValue = (projectedFcf * (1 + g)) / safeSpread;
  const pvTerminal = terminalValue / (1 + r) ** n;

  const enterpriseValue = pvOfFlows + pvTerminal;
  const netDebt = latest.totalDebt - latest.cashAndEquivalents;
  const equityValue = enterpriseValue - netDebt;
  const intrinsicValuePerShare =
    latest.sharesOutstanding > 0 ? equityValue / latest.sharesOutstanding : 0;

  const upside =
    currentPrice > 0 ? (intrinsicValuePerShare - currentPrice) / currentPrice : 0;

  return {
    estimatedGrowthRate: growth,
    projectedFreeCashFlows,
    terminalValue,
    enterpriseValue,
    netDebt,
    equityValue,
    intrinsicValuePerShare,
    currentPrice,
    upside,
    assumptions,
  };
}

/** Derive the headline ratios investors screen on. */
export function computeRatios(
  financials: CompanyFinancials,
  currentPrice: number,
): FinancialRatios {
  const years = financials.years;
  const latest = years[years.length - 1];
  const first = years[0];
  const periods = Math.max(1, years.length - 1);

  const marketCap = currentPrice * latest.sharesOutstanding;
  const currentRatio =
    latest.currentAssets != null &&
    latest.currentLiabilities != null &&
    latest.currentLiabilities > 0
      ? latest.currentAssets / latest.currentLiabilities
      : null;

  return {
    revenueCagr: cagr(first.revenue, latest.revenue, periods),
    fcfCagr: cagr(first.freeCashFlow, latest.freeCashFlow, periods),
    netMargin: latest.revenue > 0 ? latest.netIncome / latest.revenue : 0,
    returnOnEquity:
      latest.shareholdersEquity > 0 ? latest.netIncome / latest.shareholdersEquity : 0,
    debtToEquity:
      latest.shareholdersEquity > 0 ? latest.totalDebt / latest.shareholdersEquity : Infinity,
    currentRatio,
    priceToEarnings: latest.netIncome > 0 ? marketCap / latest.netIncome : null,
    priceToFcf: latest.freeCashFlow > 0 ? marketCap / latest.freeCashFlow : null,
  };
}

/**
 * Score fundamental health 0–100 from the ratios. Each check contributes a
 * band of points; the notes explain what helped or hurt.
 */
export function scoreHealth(ratios: FinancialRatios, latest: FinancialYear): HealthScore {
  let score = 50; // neutral baseline
  const notes: string[] = [];

  // Profitability
  if (latest.netIncome > 0) {
    score += 10;
    notes.push('Profitable (positive net income).');
  } else {
    score -= 15;
    notes.push('Unprofitable (negative net income).');
  }
  if (ratios.netMargin > 0.15) {
    score += 8;
    notes.push(`Healthy net margin (${(ratios.netMargin * 100).toFixed(1)}%).`);
  } else if (ratios.netMargin < 0.05 && latest.netIncome > 0) {
    score -= 4;
    notes.push(`Thin net margin (${(ratios.netMargin * 100).toFixed(1)}%).`);
  }

  // Cash generation
  if (latest.freeCashFlow > 0) {
    score += 8;
    notes.push('Generates positive free cash flow.');
  } else {
    score -= 10;
    notes.push('Burning cash (negative free cash flow).');
  }

  // Growth
  if (ratios.revenueCagr > 0.1) {
    score += 8;
    notes.push(`Strong revenue growth (${(ratios.revenueCagr * 100).toFixed(1)}% CAGR).`);
  } else if (ratios.revenueCagr < 0) {
    score -= 8;
    notes.push(`Shrinking revenue (${(ratios.revenueCagr * 100).toFixed(1)}% CAGR).`);
  }

  // Leverage
  if (ratios.debtToEquity < 0.5) {
    score += 8;
    notes.push('Conservative balance sheet (low debt/equity).');
  } else if (ratios.debtToEquity > 2) {
    score -= 12;
    notes.push(`Highly leveraged (debt/equity ${ratios.debtToEquity.toFixed(2)}).`);
  }

  // Liquidity
  if (ratios.currentRatio != null) {
    if (ratios.currentRatio >= 1.5) {
      score += 5;
      notes.push('Comfortable liquidity (current ratio ≥ 1.5).');
    } else if (ratios.currentRatio < 1) {
      score -= 8;
      notes.push(`Liquidity risk (current ratio ${ratios.currentRatio.toFixed(2)}).`);
    }
  }

  // Returns
  if (ratios.returnOnEquity > 0.15) {
    score += 6;
    notes.push(`Strong return on equity (${(ratios.returnOnEquity * 100).toFixed(1)}%).`);
  }

  return { score: clamp(score, 0, 100), notes };
}
