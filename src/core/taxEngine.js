/**
 * Indian Income Tax Classification and Bucket Assignment Engine.
 * Post-July 2024 Budget rules in force for 2025/2026.
 */

function addMonths(dateObj, months) {
  if (!dateObj) return null;
  const d = new Date(dateObj.getTime());
  const curMonth = d.getUTCMonth();
  d.setUTCMonth(curMonth + months);
  return d;
}

/**
 * Determine holding period threshold date for LTCG.
 * taxCategory: 'Equity', 'Arbitrage', 'Gold ETF', 'Gold FoF', 'Debt', 'Review'
 */
function getLTCGThresholdDate(buyDateObj, taxCategory) {
  if (!buyDateObj) return null;
  const cat = (taxCategory || 'Equity').toLowerCase();

  if (cat === 'debt') {
    // Post-April 2023 debt funds are always short-term (Section 50AA)
    return null;
  }
  if (cat === 'gold fof' || cat === 'gold_fof') {
    // Unlisted mutual fund FoF requires > 24 months for LTCG
    return addMonths(buyDateObj, 24);
  }
  // Equity shares, equity ETFs, gold ETFs, equity MFs, and arbitrage require > 12 months
  return addMonths(buyDateObj, 12);
}

/**
 * Classify a lot into STCG, LTCG, or Slab.
 */
function classifyLotTaxBucket(buyDateObj, saleOrAsOfDateObj, taxCategory, isSameDay = false) {
  if (isSameDay) return 'STCG';
  const cat = (taxCategory || 'Equity').toLowerCase();

  if (cat === 'debt') {
    return 'Slab';
  }

  const thresholdDate = getLTCGThresholdDate(buyDateObj, taxCategory);
  if (!thresholdDate) {
    return 'Slab';
  }

  // "12 months means a sale after the same date one year later"
  const isLongTerm = saleOrAsOfDateObj.getTime() > thresholdDate.getTime();

  if (cat === 'gold etf' || cat === 'gold_etf' || cat === 'gold fof') {
    return isLongTerm ? 'LTCG' : 'Slab';
  }

  return isLongTerm ? 'LTCG' : 'STCG';
}

function calculateDaysToLongTerm(buyDateObj, asOfDateObj, taxCategory) {
  const thresholdDate = getLTCGThresholdDate(buyDateObj, taxCategory);
  if (!thresholdDate) return 'N/A'; // e.g. Debt is always Slab

  const diffMs = thresholdDate.getTime() - asOfDateObj.getTime();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 86400));
}

module.exports = {
  getLTCGThresholdDate,
  classifyLotTaxBucket,
  calculateDaysToLongTerm
};
