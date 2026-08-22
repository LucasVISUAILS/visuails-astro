// VISUAILS — i18n dictionary + helpers.
// English at the root (/), Dutch at /nl. This file holds the SHARED chrome
// strings (nav, footer, conversion bar, common buttons) so the Layout stays
// DRY; page bodies are translated in their own src/pages/nl files.
//
// There is no German site. This header used to claim "German at /de" and
// `support_note` existed to tell German visitors that support is English or
// Dutch only — but `languages` has only ever declared en and nl, so nothing
// ever rendered at /de. The claim is removed rather than left to mislead the
// next person who greps for it. `support_note` stays as an empty string in
// both locales because the Layout renders it conditionally and a per-locale
// notice slot is worth keeping.

// The €1 test-sample figure is read from the price ladder, never typed here.
// src/data/pricing.js is the single source of truth for every euro on the site.
import { TEST_SAMPLE, CATALOG_IMAGES, LIFESTYLE_IMAGES } from '../data/pricing.js';

export const languages = { en: 'English', nl: 'Nederlands' };
export const localeNames = { en: 'EN', nl: 'NL' };
export const ogLocale = { en: 'en_US', nl: 'nl_NL' };
// `export const defaultLang = 'en'` was here and had no consumer — no module
// imported it and nothing in this file read it. The fallback it looked like it
// controlled is actually getLangFromPath()'s own 'en' return, further down;
// re-adding this constant without wiring that function to it would give the
// codebase two defaults that can disagree.

// The Drops menu — href is a language-neutral base path (the Layout localizes
// it with localizedPath); [title, desc] are translated per language below.
//
// This used to be a five-item "Services" list that also carried /models and
// /custom-models. Those two merge into one page under the new positioning
// (see AUDIT-TASK-0.md §D), and Your Brand Model is important enough to sit at
// the top level of the nav rather than inside a dropdown.
//
// ── dropHrefs IS WEG, EN DAT HEEFT EEN REDEN — 9 augustus 2026 ──────────────
//
// Hier stond `export const dropHrefs = ['/catalog', '/lifestyle', '/video']`, en
// Layout.astro reeg die aan de titels vast OP INDEX:
//
//   ui[lang].drops.map((s, i) => ({ href: dropHrefs[i], title: s[0], desc: s[1] }))
//
// Drie parallelle lijsten — één met paden, één met Engelse teksten, één met
// Nederlandse — die alleen goed blijven zolang alle drie in dezelfde volgorde
// staan. Er is geen sleutel die een verschuiving opmerkt: wie een item in het
// midden toevoegt en één van de drie vergeet, krijgt Lifestyle met de url van
// Video en een build die vrolijk doorloopt.
//
// Bij het toevoegen van het vierde item (Hooks) is dat omgezet naar objecten die
// hun eigen `href` dragen. Nu is de volgorde per taal vrij, kan een verschuiving
// niet meer bestaan, en is er ruimte voor `soon` — het label voor een dienst die
// er wel is maar nog niet te bestellen valt.
export const NAV_SOON = 'soon';

// Your Brand Model's live URL. /models used to 301 here (AUDIT-TASK-0.md
// §H·8); as of task #270 it’s a real page of its own again (§H·8's own
// 2026-07-29 addendum), reached from this page's #standard block and from the
// homepage rather than through the nav — see that addendum for why no
// nav_models slot was added here.
export const brandModelHref = '/custom-models';

export const ui = {
  en: {
    // WAS 'Drops', in both the nav and the footer, and that is the label that
    // taught every visitor the word before they reached a page that could
    // explain it. "Drop" already means a collection going live; the studio
    // used it for a work order, and the chrome repeated the collision on all
    // 72 pages. 'What we make' names the menu by its contents instead.
    nav_drops: 'What we make',
    nav_brandmodel: 'Your Brand Model',
    nav_pricing: 'Pricing',
    // Het abonnement kreeg op 20 augustus 2026 een eigen pagina en dus een eigen
    // ingang. Naast Prijzen en niet erin: het zijn twee manieren om te kopen, en
    // een menu dat de tweede verstopt onder de eerste zegt dat hij een detail is.
    nav_plans: 'Plans',
    nav_gallery: 'Gallery',
    nav_contact: 'Contact',
    nav_start: 'Order',
    // Customer accounts (task #257) had no entry point anywhere in the
    // chrome — the dashboard, magic-link login and downloads all existed at
    // /account, reachable only if you already knew the URL. One small text
    // link, not a second CTA button: nav_start is the one door into a new
    // order (see the comment above it in Layout.astro) and this must not
    // compete with it for weight.
    nav_account: 'Log in',
    // No prices here. Section 13 of the brief puts the per-product tier on
    // /pricing, /catalog, /lifestyle and /video only — never in the nav — so
    // these descriptions say what the work is, not what one product costs.
    drops: [
      { href: '/catalog', title: 'Catalog', desc: 'Front, back, detail and on-model, for every product' },
      { href: '/lifestyle', title: 'Lifestyle', desc: 'Your product in a styled scene, ready to post' },
      { href: '/video', title: 'Video', desc: 'Short clips that move, on any product in the order' },
      /* ── MERKMODEL EN ABONNEMENT STAAN NU HIER — 21 augustus 2026 ────────
       *
       * Allebei stonden ze als los item bovenin, naast Prijzen, Galerij en
       * Contact. Dat maakte de bovenbalk zeven items lang en het zei iets wat
       * niet klopt: dat "Wat we maken" niet alles is wat we maken. Een merkmodel
       * en een abonnement zijn precies dat — dingen die je koopt. Ze horen in de
       * lijst met dingen die je koopt.
       *
       * Wat het oplevert: twee items minder in de balk, en één plek waar de
       * vraag "wat kan ik hier bestellen" volledig beantwoord wordt. */
      { href: '/custom-models', title: 'Your Brand Model', desc: 'One face, made for your brand and used by nobody else' },
      { href: '/plans', title: 'Monthly plan', desc: 'A fixed number of products every month, below the per-product rate' },
      /*
       * HOOKS HEEFT GEEN href, EN DAT IS HET HELE PUNT — 9 augustus 2026.
       *
       * Lucas: *"Verberg de pagina voor nu (…) maar post hem voor nu wel alvast
       * tussen de services als knop die niet werkt met een label erbij dat deze
       * nog niet klaar is."*
       *
       * Er was een /hooks-pagina en die is weg. Dit item blijft staan, want een
       * dienst die je aankondigt hoort in het menu waar je diensten staan — maar
       * zonder href, en Layout.astro tekent hem daarom als een uitgeschakeld
       * menu-item in plaats van als een link.
       *
       * WAAROM NIET GEWOON WEGLATEN TOT DE PAGINA ER IS. Omdat dat de vraag
       * "wat maken jullie" met een half antwoord laat staan. Zie de kop van
       * HoldingPage.astro: een gat dat een bezoeker kan zien, is erger dan een
       * onafgemaakt ding dat zegt wat het is.
       */
      { title: 'Hooks', desc: 'Not ready yet — a short video on a proven format, soon', soon: true },
      /* EDITIONS — aangekondigd op 18 augustus 2026, zelfde behandeling als
         Hooks: in het menu waar de diensten staan, zonder href, en Layout.astro
         tekent hem daarom als uitgeschakeld menu-item.

         De naam staat op TWEE plekken: hier, en in svcSoonList in
         HomeV2.astro. Verandert hij, dan hier ook. Waarom juist dit woord staat
         voluit bij dat object; kort: het idee komt uit STOCK-IDEE.md, en dat
         document laat zien dat "stock" de vergelijking opzoekt die je verliest
         terwijl een editie precies zegt wat het is — een oplage, gedateerd en
         voor deze maand gemaakt. */
      { title: 'Editions', desc: 'Not ready yet — a set of images made for your brand, every month', soon: true },
    ],
    /*
     * ── DE TWEEDE LAAG, 18 AUGUSTUS 2026 ──────────────────────────────────
     *
     * De site had 36 routes en zes plekken in het menu. Alles wat niet paste,
     * belandde in de voettekst: vijfentwintig links in vier kolommen, zonder
     * rangorde. Acht pagina's van gewicht bestonden alléén daar, en twee —
     * /models en /upload-guidelines — hadden helemaal geen plek en waren alleen
     * te vinden als zin in een alinea. /demo had nul inkomende links.
     *
     * Sorteer je die 36 routes op functie, dan zijn er vier lagen: wat we maken,
     * HOE HET WERKT, wat het kost, en wie we zijn. De tweede ontbrak in de
     * navigatie, terwijl het de laag is die het bezwaar wegneemt — en dit
     * verkoopt aan merken die volgens PRODUCT.md *"sceptisch in plaats van
     * nieuwsgierig"* aankomen.
     *
     * Vandaar één ingang erbij in plaats van tien losse links. Geen enkele URL
     * verandert, dus er gaat geen enkele vindbaarheid verloren; wat verandert is
     * dat deze pagina's te vinden zijn zonder naar beneden te scrollen.
     *
     * DE VOLGORDE IS DIE VAN EEN BESTELLING en niet alfabetisch: eerst wat er
     * gebeurt, dan waar je het ziet, dan waarmee het gemaakt wordt, dan de
     * vergelijking, dan de verantwoording.
     */
    nav_how: 'How it works',
    how: [
      { href: '/how-it-works', title: 'From order to delivery', desc: 'The four steps, and the two you are in' },
      { href: '/demo', title: 'See an order run', desc: 'Walk through one, screen by screen' },
      { href: '/studio', title: 'How an order is run', desc: 'The studio day, the calendar, the capacity' },
      { href: '/portal', title: 'VISUAILS Studio', desc: 'Where your work lands, and how you approve it' },
      { href: '/models', title: 'The models', desc: 'The ten faces included in every order' },
      { href: '/upload-guidelines', title: 'Sending your photos', desc: 'What we need, and what a phone can do' },
      /* ── TWEE ERAF, EN ALLEBEI NAAR EEN BETERE PLEK — 21 augustus 2026 ────
       *
       * Acht items in één lade is een lijst waarin je zoekt, en twee ervan
       * hoorden hier inhoudelijk niet:
       *
       *   /compare  is een vergelijking van GELD — een shootdag tegen een
       *             bestelling. Die overtuigt naast de prijzen en niet naast
       *             "hoe het werkt", dus staat hij nu op /pricing én in de
       *             voettekst.
       *   /ai-act   is een verantwoording, geen processtap. Die staat nu in de
       *             juridische regel onderaan, bij privacy en voorwaarden,
       *             waar een lezer dat soort verklaringen zoekt.
       *
       * Geen enkele URL verandert en geen van beide raakt een link kwijt — ze
       * verhuizen naar de plek waar iemand ze zoekt in plaats van naar de plek
       * waar ze toevallig pasten. */
    ],
    nav_soon: 'Soon',
    mob_chat: 'Chat on WhatsApp',
    mob_notsure: 'Not sure yet?',
    mob_try: `Try a test sample · ${TEST_SAMPLE.en.price}`,
    foot_tagline: 'The visual studio for clothing brands and modern e-commerce — for founders who would rather grow than book another shoot.',
    // De knop in de merkkolom van de voettekst. Kort, want hij staat naast drie
    // kolommen links en moet als handeling lezen en niet als vierde lijst.
    foot_cta: 'Start an order',
    foot_drops: 'What we make',
    foot_brandmodel: 'Your Brand Model',
    foot_aiact: 'AI Act',
    foot_company: 'Company',
    foot_touch: 'Get in touch',
    foot_about: 'About',
    foot_how: 'How it works',
    foot_portal: 'VISUAILS Studio',
    foot_studio: 'How an order is run',
    foot_guides: 'Guides',
    // /compare is now "a shoot day, or a drop" (AUDIT §F). The AI-tools
    // argument still lives on that page at #ai-tools and in its <title>, so
    // the search intent is not lost — but the footer label names the primary
    // comparison, which is the one a brand is actually weighing.
    foot_compare: 'Shoot day vs VISUAILS',
    foot_sample: `Test sample · ${TEST_SAMPLE.en.price}`,
    foot_gallery: 'Gallery',
    foot_pricing: 'Pricing',
    foot_plans: 'Plans',
    foot_faq: 'FAQ',
    foot_contact: 'Contact',
    foot_privacy: 'Privacy',
    foot_terms: 'Terms of Service',
    foot_dpa: 'Data processing',
    foot_cookies: 'Cookies',
    // ---- cookie consent (section 19) ---------------------------------------
    // Deliberately plain. A banner that explains itself in one sentence and
    // offers two equal buttons is both the lawful shape and the one that gets
    // read; the "we value your privacy" preamble is neither.
    // The mobile drawer's close button. It was an inline aria-label in
    // Layout.astro and so shipped as English on all 36 NL pages — the only
    // untranslated string left in the tree.
    nav_primary: 'Primary',
    nav_open: 'Open menu',
    cb_region: 'Quick start',
    cb_dismiss: 'Dismiss',
    cmp_drag: 'Drag to compare before and after',
    nav_close: 'Close menu',
    /* Het merkteken in de mobiele lade is sinds 21 augustus een link naar huis;
       dit is het label dat een schermlezer voorleest. */
    nav_home: 'VISUAILS home',
    nav_skip: 'Skip to content',
    cc_title: 'Cookies on this site',
    cc_body: 'We use only what the site needs to work. Nothing that measures you is switched on unless you say so.',
    cc_accept: 'Accept analytics',
    cc_reject: 'Only what is necessary',
    cc_manage: 'Choose per purpose',
    cc_policy: 'Cookie Policy',
    cc_prefs_title: 'Cookie preferences',
    cc_prefs_intro: 'Necessary cookies keep you signed in and remember this choice. They cannot be switched off, and they are all the site sets today.',
    cc_nec_h: 'Necessary',
    cc_nec_n: 'Sign-in sessions for VISUAILS Studio and for the admin side, and this preference itself. Always on.',
    cc_ana_h: 'Analytics',
    cc_ana_n: 'Anonymous, cookieless page counts so we can see which pages are read. Off unless you turn it on, and nothing loads until you do.',
    cc_always: 'Always on',
    cc_save: 'Save my choice',
    cc_cancel: 'Back',
    cc_reopen: 'Cookie preferences',
    /* cc_changed ('Saved.' / 'Opgeslagen.') was here in both locales. The
       consent banner never rendered it — nothing called t('cc_changed') in
       any component, script or page. */
    foot_location: 'Enschede, Netherlands',
    /*
     * ── DE BALK IS EEN KNOP MET EEN NOOT, GEEN ALINEA (9 augustus 2026) ───────
     *
     * Lucas: *"de test sample pop up is veel te lang. Maak het vergelijkbaar met
     * de Request a test sample knop en een kleine note eronder."*
     *
     * Hier stond een zin van dertig woorden op één regel, en `white-space: nowrap`
     * in de opmaak maakte de balk daarmee bijna zo breed als het scherm. Een
     * element dat ongevraagd over je pagina schuift, moet in één oogopslag te
     * lezen zijn en anders weg te klikken; dertig woorden zijn geen oogopslag.
     *
     * `cb_cta` heette "One product in full · €1". Dat las als een productnaam en
     * niet als een handeling, en het is bovendien dezelfde knop die op /pricing en
     * op de homepage "Request a test sample · €1" heet. Eén handeling hoort overal
     * hetzelfde te heten, anders lijkt het iets anders.
     *
     * De noot noemt nu WAT je krijgt in plaats van te herhalen dat je iets moet
     * opsturen: vier beelden of een carousel van drie. Dat is het concrete ding —
     * "één product volledig" is een omschrijving van diezelfde beelden waar je
     * niets aan hebt tot je weet hoeveel het er zijn.
     *
     * ── ÉÉN ZIN, OP ÉÉN REGEL (9 augustus 2026, tweede ronde) ────────────────
     *
     * Lucas: *"maak de note 1 zin. De pop up mag wel iets langer zijn maar niet te
     * lang."* De balk staat nu op één rij — teken, zin, knop, kruisje — zoals een
     * promobalk hoort te staan, en dan mag de zin niet afbreken. Vandaar dat het
     * product vooropstaat en de opsomming erachter: "Je eigen product als …" is
     * één mededeling, terwijl "… , van je eigen product" een bijstelling was die
     * op een tweede regel belandde.
     */
    // \u00A0 tussen "of" en het getal: text-wrap:balance brak de regel precies
    // daar af, en "a carousel of" met de 3 op de volgende regel leest als een
    // onafgemaakte zin. Een harde spatie houdt ze bij elkaar zonder de balans
    // uit te zetten.
    cb_note: `Your own product as ${TEST_SAMPLE.en.deliverable}.`,
    cb_cta: `Request a test sample · ${TEST_SAMPLE.en.price}`,
    wa_launcher_label: 'WhatsApp',
    wa_launcher_aria: 'Message VISUAILS on WhatsApp — opens in a new tab',
    lang_label: 'Language',
    support_note: '',
  },
  nl: {
    nav_drops: 'Wat we maken',
    nav_brandmodel: 'Jouw merkmodel',
    nav_pricing: 'Prijzen',
    nav_plans: 'Abonnementen',
    nav_gallery: 'Galerij',
    nav_contact: 'Contact',
    nav_start: 'Bestellen',
    nav_account: 'Inloggen',
    drops: [
      { href: '/catalog', title: 'Catalog', desc: 'Voorkant, achterkant, detail en on-model, voor elk product' },
      { href: '/lifestyle', title: 'Lifestyle', desc: 'Je product in een gestylede scène, klaar om te posten' },
      { href: '/video', title: 'Video', desc: 'Korte clips met beweging, op elk product in de bestelling' },
      /* Zie de noot bij de Engelse lijst hierboven: alles wat je koopt, staat
         in het menu waar staat wat we maken. */
      { href: '/custom-models', title: 'Jouw merkmodel', desc: 'Eén gezicht, voor jouw merk gemaakt en door niemand anders gebruikt' },
      { href: '/plans', title: 'Abonnement', desc: 'Elke maand een vast aantal producten, onder het tarief per product' },
      { title: 'Hooks', desc: 'Nog niet klaar — een korte video op een bewezen format, binnenkort', soon: true },
      { title: 'Editions', desc: 'Nog niet klaar — elke maand een set beelden op jouw merk, binnenkort', soon: true },
    ],
    nav_how: 'Hoe het werkt',
    how: [
      { href: '/how-it-works', title: 'Van bestelling tot levering', desc: 'De vier stappen, en de twee waar jij in zit' },
      { href: '/demo', title: 'Zie een bestelling draaien', desc: 'Loop er \u00e9\u00e9n door, scherm voor scherm' },
      { href: '/studio', title: 'Hoe een bestelling draait', desc: 'De studiodag, de kalender, de capaciteit' },
      { href: '/portal', title: 'VISUAILS Studio', desc: 'Waar je werk landt, en hoe je het goedkeurt' },
      { href: '/models', title: 'De modellen', desc: 'De tien gezichten die bij elke bestelling horen' },
      { href: '/upload-guidelines', title: 'Je foto\u2019s aanleveren', desc: 'Wat we nodig hebben, en wat een telefoon kan' },
      /* /compare staat nu op de prijzenpagina en /ai-act in de juridische regel
         onderaan — zie de noot bij de Engelse lijst. */
    ],
    nav_soon: 'Binnenkort',
    mob_chat: 'Chat via WhatsApp',
    mob_notsure: 'Nog niet zeker?',
    mob_try: `Probeer een proefvisual · ${TEST_SAMPLE.nl.price}`,
    foot_tagline: 'De studio voor productvisuals voor kledingmerken en moderne e-commerce — voor ondernemers die liever groeien dan nóg een fotoshoot boeken.',
    foot_cta: 'Start een bestelling',
    foot_drops: 'Wat we maken',
    foot_brandmodel: 'Jouw merkmodel',
    foot_aiact: 'AI Act',
    foot_company: 'Bedrijf',
    foot_touch: 'Contact',
    foot_about: 'Over ons',
    foot_how: 'Hoe het werkt',
    foot_portal: 'VISUAILS Studio',
    foot_studio: 'Hoe een bestelling draait',
    foot_guides: 'Gidsen',
    foot_compare: 'Shootdag vs VISUAILS',
    foot_sample: `Proefvisual · ${TEST_SAMPLE.nl.price}`,
    foot_gallery: 'Galerij',
    foot_pricing: 'Prijzen',
    foot_plans: 'Abonnementen',
    foot_faq: 'FAQ',
    foot_contact: 'Contact',
    foot_privacy: 'Privacy',
    foot_terms: 'Algemene voorwaarden',
    foot_dpa: 'Verwerkersovereenkomst',
    foot_cookies: 'Cookies',
    nav_primary: 'Hoofdnavigatie',
    nav_open: 'Menu openen',
    cb_region: 'Snel starten',
    cb_dismiss: 'Sluiten',
    cmp_drag: 'Sleep om voor en na te vergelijken',
    nav_close: 'Menu sluiten',
    nav_home: 'VISUAILS home',
    nav_skip: 'Naar de inhoud',
    cc_title: 'Cookies op deze site',
    cc_body: 'We gebruiken alleen wat de site nodig heeft om te werken. Niets dat jou meet staat aan, tenzij je dat zelf zegt.',
    cc_accept: 'Analytics accepteren',
    cc_reject: 'Alleen het noodzakelijke',
    cc_manage: 'Kies per doel',
    cc_policy: 'Cookiebeleid',
    cc_prefs_title: 'Cookievoorkeuren',
    cc_prefs_intro: 'Noodzakelijke cookies houden je ingelogd en onthouden deze keuze. Ze kunnen niet uit, en meer plaatst de site vandaag niet.',
    cc_nec_h: 'Noodzakelijk',
    cc_nec_n: 'Inlogsessies voor VISUAILS Studio en voor het adminportaal, en deze voorkeur zelf. Staat altijd aan.',
    cc_ana_h: 'Analytics',
    cc_ana_n: 'Anonieme, cookieloze paginatellingen zodat we zien welke pagina\u2019s gelezen worden. Staat uit tenzij jij hem aanzet, en er laadt niets voordat je dat doet.',
    cc_always: 'Staat altijd aan',
    cc_save: 'Keuze opslaan',
    cc_cancel: 'Terug',
    cc_reopen: 'Cookievoorkeuren',
    foot_location: 'Enschede, Nederland',
    cb_note: `Je eigen product als ${TEST_SAMPLE.nl.deliverable}.`,
    cb_cta: `Vraag een proefvisual aan · ${TEST_SAMPLE.nl.price}`,
    wa_launcher_label: 'WhatsApp',
    wa_launcher_aria: 'Stuur VISUAILS een bericht via WhatsApp — opent in een nieuw tabblad',
    lang_label: 'Taal',
    support_note: '',
  },
};

export function getLangFromPath(pathname) {
  const seg = (pathname || '/').split('/')[1];
  return seg === 'nl' ? 'nl' : 'en';
}

// Strip a leading /nl, returning the language-neutral base path ('/...').
export function stripLang(pathname) {
  const seg = (pathname || '/').split('/')[1];
  if (seg === 'nl') {
    const rest = pathname.slice(3);
    return rest === '' ? '/' : rest;
  }
  return pathname || '/';
}

// Build a localized URL for a language-neutral base path.
//
// ── DE SLASH AAN HET EIND, 22 AUGUSTUS 2026 ──────────────────────────────────
// De site bouwt met build.format: 'directory', dus /about staat op schijf als
// /about/index.html. Cloudflare Pages serveert dan /about niet: het antwoordt
// met een 308 naar /about/. Elke interne klik kostte daarmee een extra
// heen-en-weer naar het netwerk voordat er ook maar één byte pagina kwam, en
// dat gold voor 5.911 links — praktisch iedere link op de site, want de
// letterlijke paden in de kopij ('/pricing', '/catalog/classic') zijn allemaal
// zonder slash geschreven.
//
// Erger dan de vertraging was dat de site zichzelf tegensprak: de canonical en
// de hreflang-paren stonden er wél mét slash in (die worden uit Astro's eigen
// pathname gebouwd), dus elke pagina wees een zoekmachine naar /about/ terwijl
// elke link op diezelfde pagina naar /about ging.
//
// Het antwoord hoort hier en niet in de kopij: dit is de enige plek waar een
// intern pad wordt samengesteld, dus één regel dekt alle 5.911. Een pad dat al
// een slash heeft blijft ongemoeid (Astro's eigen base komt zo binnen), en een
// pad dat naar een bestand wijst krijgt er geen — /favicon.ico blijft
// /favicon.ico. Een #anker of een ?vraag wordt eerst afgeknipt en er daarna
// weer achter gezet, zodat lp('/compare#ai-tools') /compare/#ai-tools wordt en
// niet /compare#ai-tools/.
//
// NIET voor de functieroutes: /account, /api, /o en /admin zijn Pages
// Functions en geen mappen op schijf. Die staan overal als letterlijke string
// in de markup en komen hier niet langs — zie de noten bij de accountlink in
// Layout.astro.
export function localizedPath(lang, path) {
  const clean = path === '' ? '/' : path;
  const voorvoegsel = lang === 'en' ? '' : `/${lang}`;
  const staart = clean.search(/[#?]/);
  const kaal = staart === -1 ? clean : clean.slice(0, staart);
  const rest = staart === -1 ? '' : clean.slice(staart);
  const bestand = /\.[a-z0-9]{2,5}$/i.test(kaal.split('/').pop() || '');
  const metSlash = kaal === '' || kaal === '/' ? '/' : (kaal.endsWith('/') || bestand ? kaal : `${kaal}/`);
  if (metSlash === '/') return `${voorvoegsel}/${rest}`;
  return `${voorvoegsel}${metSlash}${rest}`;
}

export function useTranslations(lang) {
  const dict = ui[lang] || ui.en;
  return (key) => (dict[key] !== undefined ? dict[key] : (ui.en[key] !== undefined ? ui.en[key] : key));
}
