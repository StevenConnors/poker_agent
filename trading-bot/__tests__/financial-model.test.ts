import { cagr, estimateGrowthRate, valuate, computeRatios, scoreHealth } from '../financial-model';
import { CompanyFinancials, DEFAULT_ASSUMPTIONS, FinancialYear } from '../types';

function year(y: number, over: Partial<FinancialYear> = {}): FinancialYear {
  return {
    year: y,
    revenue: 1000,
    netIncome: 100,
    freeCashFlow: 90,
    totalDebt: 200,
    cashAndEquivalents: 300,
    shareholdersEquity: 500,
    sharesOutstanding: 100,
    currentAssets: 400,
    currentLiabilities: 200,
    ...over,
  };
}

const healthy: CompanyFinancials = {
  ticker: 'TST',
  name: 'Test Co',
  years: [
    year(2021, { revenue: 1000, freeCashFlow: 90, netIncome: 100 }),
    year(2022, { revenue: 1200, freeCashFlow: 110, netIncome: 130 }),
    year(2023, { revenue: 1450, freeCashFlow: 140, netIncome: 170 }),
  ],
};

describe('cagr', () => {
  test('computes compound growth', () => {
    expect(cagr(100, 400, 2)).toBeCloseTo(1.0, 5); // 100 -> 400 over 2y = 100%/yr
  });
  test('guards against non-positive inputs', () => {
    expect(cagr(0, 100, 2)).toBe(0);
    expect(cagr(100, 100, 0)).toBe(0);
  });
});

describe('estimateGrowthRate', () => {
  test('respects the configured cap', () => {
    const rocket: CompanyFinancials = {
      ...healthy,
      years: [year(2022, { revenue: 100, freeCashFlow: 10 }), year(2023, { revenue: 1000, freeCashFlow: 100 })],
    };
    const g = estimateGrowthRate(rocket, DEFAULT_ASSUMPTIONS);
    expect(g).toBeLessThanOrEqual(DEFAULT_ASSUMPTIONS.maxGrowthRate + 1e-9);
  });

  test('single year falls back to terminal growth', () => {
    const one: CompanyFinancials = { ...healthy, years: [year(2023)] };
    expect(estimateGrowthRate(one, DEFAULT_ASSUMPTIONS)).toBe(DEFAULT_ASSUMPTIONS.terminalGrowthRate);
  });
});

describe('valuate', () => {
  test('produces a positive intrinsic value for a profitable growing firm', () => {
    const v = valuate(healthy, 15);
    expect(v.intrinsicValuePerShare).toBeGreaterThan(0);
    expect(v.projectedFreeCashFlows).toHaveLength(DEFAULT_ASSUMPTIONS.projectionYears);
    expect(v.enterpriseValue).toBeGreaterThan(0);
  });

  test('upside is positive when price is below intrinsic value', () => {
    const v = valuate(healthy, 1); // absurdly cheap
    expect(v.upside).toBeGreaterThan(0);
  });

  test('upside is negative when price is far above intrinsic value', () => {
    const v = valuate(healthy, 100000);
    expect(v.upside).toBeLessThan(0);
  });

  test('net debt = debt − cash and flows into equity value', () => {
    const v = valuate(healthy, 15);
    const latest = healthy.years[healthy.years.length - 1];
    expect(v.netDebt).toBe(latest.totalDebt - latest.cashAndEquivalents);
    expect(v.equityValue).toBeCloseTo(v.enterpriseValue - v.netDebt, 3);
  });

  test('does not divide by zero when discount rate ≈ terminal growth', () => {
    const v = valuate(healthy, 15, { ...DEFAULT_ASSUMPTIONS, discountRate: 0.03, terminalGrowthRate: 0.03 });
    expect(Number.isFinite(v.intrinsicValuePerShare)).toBe(true);
  });
});

describe('computeRatios', () => {
  test('derives margins, leverage and multiples', () => {
    const r = computeRatios(healthy, 15);
    expect(r.netMargin).toBeCloseTo(170 / 1450, 5);
    expect(r.debtToEquity).toBeCloseTo(200 / 500, 5);
    expect(r.currentRatio).toBeCloseTo(400 / 200, 5);
    expect(r.priceToEarnings).not.toBeNull();
  });

  test('P/E is null when the company is unprofitable', () => {
    const loss: CompanyFinancials = { ...healthy, years: [year(2023, { netIncome: -50 })] };
    expect(computeRatios(loss, 15).priceToEarnings).toBeNull();
  });
});

describe('scoreHealth', () => {
  test('a strong company scores well above neutral', () => {
    const r = computeRatios(healthy, 15);
    const h = scoreHealth(r, healthy.years[healthy.years.length - 1]);
    expect(h.score).toBeGreaterThan(60);
    expect(h.notes.length).toBeGreaterThan(0);
  });

  test('an unprofitable, cash-burning, leveraged firm scores low', () => {
    const weak: CompanyFinancials = {
      ticker: 'WEK',
      name: 'Weak Co',
      years: [
        year(2022, { revenue: 1200, netIncome: -100, freeCashFlow: -80, totalDebt: 2000, shareholdersEquity: 400 }),
        year(2023, { revenue: 1000, netIncome: -150, freeCashFlow: -120, totalDebt: 2200, shareholdersEquity: 300, currentAssets: 100, currentLiabilities: 400 }),
      ],
    };
    const r = computeRatios(weak, 5);
    const h = scoreHealth(r, weak.years[weak.years.length - 1]);
    expect(h.score).toBeLessThan(40);
  });
});
