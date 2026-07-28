#!/usr/bin/env node
// VISUAILS — one-time helper to create (or reset) the admin login. 2026-07-27.
//
// There is no signup page for /admin on purpose — a public "create an admin
// account" endpoint is a hole, not a feature, on a site with exactly one
// studio and one login. This script is the alternative: it hashes a password
// the same way src/lib/adminAuth.js does, and prints the exact SQL to run.
// Nothing here touches the database itself, so it works with no wrangler
// session and no network — copy the printed command, run it yourself, and
// you can see precisely what you're about to write before you write it.
//
// Usage:
//   node scripts/hash-admin-password.mjs you@visuails.com "your password"
//
// Then run the SQL it prints, e.g.:
//   npx wrangler d1 execute visuails --remote --command "..."
//
// To change your password later, run this again with the same email — the
// printed statement is an UPSERT, so it replaces the existing row rather than
// erroring on the UNIQUE constraint.

import { hashPassword } from '../src/lib/adminAuth.js';

const [, , email, password] = process.argv;

if (!email || !password) {
  console.error('usage: node scripts/hash-admin-password.mjs <email> <password>');
  process.exit(1);
}
if (password.length < 12) {
  console.error(`refusing: "${password}" is under 12 characters. Pick something longer — `
    + 'this password is the only thing standing between the internet and every order in the database.');
  process.exit(1);
}

const hash = await hashPassword(password);
const escapedEmail = email.replace(/'/g, "''");
const escapedHash = hash.replace(/'/g, "''");

console.log('\nRun this against your D1 database:\n');
console.log(
  `npx wrangler d1 execute visuails --remote --command "INSERT INTO admin_users (email, password_hash) VALUES ('${escapedEmail}', '${escapedHash}') ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash"`
);
console.log('\n(swap --remote for --local to set it up in a local wrangler dev database instead.)\n');
