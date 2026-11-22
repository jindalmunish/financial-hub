# MJ Portfolio Project — Conversation & Development History

This document preserves the complete context, requirements, architectural decisions, and updates from the initial build session for any new Antigravity chat or future AI agent.

---

## 1. Project Locations & Identifiers
- **Local Project Path:** `/Users/munish/Documents/MJ Projects/Portfolio`
- **Target Google Sheet ID:** `1x3fMFOJ8_rjIxQsRfLW4Ngin9ouzd1CftVi7XNWek2U`
- **Google Apps Script Project ID:** `1p-jaBLrJ7gAXpxJRTKFaPfxSK4OvYyRyZeSORfkuJHUKHZSuH7_EME1e`
- **Web App URL (v3 Embed-Ready):**
  `https://script.google.com/macros/s/AKfycbxn6ykHnEIFLw_iXbkpOo5ZHQKaxG80BLhIXwFoc6Mut06G4U4nt74CngJckki0gGp-/exec`

---

## 2. Core Functional Requirements Implemented

### Formatting Standards (Strict Rules)
1. **Rupee Amounts:** Whole numbers only without decimals (e.g., `₹1,24,560`).
2. **Quantities / Units:** Whole numbers only without decimals (e.g., `1,420`).
3. **NAV / Stock Prices:** Up to 2 decimal places (e.g., `₹125.40`).
4. **Percentages (%):** Up to 2 decimal places (e.g., `14.25%`).
5. **Dates:** Uniform `dd-MMM-yyyy` format across all views.

### Overview Visual Cockpit
1. **Full-Width Allocation Ribbon:** Continuous 100% stacked bar showing asset distribution (Equity, Hybrid, Gold, Debt).
2. **Dynamic Investor Split Cards:** Separate summary cards for all investor entities (`MJ`, `JJ`, etc.) with Invested, Current Value, Profit, and annualized XIRR, followed by the **Family Total (Sum of All)** card.
3. **Dual Heatmaps:**
   - **Proportional Instrument Heatmap:** Tile area is strictly proportional to true % portfolio weight.
   - **Proportional Color Darkening/Shading:** Graduated color scale from pale tint (near 0%) to rich dark emerald green (>40%), and pale red to dark crimson red (<-30%). Includes interactive return scale legend.
   - **Allocation Category Summary Heatmap:** Sized by category % weight (Large Cap, Mid Cap, Small Cap, Flexi Cap, PPF/Debt, etc.), dynamically shaded by category return %, with click-to-filter capability.
4. **Category Runway & Top Gainers:** Tracking target vs actual allocation and top performers.

### Global PPF Include / Exclude Switch
- **Default State:** **Excluded**. PPF is a guaranteed fixed-income instrument (like an FD), so it is excluded by default from overview cards, allocation ribbons, and XIRR calculations to prevent diluting market performance metrics.
- **Toggle Button:** One-click header button `[ PPF: Excluded (Default) ]` $\iff$ `[ PPF: Included ]` toggles PPF across all views instantly.
- **PPF Interest as Returns:** Annual bank interest entries (e.g., 31.03.2026) are treated strictly as returns/profit ($cost = 0$) rather than user-invested capital.

### Transactions Ledger
- **Summarized by Script (Default):** Consolidates multiple entries by `(Who, Type, Script)` into a single row showing Total Bought, Total Sold, Net Invested, Units Held, Current Value, and Script-level XIRR.
- **Inline Accordion Drawer:** Clicking any script row expands an inline drawer showing all individual transactions with running units balance and field-level sorting.
- **View Switcher:** Toggle between **"Summarized by Script"** and **"Detailed Transactions"**.

### Data Health & Reconciliation Tools
- **Asset & Person Checklist Table:** Displays the latest transaction date, description, and amount for each person and asset class (`MJ Shares`, `MJ MF`, `MJ PPF`, `JJ Shares`, `JJ MF`, `JJ PPF`) to guide manual updates.
- **Cross-Tab Net Investment Matrix (2D Grid):** Interactive matrix with filters for Who, Year, and Type, displaying net invested amounts in whole ₹ without decimals.
- **Reconciliation Audit:** One-click scan for negative quantities, zero amounts, or cash flow gaps.
- **Sheet Cleanliness:** Buttons to hide/show system helper sheets in Google Sheets, keeping only `Transection` visible.

---

## 3. Deployment & Verification Commands
- **Run Engine Tests:** `npm test`
- **Deploy to Apps Script:** `clasp push -f` and `clasp deploy`
- **Master Rulebook:** See `MASTER_RULES.md`
