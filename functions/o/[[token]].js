// VISUAILS — the client portal's routes (Cloudflare Pages Function). Section 10.
//
//   GET  /o/<token>            the order page, or the delivery page on Tier 0
//   GET  /o/<token>/f/<id>     one image, inline, for the page above
//   GET  /o/<token>/d/<id>     the same image as a download
//   POST /o/<token>            approve / request a revision / undo
//
// WHY THIS FILE IS FOUR LINES
// All of it lives in src/lib/portal.js. Two route files need the same code —
// this one and functions/o/index.js — and duplicating eight hundred lines across
// them so that Cloudflare can find an entry point would mean two portals to keep
// in step, which is one more than anybody can. It also means the implementation
// runs under plain `node` with a stubbed env, which is the only way any of it
// can be tested in an environment that has no wrangler.
//
// WHY HEAD IS MAPPED TO THE GET HANDLER
// Pages dispatches by method and does not derive HEAD from onRequestGet, so
// without this export a HEAD request to a real order would 405. The runtime
// discards the body itself, so the handler needs no notion of which it is
// serving — and a HEAD costs the same rate-limit hit as the GET it stands in
// for, which is the point.
//
// There is no onRequest fallthrough on purpose: anything that is not GET, HEAD
// or POST should get Cloudflare's 405, not a portal page rendered for a verb the
// portal does not implement.

import { portalGet, portalPost } from '../../src/lib/portal.js';

export const onRequestGet = portalGet;
export const onRequestHead = portalGet;
export const onRequestPost = portalPost;
