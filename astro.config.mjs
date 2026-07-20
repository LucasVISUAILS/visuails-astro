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
  build: {
    format: 'directory',
  },
  compressHTML: true,
});
