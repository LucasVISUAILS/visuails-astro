/* Alleen het toetsenbord: hulpjes voor klanttype 13. */
export async function focusInfo(page) {
  return page.evaluate(() => {
    const e = document.activeElement;
    if (!e || e === document.body) return { tag: 'body' };
    const cs = getComputedStyle(e);
    const ring = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || (cs.boxShadow && cs.boxShadow !== 'none');
    /* Een verborgen radio/checkbox draagt de ring vaak op zijn label of kaart. */
    let ouderRing = false;
    if (!ring) {
      let p = e.parentElement;
      for (let i = 0; i < 4 && p; i++, p = p.parentElement) {
        const c = getComputedStyle(p);
        if ((c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) > 0) || (c.boxShadow && c.boxShadow !== 'none' && /focus|:has/.test('x'))) { ouderRing = true; break; }
      }
    }
    const r = e.getBoundingClientRect();
    const label = (e.getAttribute('aria-label') || e.labels?.[0]?.innerText || e.innerText || e.value || e.name || '').trim().replace(/\s+/g, ' ').slice(0, 50);
    return { tag: e.tagName.toLowerCase(), type: e.type || '', name: e.name || '', label, ring, ouderRing, zichtbaar: r.width > 0 && r.height > 0, inBeeld: r.bottom > 0 && r.top < innerHeight };
  });
}
export async function tabNaar(page, test, { max = 120, terug = false, log = null, arg = null } = {}) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press(terug ? 'Shift+Tab' : 'Tab');
    const f = await focusInfo(page);
    if (log) log.push(f);
    if (await page.evaluate(test, arg)) return f;
  }
  throw new Error('niet bereikt met Tab: ' + test.toString().slice(0, 120));
}
