/**
 * MJ Portfolio — Operational Entry Points & Legacy Compatibility
 * Exposes standard wrappers for menu and scheduled triggers.
 */

function setupMFPortfolio() {
  return runUpdateNow();
}

function updateMFPortfolio() {
  return runUpdateNow();
}

function rebuildAnalysis() {
  return runUpdateNow();
}

function installDailyUpdate() {
  return installDailyTriggers();
}
