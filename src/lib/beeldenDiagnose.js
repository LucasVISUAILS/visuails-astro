/*
 * VISUAILS — /admin/diagnose: "Beelden die nog ontbreken". 8 oktober 2026 (1.02).
 *
 * De lijst staat in src/data/beeldenNodig.js. Hier wordt per beeld nagekeken of
 * het bestand er in de uitgerolde site ligt, via de ASSETS-binding van de Worker
 * (een HEAD-verzoek, niets wordt gedownload). De Worker kan public/img niet
 * lezen; de statische bestanden wel.
 *
 * Zonder ASSETS (een test, `wrangler dev` zonder assets) staat er "niet te
 * controleren" en de hele lijst — nooit "alles aanwezig" op een gok.
 */
import { BEELDEN_NODIG } from '../data/beeldenNodig.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** De varianten waaronder een beeld mag liggen — dezelfde als scripts/plaatshouders.mjs. */
function varianten(bestand) {
  const kaal = String(bestand).replace(/\.(webp|png|jpe?g|avif)$/, '');
  return [`${kaal}.webp`, `${kaal}.png`, `${kaal}.jpg`, `${kaal}-w760.webp`, `${kaal}-w1560.webp`];
}

/**
 * Lees per beeld of het er is. Geeft { staat: 'gelezen' | 'onbekend', rijen },
 * met per rij `aanwezig: true | false | null`.
 */
export async function beeldenStand(env, origin = 'https://visuails.com', lijst = BEELDEN_NODIG) {
  if (!env?.ASSETS || typeof env.ASSETS.fetch !== 'function') {
    return { staat: 'onbekend', rijen: lijst.map((b) => ({ ...b, aanwezig: null })) };
  }
  const rijen = await Promise.all(lijst.map(async (b) => {
    for (const pad of varianten(b.bestand)) {
      try {
        const res = await env.ASSETS.fetch(new Request(new URL(pad, origin).href, { method: 'HEAD' }));
        if (res.ok && /^image\//.test(res.headers.get('content-type') || 'image/')) return { ...b, aanwezig: true };
      } catch { /* volgende variant */ }
    }
    return { ...b, aanwezig: false };
  }));
  return { staat: 'gelezen', rijen };
}

/** Het blok voor /admin/diagnose, met een anker (#beelden). */
export function beeldenBlok(stand) {
  if (!stand) return '';
  return `<div class="diag-beelden" id="beelden">${binnen(stand)}</div>`;
}

function binnen(stand) {
  const ontbreekt = stand.rijen.filter((r) => r.aanwezig !== true);
  const totaal = stand.rijen.length;
  const kop = '<h2>Beelden die nog ontbreken</h2>';
  const uitleg = '<p class="meta">Secties buiten het pad naar betalen blijven verborgen tot hun beeld er is; '
    + 'er verschijnt geen grijs vlak. Leg het bestand onder deze naam in <code>public/img</code>, rol uit, en de sectie staat er. '
    + 'De lijst staat in <code>src/data/beeldenNodig.js</code>.</p>';
  if (stand.staat !== 'gelezen') {
    return `${kop}${uitleg}<p class="meta is-warn">Niet te controleren: de Worker kan de bestanden niet lezen (geen ASSETS-binding). Dit is de hele lijst.</p>${tabel(stand.rijen)}`;
  }
  if (!ontbreekt.length) {
    return `${kop}<p class="meta">Alle ${totaal} beelden uit de lijst staan op de site.</p>`;
  }
  return `${kop}${uitleg}<p class="meta"><strong>${totaal - ontbreekt.length} van ${totaal} aanwezig.</strong> Nog te maken:</p>${tabel(ontbreekt)}`;
}

/* Een lijst en geen tabel: vier kolommen met lange zinnen liepen op een
   telefoon (390 px) rechts van het scherm af. */
function tabel(rijen) {
  return `<ul class="beelden-lijst">${
    rijen.map((r) => `<li><p><strong><code>${esc(r.bestand.replace(/^\/img\//, ''))}</code></strong>${r.betaalpad ? ' <span class="pill">pad naar betalen</span>' : ''} <span class="meta">· ${esc(r.maat)}</span></p>`
      + `<p>${esc(r.plek)}</p><p class="meta">${esc(r.wat)}</p></li>`).join('')
  }</ul>`;
}
