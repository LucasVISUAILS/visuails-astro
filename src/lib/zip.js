/* Een ZIP samenstellen terwijl hij verstuurd wordt, zonder afhankelijkheden.
 *
 * WAAROM ZELF EN NIET EEN BIBLIOTHEEK. Dit draait in een Cloudflare Worker.
 * Wat er nodig is — het ZIP-formaat zonder compressie — is een paar honderd
 * bytes aan headers en een CRC-tabel, en dat weegt minder dan het inladen van
 * een pakket dat ook deflate, encryptie en ZIP64 meebrengt die hier geen van
 * drieën gebruikt worden.
 *
 * WAAROM STORE EN NIET DEFLATE. De inhoud is JPEG en WebP. Die zijn al
 * gecomprimeerd; er nog een deflate-pass overheen halen levert doorgaans onder
 * de procent op en kost CPU-tijd per byte in een omgeving die per milliseconde
 * afrekent. STORE is hier niet de luie keuze maar de juiste.
 *
 * WAAROM STREAMEND. Een bestelling van dertig producten is honderdtwintig
 * beelden. Die eerst allemaal in het geheugen zetten om daarna één Response te
 * maken, is precies de manier waarop een Worker omvalt. Deze schrijft per
 * bestand: ophalen, wegschrijven, loslaten — het geheugen houdt nooit meer dan
 * één foto vast.
 *
 * GEEN ZIP64, EN DAT IS EEN BEWUSTE GRENS. Zonder ZIP64 kan een archief niet
 * boven 4 GiB en kan het niet meer dan 65535 bestanden bevatten. Een levering
 * die daar overheen gaat bestaat niet en zou stilzwijgend een kapot archief
 * opleveren, dus ZIP_MAX_BYTES hieronder weigert hem in plaats van hem te
 * maken. Een duidelijke weigering is beter dan een bestand dat pas bij de klant
 * blijkt niet te openen.
 */

/** Ruim boven elke echte levering, ruim onder de 4 GiB waar ZIP64 begint. */
export const ZIP_MAX_BYTES = 2 * 1024 * 1024 * 1024;
export const ZIP_MAX_FILES = 4096;

/* DE DATUM IN HET ARCHIEF, vast op 1980-01-01 — de nul van het DOS-formaat.
 *
 * Nul in beide velden gaf "1980-00-00 00:00" bij het uitpakken: maand nul, dag
 * nul, wat strikt genomen geen datum is. Sommige uitpakkers halen er hun
 * schouders over op, andere klagen. En de echte tijd is hier de verkeerde
 * keuze: dan levert twee keer dezelfde bestelling downloaden twee verschillende
 * archieven op, wat caching en vergelijken zinloos maakt voor een inhoud die
 * niet veranderd is. De aanmaakdatum van een zip zegt niets over de foto's erin;
 * die staan in het portaal en in de mail. */
const DOS_DATE = (0 << 9) | (1 << 5) | 1;   // 1980-01-01
const DOS_TIME = 0;

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Kleine helper: little-endian schrijven zonder per veld een DataView te maken. */
function bytes(...parts) {
  let n = 0;
  for (const [, size] of parts) n += size;
  const out = new Uint8Array(n);
  const dv = new DataView(out.buffer);
  let o = 0;
  for (const [value, size] of parts) {
    if (size === 2) dv.setUint16(o, value, true);
    else if (size === 4) dv.setUint32(o, value, true);
    else out.set(value, o);
    o += size;
  }
  return out;
}

/**
 * Namen binnen het archief uniek en veilig houden — inclusief mappen.
 *
 * Twee bestanden mogen dezelfde naam hebben — dat gebeurt zodra een klant twee
 * producten met dezelfde cameranaam aanlevert — en een zip met twee keer
 * dezelfde naam pakt bij het uitpakken over zichzelf heen.
 *
 * ── DIT LIET GEEN MAPPEN TOE, EN JE ZAG HET NIET ────────────────────────────
 *
 * Hier stond één tekenklasse met de schuine streep erin, dus werd
 * `product-1/PNG/voorkant.png` het bestand `product-1-PNG-voorkant.png`. Geen
 * fout, geen waarschuwing, alleen een plat archief waar mappen bedoeld waren.
 *
 * Lucas, 9 augustus 2026: *"alles gesorteerd in mappen om het overzichtelijk te
 * maken."* Dus mag de schuine streep blijven staan, en moet alles wat een
 * schuine streep GEVAARLIJK maakt hier alsnog weg.
 *
 * ── EN DE CONTROLETEKENS STONDEN ER LETTERLIJK IN ───────────────────────────
 *
 * De oude tekenklasse bevatte een echte NUL-byte en een echte 0x1F, ingetypt als
 * teken in plaats van als escape. Daardoor was dit bestand voor `file` en voor
 * ripgrep geen tekst maar `data`: elke zoekopdracht over de repo sloeg zip.js
 * stil over, en in een project waarvan het vangnet uit statische controles
 * bestaat is dat een bestand dat buiten het net valt. Ze staan er nu als
 * \u0000-\u001f, wat hetzelfde betekent en wel te lezen en te zoeken is.
 *
 * ── WAT ER WEG MOET, EN WAAROM ELK VAN DIE DINGEN ───────────────────────────
 *
 * Een pad in een zip is de klassieke uitpak-kwetsbaarheid (Zip Slip): een naam
 * als `../../.bashrc` laat een naïeve uitpakker buiten de doelmap schrijven.
 * Onze namen komen uit onze eigen code, maar dit is de laatste plek waar het te
 * controleren is en de eerste plek waar iemand later een klantnaam doorgeeft.
 *
 *   · elk segment `.` of `..` valt weg — teruglopen is daarmee onmogelijk, ook
 *     als het diep in het pad verstopt zit (`a/../../b`)
 *   · een backslash wordt een koppelteken en géén scheidingsteken: Windows leest
 *     hem als map, de zipstandaard niet, en dan hangt de uitkomst af van de
 *     uitpakker
 *   · een leidende schuine streep gaat eraf, want dat is een absoluut pad
 *   · een leeg segment kan niet blijven: een naam die op / eindigt is in de
 *     zipstandaard een MAP en geen bestand
 *   · besturingstekens en de tekens die Windows in een naam verbiedt
 *     (: * ? " < > |) worden een koppelteken, anders is het archief op de helft
 *     van de computers niet uit te pakken
 *
 * ── DE DEDUPLICATIE KIJKT NAAR HET HELE PAD ────────────────────────────────
 *
 * Eerst was de sleutel de bestandsnaam. Met mappen erbij zou dat
 * `product-1/PNG/voorkant.png` en `product-2/PNG/voorkant.png` als botsing zien
 * en de tweede `voorkant (2).png` noemen — twee bestanden die niets met elkaar
 * te maken hebben, in verschillende mappen, waarvan er één een rare naam krijgt.
 * De sleutel is dus het hele pad, en alleen een echte botsing wordt er nog een.
 */
function uniqueNames(files) {
  const seen = new Map();
  return files.map((f, i) => {
    const fallback = `bestand-${i + 1}`;
    const cleaned = String(f.name || fallback)
      .replace(/[\u0000-\u001f\u007f\\:*?"<>|]/g, '-');
    const segments = cleaned
      .split('/')
      .map((seg) => seg.trim())
      .filter((seg) => seg !== '' && seg !== '.' && seg !== '..');
    /*
     * ── EEN MAP IS EEN NAAM DIE OP / EINDIGT — 12 AUGUSTUS 2026 ──────────────
     *
     * Toegevoegd voor de mappenroute op /admin: een zip die alleen de STRUCTUUR
     * van een bestelling bevat, zodat de studio de foto's er in de goede vakjes
     * in zet en de server daarna uit het PAD kan lezen welk product en welke shot
     * het is. Zonder mapvermeldingen zou zo'n zip leeg uitpakken -- een
     * uitpakker maakt alleen mappen die hij uit een bestandspad kan afleiden, en
     * er zijn hier per definitie nog geen bestanden.
     *
     * `f.dir` is dus geen sier maar de hele functie van dat archief. De schuine
     * streep wordt na het opschonen weer aangeplakt, want de splitser hierboven
     * gooit het lege laatste segment eruit -- en dat moet hij ook doen voor een
     * BESTANDSnaam die per ongeluk op / eindigt.
     */
    if (f.dir) {
      const dirPath = segments.map((seg) => seg.slice(0, 60)).join('/');
      // Een map zonder segmenten bestaat niet; die slaan we over in pull().
      const key = dirPath ? `${dirPath}/` : '';
      // Mappen worden NIET gededupliceerd met een "(2)": twee keer dezelfde map
      // is dezelfde map, en een tweede vermelding ervan is onschuldig. Een
      // uitpakker maakt hem één keer aan. `(2)` erachter zou juist een tweede,
      // verkeerde map opleveren.
      return key;
    }
    /* Het laatste segment is de bestandsnaam, de rest zijn mappen. Alleen de
       bestandsnaam wordt op 120 tekens afgekapt: afkappen midden in een mapnaam
       zou twee producten in dezelfde map kunnen laten belanden. */
    const file = (segments.pop() || fallback).slice(0, 120) || fallback;
    let path = [...segments.map((seg) => seg.slice(0, 60)), file].join('/');
    const n = (seen.get(path) || 0) + 1;
    seen.set(path, n);
    if (n > 1) {
      const dot = path.lastIndexOf('.');
      const slash = path.lastIndexOf('/');
      path = dot > slash && dot > 0
        ? `${path.slice(0, dot)} (${n})${path.slice(dot)}`
        : `${path} (${n})`;
    }
    return path;
  });
}

/**
 * @param {Array<{name: string, get: () => Promise<ArrayBuffer|null>}>} files
 *        `get` wordt pas aangeroepen als dit bestand aan de beurt is — dat is
 *        wat het streamend maakt. Levert hij null, dan wordt het bestand
 *        overgeslagen en de rest gaat door: één verdwenen object mag geen
 *        archief kosten waar de andere negenennegentig wél in zitten.
 * @returns {ReadableStream<Uint8Array>}
 */
export function zipStream(files) {
  const names = uniqueNames(files);
  const enc = new TextEncoder();
  const central = [];
  let offset = 0;
  let index = 0;

  return new ReadableStream({
    async pull(controller) {
      // Alle bestanden gehad → centrale directory en afsluiter, dan klaar.
      if (index >= files.length) {
        const dirStart = offset;
        let dirSize = 0;
        for (const e of central) {
          /* ── 0x0800 EN NIET 0x0808 ──────────────────────────────────────────
             Hier stond 0x0808. Bit 3 van dat getal betekent: de maten van dit
             bestand staan NIET in de header maar in een data descriptor erachter.
             Die schrijven we nooit, en de maten staan hier wél gewoon in — dus
             beloofde de centrale directory iets wat het archief niet had, terwijl
             de lokale header (verderop) 0x0800 zei. Twee headers over hetzelfde
             bestand die het oneens waren.

             In de praktijk viel het niet op omdat de maten kloppen en elke
             gangbare uitpakker die dan leest en verder gaat. Een strengere lezer
             mag het weigeren, en dat is niet iets om te laten liggen in het
             bestand dat straks het énige is wat de klant meeneemt.

             Alleen bit 11 blijft staan: de naam is UTF-8. Zie de noot bij de
             lokale header. */
          const head = bytes(
            [0x02014b50, 4], [20, 2], [20, 2], [0x0800, 2], [0, 2],
            [DOS_TIME, 2], [DOS_DATE, 2], [e.crc, 4], [e.size, 4], [e.size, 4],
            [e.name.length, 2], [0, 2], [0, 2], [0, 2], [0, 2], [0, 4], [e.offset, 4],
          );
          controller.enqueue(head);
          controller.enqueue(e.name);
          dirSize += head.length + e.name.length;
        }
        controller.enqueue(bytes(
          [0x06054b50, 4], [0, 2], [0, 2],
          [central.length, 2], [central.length, 2],
          [dirSize, 4], [dirStart, 4], [0, 2],
        ));
        controller.close();
        return;
      }

      const f = files[index];
      const name = enc.encode(names[index]);
      index += 1;

      /*
       * EEN MAPVERMELDING: nul bytes, crc nul, en de naam eindigt op /. Verder is
       * het een gewone vermelding -- er is geen aparte structuur voor nodig. De
       * externe attributen (waar de mapbit van MS-DOS in zou staan) laten we nul:
       * elke gangbare uitpakker leest de afsluitende schuine streep en maakt de
       * map, en een attribuutveld verkeerd vullen is een grotere kans op gezeur
       * dan het leeg laten.
       *
       * Een lege naam kan hier voorkomen als iemand `{ dir: true, name: '/' }`
       * meegeeft; die vermelding zou een archief opleveren met een naamloze
       * ingang. Overslaan is het juiste antwoord en het is stil, net als een
       * object dat uit R2 verdwenen is.
       */
      if (f.dir) {
        if (!name.length) return;
        const localDir = bytes(
          [0x04034b50, 4], [20, 2], [0x0800, 2], [0, 2],
          [DOS_TIME, 2], [DOS_DATE, 2], [0, 4], [0, 4], [0, 4],
          [name.length, 2], [0, 2],
        );
        controller.enqueue(localDir);
        controller.enqueue(name);
        central.push({ name, crc: 0, size: 0, offset });
        offset += localDir.length + name.length;
        return;
      }

      let buf;
      try {
        buf = await f.get();
      } catch {
        buf = null;
      }
      if (!buf) return;   // overslaan, pull() wordt opnieuw aangeroepen

      const data = new Uint8Array(buf);
      const crc = crc32(data);

      // Bit 11 van de vlaggen (0x0800) zegt: de naam is UTF-8. Zonder dat leest
      // Windows een é als twee tekens.
      const local = bytes(
        [0x04034b50, 4], [20, 2], [0x0800, 2], [0, 2],
        [DOS_TIME, 2], [DOS_DATE, 2], [crc, 4], [data.length, 4], [data.length, 4],
        [name.length, 2], [0, 2],
      );
      controller.enqueue(local);
      controller.enqueue(name);
      controller.enqueue(data);

      central.push({ name, crc, size: data.length, offset });
      offset += local.length + name.length + data.length;
    },
  });
}

/** Een naam die een browser accepteert, met een ASCII-terugval voor oude clients. */
export function zipDisposition(filename) {
  const ascii = filename.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
