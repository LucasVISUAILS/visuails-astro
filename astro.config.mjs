// @ts-check
import { defineConfig } from 'astro/config';

// VISUAILS — Astro v2 rebuild. Fully static output (Cloudflare Pages serves
// the build/ output directly, same deploy shape as the previous SvelteKit
// site). No integrations needed: motion is vanilla CSS/JS (see
// src/scripts/interactions.js), images are pre-optimized .webp in public/img
// rather than routed through astro:assets (they're already sized/compressed
// — see IMAGES.md for why).
export default defineConfig({
  site: 'https://visuails.com',
  output: 'static',
  trailingSlash: 'ignore',
  // Trilingual: English at the root (/), Dutch at /nl, German at /de.
  // prefixDefaultLocale:false keeps the existing English URLs unchanged;
  // localized pages live in src/pages/nl and src/pages/de. See src/i18n/ui.js
  // for the shared string dictionary and the Layout's language switcher/hreflang.
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'nl', 'de'],
    routing: { prefixDefaultLocale: false },
  },
  build: {
    format: 'directory',
  },
  compressHTML: true,
});
