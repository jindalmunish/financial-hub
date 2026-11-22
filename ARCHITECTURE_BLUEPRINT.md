# MJ Financial & Client Portal — Architecture Blueprint & Memory

This document stores the complete architecture, decisions, and recommendations for the Multi-Client SaaS, Decentralized Google Drive Sovereignty, Domain & Infrastructure Strategy.

---

## 1. Core Vision & Requirements
- **Unified Master Hub**: Single web portal with top navigation menu:
  - 📊 **Portfolio Hub** (Family tracker: Net Worth, Allocations, Heatmaps, Split Cards, Ledger, PPF switch)
  - 📈 **Market Depth** (Indian market valuation barometer, 10-year percentiles, valuation regimes)
  - ➕ **Client Dashboards / Future Tools** (Modular routing for adding more dashboards)
- **Source Code Privacy**: Code stays 100% PRIVATE on GitHub (`jindalmunish` private repo).
- **Client Data Sovereignty (Zero Data Retention)**:
  - Each client's data lives exclusively in their own Google Drive / Google Sheets.
  - Zero centralized database to maintain; zero data liability; GDPR/privacy compliant.
- **Authentication**: Sign in with Google (GIS OAuth 2.0).
  - Only whitelisted Gmail addresses can enter and view their specific Sheet.
- **One Domain Strategy**:
  - `yourcompany.com/` ➔ Public company website (indexed on Google).
  - `yourcompany.com/portal` ➔ Secure client portal (blocked from Google search indexing with `noindex` and `robots.txt`).

---

## 2. Technical Architecture & Security

### Why Google Identity Services (GIS) over pure Apps Script:
In Google Apps Script, `Session.getActiveUser().getEmail()` returns an empty string `""` for consumer `@gmail.com` accounts due to anti-fingerprinting restrictions. 
**Solution**: Use Google Identity Services (GIS) Web SDK on the frontend. It returns a cryptographically signed JWT confirming the verified Gmail address.

### 3-Layer Client Privacy & Isolation:
1. **Layer 1 — Identity Gate**: App verifies Gmail against an encrypted authorization list. Non-whitelisted users receive `403 Access Denied`.
2. **Layer 2 — Roster Obfuscation**: Client A's session only receives Client A's Sheet ID; other clients are never exposed in code.
3. **Layer 3 — Google Drive IAM Boundary**: Because Client B's sheet is in Client B's Google Drive, Google's API physically rejects any unauthorized access attempt.

---

## 3. Domain & Hosting Decisions
- **Domain Purchase**:
  - **Do NOT lock in 10 years upfront.** Buy for **1 Year with Auto-Renew**.
  - Wholesale `.com` price hikes are capped at 7%/year by ICANN. Pre-paying locks up capital without savings.
  - Buy at **Cloudflare Registrar** or **Porkbun** (~$10.44/yr at cost, zero markup, free WHOIS privacy). Avoid GoDaddy/Squarespace.
- **Hosting Platform**:
  - Deploy private GitHub repo to **Cloudflare Pages** (100% Free).
  - **Unlimited Bandwidth & Requests** (No surprise billing).
  - Up to 50 active users free via Cloudflare Zero Trust.
  - Free automated SSL certificates.
- **Total Operating Cost**: **~$10.44 / year (~₹900/yr)** all-inclusive.

---

## 4. Associated PDF Document
- **PDF File**: `MJ_Financial_Hub_Architecture_Blueprint.pdf` located in the root workspace.
