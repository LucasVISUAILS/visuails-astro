/* VISUAILS — de meter die "te dicht" en "scheef" vindt, als één functie.
 *
 * Hij stond in kladblok/te-dicht.mjs en moest daar weg op het moment dat
 * VISUAILS Studio en /admin er ook langs moesten: die twee draaien niet op de
 * statische dist maar in de Worker, dus ze hebben een eigen opstelling nodig
 * en niet een eigen meter. Twee meters die uit elkaar lopen, meten twee
 * verschillende dingen en je merkt het pas als de uitkomsten niet meer
 * kloppen.
 *
 * Deze functie draait IN DE PAGINA (page.evaluate), dus hij mag niets van
 * buiten zich gebruiken. Alle keuzes en hun onderbouwing staan als noot in de
 * functie zelf — dat is waar ze te lezen zijn op het moment dat iemand zich
 * afvraagt waarom een melding er wel of niet staat.
 */
export function meetDicht() {
      const zichtbaar = (el) => {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.2) return false;
        const r = el.getBoundingClientRect();
        return r.width > 2 && r.height > 2;
      };
      /* ── WAT TELT ALS BUUR, EN WAAROM DE EERSTE VERSIE ONBRUIKBAAR WAS ──
         De eerste versie vond 202 plekken op drie pagina's, en bijna allemaal
         waren ze goed: "€69" met "per clip · excl. btw" 3px eronder is geen
         fout maar één ding — een getal met zijn onderschrift. Zo ook een
         stapnummer met zijn titel, en een naam met zijn regel.

         Een meter die goede typografie afkeurt, wordt genegeerd, en dan vangt
         hij ook de echte fouten niet meer. Dus: alleen BLOKKEN tellen als
         buur — een alinea, een kop, een lijst, een figuur, een knoppenrij —
         en nooit een inline label bij zijn waarde. */
      const BLOK = 'p, h1, h2, h3, h4, ul, ol, figure, img, table, form, .acties, .knop, .btn';
      const isBlok = (el) => {
        if (!el.matches(BLOK)) return false;
        const d = getComputedStyle(el).display;
        return d !== 'inline' && d !== 'contents';
      };
      /* Wat BINNEN een nagebouwd scherm staat, telt niet mee. De figuren op
         /studio en /how-it-works tekenen een interface na — een berichtje, een
         kalenderrij, een statusregel — en daar is 6px tussen twee regels
         precies wat een interface doet. De meter gaat over de PAGINA. */
      /* ── EN HET LAPTOPSCHERM OOK NIET — 20 september 2026 ───────────────
         Dezelfde reden, één laag dieper. De carrousel op de voorpagina en de
         dienstpagina's tekent de PRODUCTPAGINA VAN DE KLANT na: een kruimelpad,
         een productnaam, een prijs, vier gallerijvakjes die elkaar raken. Dat
         is geen VISUAILS-typografie maar een nabootsing van een webshop, en
         een webshop zet zijn prijs twee pixels onder zijn productnaam.

         Gemeten voor deze uitzondering: 40 van de 88 meldingen kwamen hier
         vandaan, op zeven pagina's, en geen ervan was te repareren zonder de
         nabootsing minder echt te maken. Een meter die veertig keer iets
         aanwijst dat goed is, wordt niet meer gelezen — zie de noot hierboven
         over de eerste versie met 202 meldingen. */
      const chroom = (el) => el.closest('header, nav, footer, [data-cookie], .cookie, .cc, [data-pk], .pk, figure[class^="fg"], figure[class*=" fg"], .fb, [class^="fb-"], .lc, [class^="lc-"], [class*=" lc-"]');
      const naam = (el) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}`;
      const kort = (el) => (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40);

      const alles = [...document.querySelectorAll('main *')].filter((el) => zichtbaar(el) && !chroom(el) && isBlok(el));

      const dicht = [];
      const scheef = [];
      for (const el of alles) {
        const ouder = el.parentElement;
        if (!ouder) continue;
        const ouderStijl = getComputedStyle(ouder);
        const rij = (ouderStijl.display === 'flex' && ouderStijl.flexDirection.startsWith('row'))
          || ouderStijl.display === 'grid';
        const broers = [...ouder.children].filter((b) => b !== el && zichtbaar(b) && isBlok(b));
        const a = el.getBoundingClientRect();
        for (const b of broers) {
          const r = b.getBoundingClientRect();
          const overlapX = Math.min(a.right, r.right) - Math.max(a.left, r.left);
          if (overlapX < Math.min(a.width, r.width) * 0.5) {
            /* Naast elkaar in dezelfde rij: dan horen ze op één lijn te
               beginnen. Alleen als de ouder ook echt een rij IS — twee
               absoluut geplaatste dingen die toevallig naast elkaar staan,
               zeggen niets. */
            /* En ze moeten elkaar VERTICAAL overlappen: staat de tweede
               helemaal onder de eerste, dan is de rij afgebroken (flex-wrap
               op een telefoon) en is dat geen scheve uitlijning maar precies
               wat afbreken hoort te doen. */
            const overlapY = Math.min(a.bottom, r.bottom) - Math.max(a.top, r.top);
            /* ── EEN GECENTREERDE RIJ IS NIET SCHEEF ────────────────────────
               8 september 2026. `align-items: center` op de ouder is geen
               ongeluk maar een keuze: twee beelden met een andere verhouding,
               of een alinea van twee regels naast één knop, horen dan op hun
               MIDDEN uit te lijnen en niet op hun bovenkant. De meter zag daar
               215px en 9px "scheef" en had in allebei de gevallen ongelijk.
               Wat wél fout kan zijn in zo'n rij — twee ONDERSCHRIFTEN die
               daardoor op verschillende hoogtes eindigen — is een andere meting
               en hoort niet met deze te worden verward; die is opgelost in
               stijl22.css door de figuren te laten strekken. */
            /* Gecentreerd óf op de basislijn: allebei zijn het een KEUZE om
               niet op de bovenkant uit te lijnen, en bij een basislijn hoort dat
               zelfs zo — twee tekstgroottes naast elkaar hebben dan per definitie
               een andere bovenkant, en dat is precies wat je wilt. De meter
               meldde daar 3px "scheef" op een kop met een bijzin ernaast. */
            const mid = (x) => /^(center|safe center|baseline|first baseline|last baseline)$/.test(x);
            /* Ook als de ouder strekt maar één van de twee zichzelf centreert
               — de gele draad tussen de twee studiobeelden doet precies dat. */
            const gecentreerd = mid(ouderStijl.alignItems)
              || mid(getComputedStyle(el).alignSelf) || mid(getComputedStyle(b).alignSelf);
            if (rij && !gecentreerd && overlapY > 4 && Math.abs(a.top - r.top) > 2 && a.top < r.top) {
              scheef.push(`${naam(el)} en ${naam(b)} beginnen ${Math.round(Math.abs(a.top - r.top))}px uit elkaar — "${kort(el)}"`);
            }
            continue;
          }
          /* ── DE UITZONDERING VOOR OPSCHRIFTEN IS INGETROKKEN ───────────
             20 september 2026. Hier stond dat een opschrift dicht op zijn kop
             HOORT: `<p class="mono">Catalog</p>` zes pixels boven
             `<h2>Op je productpagina</h2>` was volgens deze meter goed, en tien
             van de achttien meldingen werden ermee weggestreept.

             Lucas, met de site voor zich: *"per element te kijken waar te weinig
             ruimte zit tussen teksten, blokken en andere elementen omdat ik deze
             nog best vaak tegenkom zoals tussenlijnen waar tekst gelijk onder
             staat, en WENKBRAUWEN DIE GELIJK OP DE KOP STAAN, alles moet rustig
             ogen dus ook whitespace bevatten."*

             Dat is precies het geval dat deze uitzondering wegstreepte. De
             aanname erachter — een opschrift en zijn kop zijn één ding, dus
             mogen ze tegen elkaar aan — klopt voor de LEESRICHTING maar niet
             voor de rust: bij een kop van dertig pixels is zes pixels geen
             paar meer maar een botsing. De ondergrens is dus voor iedereen
             dezelfde acht, en wat daar nu uit komt is gerepareerd in plaats van
             vrijgesteld. */
          const gat = r.top - a.bottom;
          if (gat >= 0 && gat < 8) {
            dicht.push(`${Math.round(gat)}px tussen ${naam(el)} en ${naam(b)} — "${kort(el)}" / "${kort(b)}"`);
          }
        }
      }
      const uniek = (l) => [...new Set(l)];
      return { dicht: uniek(dicht), scheef: uniek(scheef) };
    }
