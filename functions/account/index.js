// VISUAILS — the bare /account route (Cloudflare Pages Function).
//
// WHY THIS EXISTS SEPARATELY FROM [[path]].js
// Same reasoning as functions/o/index.js: a [[catch-all]] segment is
// documented as matching everything BELOW its parent, and whether it also
// matches the bare parent is not something worth being clever about when the
// cost of being wrong is a 404 on the one URL the site's own nav now links to
// (Layout.astro's nav-account-link / mobile-account-link, task #259) and the
// cost of being safe is this file. Pages prefers a static route over a
// dynamic one, so if [[path]].js does match /account, this still wins, and
// both resolve to the same handler either way — accountGet reads
// url.pathname itself rather than a router-supplied param, so a second entry
// point costs nothing in behaviour.
//
// No POST export: accountPost never dispatches on the bare '/account' path
// (only '/account/login', '/account/logout', '/account/lock' — see
// src/lib/account.js), so there is nothing to submit here.

import { accountGet } from '../../src/lib/account.js';

export const onRequestGet = accountGet;
export const onRequestHead = accountGet;
