/**
 * De gebouwde Worker, in dit proces, met nepdata. 6 september 2026.
 *
 * De Astro-pagina's van Studio draaien alleen in workerd; een test die wil
 * zien wat een klant ziet moet dus door de echte Worker. Dit doet dat zonder
 * subproces — geen `spawn('npx', …)`, dat op Windows `ENOENT` gaf (zie de noot
 * in tests/a11y.test.mjs) — via de JS-API van wrangler:
 *
 *   · getPlatformProxy() geeft de bindings (D1, R2) op een eigen persist-map,
 *     en daarmee zetten we het schema en de nepdata neer;
 *   · unstable_startWorker() start dist/server op diezelfde map, op poort 0.
 *
 * Alles staat in een tijdelijke map die bij dispose() weer weg is: niets raakt
 * .wrangler/state of de echte database. Vereist een verse build (test:bouw
 * draait als eerste in `npm test`).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashToken } from '../../src/lib/token.js';
import { studioSeed, IMG, VOLT, NOORD } from './studio-seed.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

export { VOLT, NOORD };

/**
 * @returns {Promise<{ url: string, fetch(pad: string, opts?: { token?: string|null, cookie?: string, method?: string, body?: any, headers?: object }): Promise<Response>, dispose(): Promise<void>, persist: string }>}
 */
export async function startStudio() {
  const { getPlatformProxy, unstable_startWorker } = await import('wrangler');
  const config = path.join(ROOT, 'dist', 'server', 'wrangler.json');
  if (!fs.existsSync(config)) throw new Error('dist/server/wrangler.json ontbreekt — draai eerst `npm run build`');
  const persist = fs.mkdtempSync(path.join(os.tmpdir(), 'visuails-studio-'));

  /* ── de nepdata ── */
  /* Op `<map>/v3`: unstable_startWorker() legt zijn D1 en R2 onder v3/ (zoals
     `wrangler dev` onder .wrangler/state/v3), getPlatformProxy() precies waar je
     wijst. Twee mappen naast elkaar was een Worker die een lege database zag. */
  const proxy = await getPlatformProxy({ configPath: config, persist: { path: path.join(persist, 'v3') } });
  try {
    const schema = fs.readFileSync(path.join(ROOT, 'schema.sql'), 'utf8')
      .replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    const stmts = schema.split(';').map((s) => s.trim().replace(/\s+/g, ' ')).filter(Boolean);
    await proxy.env.DB.exec(`${stmts.join(';\n')};`);
    const img = IMG.filter((f) => fs.existsSync(path.join(ROOT, 'public', 'img', f)));
    const seed = studioSeed({ hash: await hashToken(VOLT.token), hash2: await hashToken(NOORD.token), img });
    await proxy.env.DB.exec(`${seed.sql.map((s) => s.replace(/\s+/g, ' ')).join(';\n')};`);
    for (const [key, file] of seed.r2) {
      await proxy.env.UPLOADS.put(key, fs.readFileSync(path.join(ROOT, 'public', 'img', file)), { httpMetadata: { contentType: 'image/webp' } });
    }
  } finally {
    await proxy.dispose();
  }

  /* ── de Worker ── */
  const worker = await unstable_startWorker({ config, dev: { persist, server: { port: 0 }, logLevel: 'error' } });
  await worker.ready;

  return {
    persist,
    /** De basis-URL van de Worker (poort 0 → wat het systeem gaf), voor een browser. */
    url: String(await worker.url).replace(/\/$/, ''),
    async fetch(pad, { token = VOLT.token, cookie = '', method = 'GET', body = undefined, headers = {} } = {}) {
      const jar = [token ? `vis_account=${token}` : '', cookie].filter(Boolean).join('; ');
      return worker.fetch(`http://localhost${pad}`, { method, body, redirect: 'manual', headers: { ...(jar ? { cookie: jar } : {}), ...headers } });
    },
    async dispose() {
      await worker.dispose();
      fs.rmSync(persist, { recursive: true, force: true });
    },
  };
}
