// VISUAILS — i18n dictionary + helpers.
// English at the root (/), Dutch at /nl, German at /de. This file holds the
// SHARED chrome strings (nav, footer, conversion bar, common buttons) so the
// Layout stays DRY; page bodies are translated in their own src/pages/{nl,de}
// files. Customer service is offered in English or Dutch only — the German
// site carries a small note to set that expectation (see `support_note`).

export const languages = { en: 'English', nl: 'Nederlands' };
export const localeNames = { en: 'EN', nl: 'NL' };
export const ogLocale = { en: 'en_US', nl: 'nl_NL' };
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
      ['Lifestyle', '3-photo carousel per product — €59.99'],
      ['Video', 'Short product videos that move'],
      ['Models', 'Consistent faces across every visual'],
      ['Custom Models', 'A unique face, exclusively yours'],
    ],
    mob_chat: 'Chat on WhatsApp',
    mob_notsure: 'Not sure yet?',
    mob_try: 'Try a test sample · €0.99',
    foot_tagline: 'The visual studio for clothing brands and modern e-commerce — for founders who would rather grow than book another shoot.',
    foot_services: 'Services',
    foot_company: 'Company',
    foot_touch: 'Get in touch',
    foot_about: 'About',
    foot_how: 'How it works',
    foot_guides: 'Guides',
    foot_compare: 'AI tools vs VISUAILS',
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
      ['Lifestyle', 'Carousel van 3 foto’s per product — €59,99'],
      ['Video', 'Korte productvideo’s met beweging'],
      ['Modellen', 'Consistente gezichten op elke visual'],
      ['Eigen modellen', 'Een uniek gezicht, exclusief van jou'],
    ],
    mob_chat: 'Chat via WhatsApp',
    mob_notsure: 'Nog niet zeker?',
    mob_try: 'Probeer een proefvisual · €0,99',
    foot_tagline: 'De studio voor productvisuals voor kledingmerken en moderne e-commerce — voor ondernemers die liever groeien dan nóg een fotoshoot boeken.',
    foot_services: 'Diensten',
    foot_company: 'Bedrijf',
    foot_touch: 'Contact',
    foot_about: 'Over ons',
    foot_how: 'Hoe het werkt',
    foot_guides: 'Gidsen',
    foot_compare: 'AI-tools vs VISUAILS',
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
