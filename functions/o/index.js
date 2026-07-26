// VISUAILS — the bare /o route (Cloudflare Pages Function). Section 10.
//
// WHY THIS EXISTS SEPARATELY FROM [[token]].js
// /order-status is retired. Both its language variants are 301s to /o in
// public/_redirects, so /o has to be a real page rather than a 404 — somebody
// has that old URL bookmarked, and the whole reason for the redirect is to land
// them somewhere that explains itself. Note that _redirects does not apply to
// requests Pages Functions serve, but that is only a constraint on redirect
// SOURCES: a 301 whose destination is /o is a fresh request, which this file
// then answers normally.
//
// A [[catch-all]] segment is documented as matching everything BELOW its parent,
// and whether it also matches the bare parent is not something worth being
// clever about when the cost of being wrong is a 404 on a redirect target and
// the cost of being safe is this file. Pages prefers a static route over a
// dynamic one, so if [[token]].js does match /o, this still wins, and both
// resolve to the same function either way.
//
// portalGet handles the tokenless case itself — parseRoute returns kind 'none'
// and it renders the "you need the link from your email" page — so there is
// nothing to special-case here.
//
// No POST export: there is nothing to submit at /o. A POST here gets a 405,
// which is the honest answer.

import { portalGet } from '../../src/lib/portal.js';

export const onRequestGet = portalGet;
export const onRequestHead = portalGet;
