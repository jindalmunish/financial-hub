/**
 * Share calculation engine.
 * Computes buy/sell amounts with charges, handles bonus shares, performs same-day netting (STCG),
 * executes FIFO matching against prior lots, and calculates demat average prices without charges.
 */

const { SHARE_MASTER_DEFAULTS } = require('./constants');
const { getFinancialYear, getCalendarYear } = require('./parser');

function getShareShortName(rawName) {
  if (!rawName) return '';
  const found = SHARE_MASTER_DEFAULTS.find(s => s.rawName.toLowerCase() === rawName.toLowerCase());
  return found ? found.shortName : rawName;
}

function isShareBuy(desc) {
  if (!desc) return false;
  return desc.toLowerCase().includes('buy');
}

function isShareSell(desc) {
  if (!desc) return false;
  return desc.toLowerCase().includes('sell');
}

function isBonusShare(record) {
  return isShareBuy(record.description) && record.units > 0 && record.navPrice === 0 && record.charges === 0;
}

/**
 * Process Share transactions.
 * records: array of parsed records where Type === 'Shares'
 */
function processSharePortfolio(records, options = {}) {
  const grouped = {};

  for (const r of records) {
    if (r.type !== 'Shares') continue;
    const key = `${r.who}|${r.schemeName}`;
    if (!grouped[key]) {
      grouped[key] = {
        who: r.who,
        rawName: r.schemeName,
        shortName: getShareShortName(r.schemeName),
        transactions: []
      };
    }
    grouped[key].transactions.push(r);
  }

  const allOpenLots = [];
  const allRealised = [];
  const holdingsSummary = [];
  const alerts = [];

  for (const key in grouped) {
    const item = grouped[key];
    const txs = item.transactions.slice();

    // Sort chronologically by dateObj, then rowIndex
    txs.sort((a, b) => {
      const diff = (a.dateObj ? a.dateObj.getTime() : 0) - (b.dateObj ? b.dateObj.getTime() : 0);
      if (diff !== 0) return diff;
      return a.rowIndex - b.rowIndex;
    });

    const openLots = [];
    const realisedList = [];

    // Group transactions by date string to perform same-day matching
    const dateGroups = {};
    const orderedDates = [];
    for (const t of txs) {
      if (!dateGroups[t.dateStr]) {
        dateGroups[t.dateStr] = [];
        orderedDates.push(t.dateStr);
      }
      dateGroups[t.dateStr].push(t);
    }

    for (const dStr of orderedDates) {
      const dayTxs = dateGroups[dStr];
      const dayBuys = [];
      const daySells = [];

      for (const t of dayTxs) {
        const isBuy = isShareBuy(t.description);
        const isSell = isShareSell(t.description);

        if (!isBuy && !isSell) {
          alerts.push({
            type: 'UNKNOWN_SHARE_DESC',
            message: `Unknown share transaction description "${t.description}" for ${item.rawName} on ${t.dateStr}`,
            who: t.who,
            schemeName: item.rawName
          });
          continue;
        }

        const isBonus = isBonusShare(t);
        const costNoChg = isBonus ? 0 : t.units * t.navPrice;
        const totalAmount = isBuy ? (costNoChg + t.charges) : (costNoChg - t.charges);

        const txObj = {
          id: `SHARE-${t.rowIndex}`,
          rowIndex: t.rowIndex,
          who: t.who,
          type: 'Shares',
          schemeName: item.rawName,
          shortName: item.shortName,
          dateStr: t.dateStr,
          dateObj: t.dateObj,
          units: t.units,
          price: t.navPrice,
          charges: t.charges,
          costNoCharges: costNoChg,
          costWithCharges: totalAmount,
          description: t.description,
          isBonus: isBonus,
          fy: t.fy,
          cy: t.cy
        };

        if (isBuy) dayBuys.push(txObj);
        else daySells.push(txObj);
      }

      // 1. Same-day matching: a sale first offsets buys of the same share on the same day (STCG)
      for (const sell of daySells) {
        let sellQty = sell.units;

        for (const buy of dayBuys) {
          if (buy.units <= 1e-6) continue;
          const matchQty = Math.min(sellQty, buy.units);
          if (matchQty > 1e-6) {
            const buyFrac = matchQty / buy.units;
            const buyCostNoChg = buy.costNoCharges * buyFrac;
            const buyCostWithChg = buy.costWithCharges * buyFrac;

            buy.units -= matchQty;
            buy.costNoCharges -= buyCostNoChg;
            buy.costWithCharges -= buyCostWithChg;

            sellQty -= matchQty;

            const sellFrac = matchQty / sell.units;
            const sellCostNoChg = sell.costNoCharges * sellFrac;
            const sellProceeds = sell.costWithCharges * sellFrac;

            realisedList.push({
              who: sell.who,
              type: 'Shares',
              schemeName: item.rawName,
              shortName: item.shortName,
              buyDateStr: buy.dateStr,
              buyDateObj: buy.dateObj,
              sellDateStr: sell.dateStr,
              sellDateObj: sell.dateObj,
              units: matchQty,
              buyPrice: buy.price,
              salePrice: sell.price,
              saleProceeds: sellProceeds,
              costNoCharges: buyCostNoChg,
              grossCost: buyCostWithChg,
              profit: sellProceeds - buyCostWithChg,
              holdingDays: 0,
              isSameDay: true,
              taxBucket: 'STCG',
              fy: sell.fy,
              cy: sell.cy,
              lotId: buy.id
            });
          }
          if (sellQty <= 1e-6) break;
        }

        // 2. Remaining sale quantity matches FIFO against older open lots
        while (sellQty > 1e-6 && openLots.length > 0) {
          const lot = openLots[0];
          const matchQty = Math.min(sellQty, lot.units);
          const lotFrac = matchQty / lot.units;
          const lotCostNoChg = lot.costNoCharges * lotFrac;
          const lotCostWithChg = lot.costWithCharges * lotFrac;

          lot.units -= matchQty;
          lot.costNoCharges -= lotCostNoChg;
          lot.costWithCharges -= lotCostWithChg;
          sellQty -= matchQty;

          const sellFrac = matchQty / sell.units;
          const sellProceeds = sell.costWithCharges * sellFrac;
          const holdingDays = sell.dateObj && lot.dateObj ? Math.round((sell.dateObj.getTime() - lot.dateObj.getTime()) / (1000 * 86400)) : 0;

          realisedList.push({
            who: sell.who,
            type: 'Shares',
            schemeName: item.rawName,
            shortName: item.shortName,
            buyDateStr: lot.dateStr,
            buyDateObj: lot.dateObj,
            sellDateStr: sell.dateStr,
            sellDateObj: sell.dateObj,
            units: matchQty,
            buyPrice: lot.price,
            salePrice: sell.price,
            saleProceeds: sellProceeds,
            costNoCharges: lotCostNoChg,
            grossCost: lotCostWithChg,
            profit: sellProceeds - lotCostWithChg,
            holdingDays: holdingDays,
            isSameDay: false,
            taxBucket: holdingDays > 365 ? 'LTCG' : 'STCG',
            fy: sell.fy,
            cy: sell.cy,
            lotId: lot.id
          });

          if (lot.units <= 1e-6) {
            openLots.shift();
          }
        }

        if (sellQty > 1e-5) {
          alerts.push({
            type: 'SHARE_SALE_EXCEEDS_HOLDING',
            message: `Share sale exceeds held units for ${item.rawName} on ${sell.dateStr}. Excess: ${sellQty.toFixed(4)}`,
            who: sell.who,
            schemeName: item.rawName
          });
        }
      }

      // 3. Remaining day buys are added to open lots
      for (const buy of dayBuys) {
        if (buy.units > 1e-6) {
          openLots.push(buy);
        }
      }
    }

    const totalUnits = openLots.reduce((s, l) => s + l.units, 0);
    const totalCostNoChg = openLots.reduce((s, l) => s + l.costNoCharges, 0);
    const totalCostWithChg = openLots.reduce((s, l) => s + l.costWithCharges, 0);

    if (totalUnits > 1e-5) {
      const avgPriceNoCharges = Math.round((totalCostNoChg / totalUnits) * 100) / 100;
      const avgPriceWithCharges = Math.round((totalCostWithChg / totalUnits) * 100) / 100;

      holdingsSummary.push({
        who: item.who,
        type: 'Shares',
        schemeName: item.rawName,
        shortName: item.shortName,
        units: Math.round(totalUnits * 10000) / 10000,
        avgPriceNoCharges: avgPriceNoCharges,
        avgPriceWithCharges: avgPriceWithCharges,
        costNoCharges: Math.round(totalCostNoChg * 100) / 100,
        costWithCharges: Math.round(totalCostWithChg * 100) / 100,
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
    alerts: alerts
  };
}

module.exports = {
  getShareShortName,
  isShareBuy,
  isShareSell,
  isBonusShare,
  processSharePortfolio
};
