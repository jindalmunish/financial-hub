Claude Code Build Prompt v1
Project MJ, Investment. 8 November 2026. This is the single prompt to paste into Claude Code in the folder ~/mfpf-script. It supersedes Investment Rules v0.1 where they differ. Before pasting, put a CSV download of the Transection tab at ~/mfpf-script/tests/data/transection.csv.
Build my investment tracker from scratch. This is a full rebuild of a Google Apps Script project bound to a Google Sheet, plus a private web dashboard. Work in this folder (a clasp clone). Make sensible decisions yourself and record assumptions in README.md. Stop only for steps only I can do (authorising, running functions in the browser, deploying).
0. Safety (do first)
.clasp.json scriptId must be 1p-jaBLrJ7gAXpxJRTKFaPfxSK4OvYyRyZeSORfkuJHUKHZSuH7_EME1e. This is the COPY of my sheet (id 1x3fMFOJ8_rjIxQsRfLW4Ngin9ouzd1CftVi7XNWek2U). Never push anywhere else. Never touch the original MFPF (id 11DNbmDXFflS1EI5U-gl7oL0hcwiWb4phkmZyHloGC24).
Run git init and commit before changing anything. Commit after each milestone.
Before deleting the old code, keep the 16 MFAPI scheme codes from MASTER_SCHEMES in Code.js as seeds.
The tab Transection is my master data. Code must never write to, format, sort, validate or delete it. Read only, and find columns by header name: Who, Type, Scheme Name, Transaction Description, Date, NAV/Price, Units, Amount, Charges. All other tabs and old script files can be deleted and rebuilt.
Put all calculation code in pure functions with no Apps Script calls, so it runs under Node. Write Node tests for every rule below and run them before every push. tests/data/transection.csv is a download of my Transection tab. If it is missing, stop and tell me to add it.
1. Data facts
Persons are named in Who (MJ, JJ). Type values: MF, Shares. Support only these now, but design one module per Type so EPF, PPF, NPS, FD, Gold, Silver and Others can be added later. An unknown Type gives a "not supported yet" alert, not an error.
Dates are real dates. Show dd-MMM-yyyy and Indian lakh formatting. Timezone Asia/Kolkata. Financial year is April to March; also support calendar year.
MF rows come from fund house statements. Amount is net of stamp duty. Gross cost = Amount / (1 - 0.00005), rounded to 2 decimals, for purchases, SIPs and switch-ins (rate in Settings). Redemptions and switch-outs have negative units and amount. Rows with zero amount (KYC, nominee, address, contact, STT borne by AMC and similar) are ignored. An unrecognised description with a non-zero amount raises an alert. A switch is a sale plus a purchase. MF sales reduce cost by FIFO lot cost.
Share rows come from my demat account. The Amount cell is blank, so calculate it: Buy = Units x Price + Charges. Sell = Units x Price - Charges. Units are positive for both; the direction is in Transaction Description (Buy or Sell). A Buy with price 0 and charges 0 is a bonus (Reliance 28-Oct-2024 is a verified 1:1 bonus, 54 units): zero cost, acquisition date = row date.
Share cost includes charges (STT excluded). Also show the demat-style average price (without charges) for reconciliation.
Matching: a sale first offsets buys of the same share on the same day, and that result is always STCG. Remaining quantity is matched FIFO against older lots. This reproduces my demat average prices.
SGB2020 T42 is a deliberate plug entry that squares sales. Keep it as a normal transaction.
Short names: Reliance, HDFC Bank, SBI (State Bank of India, not SBI Cards), TCS, Nifty50 ETF (Nifty BeES), Next 50 ETF (Junior BeES), Gold ETF (ICICIPR GETF, demat symbol GOLDIETF), Liquid ETF (KNIF1DRLQETF, symbol LIQUID1). Other names keep their broker names until I rename them in Share_Master.
HDFC Aggressive Hybrid has only admin rows and no holding. Ignore it.
2. Masters (system-maintained; never edit Transection)
Fund_Master and Share_Master: one row per fund or share with system columns (full name, short name, plan, MFAPI code or exchange symbol, asset class, index or category group, active or passive, tax category, needs-review flag) and my Override columns, which are never overwritten. Effective value = override if filled, else system value.
Fund codes come from MFAPI (api.mfapi.in). Auto-map new funds only with strict matching (fund house, plan Direct or Regular, Growth); otherwise flag for review. Never use loose word-overlap matching. Seed with the 16 old codes. Add: ICICI Prudential Nifty 50 Index Fund Direct Growth, ICICI Prudential Gold ETF FOF Direct Growth, ICICI Prudential Nifty Smallcap 250 Index Fund Direct Growth.
Classification comes from the MFAPI scheme category plus name rules. Asset class: Equity, Debt, Gold, Hybrid. Group order: index funds and ETFs first (Nifty 50, Next 50, Midcap 150, Smallcap 250, Bank, IT, other indices), then Multicap, Flexicap, Multi-asset and Balanced, Arbitrage, Debt and Liquid, Gold, others. Each group splits into Active and Passive. Funds with uncertain tax treatment (multi-asset, hybrid, arbitrage) get tax category "Review" until I fill the override.
Prices: MF latest NAV from MFAPI, one fetch per fund per run, with retries. Keep NAV_History only for held funds, appending new dates. Shares: GOOGLEFINANCE formulas written to a Prices tab (NSE:HDFCBANK, NSE:NIFTYBEES, NSE:GOLDIETF, NSE:JUNIORBEES, NSE:LIQUID1, NSE:RELIANCE), flush, retry if Loading, fall back to BSE, else raise an alert. Keep the last good price on any failure.
3. Tax
Tax_Rules tab with effective dates and a Status column. Do not guess rates. Search the web for current Indian Income Tax rules as of today (November 2026, including the latest Budget) for listed shares and equity ETFs, equity-oriented funds, arbitrage funds, hybrid and multi-asset funds, debt and liquid funds and ETFs, gold ETFs and gold FOFs, bonus shares and switches. Record rates, holding periods, exemptions and source URLs with dates. Mark every uncertain item "Draft - confirm" and list them in your final report.
Tax bucket per lot: STCG, LTCG or Slab, from the tax category and holding period (12 months means a sale after the same date one year later). Same-day share trades are STCG. Show profit by tax bucket, realised by financial and calendar year, unrealised if sold today, and days until a lot becomes long-term. Do not compute tax payable.
4. Metrics
Every summary shows Total Investment (open holdings, gross), Current Value, Profit Received (realised, plus dividends or interest if present), Profit Available (unrealised), and XIRR or CAGR plus absolute return.
XIRR uses Newton with a bisection fallback. Current value is the final flow on the as-of date. Show XIRR for short holdings with a "short holding" flag if under 90 days, and "n/a" (never 0) if it cannot be solved. CAGR only for a single lump sum.
Analysis starts FY 2025-26 and CY 2025. Use all history for lots and cost, but period selectors filter realised gains, transactions and funds flow. XIRR and unrealised figures are since acquisition; say so in the UI.
Share rule: a share gets its own line if its current value is 5% or more of the selected portfolio; the rest are grouped as Other shares and expand on click. In the index-first view, ETFs sit with the matching index funds (for example Junior BeES with Next 50).
Funds flow (new money) = purchases and contributions minus sale proceeds and withdrawals, per month, financial year and calendar year, per person and for all. Moves between shares and MF net out. Split MF into SIP versus other.
SIP tracker from descriptions containing SIP, Systematic or Instalment: fund, monthly amount, day, count, first and last date, next due, and "possibly stopped" if none in 35 days.
5. Alerts
Alerts go to the Alerts tab, a dashboard banner, and a toast on opening the sheet. No email unless Settings says so. Checks: missing Who or Type; unsupported Type; bad, missing or future date; MF fund not in Fund_Master or no code; units x NAV not matching amount beyond tolerance (Settings); share sale larger than the holding at that date; duplicate row (same Who, Type, name, date, units, price, amount); price at or below 0 except bonus; share row without charges; holding with no price; stale NAV or price (older than the last business day, using weekends plus a holiday list in Settings), naming the fund or share and the date; unclassified fund or share; holding differs from Statement_Check; any failed run.
6. Statement_Check and acceptance tests
Statement_Check is my tab. Seed it once, never overwrite it. Seed with these 6-Nov-2026 authenticated statements (Who, Type, Name, Units or Qty, Invested or average price, Market value):
MJ,MF,Axis Small Cap Fund Direct Growth,47.555,6000.00,6264.42
MJ,MF,ICICI Prudential Nifty Midcap 150 Index Fund - Direct Plan - Growth,2023.412,40000.00,40361.20 (folio 507.193 units plus SIP holding 1516.219 units)
MJ,MF,ICICI Prudential Nifty Bank Index Fund - Direct Plan - Growth,925.334,15000.00,15786.38
MJ,MF,ICICI Prudential Nifty IT Index Fund - Direct Plan - Growth,2882.747,30000.00,33877.18
MJ,MF,ICICI Prudential Mid Cap Fund - Growth,340.234,110000.00,111273.53
MJ,MF,ICICI Prudential Nifty Smallcap 250 Index Fund - Direct Plan - Growth,107.196,2000.00,1910.98
MJ,MF,ICICI Prudential Arbitrage Fund - Direct Plan - Growth,201.494,7997.70,8075.23
MJ,MF,ICICI Prudential Nifty Next 50 Index Fund - Direct Plan - Growth,1515.947,100000.00,101120.49
MJ,MF,Invesco India Small Cap Fund - Direct Plan Growth,116.901,6000.00,6392.15
MJ,MF,Kotak Multi Asset Allocation Fund Regular Plan - Growth,3849.493,60000.00,59724.88
MJ,MF,Mirae Asset Large and Midcap Fund - Regular Plan,723.771,110000.00,112947.36
MJ,MF,Mirae Asset Midcap Fund - Regular Plan,2913.100,110000.00,111906.74
MJ,MF,Parag Parikh Flexi Cap Fund - Direct Plan Growth,220.117,20000.00,20679.62
MJ,MF,quant Multi Asset Allocation Fund - Direct Plan,27.904,5000.00,5042.07
MJ,MF,quant Small Cap Fund - Direct Plan,15.898,5000.00,4894.62
MJ,MF,SBI Nifty Next 50 Index Fund - Direct Plan - Growth,11359.735,230000.00,226173.46
MJ,Shares,HDFC Bank,240,727.35 (average price, without charges)
MJ,Shares,Nifty50 ETF,1700,267.27
MJ,Shares,Gold ETF,1500,122.10
MJ,Shares,Next 50 ETF,650,757.96
MJ,Shares,Liquid ETF,100,1107.75
MJ,Shares,Reliance,200,1249.58
JJ,MF,ICICI Prudential Nifty Next 50 Index Fund - Direct Plan - Growth,1046.281,70000.00,69791.65
JJ,MF,ICICI Prudential Nifty Midcap 150 Index Fund - Direct Plan - Growth,474.953,10000.00,9473.93
JJ,MF,ICICI Prudential Nifty 50 Index Fund - Direct Plan Growth,19.507,5000.00,5170.17
JJ,MF,ICICI Prudential Arbitrage Fund - Direct Plan - Growth,125.970,5000.00,5048.47
JJ,MF,ICICI Prudential Gold ETF FOF - Direct Plan - Growth,62.828,3000.00,2820.12
Self_Test tab: run on demand and after each update, one row per test with expected, actual, and PASS or FAIL. Tests: units or quantity equal exactly; MF gross invested within Rs 1; share average price (without charges) within 0.01; MF market value within Rs 1 when the NAV date matches the statement date (use NAV_History); MJ MF invested 856,997.70 and value 866,430.31; JJ MF invested 93,000.00 and value 92,304.34; MJ shares cost about 1,665,440 without charges and about 1,667,065 with charges (within Rs 5), and profit about 68,064 at these statement prices (HDFC Bank 788.25, Gold ETF 120.30, Next 50 ETF 774.78, Liquid ETF 1130.93, Nifty50 ETF 284.22, Reliance 1320.00); Smallcap 250 maps to its own code; no row of Transection was modified.
7. Tabs (system-owned, rebuildable)
Settings (my editable values: stamp duty rate, update hours, analysis starts, holidays, tolerances; seed defaults once), Tax_Rules, Fund_Master, Share_Master, Statement_Check, Prices, NAV_History, Lots, Realised, Holdings, Flows, SIPs, Alerts, Self_Test, Run_Log. Use batch reads and writes, LockService on every writing function, idempotent runs, one MFAPI fetch per fund per run, and stay under the 6-minute limit.
8. Updates
Menu "MJ Portfolio": Update now, Run self test, Install triggers, Show alerts. Time triggers at 07:00 and 18:00 IST (hours in Settings). The dashboard has an Update button that runs the same job.
9. Web app (private)
appsscript.json: V8, Asia/Kolkata, explicit minimal oauthScopes, webapp executeAs USER_DEPLOYING and access MYSELF. No anonymous access and no ALLOWALL framing. Only a whitelist of functions callable from the page; helpers end with an underscore.
One hub shell with a router. Investments is built. Daily Work and Tasks appear as disabled placeholders so more parts can be added later. The page reads precomputed tabs, not raw recalculation.
Every page header shows the four metrics (Total Investment, Current Value, Profit Received/Available, XIRR or CAGR), an as-of NAV or price date, and person (All, MJ, JJ) and period (FY 2025-26, FY 2026-27, CY 2025, CY 2026, all) selectors. A banner shows alert counts.
Pages: Overview (cards, allocation chart, value versus invested over time from NAV_History); Holdings (Group by: Category default, Asset class, Vehicle, Fund house, Plan, Person; groups split Active and Passive; click for the instrument, then its lots with date, qty, price, gross cost, value, absolute return, XIRR, days and tax bucket, then transactions); Allocation; Funds Flow; SIPs; Tax; Transactions; Data Health.
Navigation: an in-page history stack, a Back button always visible, breadcrumbs, and the Backspace key goes back unless focus is in an input.
Mobile first, light and dark, no external libraries (inline SVG charts), gains and losses shown with sign and colour.
10. Delivery
README.md (architecture, tabs, assumptions, how to run tests) and SPEC.md (this text). Commit.
Push with clasp. Then tell me exactly the manual steps, in order: authorise, run Install triggers, run Update now, run Self test, deploy the web app and give me its URL. If you cannot run a function yourself, do not pretend: I will run it and you can ask me to paste the Self_Test results.
Final report: what was built, test results, assumptions, Tax_Rules items marked "Draft - confirm", and anything needing my decision.