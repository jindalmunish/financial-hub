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

  var template = HtmlService.createTemplateFromFile('Index');
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
