// Waar sluit een CSS-blokcommentaar eerder af dan de schrijver bedoelde?
//
// Dubbele sterretjes zijn in dit project de gewone nadrukvorm in commentaar, en
// twee sterretjes gevolgd door een schuine streep sluiten een blokcommentaar af.
// Alles erna wordt als CSS gelezen, de parser slaat door tot hij zich herstelt,
// en de regels daartussen bestaan niet meer. Zonder foutmelding.
//
// ALLEEN CSS. In JavaScript is dezelfde val een syntaxfout — luid, meteen, bij de
// eerste run. In CSS is het stil, en dat is precies het verschil dat een toets
// rechtvaardigt.
//
// Deze kop staat in REGELcommentaar: de eerste versie stond in een blokcommentaar
// en viel om op zijn eigen voorbeeld.

/** Elke blokcommentaar-sluiting in deze CSS, met de tekst eromheen. Strings
 *  worden overgeslagen, anders leest `url('a/*b')` als een commentaar. */
export function sluitingen(css) {
  const uit = [];
  let i = 0;
  while (i < css.length) {
    const c = css[i];
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < css.length) {
        if (css[j] === '\\') { j += 2; continue; }
        if (css[j] === c) { j += 1; break; }
        j += 1;
      }
      i = j;
      continue;
    }
    if (c === '/' && css[i + 1] === '*') {
      const eind = css.indexOf('*/', i + 2);
      if (eind === -1) { uit.push({ pos: i, nietGesloten: true }); break; }
      uit.push({ pos: eind, voor: css[eind - 1], na: css.slice(eind + 2, eind + 3), start: i });
      i = eind + 2;
      continue;
    }
    i += 1;
  }
  return uit;
}

/** De verdachte sluitingen: een sterretje ervóór en direct tekst erna. */
export function verdacht(css) {
  return sluitingen(css).filter((s) => s.nietGesloten
    || (s.voor === '*' && s.na && !/[\s;{}]/.test(s.na)));
}
