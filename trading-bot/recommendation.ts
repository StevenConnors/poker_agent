// Recommendation engine: fuse valuation, fundamental health, and social
// sentiment into a single buy / hold / avoid call.
//
// Fundamentals dominate — this is a value-oriented bot, so a cheap price
// relative to intrinsic value matters most. Sentiment is a minority tilt that
// can nudge a borderline case but never overrides a clearly (over/under)valued
// business.

import {
  HealthScore,
  Recommendation,
  SentimentResult,
  Valuation,
} from './types';

const WEIGHTS = {
  valuation: 0.55,
  health: 0.3,
  sentiment: 0.15,
};

/** Map DCF upside to a −1 … +1 score (saturates at ±50% mispricing). */
function valuationScore(upside: number): number {
  return Math.max(-1, Math.min(1, upside / 0.5));
}

/** Map a 0–100 health score to −1 … +1 (50 is neutral). */
function healthScoreToSignal(health: number): number {
  return (health - 50) / 50;
}

export function recommend(
  valuation: Valuation,
  health: HealthScore,
  sentiment: SentimentResult,
): Recommendation {
  const vScore = valuationScore(valuation.upside);
  const hScore = healthScoreToSignal(health.score);
  const sScore = sentiment.score;

  const compositeScore =
    WEIGHTS.valuation * vScore + WEIGHTS.health * hScore + WEIGHTS.sentiment * sScore;

  let action: Recommendation['action'];
  if (compositeScore > 0.2) action = 'buy';
  else if (compositeScore < -0.2) action = 'avoid';
  else action = 'hold';

  // A structurally broken business (very low health) is never a buy, no matter
  // how cheap it screens — cheapness is often a value trap.
  if (action === 'buy' && health.score < 30) {
    action = 'hold';
  }

  // Symmetric guard on the expensive end: paying far above intrinsic value is
  // not a buy regardless of hype, and paying a wild premium is an outright
  // avoid — this is a value bot, price-to-value has the final word at extremes.
  if (valuation.upside < -0.4 && action === 'buy') {
    action = 'hold';
  }
  if (valuation.upside < -0.6) {
    action = 'avoid';
  }

  const confidence = Math.min(1, Math.abs(compositeScore) / 0.6);

  const rationale: string[] = [];
  rationale.push(
    valuation.upside >= 0
      ? `DCF intrinsic value $${valuation.intrinsicValuePerShare.toFixed(2)} is ${(valuation.upside * 100).toFixed(0)}% above the $${valuation.currentPrice.toFixed(2)} price (undervalued).`
      : `DCF intrinsic value $${valuation.intrinsicValuePerShare.toFixed(2)} is ${(Math.abs(valuation.upside) * 100).toFixed(0)}% below the $${valuation.currentPrice.toFixed(2)} price (overvalued).`,
  );
  rationale.push(`Fundamental health score: ${health.score.toFixed(0)}/100.`);
  rationale.push(
    `Social sentiment: ${sentiment.label} (${sentiment.score.toFixed(2)}) across ${sentiment.tweetsAnalyzed} tweets.`,
  );
  if (action === 'hold' && valuation.upside > 0.2 && health.score < 30) {
    rationale.push('Downgraded from buy: cheap but fundamentally weak (possible value trap).');
  }
  if (action === 'avoid' && valuation.upside < -0.6) {
    rationale.push('Trades at a steep premium to intrinsic value — overvaluation overrides positive sentiment.');
  }

  return { action, confidence, compositeScore, rationale };
}
