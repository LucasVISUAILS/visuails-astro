// VISUAILS — the customer account dashboard's routes (Cloudflare Pages Function). Task #257, 2026-07-27.
//
//   GET  /account/login             the sign-in form (enter email)
//   POST /account/login             send a magic-link email
//   GET  /account/verify/<token>    redeem the link, set the session cookie
//   GET  /account                   the dashboard: orders, files, brand lock
//   POST /account/logout            clear the session
//   POST /account/lock              set/clear a per-style brand lock
//   GET  /account/files/<id>/f      inline view of a delivered file
//   GET  /account/files/<id>/d      download a delivered file
//   GET  /account/me                JSON: who is signed in, and their saved
//                                   details. 401 when nobody is. Read by
//                                   /start's prefill (task #271e) AND, since
//                                   August 2026, by Layout.astro's chrome —
//                                   a static build has no other way to know
//                                   whether the visitor has a session.
//   POST /account/details           save the fields that do not change between
//                                   orders. Answers a 303 to the dashboard
//                                   form and JSON to /start's opt-in fetch;
//                                   which one is decided by Accept, and by
//                                   nothing the body could claim.
//
// WHY THIS FILE IS FOUR LINES
// Same reason functions/admin/[[path]].js is four lines — see that file's
// header, and src/lib/portal.js's for the fuller argument. All of it lives in
// src/lib/account.js.

import { accountGet, accountPost } from '../../src/lib/account.js';

export const onRequestGet = accountGet;
export const onRequestPost = accountPost;
