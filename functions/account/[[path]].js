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
//
// WHY THIS FILE IS FOUR LINES
// Same reason functions/admin/[[path]].js is four lines — see that file's
// header, and src/lib/portal.js's for the fuller argument. All of it lives in
// src/lib/account.js.

import { accountGet, accountPost } from '../../src/lib/account.js';

export const onRequestGet = accountGet;
export const onRequestPost = accountPost;
