# MJ Investment Portfolio Tracker

A production-grade, automated portfolio tracking engine and private dashboard for Google Sheets, built to track Mutual Funds and Demat Shares for **MJ** and **JJ**.

---

## 1. System Architecture

The solution uses a two-tier decoupled architecture:
1. **Pure Node.js Calculation Engine (`src/core/`)**:
   - Zero external dependencies.
   - Fully testable locally under Node.js (`npm test`).
   - Implements FIFO matching, same-day share trade netting, gross-up for stamp duty, post-Budget 2024 capital gains tax rules, Newton-Raphson XIRR with bisection fallback, SIP tracking, and all 14 data health checks.
2. **Google Apps Script & Web Dashboard (`Code.js`, `WebApp.js`, `Index.html`)**:
   - Bound to Google Sheet Copy: `1x3fMFOJ8_rjIxQsRfLW4Ngin9ouzd1CftVi7XNWek2U`.
   - Script ID: `1p-jaBLrJ7gAXpxJRTKFaPfxSK4OvYyRyZeSORfkuJHUKHZSuH7_EME1e`.
   - Deployed and synchronized via `@google/clasp`.
   - Batch reads and writes with script locking to stay within Google Apps Script's 6-minute execution limits.
   - Mobile-first private web app with router, dark/light themes, and inline SVG charts.

---

## 2. Spreadsheet Tabs

| Tab Name | Owner / Type | Description |
| :--- | :--- | :--- |
| **Transection** | **User Master (READ-ONLY)** | Master statement data. The script **never** writes to, formats, sorts, validates, or deletes this sheet. Columns are mapped by header name. |
| **Settings** | User Editable | System parameters (Stamp duty rate, daily update hours, analysis start FY/CY, tolerances, holidays). Seeded once. |
| **Tax_Rules** | System Maintained | Indian capital gains tax rules (post-July 2024 Budget) with holding periods, rates, exemptions, and source URLs. |
| **Fund_Master** | System + Overrides | MFAPI scheme codes, classification, and user override columns (which are never overwritten). |
| **Share_Master** | System + Overrides | Demat share symbols, short names, classification, and user override columns. |
| **Statement_Check** | Benchmark (Immutable) | Authenticated 6-Nov-2026 statements used by automated self-tests. Seeded once, never overwritten. |
| **Prices** | System Dynamic | Live prices: `=GOOGLEFINANCE(...)` formulas for shares (with BSE fallback) and MFAPI for mutual funds. |
| **NAV_History** | System Historical | Historical NAV cache appended only for held funds. |
| **Lots** | Precomputed | Open tax lots with date, units, lot price, gross cost, current value, return, XIRR, tax bucket, days held, and days to LTCG. |
| **Realised** | Precomputed | Matched sales with buy/sell dates, proceeds, cost, profit, tax bucket, holding days, FY, and CY. |
| **Holdings** | Precomputed | Consolidated holdings by instrument with category, asset class, active/passive, units, invested, current value, profit, return %, and portfolio weight %. |
| **Flows** | Precomputed | Monthly, FY, and CY new money flows split by person and SIP vs Lump Sum. |
| **SIPs** | Precomputed | SIP tracker (fund, monthly amount, SIP day, installments count, last date, next due, active/stopped status). |
| **Alerts** | System Alerts | Real-time integrity and validation alerts (errors, warnings, and info). |
| **Self_Test** | Automated Quality | Acceptance tests verifying calculated values against authenticated benchmarks. |
| **Run_Log** | System Audit | Execution history timestamps, status, duration, and error logs. |

---

## 3. Key Financial & Tax Rules Implemented

1. **Stamp Duty Gross-Up**:
   $$\text{Gross Cost} = \text{round}\left(\frac{\text{Amount}}{1 - 0.00005}, 2\right)$$
   Applied to all MF purchases, SIPs, and switch-ins.
2. **Share Amount & Charges**:
   - $\text{Buy} = \text{Units} \times \text{Price} + \text{Charges}$
   - $\text{Sell} = \text{Units} \times \text{Price} - \text{Charges}$
   - Bonus shares (Price = 0, Charges = 0): Zero cost, acquired on row date.
   - Demat-style average price without charges calculated for reconciliation.
3. **Same-Day Share Netting (STCG)**:
   - Sales first offset buys of the same share on the same day. Any matched intraday trade is classified as **STCG**.
   - Remaining quantity matches FIFO against older open lots.
4. **Post-Budget 2024 Tax Treatment**:
   - **Listed Equity & Equity ETFs**: LTCG if held $> 12$ months (12.5% tax above ₹1.25L exemption); STCG if $\le 12$ months (20% tax).
   - **Equity Mutual Funds**: Same as listed equity.
   - **Gold ETFs (Listed Demat)**: LTCG if $> 12$ months (12.5%); STCG at Slab rate.
   - **Gold FoF (Unlisted)**: LTCG if $> 24$ months (12.5%); STCG at Slab rate.
   - **Debt & Liquid (Post-Apr 2023)**: Section 50AA applies; all gains taxed at Slab rates regardless of holding period.
   - **Arbitrage & Multi-Asset**: Default flagged as `"Review"` until confirmed by user override.
5. **XIRR**:
   - Newton-Raphson iteration with a robust Bisection fallback ($-99.9\%$ to $+5000\%$).
   - Flagged with `short holding` if under 90 days.

---

## 4. Running Local Tests

Run the full automated test suite against `tests/data/transection.csv`:
```bash
npm test
```
All 63 self-tests and unit checks run and verify 100% agreement with `Statement_Check`.

---

## 5. Deployment with Clasp

Push the code to your Apps Script project:
```bash
clasp push
```

---

## 6. Manual Steps for the User

1. **Open Google Sheet**:
   Open [`1x3fMFOJ8_rjIxQsRfLW4Ngin9ouzd1CftVi7XNWek2U`](https://docs.google.com/spreadsheets/d/1x3fMFOJ8_rjIxQsRfLW4Ngin9ouzd1CftVi7XNWek2U/edit).
2. **Authorize Script (One-Time)**:
   - Reload the sheet tab in your browser.
   - Click the top menu **MJ Portfolio > Update now**.
   - When Google displays the "Authorization Required" popup, click **Continue**, select your account, click **Advanced**, and click **Go to MJ Portfolio (unsafe)** to grant permissions.
3. **Install Triggers**:
   - Click **MJ Portfolio > Install triggers**. This schedules daily automated updates at 07:00 and 18:00 IST.
4. **Run Self Test**:
   - Click **MJ Portfolio > Run self test**.
   - Inspect the **Self_Test** tab to see that all tests are marked **PASS**.
5. **Deploy & Open the Web App**:
   - In the Google Sheet, go to **Extensions > Apps Script**.
   - In the Apps Script editor, click **Deploy > New deployment**.
   - Click the gear icon next to "Select type" and choose **Web app**.
   - Description: `MJ Portfolio Web App v1`.
   - Execute as: **Me**.
   - Who has access: **Only myself**.
   - Click **Deploy** and copy your Web App URL to open your private dashboard.
