/**
 * System constants, master seed definitions, and default configuration.
 */

const STAMP_DUTY_RATE = 0.00005; // 0.005% on purchases, SIPs, switch-ins

// Seed MFAPI scheme codes: 16 original from MASTER_SCHEMES + 3 additions
const MASTER_SCHEMES = [
  {
    name: 'HDFC Aggressive Hybrid Fund',
    fullName: 'HDFC Aggressive Hybrid Fund - Direct Plan - Growth Option',
    code: 119062,
    isin: 'INF179K01XZ1',
    assetClass: 'Hybrid',
    category: 'Aggressive Hybrid',
    activePassive: 'Active',
    taxCategory: 'Review'
  },
  {
    name: 'Kotak Multi Asset Allocation Fund',
    fullName: 'Kotak Multi Asset Allocation Fund Regular Plan - Growth',
    code: 152065,
    isin: 'INF174KA1PA0',
    assetClass: 'Hybrid',
    category: 'Multi-asset and Balanced',
    activePassive: 'Active',
    taxCategory: 'Review'
  },
  {
    name: 'SBI Nifty Next 50 Index Fund',
    fullName: 'SBI Nifty Next 50 Index Fund - Direct Plan - Growth',
    code: 148945,
    isin: 'INF200KA1W00',
    assetClass: 'Equity',
    category: 'Next 50',
    activePassive: 'Passive',
    taxCategory: 'Equity'
  },
  {
    name: 'ICICI Prudential Nifty Next 50 Index Fund',
    fullName: 'ICICI Prudential Nifty Next 50 Index Fund - Direct Plan - Growth',
    code: 120684,
    isin: 'INF109K01Y80',
    assetClass: 'Equity',
    category: 'Next 50',
    activePassive: 'Passive',
    taxCategory: 'Equity'
  },
  {
    name: 'ICICI Prudential Arbitrage Fund',
    fullName: 'ICICI Prudential Arbitrage Fund - Direct Plan - Growth',
    code: 120364,
    isin: 'INF109K016O4',
    assetClass: 'Hybrid',
    category: 'Arbitrage',
    activePassive: 'Active',
    taxCategory: 'Review'
  },
  {
    name: 'ICICI Prudential Nifty Midcap 150 Index Fund',
    fullName: 'ICICI Prudential Nifty Midcap 150 Index Fund - Direct Plan - Growth',
    code: 149389,
    isin: 'INF109KC1W58',
    assetClass: 'Equity',
    category: 'Midcap',
    activePassive: 'Passive',
    taxCategory: 'Equity'
  },
  {
    name: 'ICICI Prudential Nifty Bank Index Fund',
    fullName: 'ICICI Prudential Nifty Bank Index Fund - Direct Plan - Growth',
    code: 149858,
    isin: 'INF109KC11A4',
    assetClass: 'Equity',
    category: 'Bank',
    activePassive: 'Passive',
    taxCategory: 'Equity'
  },
  {
    name: 'ICICI Prudential Nifty IT Index Fund',
    fullName: 'ICICI Prudential Nifty IT Index Fund - Direct Plan - Growth',
    code: 150468,
    isin: 'INF109KC13E2',
    assetClass: 'Equity',
    category: 'IT',
    activePassive: 'Passive',
    taxCategory: 'Equity'
  },
  {
    name: 'ICICI Prudential Mid Cap Fund',
    fullName: 'ICICI Prudential Mid Cap Fund - Growth',
    code: 102528,
    isin: 'INF109K01AN2',
    assetClass: 'Equity',
    category: 'Midcap',
    activePassive: 'Active',
    taxCategory: 'Equity'
  },
  {
    name: 'Parag Parikh Flexi Cap Fund',
    fullName: 'Parag Parikh Flexi Cap Fund - Direct Plan Growth (formerly Parag Parikh Long Term Value Fund)',
    code: 122639,
    isin: 'INF879O01027',
    assetClass: 'Equity',
    category: 'Flexicap',
    activePassive: 'Active',
    taxCategory: 'Equity'
  },
  {
    name: 'Axis Small Cap Fund',
    fullName: 'Axis Small Cap Fund Direct Growth',
    code: 125354,
    isin: 'INF846K01K35',
    assetClass: 'Equity',
    category: 'Smallcap',
    activePassive: 'Active',
    taxCategory: 'Equity'
  },
  {
    name: 'Invesco India Small Cap Fund',
    fullName: 'Invesco India Small Cap Fund - Direct Plan Growth',
    code: 145137,
    isin: 'INF205K013T3',
    assetClass: 'Equity',
    category: 'Smallcap',
    activePassive: 'Active',
    taxCategory: 'Equity'
  },
  {
    name: 'Mirae Asset Midcap Fund',
    fullName: 'Mirae Asset Midcap Fund - Regular Plan',
    code: 147479,
    isin: 'INF769K01EY2',
    assetClass: 'Equity',
    category: 'Midcap',
    activePassive: 'Active',
    taxCategory: 'Equity'
  },
  {
    name: 'Mirae Asset Large and Midcap Fund',
    fullName: 'Mirae Asset Large and Midcap Fund (formerly Mirae Asset Emerging Bluechip Fund) - Regular Plan',
    code: 112932,
    isin: 'INF769K01101',
    assetClass: 'Equity',
    category: 'Large and Midcap',
    activePassive: 'Active',
    taxCategory: 'Equity'
  },
  {
    name: 'quant Multi Asset Allocation Fund',
    fullName: 'quant Multi Asset Allocation Fund - Direct Plan',
    code: 120821,
    isin: 'INF966L01580',
    assetClass: 'Hybrid',
    category: 'Multi-asset and Balanced',
    activePassive: 'Active',
    taxCategory: 'Review'
  },
  {
    name: 'quant Small Cap Fund',
    fullName: 'quant Small Cap Fund - Direct Plan',
    code: 120828,
    isin: 'INF966L01689',
    assetClass: 'Equity',
    category: 'Smallcap',
    activePassive: 'Active',
    taxCategory: 'Equity'
  },
  // Added 3 as requested in SPEC:
  {
    name: 'ICICI Prudential Nifty 50 Index Fund',
    fullName: 'ICICI Prudential Nifty 50 Index Fund - Direct Plan Growth',
    code: 120620,
    isin: 'INF109K012M7',
    assetClass: 'Equity',
    category: 'Nifty 50',
    activePassive: 'Passive',
    taxCategory: 'Equity'
  },
  {
    name: 'ICICI Prudential Gold ETF FOF',
    fullName: 'ICICI Prudential Gold ETF FOF - Direct Plan - Growth',
    code: 120685,
    isin: 'INF109K01U92',
    assetClass: 'Gold',
    category: 'Gold',
    activePassive: 'Passive',
    taxCategory: 'Gold FoF'
  },
  {
    name: 'ICICI Prudential Nifty Smallcap 250 Index Fund',
    fullName: 'ICICI Prudential Nifty Smallcap 250 Index Fund - Direct Plan - Growth',
    code: 149283,
    isin: 'INF109KC1V18',
    assetClass: 'Equity',
    category: 'Smallcap',
    activePassive: 'Passive',
    taxCategory: 'Equity'
  }
];

// Share definitions and short names
const SHARE_MASTER_DEFAULTS = [
  {
    rawName: 'Reliance Industries',
    shortName: 'Reliance',
    symbol: 'NSE:RELIANCE',
    assetClass: 'Equity',
    category: 'Other shares',
    activePassive: 'Active',
    taxCategory: 'Equity'
  },
  {
    rawName: 'HDFC Bank',
    shortName: 'HDFC Bank',
    symbol: 'NSE:HDFCBANK',
    assetClass: 'Equity',
    category: 'Other shares',
    activePassive: 'Active',
    taxCategory: 'Equity'
  },
  {
    rawName: 'SBI',
    shortName: 'SBI',
    symbol: 'NSE:SBIN',
    assetClass: 'Equity',
    category: 'Other shares',
    activePassive: 'Active',
    taxCategory: 'Equity'
  },
  {
    rawName: 'Tata Consult. Serv.',
    shortName: 'TCS',
    symbol: 'NSE:TCS',
    assetClass: 'Equity',
    category: 'Other shares',
    activePassive: 'Active',
    taxCategory: 'Equity'
  },
  {
    rawName: 'Nifty BeES',
    shortName: 'Nifty50 ETF',
    symbol: 'NSE:NIFTYBEES',
    assetClass: 'Equity',
    category: 'Nifty 50',
    activePassive: 'Passive',
    taxCategory: 'Equity'
  },
  {
    rawName: 'Junior BeES',
    shortName: 'Next 50 ETF',
    symbol: 'NSE:JUNIORBEES',
    assetClass: 'Equity',
    category: 'Next 50',
    activePassive: 'Passive',
    taxCategory: 'Equity'
  },
  {
    rawName: 'ICICIPR GETF',
    shortName: 'Gold ETF',
    symbol: 'NSE:GOLDIETF',
    assetClass: 'Gold',
    category: 'Gold',
    activePassive: 'Passive',
    taxCategory: 'Gold ETF'
  },
  {
    rawName: 'KNIF1DRLQETF',
    shortName: 'Liquid ETF',
    symbol: 'NSE:LIQUID1',
    assetClass: 'Debt',
    category: 'Debt and Liquid',
    activePassive: 'Passive',
    taxCategory: 'Debt'
  }
];

// Reference statement prices for 06-Nov-2026 self test
const STATEMENT_SHARE_PRICES = {
  'HDFC Bank': 788.25,
  'Gold ETF': 120.30,
  'Next 50 ETF': 774.78,
  'Liquid ETF': 1130.93,
  'Nifty50 ETF': 284.22,
  'Reliance': 1320.00
};

// 6-Nov-2026 authenticated Statement_Check benchmark rows
const STATEMENT_CHECK_SEEDS = [
  { who: 'MJ', type: 'MF', name: 'Axis Small Cap Fund Direct Growth', units: 47.555, investedOrAvg: 6000.00, value: 6264.42 },
  { who: 'MJ', type: 'MF', name: 'ICICI Prudential Nifty Midcap 150 Index Fund - Direct Plan - Growth', units: 2023.412, investedOrAvg: 40000.00, value: 40361.20 },
  { who: 'MJ', type: 'MF', name: 'ICICI Prudential Nifty Bank Index Fund - Direct Plan - Growth', units: 925.334, investedOrAvg: 15000.00, value: 15786.38 },
  { who: 'MJ', type: 'MF', name: 'ICICI Prudential Nifty IT Index Fund - Direct Plan - Growth', units: 2882.747, investedOrAvg: 30000.00, value: 33877.18 },
  { who: 'MJ', type: 'MF', name: 'ICICI Prudential Mid Cap Fund - Growth', units: 340.234, investedOrAvg: 110000.00, value: 111273.53 },
  { who: 'MJ', type: 'MF', name: 'ICICI Prudential Nifty Smallcap 250 Index Fund - Direct Plan - Growth', units: 107.196, investedOrAvg: 2000.00, value: 1910.98 },
  { who: 'MJ', type: 'MF', name: 'ICICI Prudential Arbitrage Fund - Direct Plan - Growth', units: 201.494, investedOrAvg: 7997.70, value: 8075.23 },
  { who: 'MJ', type: 'MF', name: 'ICICI Prudential Nifty Next 50 Index Fund - Direct Plan - Growth', units: 1515.947, investedOrAvg: 100000.00, value: 101120.49 },
  { who: 'MJ', type: 'MF', name: 'Invesco India Small Cap Fund - Direct Plan Growth', units: 116.901, investedOrAvg: 6000.00, value: 6392.15 },
  { who: 'MJ', type: 'MF', name: 'Kotak Multi Asset Allocation Fund Regular Plan - Growth', units: 3849.493, investedOrAvg: 60000.00, value: 59724.88 },
  { who: 'MJ', type: 'MF', name: 'Mirae Asset Large and Midcap Fund - Regular Plan', units: 723.771, investedOrAvg: 110000.00, value: 112947.36 },
  { who: 'MJ', type: 'MF', name: 'Mirae Asset Midcap Fund - Regular Plan', units: 2913.100, investedOrAvg: 110000.00, value: 111906.74 },
  { who: 'MJ', type: 'MF', name: 'Parag Parikh Flexi Cap Fund - Direct Plan Growth', units: 220.117, investedOrAvg: 20000.00, value: 20679.62 },
  { who: 'MJ', type: 'MF', name: 'quant Multi Asset Allocation Fund - Direct Plan', units: 27.904, investedOrAvg: 5000.00, value: 5042.07 },
  { who: 'MJ', type: 'MF', name: 'quant Small Cap Fund - Direct Plan', units: 15.898, investedOrAvg: 5000.00, value: 4894.62 },
  { who: 'MJ', type: 'MF', name: 'SBI Nifty Next 50 Index Fund - Direct Plan - Growth', units: 11359.735, investedOrAvg: 230000.00, value: 226173.46 },
  { who: 'MJ', type: 'Shares', name: 'HDFC Bank', units: 240, investedOrAvg: 727.35, value: 189180.00 },
  { who: 'MJ', type: 'Shares', name: 'Nifty50 ETF', units: 1700, investedOrAvg: 267.27, value: 483174.00 },
  { who: 'MJ', type: 'Shares', name: 'Gold ETF', units: 1500, investedOrAvg: 122.10, value: 180450.00 },
  { who: 'MJ', type: 'Shares', name: 'Next 50 ETF', units: 650, investedOrAvg: 757.96, value: 503607.00 },
  { who: 'MJ', type: 'Shares', name: 'Liquid ETF', units: 100, investedOrAvg: 1107.75, value: 113093.00 },
  { who: 'MJ', type: 'Shares', name: 'Reliance', units: 200, investedOrAvg: 1249.58, value: 264000.00 },
  { who: 'JJ', type: 'MF', name: 'ICICI Prudential Nifty Next 50 Index Fund - Direct Plan - Growth', units: 1046.281, investedOrAvg: 70000.00, value: 69791.65 },
  { who: 'JJ', type: 'MF', name: 'ICICI Prudential Nifty Midcap 150 Index Fund - Direct Plan - Growth', units: 474.953, investedOrAvg: 10000.00, value: 9473.93 },
  { who: 'JJ', type: 'MF', name: 'ICICI Prudential Nifty 50 Index Fund - Direct Plan Growth', units: 19.507, investedOrAvg: 5000.00, value: 5170.17 },
  { who: 'JJ', type: 'MF', name: 'ICICI Prudential Arbitrage Fund - Direct Plan - Growth', units: 125.970, investedOrAvg: 5000.00, value: 5048.47 },
  { who: 'JJ', type: 'MF', name: 'ICICI Prudential Gold ETF FOF - Direct Plan - Growth', units: 62.828, investedOrAvg: 3000.00, value: 2820.12 }
];

// Tax rules reference table (effective post-July 23, 2024 Budget)
const TAX_RULES_SEEDS = [
  {
    assetClass: 'Listed Equity & Equity ETFs',
    holdingPeriodLTCG: '> 12 months',
    stcgRate: '20%',
    ltcgRate: '12.5%',
    exemptionLimit: '₹1,25,000 per financial year',
    effectiveDate: '23-Jul-2024',
    sourceUrl: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2035618',
    status: 'Verified'
  },
  {
    assetClass: 'Equity-Oriented Mutual Funds (Equity >= 65%)',
    holdingPeriodLTCG: '> 12 months',
    stcgRate: '20%',
    ltcgRate: '12.5%',
    exemptionLimit: '₹1,25,000 per financial year',
    effectiveDate: '23-Jul-2024',
    sourceUrl: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2035618',
    status: 'Verified'
  },
  {
    assetClass: 'Arbitrage Funds (Derivatives/Equity >= 65%)',
    holdingPeriodLTCG: '> 12 months',
    stcgRate: '20%',
    ltcgRate: '12.5%',
    exemptionLimit: '₹1,25,000 per financial year',
    effectiveDate: '23-Jul-2024',
    sourceUrl: 'https://primeinvestor.in/mutual-fund-taxation/',
    status: 'Draft - confirm'
  },
  {
    assetClass: 'Multi-Asset / Hybrid Funds',
    holdingPeriodLTCG: '> 12 or 24 months depending on equity %',
    stcgRate: 'Slab or 20%',
    ltcgRate: '12.5% without indexation (if equity >= 65%)',
    exemptionLimit: '₹1,25,000 (if equity >= 65%)',
    effectiveDate: '23-Jul-2024',
    sourceUrl: 'https://taxindiaupdates.in/',
    status: 'Draft - confirm'
  },
  {
    assetClass: 'Gold ETFs (Listed Demat)',
    holdingPeriodLTCG: '> 12 months',
    stcgRate: 'Applicable Slab Rate',
    ltcgRate: '12.5% without indexation',
    exemptionLimit: 'Nil',
    effectiveDate: '23-Jul-2024',
    sourceUrl: 'https://dspim.com/',
    status: 'Verified'
  },
  {
    assetClass: 'Gold FoF / Unlisted Gold Funds',
    holdingPeriodLTCG: '> 24 months',
    stcgRate: 'Applicable Slab Rate',
    ltcgRate: '12.5% without indexation',
    exemptionLimit: 'Nil',
    effectiveDate: '23-Jul-2024',
    sourceUrl: 'https://dspim.com/',
    status: 'Verified'
  },
  {
    assetClass: 'Debt & Liquid Funds / Liquid ETFs (Acquired >= 01-Apr-2023)',
    holdingPeriodLTCG: 'None (Section 50AA)',
    stcgRate: 'Applicable Slab Rate',
    ltcgRate: 'Applicable Slab Rate (Treated as STCG)',
    exemptionLimit: 'Nil',
    effectiveDate: '01-Apr-2023',
    sourceUrl: 'https://incometaxindia.gov.in/',
    status: 'Verified'
  },
  {
    assetClass: 'Bonus Shares',
    holdingPeriodLTCG: '> 12 months from allotment',
    stcgRate: '20%',
    ltcgRate: '12.5%',
    exemptionLimit: '₹1,25,000 pooled',
    effectiveDate: '23-Jul-2024',
    sourceUrl: 'https://incometaxindia.gov.in/',
    status: 'Verified'
  }
];

// System Settings defaults
const SETTINGS_DEFAULTS = [
  ['Stamp Duty Rate', '0.00005', 'Rate applied to gross up purchases and SIPs'],
  ['Update Hours', '07:00, 18:00', 'Daily scheduled trigger hours (Asia/Kolkata)'],
  ['Analysis Starts FY', '2025-26', 'Starting financial year for periodic filtering'],
  ['Analysis Starts CY', '2025', 'Starting calendar year for periodic filtering'],
  ['Amount Tolerance', '1.00', 'Permissible discrepancy between units*nav and amount (Rs)'],
  ['Email Alerts', 'FALSE', 'Set TRUE to receive email notifications on alerts'],
  ['Holidays', '26-Jan-2026, 03-Mar-2026, 25-Mar-2026, 02-Oct-2026, 25-Dec-2026', 'Market holidays for staleness check']
];

module.exports = {
  STAMP_DUTY_RATE,
  MASTER_SCHEMES,
  SHARE_MASTER_DEFAULTS,
  STATEMENT_SHARE_PRICES,
  STATEMENT_CHECK_SEEDS,
  TAX_RULES_SEEDS,
  SETTINGS_DEFAULTS
};
