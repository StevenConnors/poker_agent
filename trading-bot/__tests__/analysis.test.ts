import { analyzeCompany } from '../index';
import { CompanyFinancials, Tweet } from '../types';

const financials: CompanyFinancials = {
  ticker: 'ACME',
  name: 'Acme Robotics Inc.',
  years: [
    { year: 2021, revenue: 1_800_000_000, netIncome: 210_000_000, freeCashFlow: 180_000_000, totalDebt: 300_000_000, cashAndEquivalents: 450_000_000, shareholdersEquity: 900_000_000, sharesOutstanding: 120_000_000, currentAssets: 780_000_000, currentLiabilities: 410_000_000 },
    { year: 2022, revenue: 2_100_000_000, netIncome: 260_000_000, freeCashFlow: 220_000_000, totalDebt: 320_000_000, cashAndEquivalents: 520_000_000, shareholdersEquity: 1_050_000_000, sharesOutstanding: 121_000_000, currentAssets: 860_000_000, currentLiabilities: 430_000_000 },
    { year: 2023, revenue: 2_520_000_000, netIncome: 340_000_000, freeCashFlow: 300_000_000, totalDebt: 310_000_000, cashAndEquivalents: 640_000_000, shareholdersEquity: 1_250_000_000, sharesOutstanding: 122_000_000, currentAssets: 980_000_000, currentLiabilities: 450_000_000 },
  ],
};

const bullishTweets: Tweet[] = [
  { id: '1', text: 'strong growth, record profit, very bullish, buy', followers: 50000, likes: 1000 },
  { id: '2', text: 'margins expanding, free cash flow strong, long term winner', followers: 20000, likes: 200 },
];

describe('analyzeCompany', () => {
  test('rejects missing financials', () => {
    const r = analyzeCompany({ financials: { ticker: 'X', name: 'X', years: [] }, currentPrice: 10 });
    expect(r.ok).toBe(false);
  });

  test('rejects non-positive price', () => {
    const r = analyzeCompany({ financials, currentPrice: 0 });
    expect(r.ok).toBe(false);
  });

  test('produces a full report for valid input', () => {
    const r = analyzeCompany({ financials, currentPrice: 42.5, tweets: bullishTweets });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.ticker).toBe('ACME');
    expect(r.value.valuation.intrinsicValuePerShare).toBeGreaterThan(0);
    expect(['buy', 'hold', 'avoid']).toContain(r.value.recommendation.action);
    expect(r.value.recommendation.rationale.length).toBeGreaterThan(0);
  });

  test('a deeply undervalued, healthy, hyped stock is a BUY', () => {
    const r = analyzeCompany({ financials, currentPrice: 5, tweets: bullishTweets });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.valuation.upside).toBeGreaterThan(0);
    expect(r.value.recommendation.action).toBe('buy');
  });

  test('a wildly overpriced stock is AVOID regardless of hype', () => {
    const r = analyzeCompany({ financials, currentPrice: 100000, tweets: bullishTweets });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.recommendation.action).toBe('avoid');
  });

  test('accepts years in any order (sorts oldest-first)', () => {
    const shuffled: CompanyFinancials = { ...financials, years: [financials.years[2], financials.years[0], financials.years[1]] };
    const r = analyzeCompany({ financials: shuffled, currentPrice: 42.5 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.ratios.revenueCagr).toBeGreaterThan(0);
  });
});
