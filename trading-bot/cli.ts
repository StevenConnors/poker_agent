// Command-line runner for the trading bot.
//
// Usage:
//   pnpm bot                                  # uses the bundled ACME sample
//   pnpm bot --financials f.json --tweets t.json --price 42.5
//
// `--financials` may include a top-level `currentPrice`; `--price` overrides it.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import chalk from 'chalk';

import { analyzeCompany } from './index';
import { AnalysisReport, CompanyFinancials, Tweet } from './types';

const here = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        out[key] = next;
        i += 1;
      } else {
        out[key] = 'true';
      }
    }
  }
  return out;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function fmtMoney(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toFixed(2)}`;
}

function actionColor(action: AnalysisReport['recommendation']['action']): string {
  if (action === 'buy') return chalk.bold.green('BUY');
  if (action === 'avoid') return chalk.bold.red('AVOID');
  return chalk.bold.yellow('HOLD');
}

function printReport(report: AnalysisReport): void {
  const { valuation: v, ratios: r, health, sentiment, recommendation: rec } = report;

  console.log(chalk.bold.cyan(`\n═══ ${report.name} (${report.ticker}) ═══`));
  console.log(`Current price:      ${fmtMoney(report.currentPrice)}`);

  console.log(chalk.bold('\nValuation (DCF)'));
  console.log(`  Est. FCF growth:  ${(v.estimatedGrowthRate * 100).toFixed(1)}%`);
  console.log(`  Enterprise value: ${fmtMoney(v.enterpriseValue)}`);
  console.log(`  Net debt:         ${fmtMoney(v.netDebt)}`);
  console.log(`  Equity value:     ${fmtMoney(v.equityValue)}`);
  console.log(`  Intrinsic / share:${chalk.bold(` ${fmtMoney(v.intrinsicValuePerShare)}`)}`);
  const upsideStr = `${(v.upside * 100).toFixed(1)}%`;
  console.log(`  Upside:           ${v.upside >= 0 ? chalk.green(upsideStr) : chalk.red(upsideStr)}`);

  console.log(chalk.bold('\nKey ratios'));
  console.log(`  Revenue CAGR:     ${(r.revenueCagr * 100).toFixed(1)}%`);
  console.log(`  Net margin:       ${(r.netMargin * 100).toFixed(1)}%`);
  console.log(`  Return on equity: ${(r.returnOnEquity * 100).toFixed(1)}%`);
  console.log(`  Debt / equity:    ${r.debtToEquity.toFixed(2)}`);
  console.log(`  P/E:              ${r.priceToEarnings != null ? r.priceToEarnings.toFixed(1) : 'n/a'}`);
  console.log(`  P/FCF:            ${r.priceToFcf != null ? r.priceToFcf.toFixed(1) : 'n/a'}`);

  console.log(chalk.bold(`\nFundamental health: ${health.score.toFixed(0)}/100`));
  for (const note of health.notes) console.log(`  • ${note}`);

  console.log(chalk.bold(`\nSocial sentiment: ${sentiment.label} (${sentiment.score.toFixed(2)})`));
  console.log(
    `  ${sentiment.bullishCount} bullish / ${sentiment.neutralCount} neutral / ${sentiment.bearishCount} bearish of ${sentiment.tweetsAnalyzed}`,
  );

  console.log(chalk.bold('\n─── Recommendation ───'));
  console.log(`  ${actionColor(rec.action)}  (confidence ${(rec.confidence * 100).toFixed(0)}%, score ${rec.compositeScore.toFixed(2)})`);
  for (const line of rec.rationale) console.log(`  • ${line}`);
  console.log('');
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));

  const financialsPath = args.financials
    ? resolve(process.cwd(), args.financials)
    : resolve(here, 'data/sample-financials.json');
  const tweetsPath = args.tweets
    ? resolve(process.cwd(), args.tweets)
    : resolve(here, 'data/sample-tweets.json');

  const financials = readJson<CompanyFinancials & { currentPrice?: number }>(financialsPath);
  const tweets = readJson<Tweet[]>(tweetsPath);

  const currentPrice = args.price ? Number(args.price) : financials.currentPrice ?? 0;

  // Note: this repo compiles with `strict: false`, which disables the
  // control-flow narrowing that would let us read `result.error` off the
  // discriminated union, so we read the fields off a widened shape instead.
  const result = analyzeCompany({ financials, currentPrice, tweets }) as {
    ok: boolean;
    value?: AnalysisReport;
    error?: string;
  };
  if (result.ok && result.value) {
    printReport(result.value);
    return;
  }
  console.error(chalk.red(`Error: ${result.error}`));
  process.exit(1);
}

main();
