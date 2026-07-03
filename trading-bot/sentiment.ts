// Lexicon-based financial sentiment analysis for tweets.
//
// This is deliberately simple and dependency-free: a curated lexicon of
// finance-flavoured terms, with handling for negation ("not good") and
// intensifiers ("very strong"). Each tweet's raw score is then weighted by the
// author's reach and engagement so that a viral post from a large account moves
// the aggregate more than an ignored one.

import { SentimentResult, Tweet, TweetSentiment } from './types';

/** Per-term polarity, roughly −2 … +2. */
const LEXICON: Record<string, number> = {
  // bullish
  buy: 1.5,
  bullish: 2,
  long: 1,
  moon: 1.5,
  rally: 1.5,
  surge: 1.5,
  soar: 1.8,
  beat: 1.5,
  beats: 1.5,
  growth: 1,
  growing: 1,
  profit: 1,
  profitable: 1.2,
  strong: 1.2,
  upgrade: 1.5,
  outperform: 1.5,
  breakout: 1.3,
  undervalued: 1.5,
  gain: 1,
  gains: 1,
  record: 1,
  momentum: 0.8,
  dividend: 0.6,
  // bearish
  sell: -1.5,
  bearish: -2,
  short: -1,
  crash: -2,
  plunge: -1.8,
  plummet: -1.8,
  drop: -1.2,
  dropped: -1.2,
  miss: -1.5,
  misses: -1.5,
  weak: -1.2,
  weakness: -1.2,
  downgrade: -1.5,
  underperform: -1.5,
  overvalued: -1.5,
  loss: -1.3,
  losses: -1.3,
  decline: -1.2,
  declining: -1.2,
  lawsuit: -1.5,
  fraud: -2,
  investigation: -1.3,
  bankruptcy: -2,
  debt: -0.6,
  layoffs: -1.2,
  warning: -1.2,
  risk: -0.6,
  risky: -1,
  dump: -1.5,
  bagholder: -1.2,
};

const NEGATIONS = new Set(['not', 'no', "n't", 'never', 'without', 'cannot', "can't", 'dont', "don't"]);
const INTENSIFIERS: Record<string, number> = {
  very: 1.5,
  super: 1.5,
  extremely: 1.8,
  really: 1.3,
  hugely: 1.6,
  massively: 1.7,
  slightly: 0.5,
  somewhat: 0.6,
};

/** Split a tweet into lowercase word tokens, stripping punctuation and $tickers. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ') // drop URLs
    .replace(/[#$]/g, ' ') // drop cashtag / hashtag markers, keep the word
    .replace(/[^a-z0-9'\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Influence weight for a tweet: a log-scaled function of followers plus
 * engagement, always ≥ 1 so an anonymous post still counts once.
 */
export function engagementWeight(tweet: Tweet): number {
  const followers = Math.max(0, tweet.followers ?? 0);
  const engagement = Math.max(0, (tweet.likes ?? 0) + (tweet.retweets ?? 0));
  const reach = Math.log10(followers + 10) - 1; // 0 at 0 followers, ~4 at 100k
  const buzz = Math.log10(engagement + 10) - 1;
  return 1 + Math.max(0, reach) + Math.max(0, buzz);
}

/** Score a single tweet in the range −1 … +1. */
export function scoreTweet(tweet: Tweet): TweetSentiment {
  const tokens = tokenize(tweet.text);
  const matchedTerms: string[] = [];
  let raw = 0;

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    const polarity = LEXICON[token];
    if (polarity === undefined) continue;

    // Look back up to two tokens for a negation or intensifier.
    let multiplier = 1;
    let negated = false;
    for (let j = Math.max(0, i - 2); j < i; j += 1) {
      const prev = tokens[j];
      if (NEGATIONS.has(prev)) negated = true;
      if (INTENSIFIERS[prev]) multiplier *= INTENSIFIERS[prev];
    }

    let contribution = polarity * multiplier;
    if (negated) contribution *= -0.8; // negation flips and slightly dampens
    raw += contribution;
    matchedTerms.push(token);
  }

  // Squash the unbounded raw sum into (−1, 1) with a smooth tanh-like curve.
  const score = matchedTerms.length === 0 ? 0 : Math.tanh(raw / 3);

  return { tweet, score, weight: engagementWeight(tweet), matchedTerms };
}

/** Aggregate a batch of tweets into a single weighted sentiment reading. */
export function analyzeTweets(tweets: Tweet[]): SentimentResult {
  const perTweet = tweets.map(scoreTweet);

  let weightedSum = 0;
  let totalWeight = 0;
  let bullishCount = 0;
  let bearishCount = 0;
  let neutralCount = 0;

  for (const t of perTweet) {
    // A tweet with no matched terms carries no signal, only its presence.
    if (t.matchedTerms.length > 0) {
      weightedSum += t.score * t.weight;
      totalWeight += t.weight;
    }
    if (t.score > 0.15) bullishCount += 1;
    else if (t.score < -0.15) bearishCount += 1;
    else neutralCount += 1;
  }

  const score = totalWeight === 0 ? 0 : weightedSum / totalWeight;
  const label: SentimentResult['label'] =
    score > 0.15 ? 'bullish' : score < -0.15 ? 'bearish' : 'neutral';

  return {
    score,
    label,
    tweetsAnalyzed: tweets.length,
    bullishCount,
    bearishCount,
    neutralCount,
    perTweet,
  };
}
