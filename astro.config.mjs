// @ts-check
import { defineConfig } from 'astro/config';
import brandLockupGuard from './scripts/brand-lockup-guard.mjs';

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
  // Bilingual: English at the root (/), Dutch at /nl.
  // prefixDefaultLocale:false keeps the existing English URLs unchanged;
  // localized pages live in src/pages/nl. See src/i18n/ui.js for the shared
  // string dictionary and the Layout's language switcher/hreflang.
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'nl'],
    routing: { prefixDefaultLocale: false },
  },
  build: {
    format: 'directory',
  },
  // NO `redirects` BLOCK HERE — deliberately. Retired routes are 301s in
  // public/_redirects, which Cloudflare Pages applies at the edge.
  //
  // Astro's `redirects` option does work in a static build, but what it emits
  // is a meta-refresh + canonical stub: a 200 OK HTML page that bounces the
  // browser. That is enough to keep a visitor off a 404 and not much more.
  // Link equity passes murkily, a crawler pays for a fetch and a parse to
  // learn the page moved, and anything that follows redirects without running
  // HTML sees a success. Section 10 replaced the stubs with real 301s; see the
  // header comment in public/_redirects for the routes and the reasoning.
  //
  // If a route needs retiring later, add it there, not here. Two mechanisms
  // for one job is how a stub and a 301 end up disagreeing about a
  // destination.
  compressHTML: true,
  // The one brand rule that markup can break silently: the V glyph and the
  // wordmark are two alternative signatures, never a lockup. Checked on the
  // built HTML, so it holds for every page and every component that renders
  // one. See scripts/brand-lockup-guard.mjs for the exact formulation.
  integrations: [brandLockupGuard()],
});
