// VISUAILS — i18n dictionary + helpers.
// English at the root (/), Dutch at /nl, German at /de. This file holds the
// SHARED chrome strings (nav, footer, conversion bar, common buttons) so the
// Layout stays DRY; page bodies are translated in their own src/pages/{nl,de}
// files. Customer service is offered in English or Dutch only — the German
// site carries a small note to set that expectation (see `support_note`).

export const languages = { en: 'English', nl: 'Nederlands', de: 'Deutsch' };
export const localeNames = { en: 'EN', nl: 'NL', de: 'DE' };
export const ogLocale = { en: 'en_US', nl: 'nl_NL', de: 'de_DE' };
export const defaultLang = 'en';

// Services list — href is a language-neutral base path (the Layout localizes it
// with localizedPath); [title, desc] are translated per language.
export const serviceHrefs = ['/catalog', '/lifestyle', '/video', '/models', '/custom-models'];

export const ui = {
  en: {
    nav_services: 'Services',
    nav_pricing: 'Pricing',
    nav_gallery: 'Gallery',
    nav_testsample: 'Test Sample',
    nav_faq: 'FAQ',
    nav_contact: 'Contact',
    nav_ordernow: 'Order now',
    services: [
      ['Catalog', '4 photos per product — €39.99'],
      ['Lifestyle', 'Styled scenes & models — from €35'],
      ['Video', 'Short product videos that move'],
      ['Models', 'Consistent faces across every visual'],
      ['Custom Models', 'A unique face, exclusively yours'],
    ],
    mob_chat: 'Chat on WhatsApp',
    mob_notsure: 'Not sure yet?',
    mob_try: 'Try a test sample · €0.99',
    foot_tagline: 'A product-visual studio for modern e-commerce brands — for founders who would rather grow than book another shoot.',
    foot_services: 'Services',
    foot_company: 'Company',
    foot_touch: 'Get in touch',
    foot_about: 'About',
    foot_how: 'How it works',
    foot_gallery: 'Gallery',
    foot_pricing: 'Pricing',
    foot_faq: 'FAQ',
    foot_contact: 'Contact',
    foot_privacy: 'Privacy',
    foot_terms: 'Terms of Service',
    foot_cookies: 'Cookies',
    foot_location: 'Enschede, Netherlands',
    cb_text: 'See it on your own product first.',
    cb_cta: 'Test sample · €0.99',
    lang_label: 'Language',
    support_note: '',
  },
  nl: {
    nav_services: 'Diensten',
    nav_pricing: 'Prijzen',
    nav_gallery: 'Galerij',
    nav_testsample: 'Proefvisual',
    nav_faq: 'FAQ',
    nav_contact: 'Contact',
    nav_ordernow: 'Bestel nu',
    services: [
      ['Catalog', '4 foto’s per product — €39,99'],
      ['Lifestyle', 'Gestylde scènes & modellen — vanaf €35'],
      ['Video', 'Korte productvideo’s met beweging'],
      ['Modellen', 'Consistente gezichten op elke visual'],
      ['Eigen modellen', 'Een uniek gezicht, exclusief van jou'],
    ],
    mob_chat: 'Chat via WhatsApp',
    mob_notsure: 'Nog niet zeker?',
    mob_try: 'Probeer een proefvisual · €0,99',
    foot_tagline: 'Een studio voor productvisuals voor moderne e-commerce merken — voor ondernemers die liever groeien dan nóg een fotoshoot boeken.',
    foot_services: 'Diensten',
    foot_company: 'Bedrijf',
    foot_touch: 'Contact',
    foot_about: 'Over ons',
    foot_how: 'Hoe het werkt',
    foot_gallery: 'Galerij',
    foot_pricing: 'Prijzen',
    foot_faq: 'FAQ',
    foot_contact: 'Contact',
    foot_privacy: 'Privacy',
    foot_terms: 'Algemene voorwaarden',
    foot_cookies: 'Cookies',
    foot_location: 'Enschede, Nederland',
    cb_text: 'Zie het eerst op je eigen product.',
    cb_cta: 'Proefvisual · €0,99',
    lang_label: 'Taal',
    support_note: '',
  },
  de: {
    nav_services: 'Leistungen',
    nav_pricing: 'Preise',
    nav_gallery: 'Galerie',
    nav_testsample: 'Test-Visual',
    nav_faq: 'FAQ',
    nav_contact: 'Kontakt',
    nav_ordernow: 'Jetzt bestellen',
    services: [
      ['Catalog', '4 Fotos pro Produkt — €39,99'],
      ['Lifestyle', 'Gestylte Szenen & Modelle — ab €35'],
      ['Video', 'Kurze Produktvideos mit Bewegung'],
      ['Modelle', 'Konsistente Gesichter auf jedem Visual'],
      ['Eigene Modelle', 'Ein einzigartiges Gesicht, exklusiv für dich'],
    ],
    mob_chat: 'Per WhatsApp chatten',
    mob_notsure: 'Noch unsicher?',
    mob_try: 'Test-Visual ausprobieren · €0,99',
    foot_tagline: 'Ein Studio für Produktvisuals für moderne E-Commerce-Marken — für Gründer, die lieber wachsen als noch ein Fotoshooting zu buchen.',
    foot_services: 'Leistungen',
    foot_company: 'Unternehmen',
    foot_touch: 'Kontakt',
    foot_about: 'Über uns',
    foot_how: 'So funktioniert’s',
    foot_gallery: 'Galerie',
    foot_pricing: 'Preise',
    foot_faq: 'FAQ',
    foot_contact: 'Kontakt',
    foot_privacy: 'Datenschutz',
    foot_terms: 'AGB',
    foot_cookies: 'Cookies',
    foot_location: 'Enschede, Niederlande',
    cb_text: 'Sieh es zuerst auf deinem eigenen Produkt.',
    cb_cta: 'Test-Visual · €0,99',
    lang_label: 'Sprache',
    support_note: 'Hinweis: Unser Kundenservice ist auf Englisch oder Niederländisch verfügbar.',
  },
};

export function getLangFromPath(pathname) {
  const seg = (pathname || '/').split('/')[1];
  return seg === 'nl' || seg === 'de' ? seg : 'en';
}

// Strip a leading /nl or /de, returning the language-neutral base path ('/...').
export function stripLang(pathname) {
  const seg = (pathname || '/').split('/')[1];
  if (seg === 'nl' || seg === 'de') {
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
