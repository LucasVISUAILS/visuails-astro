// VISUAILS — the admin dashboard's routes (Cloudflare Pages Function). 2026-07-27.
//
//   GET  /admin/login              the sign-in form
//   POST /admin/login              verify password, set the session cookie
//   GET  /admin                    the dashboard: orders + revision inbox
//   POST /admin/logout             clear the session
//   POST /admin/orders/<id>/status change status, write the client-visible timeline row too
//
// WHY THIS FILE IS FOUR LINES
// All of it lives in src/lib/admin.js. See functions/o/[[token]].js, which
// makes the identical argument for the identical reason: one implementation
// that Cloudflare can find an entry point for, importable from a route file
// and runnable under plain `node` with a stubbed env — the only way any of
// this can be tested where there is no wrangler.

import { adminGet, adminPost } from '../../src/lib/admin.js';

export const onRequestGet = adminGet;
export const onRequestPost = adminPost;
