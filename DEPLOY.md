# Deploying visuails-astro to GitHub + Cloudflare Pages

I can't push to GitHub myself from here — this sandbox has no network access
to github.com, and even if it did I don't hold your GitHub credentials (and
never should). Everything below runs on your own machine, in Command Prompt,
inside the `visuails-astro` folder. It's already a git repo with one commit —
all 72 real photos are already inside it (`public/img/`), so unlike the old
delivery there's no separate "copy your photos in" step this time.

## 1. The GitHub repo

Already created: https://github.com/LucasVISUAILS/visuails-astro.git — empty,
no README/`.gitignore`/license (this project already has its own).

## 2. Push what's already committed

In Command Prompt, in the `visuails-astro` folder:

```
git remote add origin https://github.com/LucasVISUAILS/visuails-astro.git
git branch -M main
git push -u origin main
```

If this is the first time you've pushed from this machine, Windows will pop up
a browser window asking you to sign in to GitHub — that's normal, sign in and
it'll continue. (Or just double-click `push-to-github.bat` in this folder —
the repo URL is already filled in, no typing needed.)

## 3. Deploy to Cloudflare Pages

This is a **new** Cloudflare Pages project — not the one your current live
SvelteKit site uses, since this is a different framework with a different
build output folder. Either create a fresh Pages project now (recommended,
so your current live site keeps running untouched until you're ready to cut
over), or repoint the existing one later once you've checked this build.

1. In the Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect
   to Git**, pick the repo you just pushed.
2. Build settings:
   - Framework preset: **Astro**
   - Build command: `npm run build`
   - Build output directory: `dist`
3. Deploy. Cloudflare will run `npm install && npm run build` on its own
   servers (real network access, unlike this sandbox) — this is the first
   time this project actually gets compiled, so it's worth watching the
   build log the first time in case something needs a fix. Tell me what it
   says if it fails and I'll patch it blind and you re-push.
4. Once it's green, Cloudflare gives you a `*.pages.dev` URL immediately.
   Click through every page there before pointing your real domain at it —
   see the checklist below.

## Before you cut over from the live site

- This is the **first real compile** of this project. I hand-authored all
  ~27 pages without being able to run `astro build`/`astro dev` locally (this
  sandbox's npm registry is blocked), so I've verified everything I could by
  hand — no leftover Svelte syntax, matching import paths, balanced tags —
  but only Cloudflare's real build will catch genuine syntax errors. If the
  build log shows errors, paste them to me and I'll fix and you re-push.
- The order / test-sample / contact / gallery forms don't submit anywhere yet
  (flagged page-by-page in code comments with `TODO: wire this form...`) —
  same limitation as the current live site, worth wiring up before this
  replaces it for real leads.
- URL shape is unchanged from the current SvelteKit site (`/catalog/classic`,
  `/lifestyle/dunes`, etc.), so there's no SEO-redirect step needed this time
  — this is a like-for-like route swap.
- Click through every page on the `*.pages.dev` preview URL, on both desktop
  and mobile width, before switching your domain over: hero animations,
  before/after sliders (`.ba` on catalog/proof pages, the cursor-lens `.spot`
  on the homepage), the mobile nav drawer, and the multi-step order wizards
  (`order-lifestyle`, `order-custom`) are the highest-risk interactive bits
  since they were the most heavily rewritten from the original Svelte code.

## What changed from the live SvelteKit site

- Full editorial redesign: cut homepage copy, bigger/bolder headlines
  (within a readable size ceiling), full-bleed photography, film-grain
  overlay, subtle scroll-reveal + magnetic-button + parallax motion
  throughout — see the earlier animation-techniques demo for the reference
  interactions this build implements site-wide.
- All 72 images are freshly sourced from your `images` folder and converted
  to `.webp` — nothing here is a placeholder or stock photo.
- Page transitions use the browser's native View Transitions API
  (`<ClientRouter />`) instead of SvelteKit's client router — same instant,
  app-like feel, framework-native this time.
- Color scheme, brand tokens, and route structure are unchanged from the
  live site on purpose, so this is a visual/interaction upgrade, not a
  rebrand.
