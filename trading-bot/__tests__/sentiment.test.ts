import { analyzeTweets, scoreTweet, tokenize, engagementWeight } from '../sentiment';
import { Tweet } from '../types';

function tweet(text: string, extra: Partial<Tweet> = {}): Tweet {
  return { id: Math.random().toString(36).slice(2), text, ...extra };
}

describe('tokenize', () => {
  test('strips URLs, cashtags and punctuation', () => {
    const tokens = tokenize('$ACME is a BUY!! http://x.co #bullish');
    expect(tokens).toContain('acme');
    expect(tokens).toContain('buy');
    expect(tokens).toContain('bullish');
    expect(tokens.some((t) => t.startsWith('http'))).toBe(false);
  });
});

describe('scoreTweet', () => {
  test('positive language yields a positive score', () => {
    expect(scoreTweet(tweet('strong growth, very bullish, buy')).score).toBeGreaterThan(0.3);
  });

  test('negative language yields a negative score', () => {
    expect(scoreTweet(tweet('bearish, crash incoming, sell now')).score).toBeLessThan(-0.3);
  });

  test('no matched terms is neutral', () => {
    const s = scoreTweet(tweet('the weather is nice today'));
    expect(s.score).toBe(0);
    expect(s.matchedTerms).toHaveLength(0);
  });

  test('negation flips polarity', () => {
    const positive = scoreTweet(tweet('this is strong')).score;
    const negated = scoreTweet(tweet('this is not strong')).score;
    expect(positive).toBeGreaterThan(0);
    expect(negated).toBeLessThan(0);
  });

  test('intensifier amplifies magnitude', () => {
    const plain = scoreTweet(tweet('growth')).score;
    const amped = scoreTweet(tweet('extremely strong growth')).score;
    expect(amped).toBeGreaterThan(plain);
  });
});

describe('engagementWeight', () => {
  test('bigger accounts and more engagement weigh more', () => {
    const small = engagementWeight(tweet('x', { followers: 10, likes: 0 }));
    const big = engagementWeight(tweet('x', { followers: 500000, likes: 5000, retweets: 1000 }));
    expect(big).toBeGreaterThan(small);
    expect(small).toBeGreaterThanOrEqual(1);
  });
});

describe('analyzeTweets', () => {
  test('aggregates to a bullish label when positives dominate', () => {
    const result = analyzeTweets([
      tweet('strong growth, bullish, buy', { followers: 10000, likes: 100 }),
      tweet('record profit, upgrade', { followers: 20000, likes: 200 }),
      tweet('slightly overvalued maybe', { followers: 500 }),
    ]);
    expect(result.label).toBe('bullish');
    expect(result.score).toBeGreaterThan(0.15);
    expect(result.tweetsAnalyzed).toBe(3);
  });

  test('high-reach bearish tweet outweighs a tiny bullish one', () => {
    const result = analyzeTweets([
      tweet('buy', { followers: 50 }),
      tweet('fraud and bankruptcy, sell everything', { followers: 1000000, likes: 20000 }),
    ]);
    expect(result.label).toBe('bearish');
  });

  test('empty input is neutral, not NaN', () => {
    const result = analyzeTweets([]);
    expect(result.score).toBe(0);
    expect(result.label).toBe('neutral');
  });
});
