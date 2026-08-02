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

// The €0.99 test-sample figure is read from the price ladder, never typed here.
// src/data/pricing.js is the single source of truth for every euro on the site.
import { TEST_SAMPLE } from '../data/pricing.js';

export const languages = { en: 'English', nl: 'Nederlands' };
export const localeNames = { en: 'EN', nl: 'NL' };
export const ogLocale = { en: 'en_US', nl: 'nl_NL' };
export const defaultLang = 'en';

// The Drops menu — href is a language-neutral base path (the Layout localizes
// it with localizedPath); [title, desc] are translated per language below.
//
// This used to be a five-item "Services" list that also carried /models and
// /custom-models. Those two merge into one page under the new positioning
// (see AUDIT-TASK-0.md §D), and Your Brand Model is important enough to sit at
// the top level of the nav rather than inside a dropdown.
export const dropHrefs = ['/catalog', '/lifestyle', '/video'];

// Your Brand Model's live URL. /models used to 301 here (AUDIT-TASK-0.md
// §H·8); as of task #270 it's a real page of its own again (§H·8's own
// 2026-07-29 addendum), reached from this page's #standard block and from the
// homepage rather than through the nav — see that addendum for why no
// nav_models slot was added here.
export const brandModelHref = '/custom-models';

export const ui = {
  en: {
    nav_drops: 'Drops',
    nav_brandmodel: 'Your Brand Model',
    nav_pricing: 'Pricing',
    nav_gallery: 'Gallery',
    nav_contact: 'Contact',
    nav_start: 'Start',
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
      ['Catalog', 'Front, back, detail and on-model, for every product'],
      ['Lifestyle', 'Your product in a styled scene, ready to post'],
      ['Video', 'Short clips that move, on any product in the drop'],
    ],
    mob_chat: 'Chat on WhatsApp',
    mob_notsure: 'Not sure yet?',
    mob_try: `Try a test sample · ${TEST_SAMPLE.en.price}`,
    foot_tagline: 'The visual studio for clothing brands and modern e-commerce — for founders who would rather grow than book another shoot.',
    foot_drops: 'Drops',
    foot_brandmodel: 'Your Brand Model',
    foot_aiact: 'AI Act',
    foot_company: 'Company',
    foot_touch: 'Get in touch',
    foot_about: 'About',
    foot_how: 'How it works',
    foot_portal: 'The client portal',
    foot_studio: 'How a drop is run',
    foot_guides: 'Guides',
    // /compare is now "a shoot day, or a drop" (AUDIT §F). The AI-tools
    // argument still lives on that page at #ai-tools and in its <title>, so
    // the search intent is not lost — but the footer label names the primary
    // comparison, which is the one a brand is actually weighing.
    foot_compare: 'Shoot day vs VISUAILS',
    foot_gallery: 'Gallery',
    foot_pricing: 'Pricing',
    foot_faq: 'FAQ',
    foot_contact: 'Contact',
    foot_privacy: 'Privacy',
    foot_terms: 'Terms of Service',
    foot_cookies: 'Cookies',
    // ---- cookie consent (section 19) ---------------------------------------
    // Deliberately plain. A banner that explains itself in one sentence and
    // offers two equal buttons is both the lawful shape and the one that gets
    // read; the "we value your privacy" preamble is neither.
    cc_title: 'Cookies on this site',
    cc_body: 'We use only what the site needs to work. Nothing that measures you is switched on unless you say so.',
    cc_accept: 'Accept analytics',
    cc_reject: 'Only what is necessary',
    cc_manage: 'Choose per purpose',
    cc_policy: 'Cookie Policy',
    cc_prefs_title: 'Cookie preferences',
    cc_prefs_intro: 'Necessary cookies keep you signed in and remember this choice. They cannot be switched off, and they are all the site sets today.',
    cc_nec_h: 'Necessary',
    cc_nec_n: 'Sign-in sessions for the client portal and the studio dashboard, and this preference itself. Always on.',
    cc_ana_h: 'Analytics',
    cc_ana_n: 'Anonymous, cookieless page counts so we can see which pages are read. Off unless you turn it on, and nothing loads until you do.',
    cc_always: 'Always on',
    cc_save: 'Save my choice',
    cc_cancel: 'Back',
    cc_reopen: 'Cookie preferences',
    cc_changed: 'Saved.',
    foot_location: 'Enschede, Netherlands',
    cb_text: 'See it on your own product first.',
    cb_cta: `Test sample · ${TEST_SAMPLE.en.price}`,
    wa_launcher_label: 'WhatsApp',
    wa_launcher_aria: 'Message VISUAILS on WhatsApp — opens in a new tab',
    lang_label: 'Language',
    support_note: '',
  },
  nl: {
    nav_drops: 'Drops',
    nav_brandmodel: 'Jouw merkmodel',
    nav_pricing: 'Prijzen',
    nav_gallery: 'Galerij',
    nav_contact: 'Contact',
    nav_start: 'Start',
    nav_account: 'Inloggen',
    drops: [
      ['Catalog', 'Voorkant, achterkant, detail en on-model, voor elk product'],
      ['Lifestyle', 'Je product in een gestylede scène, klaar om te posten'],
      ['Video', 'Korte clips met beweging, op elk product in de drop'],
    ],
    mob_chat: 'Chat via WhatsApp',
    mob_notsure: 'Nog niet zeker?',
    mob_try: `Probeer een proefvisual · ${TEST_SAMPLE.nl.price}`,
    foot_tagline: 'De studio voor productvisuals voor kledingmerken en moderne e-commerce — voor ondernemers die liever groeien dan nóg een fotoshoot boeken.',
    foot_drops: 'Drops',
    foot_brandmodel: 'Jouw merkmodel',
    foot_aiact: 'AI Act',
    foot_company: 'Bedrijf',
    foot_touch: 'Contact',
    foot_about: 'Over ons',
    foot_how: 'Hoe het werkt',
    foot_portal: 'Het klantportaal',
    foot_studio: 'Hoe een drop draait',
    foot_guides: 'Gidsen',
    foot_compare: 'Shootdag vs VISUAILS',
    foot_gallery: 'Galerij',
    foot_pricing: 'Prijzen',
    foot_faq: 'FAQ',
    foot_contact: 'Contact',
    foot_privacy: 'Privacy',
    foot_terms: 'Algemene voorwaarden',
    foot_cookies: 'Cookies',
    cc_title: 'Cookies op deze site',
    cc_body: 'We gebruiken alleen wat de site nodig heeft om te werken. Niets dat jou meet staat aan, tenzij je dat zelf zegt.',
    cc_accept: 'Analytics accepteren',
    cc_reject: 'Alleen het noodzakelijke',
    cc_manage: 'Kies per doel',
    cc_policy: 'Cookiebeleid',
    cc_prefs_title: 'Cookievoorkeuren',
    cc_prefs_intro: 'Noodzakelijke cookies houden je ingelogd en onthouden deze keuze. Ze kunnen niet uit, en meer plaatst de site vandaag niet.',
    cc_nec_h: 'Noodzakelijk',
    cc_nec_n: 'Inlogsessies voor het klantenportaal en het studiodashboard, en deze voorkeur zelf. Staat altijd aan.',
    cc_ana_h: 'Analytics',
    cc_ana_n: 'Anonieme, cookieloze paginatellingen zodat we zien welke pagina\u2019s gelezen worden. Staat uit tenzij jij hem aanzet, en er laadt niets voordat je dat doet.',
    cc_always: 'Staat altijd aan',
    cc_save: 'Keuze opslaan',
    cc_cancel: 'Terug',
    cc_reopen: 'Cookievoorkeuren',
    cc_changed: 'Opgeslagen.',
    foot_location: 'Enschede, Nederland',
    cb_text: 'Zie het eerst op je eigen product.',
    cb_cta: `Proefvisual · ${TEST_SAMPLE.nl.price}`,
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
export function localizedPath(lang, path) {
  const clean = path === '' ? '/' : path;
  if (lang === 'en') return clean;
  return clean === '/' ? `/${lang}` : `/${lang}${clean}`;
}

export function useTranslations(lang) {
  const dict = ui[lang] || ui.en;
  return (key) => (dict[key] !== undefined ? dict[key] : (ui.en[key] !== undefined ? ui.en[key] : key));
}
