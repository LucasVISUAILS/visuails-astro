/**
 * vis_in in de browsertoetsen — 15 oktober 2026 (afvinklijst 31, v31-me = a).
 *
 * Sinds levering 52 vraagt de site /account/me alleen als het cookie vis_in=1
 * er staat (het inloggen zet het; zie src/data/cookies.js). De toetsen die een
 * ingelogde klant nadoen met een nep-antwoord op /account/me (page.route), zetten
 * geen echte sessie en dus ook geen vis_in. Deze helper zet hem in elk tabblad
 * van de browser, zodat de pagina weer vraagt, zoals voorheen; het nep-antwoord
 * beslist dan of er iemand is ingelogd. Wat er zonder vis_in gebeurt (geen vraag,
 * geen 401), staat in tests/abo-qa-52-browser.test.mjs.
 */
export function metVisIn(browser) {
  const nieuweContext = browser.newContext.bind(browser);
  browser.newContext = async (opties) => {
    const ctx = await nieuweContext(opties);
    await ctx.addInitScript(() => { try { document.cookie = 'vis_in=1; path=/'; } catch { /* geen cookies: dan niet */ } });
    return ctx;
  };
  browser.newPage = async (opties) => (await browser.newContext(opties)).newPage();
  return browser;
}
