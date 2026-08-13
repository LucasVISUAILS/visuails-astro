/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * EEN ECHTE DATABASE ONDER DE TESTS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ── WAAROM DIT ER IS ────────────────────────────────────────────────────────
 *
 * tests/admin.test.mjs gebruikt een nepdatabase die SQL-strings in een lijst opslaat.
 * Dat is snel, het leest prettig, en het heeft op 12 augustus 2026 een fout gemist die
 * de AVG-knop halverwege liet falen: `invoices.order_id` verwijst naar `orders` met
 * ON DELETE RESTRICT, dus de laatste DELETE gooide zodra er ooit een factuur was
 * uitgereikt — nádat de bestanden al uit R2 waren gewist.
 *
 * Een fout die bestaat omdat de DATABASE iets weigert, kun je niet vinden met een
 * database die nooit iets weigert. Hoeveel assertions je er ook op zet.
 *
 * Dus: `node:sqlite` (aanwezig sinds Node 22), het echte schema.sql, foreign keys aan,
 * en een dun D1-jasje eromheen. Wat hiermee slaagt, slaagt om dezelfde reden als in
 * productie.
 *
 * ── WAT DIT NIET IS ─────────────────────────────────────────────────────────
 *
 * Geen vervanging van de nepdatabase. Die blijft de juiste keuze voor het meeste werk:
 * hij is sneller, hij laat je een rij verzinnen zonder de halve boekhouding te vullen,
 * en hij kan iets teruggeven wat in een echte database moeilijk te maken is. Dit is
 * het gereedschap voor de gevallen waar het GEDRAG VAN DE DATABASE zelf meedoet:
 * foreign keys, CHECK-beperkingen, unieke indexen, transacties.
 *
 * Gebruik het dus als de vraag "wat gebeurt er als de database dit weigert" is, en de
 * nepdatabase als de vraag "welke SQL stuurt deze code" is.
 */
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

/**
 * Een D1-achtig object om een node:sqlite-database heen.
 *
 * D1 heeft prepare().bind().first()/all()/run() plus batch(). node:sqlite heeft
 * prepare().get()/all()/run(). Het verschil is klein genoeg om te overbruggen en
 * groot genoeg om niet te doen alsof.
 *
 * ── DE GENUMMERDE PLAATSHOUDERS BLIJVEN STAAN ───────────────────────────────
 *
 * De eerste versie hiervan verving `?1`, `?2` … door `?`, omdat dat er eenvoudiger
 * uitzag. Dat is stil verkeerd zodra de nummers niet in oplopende volgorde in de SQL
 * staan: `SET email = ?2 ... WHERE id = ?1` werd `SET email = ? ... WHERE id = ?`, dus
 * kreeg het e-mailveld het bestelnummer en zocht de WHERE op een e-mailadres. Nul
 * rijen bijgewerkt, geen foutmelding, en een test die hard rood ging op de code in
 * plaats van op het harnas.
 *
 * SQLite kent `?NNN` zelf en node:sqlite bindt een lijst op index 1..n. Er is dus
 * niets te vervangen.
 *
 * `batch` krijgt een echte transactie, want dat is wat D1 belooft en het is precies de
 * eigenschap waar deze tests op leunen: faalt één statement, dan is er niets veranderd.
 */
export function d1(db) {
  const mk = (sql) => {
    const st = {
      sql,
      _b: [],
      bind(...a) { st._b = a.map((v) => (v === undefined ? null : v)); return st; },
      async first() { return db.prepare(sql).get(...st._b) ?? null; },
      async all() { return { results: db.prepare(sql).all(...st._b) }; },
      async run() {
        const r = db.prepare(sql).run(...st._b);
        return { success: true, meta: { changes: r.changes } };
      },
    };
    return st;
  };
  return {
    prepare: mk,
    async batch(list) {
      db.exec('BEGIN');
      try {
        const uit = [];
        for (const st of list) uit.push(await st.run());
        db.exec('COMMIT');
        return uit;
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    },
  };
}

/**
 * Een lege database met het echte schema erin.
 *
 * schema.sql is één bestand met CREATE TABLE, ALTER TABLE en CREATE INDEX door elkaar,
 * en dat is precies wat er in productie is uitgevoerd. Hij wordt hier dus ook zo
 * uitgevoerd, statement voor statement, en een statement dat faalt wordt GEMELD in
 * plaats van ingeslikt — anders test je straks tegen een database met halve tabellen
 * en weet je niet welke.
 *
 * @returns {{db: DatabaseSync, mislukt: string[]}}
 */
export function verseDb(schemaUrl) {
  const db = new DatabaseSync(':memory:');
  const sql = readFileSync(schemaUrl, 'utf8');

  /* Commentaar eruit en dan splitsen op de puntkomma. Dat is grof, en het mag grof:
     schema.sql bevat geen triggers en geen BEGIN...END-blokken, dus er is geen
     puntkomma die binnen een statement staat. Zou dat veranderen, dan valt dit
     luidruchtig om op een onvolledig statement in plaats van stil iets over te slaan. */
  const schoon = sql.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  const mislukt = [];
  for (const stuk of schoon.split(';')) {
    const q = stuk.trim();
    if (!q) continue;
    try { db.exec(q); } catch (err) {
      mislukt.push(`${q.slice(0, 60)}… → ${err.message}`);
    }
  }
  db.exec('PRAGMA foreign_keys = ON');
  return { db, mislukt };
}

/** Eén getal uit een COUNT- of SUM-query, zonder de kolomnaam te hoeven kennen. */
export function telling(db, sql, ...binds) {
  const rij = db.prepare(sql).get(...binds);
  return rij ? Object.values(rij)[0] : null;
}
