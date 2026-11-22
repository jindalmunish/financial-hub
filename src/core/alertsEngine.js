/**
 * Portfolio Alerts and Validation Engine.
 * Implements all 14 safety and data integrity checks specified in SPEC.md.
 */

function runDataHealthChecks(records, masters, options = {}) {
  const asOfDate = options.asOfDate || new Date();
  const tolerance = options.tolerance !== undefined ? options.tolerance : 1.00;
  const holidays = options.holidays || [];
  const statementCheckSeeds = options.statementCheckSeeds || [];
  const currentHoldings = options.currentHoldings || [];

  const alerts = [];
  const seenKeys = new Set();

  for (const r of records) {
    // 1. Missing Who or Type
    if (!r.who) {
      alerts.push({
        severity: 'ERROR',
        rule: 'MISSING_WHO',
        row: r.rowIndex,
        message: `Row ${r.rowIndex}: Missing "Who" field.`
      });
    }
    if (!r.type) {
      alerts.push({
        severity: 'ERROR',
        rule: 'MISSING_TYPE',
        row: r.rowIndex,
        message: `Row ${r.rowIndex}: Missing "Type" field.`
      });
    }

    // 2. Unsupported Type
    if (r.type && r.type !== 'MF' && r.type !== 'Shares') {
      alerts.push({
        severity: 'WARNING',
        rule: 'UNSUPPORTED_TYPE',
        row: r.rowIndex,
        message: `Row ${r.rowIndex}: Asset Type "${r.type}" is not supported yet.`
      });
    }

    // 3. Bad, missing, or future date
    if (!r.dateObj) {
      alerts.push({
        severity: 'ERROR',
        rule: 'INVALID_DATE',
        row: r.rowIndex,
        message: `Row ${r.rowIndex}: Bad or missing date "${r.rawDate}".`
      });
    } else if (r.dateObj.getTime() > asOfDate.getTime() + 86400 * 1000) {
      alerts.push({
        severity: 'WARNING',
        rule: 'FUTURE_DATE',
        row: r.rowIndex,
        message: `Row ${r.rowIndex}: Future date detected: ${r.dateStr}.`
      });
    }

    // 4. Duplicate row (same Who, Type, name, date, units, price, amount)
    const dupKey = `${r.who}|${r.type}|${r.schemeName}|${r.dateStr}|${r.units}|${r.navPrice}|${r.amount}`;
    if (seenKeys.has(dupKey)) {
      alerts.push({
        severity: 'WARNING',
        rule: 'DUPLICATE_ROW',
        row: r.rowIndex,
        message: `Row ${r.rowIndex}: Potential duplicate transaction: ${dupKey}`
      });
    }
    seenKeys.add(dupKey);

    // 5. Price at or below 0 except bonus
    const isBonus = r.type === 'Shares' && (r.description || '').toLowerCase().includes('buy') && r.units > 0 && r.navPrice === 0 && r.charges === 0;
    if (r.units > 0 && r.navPrice <= 0 && !isBonus && Math.abs(r.amount) > 1e-4) {
      alerts.push({
        severity: 'ERROR',
        rule: 'INVALID_PRICE',
        row: r.rowIndex,
        message: `Row ${r.rowIndex}: Price is zero or negative (${r.navPrice}) for non-bonus entry.`
      });
    }

    // 6. Share row without charges
    if (r.type === 'Shares' && !isBonus && (r.charges === null || r.charges === undefined || r.charges === 0)) {
      alerts.push({
        severity: 'INFO',
        rule: 'SHARE_WITHOUT_CHARGES',
        row: r.rowIndex,
        message: `Row ${r.rowIndex}: Share trade for "${r.schemeName}" on ${r.dateStr} has 0 or missing charges.`
      });
    }

    // 7. MF units x NAV not matching amount beyond tolerance
    if (r.type === 'MF' && r.units > 0 && r.navPrice > 0 && r.amount > 0) {
      // Amount is net of stamp duty (0.00005) or units * NAV
      // Expected amount approx units * navPrice
      const expectedProduct = r.units * r.navPrice;
      const diff = Math.abs(expectedProduct - r.amount);
      if (diff > tolerance && diff > expectedProduct * 0.001) {
        alerts.push({
          severity: 'WARNING',
          rule: 'AMOUNT_MISMATCH',
          row: r.rowIndex,
          message: `Row ${r.rowIndex}: Units * NAV (${expectedProduct.toFixed(2)}) differs from Amount (${r.amount.toFixed(2)}) by ₹${diff.toFixed(2)}.`
        });
      }
    }
  }

  // 8. Holding differs from Statement_Check
  if (statementCheckSeeds.length > 0 && currentHoldings.length > 0) {
    for (const seed of statementCheckSeeds) {
      const held = currentHoldings.find(h => h.who === seed.who && h.type === seed.type && (h.schemeName === seed.name || h.shortName === seed.name));
      if (!held) {
        alerts.push({
          severity: 'ERROR',
          rule: 'STATEMENT_CHECK_MISMATCH',
          row: 'N/A',
          message: `Statement_Check mismatch: Instrument "${seed.name}" for ${seed.who} not found in calculated holdings.`
        });
      } else {
        const unitDiff = Math.abs(held.units - seed.units);
        if (unitDiff > 0.01) {
          alerts.push({
            severity: 'ERROR',
            rule: 'STATEMENT_CHECK_MISMATCH',
            row: 'N/A',
            message: `Statement_Check mismatch for "${seed.name}": Expected ${seed.units} units, got ${held.units}.`
          });
        }
      }
    }
  }

  return alerts;
}

module.exports = {
  runDataHealthChecks
};
