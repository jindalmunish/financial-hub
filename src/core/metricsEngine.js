/**
 * Financial metrics engine: XIRR (Newton + Bisection fallback), CAGR,
 * Absolute Return, Funds Flow aggregation, and SIP Tracker.
 */

function calculateAbsoluteReturn(cost, value) {
  if (cost <= 0) return 0;
  return ((value - cost) / cost) * 100;
}

function calculateCAGR(initialCost, finalValue, days) {
  if (initialCost <= 0 || finalValue <= 0 || days <= 0) return null;
  const years = days / 365.0;
  return (Math.pow(finalValue / initialCost, 1.0 / years) - 1) * 100;
}

/**
 * XIRR calculation with Newton-Raphson and Bisection fallback.
 * cashFlows: array of { date: Date, amount: number }
 * (investments negative, returns/terminal value positive)
 */
function calculateXIRR(cashFlows, guess = 0.1) {
  if (!cashFlows || cashFlows.length < 2) return null;

  // Verify there is at least one positive and one negative cash flow
  let hasPos = false;
  let hasNeg = false;
  for (const cf of cashFlows) {
    if (cf.amount > 0) hasPos = true;
    if (cf.amount < 0) hasNeg = true;
  }
  if (!hasPos || !hasNeg) return null;

  const t0 = cashFlows[0].date.getTime();
  const times = cashFlows.map(cf => (cf.date.getTime() - t0) / (365.0 * 86400 * 1000));
  const amounts = cashFlows.map(cf => cf.amount);

  function f(r) {
    let sum = 0;
    for (let i = 0; i < amounts.length; i++) {
      sum += amounts[i] * Math.pow(1.0 + r, -times[i]);
    }
    return sum;
  }

  function df(r) {
    let sum = 0;
    for (let i = 0; i < amounts.length; i++) {
      if (times[i] === 0) continue;
      sum += -times[i] * amounts[i] * Math.pow(1.0 + r, -times[i] - 1.0);
    }
    return sum;
  }

  // 1. Newton-Raphson iteration
  let r = guess;
  const maxNewton = 60;
  const tol = 1e-6;

  for (let i = 0; i < maxNewton; i++) {
    if (r <= -0.999) r = -0.99;
    const y = f(r);
    const dy = df(r);
    if (Math.abs(dy) < 1e-12) break; // Slope too flat, fall back to bisection

    const nextR = r - y / dy;
    if (Math.abs(nextR - r) < tol) {
      if (nextR > -0.999 && isFinite(nextR)) {
        return Math.round(nextR * 10000) / 100; // Return percentage with 2 decimals
      }
    }
    r = nextR;
    if (r < -0.999 || r > 50.0 || isNaN(r)) break; // Diverged, fall back
  }

  // 2. Bisection fallback
  let low = -0.999;
  let high = 50.0;
  let fLow = f(low);
  let fHigh = f(high);

  if (fLow * fHigh > 0) {
    // Try wider range or return null
    high = 100.0;
    fHigh = f(high);
    if (fLow * fHigh > 0) return null;
  }

  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2.0;
    const fMid = f(mid);
    if (Math.abs(fMid) < tol || (high - low) / 2.0 < tol) {
      return Math.round(mid * 10000) / 100;
    }
    if (fLow * fMid < 0) {
      high = mid;
      fHigh = fMid;
    } else {
      low = mid;
      fLow = fMid;
    }
  }

  return null;
}

/**
 * Format XIRR result with "short holding" flag if under 90 days, or "n/a".
 */
function formatXIRR(cashFlows, asOfDate) {
  if (!cashFlows || cashFlows.length < 2) return { value: 'n/a', isShortHolding: false };

  const firstDate = cashFlows[0].date;
  const days = Math.round((asOfDate.getTime() - firstDate.getTime()) / (1000 * 86400));
  const isShortHolding = days < 90;

  const result = calculateXIRR(cashFlows);
  if (result === null) {
    return { value: 'n/a', isShortHolding: false, days: days };
  }

  return {
    value: result,
    display: `${result.toFixed(2)}%`,
    isShortHolding: isShortHolding,
    days: days
  };
}

/**
 * Aggregates Funds Flow (new money) across periods.
 */
function aggregateFundsFlow(records) {
  const flowMap = {}; // key: periodKey (e.g. "2026-03" or FY or CY)

  for (const r of records) {
    if (!r.dateObj) continue;
    const monthKey = `${r.dateObj.getUTCFullYear()}-${String(r.dateObj.getUTCMonth() + 1).padStart(2, '0')}`;
    const fyKey = r.fy;
    const cyKey = r.cy;

    const keys = [
      { type: 'month', key: monthKey },
      { type: 'fy', key: fyKey },
      { type: 'cy', key: cyKey }
    ];

    for (const item of keys) {
      const fullKey = `${r.who || 'All'}|${item.type}|${item.key}`;
      if (!flowMap[fullKey]) {
        flowMap[fullKey] = {
          who: r.who,
          periodType: item.type,
          period: item.key,
          mfSipIn: 0,
          mfLumpIn: 0,
          mfOut: 0,
          shareBuy: 0,
          shareSell: 0,
          netFlow: 0
        };
      }
      const entry = flowMap[fullKey];

      if (r.type === 'MF') {
        const desc = (r.description || '').toLowerCase();
        const isSip = desc.includes('sip') || desc.includes('systematic') || desc.includes('instalment');
        if (r.amount > 0) {
          if (isSip) entry.mfSipIn += r.amount;
          else entry.mfLumpIn += r.amount;
        } else if (r.amount < 0) {
          entry.mfOut += Math.abs(r.amount);
        }
      } else if (r.type === 'Shares') {
        const desc = (r.description || '').toLowerCase();
        const costNoChg = r.units * r.navPrice;
        if (desc.includes('buy')) {
          entry.shareBuy += (costNoChg + r.charges);
        } else if (desc.includes('sell')) {
          entry.shareSell += (costNoChg - r.charges);
        }
      }

      entry.netFlow = (entry.mfSipIn + entry.mfLumpIn + entry.shareBuy) - (entry.mfOut + entry.shareSell);
    }
  }

  const list = Object.values(flowMap);
  list.sort((a, b) => {
    if (a.periodType !== b.periodType) return a.periodType.localeCompare(b.periodType);
    return b.period.localeCompare(a.period);
  });
  return list;
}

/**
 * Tracks SIP status from transaction statements.
 */
function trackSIPs(records, asOfDate = new Date()) {
  const mfTxs = records.filter(r => r.type === 'MF' && r.amount > 0);
  const sipGroups = {};

  for (const r of mfTxs) {
    const desc = (r.description || '').toLowerCase();
    const isSip = desc.includes('sip') || desc.includes('systematic') || desc.includes('instalment');
    if (!isSip) continue;

    const key = `${r.who}|${r.schemeName}`;
    if (!sipGroups[key]) {
      sipGroups[key] = {
        who: r.who,
        schemeName: r.schemeName,
        installments: []
      };
    }
    sipGroups[key].installments.push(r);
  }

  const results = [];
  for (const key in sipGroups) {
    const item = sipGroups[key];
    const inst = item.installments.slice().sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
    if (inst.length === 0) continue;

    const firstDate = inst[0].dateStr;
    const lastTx = inst[inst.length - 1];
    const lastDate = lastTx.dateStr;
    const lastDateObj = lastTx.dateObj;

    // Approximate monthly amount and day of month
    const amounts = inst.map(x => Math.round((x.amount / (1 - 0.00005)) * 100) / 100);
    const monthlyAmount = amounts[amounts.length - 1]; // Latest installment amount
    const sipDay = lastDateObj ? lastDateObj.getUTCDate() : 1;

    // Days since last installment
    const daysSinceLast = lastDateObj ? Math.round((asOfDate.getTime() - lastDateObj.getTime()) / (1000 * 86400)) : 0;
    const isPossiblyStopped = daysSinceLast > 35;

    // Next due date
    let nextDueStr = '';
    if (lastDateObj) {
      const nextDue = new Date(lastDateObj.getTime());
      nextDue.setUTCMonth(nextDue.getUTCMonth() + 1);
      nextDueStr = `${String(sipDay).padStart(2, '0')}-${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][nextDue.getUTCMonth()]}-${nextDue.getUTCFullYear()}`;
    }

    results.push({
      who: item.who,
      schemeName: item.schemeName,
      monthlyAmount: monthlyAmount,
      sipDay: sipDay,
      count: inst.length,
      firstDate: firstDate,
      lastDate: lastDate,
      nextDue: isPossiblyStopped ? 'N/A' : nextDueStr,
      status: isPossiblyStopped ? 'Possibly stopped' : 'Active',
      daysSinceLast: daysSinceLast
    });
  }

  return results;
}

module.exports = {
  calculateAbsoluteReturn,
  calculateCAGR,
  calculateXIRR,
  formatXIRR,
  aggregateFundsFlow,
  trackSIPs
};
