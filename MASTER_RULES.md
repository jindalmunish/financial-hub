# MASTER RULES & SPECIFICATION BOOK
## MJ Portfolio Management System
**Document Version:** 2.0  
**Last Updated:** November 2026  
**Target Sheet ID:** `1x3fMFOJ8_rjIxQsRfLW4Ngin9ouzd1CftVi7XNWek2U`  
**Apps Script Project ID:** `1p-jaBLrJ7gAXpxJRTKFaPfxSK4OvYyRyZeSORfkuJHUKHZSuH7_EME1e`  
**Local Project Directory:** `/Users/munish/Documents/MJ Projects/Portfolio`

---

## 1. System Vision & Interoperability Principle
This document serves as the single source of truth for the MJ Portfolio project. If this folder is handed to any AI agent, software engineer, or analytics engine, it must provide full clarity on data semantics, calculation mathematics, UI conventions, and operational workflows without ambiguity.

### Key Architectural Invariants:
1. **Master Data Read-Only Integrity:** The `Transection` sheet in Google Sheets is raw master transaction data entered by the user. Automation scripts must **NEVER** overwrite, re-order, or delete rows from `Transection`.
2. **Target Sheet Boundary:** All automated pushes, fetches, and tests strictly target sheet `1x3fMFOJ8_rjIxQsRfLW4Ngin9ouzd1CftVi7XNWek2U`. Never touch legacy or backup sheets.
3. **In-Memory Web Engine Performance:** The Web Dashboard (`WebApp.js`) computes all portfolio metrics in-memory directly from `Transection` and `Prices` via `calculatePortfolioEngine_` in <20ms, bypassing slow sequential Google Sheet reads.

---

## 2. Data Schema & Semantics

### 2.1 The `Transection` Master Sheet
Transactions are recorded as flat ledger entries:
- **Date (`Col A`):** Transaction execution date (`dd-MMM-yyyy`).
- **Type (`Col B`):** Asset vehicle type (`Share`, `MF`, `PPF`, `SGB`, etc.).
- **Who (`Col C`):** Investor person / entity (`MJ`, `JJ`, etc.).
- **Script (`Col D`):** Name of security (e.g. `ITC`, `Parag Parikh Flexi Cap Fund - Direct Plan - Growth`).
- **Trans Type (`Col E`):** Operation type (`BUY`, `PURCHASE`, `SELL`, `SWITCH_IN`, `SWITCH_OUT`, `SIP`, `DIVIDEND`).
- **Units (`Col F`):** Quantity of shares or mutual fund units.
- **Price (`Col G`):** Execution price or NAV per unit.
- **Amount (`Col H`):** Gross transaction value (`Units * Price`). If blank, auto-computed.
- **Charges (`Col I`):** Brokerage, STT, exchange charges, stamp duty.
- **Net Amount (`Col J`):** Cash flow impact (`Amount + Charges` for Buy, `Amount - Charges` for Sell).

### 2.2 Difference Between `Who` and `Type`
- **`Who`:** The person who owns the investment (e.g., `MJ` vs `JJ`). Dashboard overview cards and summary metrics must break down figures by investor person, ending with a **Family Total** (sum of all).
- **`Type`:** The asset class / vehicle (`Share`, `Mutual Fund`, `PPF`, etc.). Used for asset allocation ribbons, category runways, and tax treatment classification.

---

## 3. Formatting Standards (Strict Rules)

| Dimension | Formatting Rule | Example |
|---|---|---|
| **Rupee Amounts** | **Whole numbers only (NO decimals)** with Indian thousands comma grouping | `₹1,24,560` (NOT `₹1,24,560.45`) |
| **Quantities / Units** | **Whole numbers only (NO decimals)** | `1,420` (NOT `1,420.50`) |
| **Share / MF NAV** | **Up to 2 decimal places** | `₹125.40` or `₹2,450.85` |
| **Percentages (%)** | **Up to 2 decimal places** | `14.25%` or `-2.10%` |
| **Dates** | **Consistent `dd-MMM-yyyy` format** | `06-Nov-2026`, `23-Sep-2026` |

---

## 4. Financial Calculations & Tax Rules

### 4.1 Holding & Cost Basis Engine
- **Accounting Method:** First-In, First-Out (FIFO) lot matching.
- **Cost Basis:** `Total Buy Cost + Buy Charges` allocated proportionally to units.
- **Current Value:** `Remaining Units * Current Market Price or NAV`.
- **Unrealised Gain / Loss:** `Current Value - Cost Basis`.
- **Realised Gain / Loss:** `(Sell Price - Buy Cost) * Units Sold - Sell Charges`.

### 4.2 XIRR & CAGR
- **Algorithm:** Newton-Raphson iterative root finding for internal rate of return on cash flows:
  $$\sum \frac{C_t}{(1 + r)^{\frac{d_t - d_0}{365}}} = 0$$
- **Short Holding Period Guard:** For holdings held less than 90 days, annualized XIRR can produce extreme/distorted rates (>200% or <-90%). The system flags these with `*` and presents Absolute Return % alongside.

### 4.3 Tax Rules (Post-July 2024 Budget Amendments)
- **Equity Shares & Equity Mutual Funds:**
  - **LTCG (Holding Period > 12 Months):** Tax rate **12.5%** (prior to July 2024: 10%). Standard exemption of **₹1,25,000** per financial year applies.
  - **STCG (Holding Period ≤ 12 Months):** Tax rate **20%** (prior to July 2024: 15%).
- **Debt Mutual Funds:** Taxed at marginal income tax slab rates regardless of holding period.
- **Tax Tab View:** Filterable by Financial Year (`FY 2024-25`, `FY 2025-26`, `FY 2026-27`, `All`) so historical sales (e.g., Reliance, PNB, SGB sales in FY 2025-26) and closed lots reflect exact realized capital gains.

### 4.4 PPF (Public Provident Fund) Rules
- **Asset Classification:** Categorized as **Debt** (Fixed Income) with Passive management.
- **Valuation & Interest as Returns:**
  - Investor deposits add to invested capital and cumulative balance.
  - Annual bank interest entries (e.g., dated 31-Mar-2026 / 31.03.2026 with description containing "Interest") are treated as **pure returns/profit** ($cost = 0$). They increase total PPF balance and value without inflating principal invested from pocket.
  - Return %: $(Total\ PPF\ Interest / Total\ Principal\ Deposits) \times 100$.
- **Tax Treatment:** Fully **Exempt** (EEE regime under Section 80C) — zero STCG or LTCG tax liability.
- **Global Include / Exclude Toggle (Default = Excluded):**
  - Because PPF is a guaranteed fixed-income instrument similar to a bank fixed deposit, it is **excluded by default** from all portfolio views, overview cards, allocation ribbons, and XIRR calculations. This ensures that the portfolio focuses on high-alpha market investments (Mutual Funds and Shares) and reflects true equity/MF market XIRR without dilution.
  - The user can toggle PPF ON/OFF anytime via the top header pill button `[ PPF: Excluded / Included ]`.

---

## 5. UI/UX Design System & Dashboard Rules

### 5.1 Overview Visual Cockpit
The Overview combines the highest-utility financial views into a single cockpit:
1. **Allocation Ribbon:** 100% stacked horizontal bar displaying proportions of Large Cap, Mid Cap, Small Cap, Flexi Cap, Debt, and SGB.
2. **Dynamic Investor Split Cards:** Dynamically generated cards for all investor entities found in data (`MJ`, `JJ`, HUF, etc.) displaying Invested, Current Value, Absolute Profit, and Portfolio XIRR, followed by the **Family Total (Sum of All)** card.
3. **Dual Heatmaps:**
   - **Proportional Instrument Heatmap:** Tile size is strictly proportional to true % portfolio weight.
   - **Proportional Return Shading (Darker/Lighter Spectrum):** Tile color intensity dynamically scales with % return. High positive returns display progressively richer, darker, and more saturated emerald green ($>40\%$, $25\text{--}40\%$, $15\text{--}25\%$, $8\text{--}15\%$, $3\text{--}8\%$), while negative returns scale into deep dark crimson ($<-30\%$, $-20\text{--}-30\%$, $-10\text{--}-20\%$). Includes an interactive return scale gradient indicator.
   - **Allocation Category Summary Heatmap:** Tiles sized by category % weight (Large Cap, Mid Cap, Small Cap, Flexi Cap, PPF/Debt, etc.), dynamically shaded by category return %, with click-to-filter capability.
4. **Category Runway:** Horizontal progress bars tracking target vs actual allocation per investment vehicle.
5. **Top Gainers & Losers:** Quick identification of portfolio drivers.

### 5.2 List Views & Table Interactions
1. **Dynamic Investor Filters:** The global `Who` filter automatically discovers all distinct investors from the ledger.
2. **Transactions Ledger (Summarized View by Default):**
   - **Summarized by Script:** Instead of repeating multiple raw transactions, transactions are consolidated by `(Who, Type, Script)`. Displays Total Bought, Total Sold, Net Invested, Units Held, Current Value, and Script-level XIRR.
   - **Inline Accordion Drawer:** Clicking any summarized script row expands all underlying transaction rows with running units balance, amounts, and sortable columns.
   - **Detailed Ledger Toggle:** Switcher button allows switching between Summarized View and Detailed Raw Transactions anytime.
3. **Sortable Columns:** Every table across all tabs (Holdings, Funds Flow, Allocations, Tax, Transactions) must support click-to-sort on any column (ascending/descending toggle with indicator arrow).
4. **Sticky Headers:** Table header rows (`<thead>`) must stick to the top (`position: sticky; top: 0; z-index: 10`) during scrolling so columns remain clearly labeled.
5. **Inline Expandable Drill-Down:** Clicking on any row (Holding, Month/Year Fund Flow, Asset Class, or Transaction Script) expands an inline drawer directly underneath the row:
   - Must be contained within a bounded scrolling box (`max-height: 380px; overflow-y: auto`).
   - Must never spawn disruptive popup modal windows.
   - Drill-down sub-tables must have sortable headers and sticky header rows.
6. **Responsive Mobile-First Design:** Fully adaptable via `@media (max-width: 768px)` with horizontal table scrolling and stacked metric cards.

---

## 6. Data Health & Administrative Tools
Located under the **Data Health** tab in the dashboard and the **MJ Portfolio** custom menu in Google Sheets:
1. **Master Sheet Updation Checklist (Asset × Investor):** Displays a granular checklist of the latest recorded transaction date, description, and amount for each person and asset class (e.g. `MJ • Shares`, `MJ • MF`, `MJ • PPF`, `JJ • Shares`, `JJ • MF`, `JJ • PPF`) to guide manual ledger additions without gaps or duplication.
2. **Cross-Tab Net Investment Matrix (2D Periodic Grid Table):**
   - Filters: `Who` (All, MJ, JJ...), `Period/Year` (All Years, FY 2026-27, FY 2025-26...), `Type` (All, Shares, MF, PPF...).
   - Columns: Investment Types (Shares, MF, PPF) + Total Net Invested.
   - Rows: Years (when All Years selected) or Months (when a specific Year selected).
   - Values: Net amount invested in whole ₹ (`formatINR`, strictly zero decimals).
3. **Reconciliation & Gap Audit:** Scans portfolio transactions for:
   - Negative unit balances (over-selling).
   - Zero-priced or missing amounts.
   - Unmapped scripts or missing AMFI scheme codes.
   - Cash flow anomalies.
4. **Sheet Tab Cleanliness:** "Hide System Tabs" hides all calculation helper sheets, leaving only the clean user-facing `Transection` master sheet visible. "Show All Tabs" restores visibility when needed.
5. **Parallel Price Synchronization:** Mutual fund NAVs from AMFI are fetched concurrently using `UrlFetchApp.fetchAll` to minimize sync latency to <1 second.
   - Cash flow anomalies.
3. **Sheet Tab Cleanliness:** "Hide System Tabs" hides all calculation helper sheets, leaving only the clean user-facing `Transection` master sheet visible. "Show All Tabs" restores visibility when needed.
4. **Parallel Price Synchronization:** Mutual fund NAVs from AMFI are fetched concurrently using `UrlFetchApp.fetchAll` to minimize sync latency to <1 second.

---

## 7. Version Control & Deployment Commands
- **Run Engine Test Suite:**
  ```bash
  cd "/Users/munish/Documents/MJ Projects/Portfolio"
  npm test
  ```
- **Deploy to Google Apps Script:**
  ```bash
  cd "/Users/munish/Documents/MJ Projects/Portfolio"
  clasp push -f
  ```
- **Git Commit:**
  ```bash
  git add -A
  git commit -m "description of changes"
  ```
