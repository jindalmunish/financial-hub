/**
 * Mutual Fund calculation engine.
 * Computes gross cost (grossed up for stamp duty), handles redemptions and switches via FIFO,
 * tracks open lots and realised trades.
 */

const { STAMP_DUTY_RATE } = require('./constants');
const { getFinancialYear, getCalendarYear } = require('./parser');

function isMFRowIgnored(record) {
  // Rows with zero amount (KYC, nominee, contact, etc.) are ignored
  return Math.abs(record.amount) < 1e-6 && Math.abs(record.units) < 1e-6;
}

function isMFBuy(record) {
  return record.amount > 0 && record.units > 0;
}

function isMFSell(record) {
  return record.amount < 0 || record.units < 0;
}

function isSIPDescription(desc) {
  if (!desc) return false;
  const d = desc.toLowerCase();
  return d.includes('sip') || d.includes('systematic') || d.includes('instalment');
}

/**
 * Process MF transactions for a portfolio.
 * records: array of parsed records for Type === 'MF'
 * options: { stampDutyRate, asOfDate }
 */
function processMFPortfolio(records, options = {}) {
  const stampDutyRate = options.stampDutyRate !== undefined ? options.stampDutyRate : STAMP_DUTY_RATE;
  const asOfDate = options.asOfDate || new Date();

  // Group by Who and Scheme Name
  const grouped = {};
  for (const r of records) {
    if (r.type !== 'MF') continue;
    if (isMFRowIgnored(r)) continue;

    const key = `${r.who}|${r.schemeName}`;
    if (!grouped[key]) {
      grouped[key] = {
        who: r.who,
        schemeName: r.schemeName,
        transactions: []
      };
    }
    grouped[key].transactions.push(r);
  }

  const allOpenLots = [];
  const allRealised = [];
  const holdingsSummary = [];
  const unrecognizedAlerts = [];

  for (const key in grouped) {
    const item = grouped[key];
    const txs = item.transactions.slice();

    // Sort by dateObj, then rowIndex
    txs.sort((a, b) => {
      const diff = (a.dateObj ? a.dateObj.getTime() : 0) - (b.dateObj ? b.dateObj.getTime() : 0);
      if (diff !== 0) return diff;
      return a.rowIndex - b.rowIndex;
    });

    const openLots = [];
    const realisedList = [];

    for (const t of txs) {
      if (isMFBuy(t)) {
        // Gross cost = Amount / (1 - stampDutyRate), rounded to 2 decimals
        const grossCost = Math.round((t.amount / (1 - stampDutyRate)) * 100) / 100;
        const lot = {
          id: `MF-${t.rowIndex}`,
          who: t.who,
          type: 'MF',
          schemeName: t.schemeName,
          dateStr: t.dateStr,
          dateObj: t.dateObj,
          units: t.units,
          navPrice: t.navPrice,
          netAmount: t.amount,
          grossCost: grossCost,
          unitCost: grossCost / t.units,
          description: t.description,
          isSIP: isSIPDescription(t.description),
          fy: t.fy,
          cy: t.cy
        };
        openLots.push(lot);
      } else if (isMFSell(t)) {
        const redeemUnits = Math.abs(t.units);
        const redeemProceeds = Math.abs(t.amount);
        let remUnits = redeemUnits;
        let totalCostRedeemed = 0;

        while (remUnits > 1e-6 && openLots.length > 0) {
          const lot = openLots[0];
          const matched = Math.min(remUnits, lot.units);
          const fraction = matched / lot.units;
          const costPart = Math.round(lot.grossCost * fraction * 100) / 100;

          totalCostRedeemed += costPart;
          lot.units -= matched;
          lot.grossCost -= costPart;
          remUnits -= matched;

          // Record realised part
          const proceedsPart = Math.round(redeemProceeds * (matched / redeemUnits) * 100) / 100;
          const profit = proceedsPart - costPart;
          const holdingDays = t.dateObj && lot.dateObj ? Math.round((t.dateObj.getTime() - lot.dateObj.getTime()) / (1000 * 86400)) : 0;

          realisedList.push({
            who: t.who,
            type: 'MF',
            schemeName: t.schemeName,
            buyDateStr: lot.dateStr,
            buyDateObj: lot.dateObj,
            sellDateStr: t.dateStr,
            sellDateObj: t.dateObj,
            units: matched,
            salePrice: t.navPrice,
            saleProceeds: proceedsPart,
            grossCost: costPart,
            profit: profit,
            holdingDays: holdingDays,
            fy: t.fy,
            cy: t.cy,
            lotId: lot.id
          });

          if (lot.units <= 1e-6) {
            openLots.shift();
          }
        }

        if (remUnits > 1e-5) {
          unrecognizedAlerts.push({
            type: 'OVERSOLD',
            message: `MF sale exceeds held units for ${item.schemeName} on ${t.dateStr}. Excess units: ${remUnits.toFixed(4)}`,
            who: t.who,
            schemeName: t.schemeName
          });
        }
      } else {
        // Unknown description with non-zero amount
        unrecognizedAlerts.push({
          type: 'UNRECOGNIZED_TX',
          message: `Unrecognised MF transaction description: "${t.description}" with amount ${t.amount} on ${t.dateStr}`,
          who: t.who,
          schemeName: t.schemeName
        });
      }
    }

    const totalUnits = openLots.reduce((acc, l) => acc + l.units, 0);
    const totalGrossInvested = openLots.reduce((acc, l) => acc + l.grossCost, 0);

    if (totalUnits > 1e-5) {
      holdingsSummary.push({
        who: item.who,
        type: 'MF',
        schemeName: item.schemeName,
        units: Math.round(totalUnits * 1000) / 1000,
        grossInvested: Math.round(totalGrossInvested * 100) / 100,
        lotsCount: openLots.length
      });
      allOpenLots.push(...openLots);
    }

    allRealised.push(...realisedList);
  }

  return {
    openLots: allOpenLots,
    realised: allRealised,
    holdings: holdingsSummary,
    alerts: unrecognizedAlerts
  };
}

module.exports = {
  isMFRowIgnored,
  isMFBuy,
  isMFSell,
  isSIPDescription,
  processMFPortfolio
};
