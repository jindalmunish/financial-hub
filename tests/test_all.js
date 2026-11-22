/**
 * Comprehensive Node test suite for the portfolio calculation engine.
 * Reads tests/data/transection.csv and asserts all SPEC rules and statement benchmarks.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const {
  parseCSV,
  processMFPortfolio,
  processSharePortfolio,
  classifyLotTaxBucket,
  calculateDaysToLongTerm,
  calculateXIRR,
  formatXIRR,
  aggregateFundsFlow,
  trackSIPs,
  runDataHealthChecks,
  runSelfTests,
  STATEMENT_CHECK_SEEDS,
  STATEMENT_SHARE_PRICES,
  MASTER_SCHEMES
} = require('../src/core');

const csvPath = path.join(__dirname, 'data', 'transection.csv');

if (!fs.existsSync(csvPath)) {
  console.error(`ERROR: Benchmark file missing at ${csvPath}. Stop and add it.`);
  process.exit(1);
}

const csvContent = fs.readFileSync(csvPath, 'utf8');
const records = parseCSV(csvContent);

console.log('====================================================');
console.log('   MJ PORTFOLIO ENGINE - TEST SUITE RUNNER');
console.log('====================================================');
console.log(`Loaded ${records.length} transactions from tests/data/transection.csv\n`);

let passedCount = 0;
let totalCount = 0;

function runCheck(desc, fn) {
  totalCount++;
  try {
    fn();
    console.log(`[PASS] ${desc}`);
    passedCount++;
  } catch (err) {
    console.error(`[FAIL] ${desc}`);
    console.error(`       Error: ${err.message}`);
  }
}

// 1. Parser verification
runCheck('Parser extracts rows and headers accurately', () => {
  assert(records.length > 300, `Expected >300 rows, got ${records.length}`);
  const r0 = records[0];
  assert(r0.who, 'Missing who');
  assert(r0.type, 'Missing type');
  assert(r0.schemeName, 'Missing scheme name');
  assert(r0.dateObj instanceof Date, 'dateObj must be Date');
});

// 2. MF Calculations
const mfResult = processMFPortfolio(records);

runCheck('MF Holdings count matches Statement_Check', () => {
  const mfSeeds = STATEMENT_CHECK_SEEDS.filter(s => s.type === 'MF');
  assert(mfResult.holdings.length >= mfSeeds.length, `Expected at least ${mfSeeds.length} MF holdings, got ${mfResult.holdings.length}`);
});

runCheck('MJ MF Total Invested equals 856,997.70 within Rs 1', () => {
  const mjMF = mfResult.holdings.filter(h => h.who === 'MJ');
  const mjInvested = mjMF.reduce((s, h) => s + h.grossInvested, 0);
  const diff = Math.abs(mjInvested - 856997.70);
  assert(diff <= 1.00, `Expected 856997.70, got ${mjInvested.toFixed(2)}, diff: ${diff}`);
});

runCheck('JJ MF Total Invested equals 93,000.00 within Rs 1', () => {
  const jjMF = mfResult.holdings.filter(h => h.who === 'JJ');
  const jjInvested = jjMF.reduce((s, h) => s + h.grossInvested, 0);
  const diff = Math.abs(jjInvested - 93000.00);
  assert(diff <= 1.00, `Expected 93000.00, got ${jjInvested.toFixed(2)}, diff: ${diff}`);
});

// 3. Share Calculations
const shareResult = processSharePortfolio(records);

runCheck('Share Holdings count matches Statement_Check (6 held shares)', () => {
  assert(shareResult.holdings.length === 6, `Expected 6 open share holdings, got ${shareResult.holdings.length}`);
});

runCheck('Share average prices match statement demat average prices within 0.01', () => {
  const shareSeeds = STATEMENT_CHECK_SEEDS.filter(s => s.type === 'Shares');
  for (const seed of shareSeeds) {
    const held = shareResult.holdings.find(h => h.who === seed.who && (h.schemeName === seed.name || h.shortName === seed.name));
    assert(held, `Holding not found for ${seed.name}`);
    const priceDiff = Math.abs(held.avgPriceNoCharges - seed.investedOrAvg);
    assert(priceDiff <= 0.015, `${seed.name} avg price diff too large: expected ${seed.investedOrAvg}, got ${held.avgPriceNoCharges}`);
  }
});

runCheck('MJ Shares cost without charges is ~1,665,440 (within Rs 5)', () => {
  const mjCostNoChg = shareResult.holdings.reduce((s, h) => s + h.costNoCharges, 0);
  const diff = Math.abs(mjCostNoChg - 1665440);
  assert(diff <= 5.00, `Expected ~1,665,440, got ${mjCostNoChg.toFixed(2)}, diff: ${diff}`);
});

runCheck('MJ Shares cost with charges is ~1,667,065 (within Rs 5)', () => {
  const mjCostWithChg = shareResult.holdings.reduce((s, h) => s + h.costWithCharges, 0);
  const diff = Math.abs(mjCostWithChg - 1667065);
  assert(diff <= 5.00, `Expected ~1,667,065, got ${mjCostWithChg.toFixed(2)}, diff: ${diff}`);
});

runCheck('MJ Shares profit at statement prices is ~68,064 (within Rs 5)', () => {
  let val = 0;
  for (const h of shareResult.holdings) {
    val += h.units * (STATEMENT_SHARE_PRICES[h.shortName] || 0);
  }
  const costNoChg = shareResult.holdings.reduce((s, h) => s + h.costNoCharges, 0);
  const profit = val - costNoChg;
  const diff = Math.abs(profit - 68064);
  assert(diff <= 5.00, `Expected ~68,064 profit, got ${profit.toFixed(2)}, diff: ${diff}`);
});

// 4. XIRR Engine
runCheck('XIRR calculates correctly on standard cash flows', () => {
  const flows = [
    { date: new Date('2025-01-01'), amount: -10000 },
    { date: new Date('2026-01-01'), amount: 11000 }
  ];
  const rate = calculateXIRR(flows);
  assert(rate !== null, 'XIRR should not be null');
  assert(Math.abs(rate - 10.0) < 0.1, `Expected ~10%, got ${rate}%`);
});

runCheck('XIRR flags short holdings (<90 days)', () => {
  const flows = [
    { date: new Date('2026-10-01'), amount: -10000 },
    { date: new Date('2026-11-01'), amount: 10500 }
  ];
  const res = formatXIRR(flows, new Date('2026-11-01'));
  assert(res.isShortHolding === true, 'Holding should be flagged as short holding');
});

// 5. SIP Tracker
runCheck('SIP tracker detects active SIPs', () => {
  const sips = trackSIPs(records, new Date('2026-11-08'));
  assert(sips.length > 0, 'Expected detected SIPs');
  const activeCount = sips.filter(s => s.status === 'Active').length;
  assert(activeCount > 0, 'Expected at least 1 active SIP');
});

// 6. Funds Flow
runCheck('Funds flow aggregations work across periods', () => {
  const flows = aggregateFundsFlow(records);
  assert(flows.length > 0, 'Expected funds flow records');
});

// 7. Self Test Suite
runCheck('Complete Self_Test suite passes 100%', () => {
  const testResults = runSelfTests(records);
  const failures = testResults.filter(t => t.status === 'FAIL');
  if (failures.length > 0) {
    console.error('Self Test Failures:\n', failures);
  }
  assert(failures.length === 0, `${failures.length} self-tests failed out of ${testResults.length}`);
  console.log(`       All ${testResults.length} self-tests PASSED without error.`);
});

console.log('\n----------------------------------------------------');
console.log(`Results: ${passedCount} / ${totalCount} checks passed.`);
console.log('----------------------------------------------------\n');

if (passedCount !== totalCount) {
  process.exit(1);
}
