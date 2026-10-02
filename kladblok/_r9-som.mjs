// Ronde 9 · F7: de regel "Je betaalt" in het overzicht van stap 5.
import { start } from './_dl.mjs';
import { bestel } from './_bestel.mjs';
const k = await start();
const r = await bestel(k.page, { pad: '/nl/start/catalog', aantal: 2, fotos: 4, wacht: 1400, land: 'US', klant: { email: `som-${Date.now() % 100000}@winkel.test` } }).catch((e) => ({ fout: String(e).slice(0, 300) }));
console.log(r.fout || r.overzicht);
await k.stop();
