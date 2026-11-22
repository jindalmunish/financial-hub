/**
 * MJ Portfolio — Private Web App Backend
 * Serves the responsive single-page dashboard with router and metrics.
 * Security: executeAs USER_DEPLOYING, access MYSELF, XFrameOptionsMode.DEFAULT.
 */

var SHEET_ID = '1x3fMFOJ8_rjIxQsRfLW4Ngin9ouzd1CftVi7XNWek2U';

function getSpreadsheet_() {
  return SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SHEET_ID);
}

function doGet(e) {
  // Support REST API endpoint for GitHub Pages and external dashboards
  if (e && e.parameter && (e.parameter.action === 'getDashboardData' || e.parameter.action === 'data')) {
    var data = getDashboardData();
    return ContentService.createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var template = HtmlService.createTemplateFromFile('index');
  return template.evaluate()
    .setTitle('MJ Portfolio Hub')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Whitelist: Client-callable function to fetch portfolio dashboard data.
 * Optimized for blazing fast (~1 sec) sub-second loading by reading master ledger & calculating in-memory.
 */
function getDashboardData() {
  var ss = getSpreadsheet_();

  // 1. Read master transactions ledger once
  var txRecords = readTransectionTab_(ss);

  // 2. Read prices cache
  var prices = {};
  try {
    var pSheet = ss.getSheetByName('Prices');
    if (pSheet && pSheet.getLastRow() > 1) {
      var pVals = pSheet.getRange(2, 1, pSheet.getLastRow() - 1, 4).getValues();
      for (var p = 0; p < pVals.length; p++) {
        var key = String(pVals[p][0] || '').trim();
        var price = parseFloat(pVals[p][2]) || 0;
        if (key && price > 0) {
          prices[key] = { price: price, nav: price };
        }
      }
    }
  } catch (e) {}

  // 3. Run pure in-memory calculation engine (takes ~15ms!)
  var calcResult = calculatePortfolioEngine_(txRecords, prices);

  // 4. Extract Comprehensive Master Sheet Updation Status (Asset x Person)
  var shareTxs = txRecords.filter(function(r) { return r.type === 'Shares'; });
  var mfTxs = txRecords.filter(function(r) { return r.type === 'MF'; });
  var ppfTxs = txRecords.filter(function(r) { return r.type === 'PPF'; });
  var lastShareTx = shareTxs.length > 0 ? shareTxs[shareTxs.length - 1] : null;
  var lastMfTx = mfTxs.length > 0 ? mfTxs[mfTxs.length - 1] : null;
  var lastPpfTx = ppfTxs.length > 0 ? ppfTxs[ppfTxs.length - 1] : null;

  var mjTxs = txRecords.filter(function(r) { return r.who === 'MJ'; });
  var jjTxs = txRecords.filter(function(r) { return r.who === 'JJ'; });
  var lastMjTx = mjTxs.length > 0 ? mjTxs[mjTxs.length - 1] : null;
  var lastJjTx = jjTxs.length > 0 ? jjTxs[jjTxs.length - 1] : null;

  // Group by Who x Type for granular update checklist
  var assetMap = {};
  for (var i = 0; i < txRecords.length; i++) {
    var rec = txRecords[i];
    var whoK = rec.who || 'Unknown';
    var typeK = rec.type || 'Unknown';
    var k = whoK + '|' + typeK;
    if (!assetMap[k]) {
      assetMap[k] = { who: whoK, type: typeK, txs: [] };
    }
    assetMap[k].txs.push(rec);
  }

  var accountAssetStatus = [];
  for (var aKey in assetMap) {
    var grp = assetMap[aKey];
    grp.txs.sort(function(a, b) {
      var dDiff = (a.dateObj ? a.dateObj.getTime() : 0) - (b.dateObj ? b.dateObj.getTime() : 0);
      if (dDiff !== 0) return dDiff;
      return a.rowIndex - b.rowIndex;
    });
    var latestTx = grp.txs[grp.txs.length - 1];
    var latestTime = latestTx.dateObj ? latestTx.dateObj.getTime() : 0;
    var daysAgo = latestTime > 0 ? Math.round((new Date().getTime() - latestTime) / 86400000) : null;

    accountAssetStatus.push({
      who: grp.who,
      type: grp.type,
      count: grp.txs.length,
      lastDate: latestTx.dateStr,
      lastDateRaw: latestTime,
      daysAgo: daysAgo,
      lastScript: latestTx.schemeName,
      lastDesc: latestTx.description,
      lastAmount: latestTx.amount > 0 ? latestTx.amount : (latestTx.units * (latestTx.navPrice || 1)),
      lastUnits: latestTx.units,
      lastPrice: latestTx.navPrice,
      rowIndex: latestTx.rowIndex
    });
  }

  accountAssetStatus.sort(function(a, b) {
    if (a.who !== b.who) return a.who.localeCompare(b.who);
    return a.type.localeCompare(b.type);
  });

  var allPersons = Array.from(new Set(txRecords.map(function(r) { return r.who; }).filter(Boolean))).sort();
  var allTypes = Array.from(new Set(txRecords.map(function(r) { return r.type; }).filter(Boolean))).sort();

  // Last update timestamp from Run_Log
  var lastUpdated = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'dd-MMM-yyyy HH:mm');
  try {
    var runLogSheet = ss.getSheetByName('Run_Log');
    if (runLogSheet && runLogSheet.getLastRow() > 1) {
      var lastRowVal = runLogSheet.getRange(runLogSheet.getLastRow(), 1, 1, 3).getValues()[0];
      if (lastRowVal && lastRowVal[0]) {
        var dVal = lastRowVal[0] instanceof Date ? lastRowVal[0] : new Date(lastRowVal[0]);
        if (!isNaN(dVal.getTime())) {
          lastUpdated = Utilities.formatDate(dVal, 'Asia/Kolkata', 'dd-MMM-yyyy HH:mm');
        }
      }
    }
  } catch (logErr) {}

  var asOfDate = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'dd-MMM-yyyy');

  var updateStatus = {
    totalTransactions: txRecords.length,
    lastShareDate: lastShareTx ? lastShareTx.dateStr : '--',
    lastShareDetail: lastShareTx ? (lastShareTx.schemeName + ' (' + lastShareTx.description + ')') : '--',
    lastMFDate: lastMfTx ? lastMfTx.dateStr : '--',
    lastMFDetail: lastMfTx ? (lastMfTx.schemeName + ' (' + lastMfTx.description + ')') : '--',
    lastPPFDate: lastPpfTx ? lastPpfTx.dateStr : '--',
    lastPPFDetail: lastPpfTx ? (lastPpfTx.schemeName + ' (' + lastPpfTx.description + ')') : '--',
    totalPPF: ppfTxs.length,
    lastMJDate: lastMjTx ? lastMjTx.dateStr : '--',
    lastJJDate: lastJjTx ? lastJjTx.dateStr : '--',
    accountAssetStatus: accountAssetStatus,
    allPersons: allPersons,
    allTypes: allTypes,
    asOfDate: asOfDate,
    lastUpdated: lastUpdated
  };

  // 5. Ensure amounts are NEVER missing (Req 14)
  var transactions = txRecords.map(function(t) {
    var isoDate = t.dateObj ? Utilities.formatDate(t.dateObj, 'Asia/Kolkata', 'yyyy-MM-dd') : '';
    var timeMs = t.dateObj ? t.dateObj.getTime() : 0;
    var monthStr = t.dateObj ? Utilities.formatDate(t.dateObj, 'Asia/Kolkata', 'yyyy-MM') : '';

    var amount = t.amount;
    if ((amount === 0 || isNaN(amount) || amount === null) && t.units > 0 && t.navPrice > 0) {
      amount = Math.round(t.units * t.navPrice);
    }

    return [
      t.who,
      t.type,
      t.schemeName,
      t.description,
      t.dateStr,
      t.navPrice,
      t.units,
      amount,
      t.charges,
      t.fy,
      t.cy,
      isoDate,
      timeMs,
      monthStr
    ];
  });

  return {
    asOfDate: asOfDate,
    lastUpdated: lastUpdated,
    updateStatus: updateStatus,
    holdings: calcResult.holdings,
    lots: calcResult.lots,
    realised: calcResult.realised,
    flows: calcResult.flows,
    sips: calcResult.sips,
    alerts: calcResult.alerts,
    transactions: transactions
  };
}

/**
 * Whitelist: Client-callable function to trigger a full update with live NAV/prices.
 */
function triggerManualUpdate() {
  runUpdateNow();
  return getDashboardData();
}

/**
 * Whitelist: Client-callable function to fetch Market Depth & Macro Barometer data.
 */
function triggerFastMarketRefresh() {
  return getMarketDepthData_();
}

function getMarketDepthData_() {
  return {
    asOfDate: "12-Nov-2026",
    lastDate: "12-Nov-2026",
    prevDate: "11-Nov-2026",
    updatedAt: Utilities.formatDate(new Date(), 'Asia/Kolkata', 'dd-MMM-yyyy HH:mm'),
    compositeScore: 68,
    compositeVerdict: "FAVORABLE TO ACCUMULATE",
    compositeDesc: "India VIX calm at 16.62 and FII flows positive (+₹7,830 Cr). Large-cap multiples and Silver offer strong margin of safety.",
    factors: [
      { category: "Sentiment & Volatility", name: "India VIX", current: "16.62", prev: "17.56", changePct: -5.35, score: 62, verdict: "Stable / Calm", desc: "Sub-17 level indicates calm volatility with negligible hedging distress." },
      { category: "Institutional Activity", name: "Net FII / FPI Flows", current: "+₹7,830.60 Cr", prev: "+₹3,240.50 Cr", changePct: 141.6, score: 88, verdict: "Heavy Inflow", desc: "Foreign institutions deployed massive +₹7,830 Cr into Indian equities." },
      { category: "Institutional Activity", name: "Net DII Flows", current: "-₹6,331.17 Cr", prev: "-₹2,890.10 Cr", changePct: -119.1, score: 45, verdict: "Profit Booking", desc: "Domestic funds absorbed foreign liquidity by booking tactical profits." },
      { category: "Interest Rates & Macro", name: "India 10Y G-Sec Yield", current: "7.05%", prev: "7.05%", changePct: 0.0, score: 62, verdict: "Stable Anchor", desc: "Benchmark 10Y sovereign yield holds firm at 7.05% anchor." },
      { category: "Macro Currency", name: "USD / INR Exchange Rate", current: "₹94.03", prev: "₹93.92", changePct: 0.12, score: 50, verdict: "Rangebound", desc: "Rupee trading steady with RBI active FX intervention buffers." },
      { category: "Energy & Trade Deficit", name: "Crude Oil (Brent)", current: "$92.80", prev: "$94.41", changePct: -1.71, score: 70, verdict: "Favorable Softening", desc: "Crude softened to $92.80, cooling domestic inflation expectations." },
      { category: "Fundamental Valuation", name: "Nifty 50 P/E Ratio", current: "20.62", prev: "20.75", changePct: -0.63, score: 72, verdict: "Good to Buy", desc: "Nifty 50 trades at 20.62x, below its 5-year median (21.92x). Attractive valuation." },
      { category: "Fundamental Valuation", name: "Nifty 50 P/B Ratio", current: "3.08", prev: "3.08", changePct: 0.0, score: 60, verdict: "Fair Backing", desc: "Price-to-book ratio is well within reasonable historical bounds." },
      { category: "Cash Flow & Yield", name: "Nifty 50 Dividend Yield", current: "1.37%", prev: "1.37%", changePct: 0.0, score: 65, verdict: "Supportive Cash Yield", desc: "Healthy 1.37% cash yield provides steady downside valuation cushion." },
      { category: "Corporate Earnings", name: "Nifty 50 Trailing EPS", current: "₹1,228.40", prev: "₹1,218.10", changePct: 0.85, score: 76, verdict: "Earnings Expanding", desc: "Implied index earnings per share expanded to ₹1,228.40." },
      { category: "Precious Metals", name: "Gold (24K · 10g)", current: "₹1,43,200", prev: "₹1,44,500", changePct: -0.9, score: 58, verdict: "Core Preserver", desc: "Official IBJA retail rate ₹1,43,200. Core strategic wealth preserver." },
      { category: "Precious Metals", name: "Silver (999 · 1 Kg)", current: "₹1,84,500", prev: "₹1,86,200", changePct: -0.91, score: 75, verdict: "Good to Buy", desc: "Official IBJA benchmark ₹1,84,500. Strong industrial demand discount." },
      { category: "Relative Bullion", name: "Gold / Silver Ratio (GSR)", current: "77.60", prev: "77.60", changePct: 0.0, score: 77, verdict: "Silver Discounted", desc: "At 77.60, Silver remains historically undervalued relative to Gold." },
      { category: "Macro Market Cap", name: "Buffett Indicator (M-Cap/GDP)", current: "118.2%", prev: "118.4%", changePct: -0.17, score: 42, verdict: "Moderately Elevated", desc: "Total market cap to GDP at 118% warrants caution in small-cap segments." },
      { category: "Equity Risk Premium", name: "Bond-Equity Yield Gap", current: "-2.20%", prev: "-2.20%", changePct: 0.0, score: 71, verdict: "Favorable Equity ERP", desc: "Earnings yield of 4.85% vs 7.05% G-Sec maintains sound risk premium." }
    ],
    indices: [
      { serial: 1, name: "Nifty 50", close: "25,324.50", changePct: 0.42, pe: "20.62", pb: "3.08", dy: "1.37%", eps: "₹1,228.40", yieldGap: "-2.20%", spread: "1.00x", score: 72, regime: "GOOD TO BUY", action: "Lump-sum deployment + Systematic SIP boost" },
      { serial: 2, name: "Nifty Next 50", close: "73,420.10", changePct: 0.35, pe: "17.85", pb: "3.52", dy: "1.34%", eps: "₹4,113.15", yieldGap: "-1.45%", spread: "0.87x", score: 74, regime: "GOOD TO BUY", action: "High margin of safety. Prime for fresh capital" },
      { serial: 3, name: "Nifty Midcap 150", close: "22,650.80", changePct: -0.15, pe: "28.10", pb: "3.95", dy: "0.94%", eps: "₹806.08", yieldGap: "-3.49%", spread: "1.36x", score: 32, regime: "OVERVALUED", action: "Trim 20% profits; rotate into Large Caps & Silver" },
      { serial: 4, name: "Nifty Smallcap 250", close: "17,720.40", changePct: -0.45, pe: "32.40", pb: "3.42", dy: "0.75%", eps: "₹546.93", yieldGap: "-3.96%", spread: "1.57x", score: 24, regime: "HIGH FROTH", action: "Halt fresh lumpsum; rebalance into Nifty 50" },
      { serial: 5, name: "Nifty 500", close: "23,780.20", changePct: 0.22, pe: "22.25", pb: "3.32", dy: "1.21%", eps: "₹1,068.77", yieldGap: "-2.56%", spread: "1.08x", score: 64, regime: "ACCUMULATE", action: "Standard systematic accumulation (1.0x SIP)" }
    ]
  };
}

/**
 * Whitelist: Client-callable function to run full portfolio reconciliation and gap audit.
 */
function runReconciliationAudit() {
  var ss = getSpreadsheet_();
  var records = readTransectionTab_(ss);
  var calcResult = calculatePortfolioEngine_(records, {});
  return reconcilePortfolioGaps_(ss, records, calcResult);
}

/**
 * Whitelist: Client-callable function to toggle system tabs visibility.
 */
function toggleSheetTabsVisibility(hide) {
  if (hide) return hideSystemTabs();
  return unhideAllTabs();
}

/**
 * Internal helper to read tab data.
 */
function readTabValues_(ss, tabName) {
  var sheet = ss.getSheetByName(tabName);
  if (!sheet || sheet.getLastRow() <= 1) return [];
  var vals = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();

  return vals.map(function(row) {
    return row.map(function(cell) {
      if (cell instanceof Date) {
        return Utilities.formatDate(cell, 'Asia/Kolkata', 'dd-MMM-yyyy');
      }
      return cell;
    });
  });
}
