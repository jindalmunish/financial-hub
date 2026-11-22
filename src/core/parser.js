/**
 * Parser for transaction statements (CSV and 2D arrays).
 * Finds columns strictly by header name. Read-only.
 */

const MONTH_NAMES = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
};

const MONTH_ABBRS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function cleanNumber(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const cleaned = String(val).replace(/,/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parseDate(dateVal) {
  if (!dateVal) return null;
  if (dateVal instanceof Date) {
    if (isNaN(dateVal.getTime())) return null;
    return dateVal;
  }
  
  const s = String(dateVal).trim();
  // Format dd-MMM-yyyy or d-MMM-yyyy
  const parts = s.split(/[-/ ]/);
  if (parts.length === 3) {
    const d = parseInt(parts[0], 10);
    const mStr = parts[1].toLowerCase().slice(0, 3);
    const m = MONTH_NAMES[mStr];
    let y = parseInt(parts[2], 10);
    if (y < 100) y += 2000;
    if (!isNaN(d) && m !== undefined && !isNaN(y)) {
      return new Date(Date.UTC(y, m, d));
    }
  }
  
  const parsed = new Date(s);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(dateObj) {
  if (!dateObj) return '';
  const d = String(dateObj.getUTCDate()).padStart(2, '0');
  const m = MONTH_ABBRS[dateObj.getUTCMonth()];
  const y = dateObj.getUTCFullYear();
  return `${d}-${m}-${y}`;
}

function getFinancialYear(dateObj) {
  if (!dateObj) return '';
  const y = dateObj.getUTCFullYear();
  const m = dateObj.getUTCMonth(); // 0 is Jan, 3 is Apr
  if (m >= 3) {
    // April to Dec
    const nextY = String(y + 1).slice(-2);
    return `FY ${y}-${nextY}`;
  } else {
    // Jan to March
    const curY = String(y).slice(-2);
    return `FY ${y - 1}-${curY}`;
  }
}

function getCalendarYear(dateObj) {
  if (!dateObj) return '';
  return `CY ${dateObj.getUTCFullYear()}`;
}

function parseCSVLine(line) {
  const parts = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      parts.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  parts.push(cur.trim());
  return parts;
}

function parseCSV(content) {
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];
  const rawRows = lines.map(parseCSVLine);
  return parseRows(rawRows);
}

function parseRows(rows2D) {
  if (!rows2D || rows2D.length === 0) return [];
  const headerRow = rows2D[0].map(h => String(h || '').trim().replace(/^"|"$/g, ''));
  
  // Find column indices by header name
  const colMap = {};
  headerRow.forEach((colName, idx) => {
    colMap[colName.toLowerCase()] = idx;
  });

  const getIdx = (name) => {
    const idx = colMap[name.toLowerCase()];
    return idx !== undefined ? idx : -1;
  };

  const whoIdx = getIdx('Who');
  const typeIdx = getIdx('Type');
  const schemeIdx = getIdx('Scheme Name');
  const descIdx = getIdx('Transaction Description');
  const dateIdx = getIdx('Date');
  const priceIdx = getIdx('NAV/Price');
  const unitsIdx = getIdx('Units');
  const amountIdx = getIdx('Amount');
  const chargesIdx = getIdx('Charges');

  const records = [];
  for (let r = 1; r < rows2D.length; r++) {
    const row = rows2D[r];
    if (!row || row.length === 0 || row.every(c => c === '' || c === null || c === undefined)) continue;

    const rawDate = dateIdx >= 0 ? row[dateIdx] : '';
    const dateObj = parseDate(rawDate);

    records.push({
      rowIndex: r + 1, // 1-based sheet row
      who: whoIdx >= 0 ? String(row[whoIdx] || '').trim() : '',
      type: typeIdx >= 0 ? String(row[typeIdx] || '').trim() : '',
      schemeName: schemeIdx >= 0 ? String(row[schemeIdx] || '').trim() : '',
      description: descIdx >= 0 ? String(row[descIdx] || '').trim() : '',
      rawDate: rawDate,
      dateObj: dateObj,
      dateStr: formatDate(dateObj) || String(rawDate),
      fy: getFinancialYear(dateObj),
      cy: getCalendarYear(dateObj),
      navPrice: cleanNumber(priceIdx >= 0 ? row[priceIdx] : 0),
      units: cleanNumber(unitsIdx >= 0 ? row[unitsIdx] : 0),
      amount: cleanNumber(amountIdx >= 0 ? row[amountIdx] : 0),
      charges: cleanNumber(chargesIdx >= 0 ? row[chargesIdx] : 0)
    });
  }

  return records;
}

module.exports = {
  cleanNumber,
  parseDate,
  formatDate,
  getFinancialYear,
  getCalendarYear,
  parseCSV,
  parseRows
};
