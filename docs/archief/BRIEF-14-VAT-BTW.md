# Brief — section 14 · VAT / BTW handling

**Verbatim record of what Lucas pasted on 26 July 2026.**

Sections 1–12 of this brief were never saved and survive only as
`AUDIT-TASK-0.md`, which is a reading of them rather than the thing itself.
That is not happening again. Section 13 is at `BRIEF-13-SERVICE-TIERS.md`;
this is section 14.

**A note on fidelity.** The paste arrived as one flowed block — the line
breaks and the box-drawing rules were collapsed in transit. Part 1 below
restores the structure at the points where it is unambiguous (the dotted
leader lines, the `·` bullets, the ALL-CAPS headings). **No word has been
changed, added, or removed.** Part 2 is the raw flowed text exactly as
received, so the restoration can always be checked against it.

My response to this section — including the things in it that cannot be
built as written — is in `REPORT-SECTION-14-VAT.md`. That is commentary.
This file is the source.

---

## Part 1 — restored structure

```
═══════════════════════════════════════════════════════════════
14 · VAT / BTW HANDLING
═══════════════════════════════════════════════════════════════

Seller: Dutch business, Enschede. Assume registered for VAT (NOT the KOR)
— if that is wrong, stop and flag it, because the whole model below changes.

DETERMINATION LOGIC (server-side only, never trust the client):

  NL customer, business or consumer ......... 21% NL VAT
  EU business, VIES-VALIDATED VAT number .... 0%, reverse charge
  EU, no valid VAT number ................... 21% NL VAT (treat as consumer)
  Non-EU business ........................... 0%, outside scope of EU VAT

Never apply reverse charge to a Dutch customer — domestic supplies are
always 21% regardless of whether they supply a VAT number.

STRIPE IS NOT ENOUGH — this is the core requirement.

Stripe Tax computes rates but does NOT verify a VAT number against VIES. It
applies whatever tax_exempt flag we set. A customer can enter a well-formed
but invalid or borrowed number and Stripe will zero-rate it without
complaint, and the liability lands on us. Build validation ourselves in a
Worker.

VIES VALIDATION — Worker endpoint, called from step 5 of /start:

  · Server-side only. Never call from client JS.

  · Store the full validation result in D1 against the order: vat_number,
    valid true/false, company_name, company_address, country_code,
    timestamp, and the raw response. Tax authorities can demand proof that
    we validated BEFORE applying reverse charge. This record is the proof —
    it is not optional and it is not a nice-to-have.

  · KNOWN VIES QUIRKS, handle all of them explicitly:

    – Greece is "EL" in VIES, not "GR" per ISO 3166. Map it.

    – Germany and Spain never return company names (data protection). A
      null company_name must NOT be treated as an invalid result.

    – VIES goes down regularly, and individual member-state endpoints fail
      independently. On failure: do NOT silently zero-rate. Either charge
      21% and refund on later successful validation, or hold the order in a
      "vat_pending" state. Log the failure either way.

  · Studio retainer (recurring): re-validate quarterly. VAT numbers get
    revoked, and a stale validation from signup is not a defence.

PRICING DISPLAY — mixed audience, so this must be explicit per price:

  · Tier 1 (Drop Pilot, Full Drop, Brand Model, Studio retainer): display
    EXCLUDING VAT, labelled "excl. btw" / "excl. VAT" next to every figure.

  · Tier 0 (Catalog €39.99, Lifestyle €59.99, Video €49, the €0.99 sample):
    display INCLUDING VAT. EU consumer law requires consumer-facing prices
    to be shown inclusive, and these are reachable by consumers and sole
    traders.

  · Never show an unlabelled price. The comparison table and pricing page
    must carry the label on every number.

  · Shoot-day comparison figures (€2,500-8,000) are excl. VAT — say so once.

/start STEP 5 — where the VAT field lives:

  · The VAT number field belongs on the CONFIRM step, not step 2, because
    entering it CHANGES THE PRICE. An EU business seeing €1,850 become
    €2,238.50 and then drop back is good UX; discovering it three steps
    later is not.

  · Show the breakdown explicitly: net, VAT line, total. When reverse charge
    applies, the VAT line reads "0,00 — btw verlegd / VAT reverse charged"
    rather than disappearing.

  · Live validation with visible state: checking / valid (show the returned
    company name where available) / not valid / VIES unavailable.

INVOICING — generate from our own data, do not rely on Stripe's template:

  · Sequential invoice numbers, no gaps.

  · Our VAT number and KVK number on every invoice.

  · Reverse-charge invoices: customer's VAT number + the phrase "btw
    verlegd / VAT reverse charged" + reference to art. 44 EU VAT Directive
    2006/112/EC.

  · Non-EU: state the supply is outside the scope of EU VAT.

  · Both EN and NL invoice templates.

  · Deposit invoices (50% on a drop) carry VAT on the deposit amount at the
    moment of invoicing, not deferred to final delivery.

REPORTING SUPPORT — build the export, it is a quarterly obligation:

  · A dashboard export listing, per quarter: total domestic (21%), total EU
    reverse-charged per customer VAT number, total non-EU.

  · The EU reverse-charge total must reconcile exactly with box 3b of the
    VAT return, because it feeds the ICP-opgaaf, which is filed per customer
    VAT number per quarter and is separately mandatory.

  · Flag any order where reverse charge was applied but validation evidence
    is missing or failed. That list is an audit liability — surface it
    loudly.

DO NOT

  · Do not zero-rate on an unvalidated or format-only-checked VAT number.

  · Do not apply reverse charge to Dutch customers.

  · Do not treat a null company_name from DE/ES as a validation failure.

  · Do not display any price without an incl./excl. label.

  · Do not implement the KOR small-business exemption unless explicitly told
    to — it is incompatible with the model above.
```

---

## Part 2 — raw paste, exactly as received

```
═══════════════════════════════════════════════════════════════ 14 · VAT / BTW HANDLING ═══════════════════════════════════════════════════════════════ Seller: Dutch business, Enschede. Assume registered for VAT (NOT the KOR) — if that is wrong, stop and flag it, because the whole model below changes. DETERMINATION LOGIC (server-side only, never trust the client): NL customer, business or consumer ......... 21% NL VAT EU business, VIES-VALIDATED VAT number .... 0%, reverse charge EU, no valid VAT number ................... 21% NL VAT (treat as consumer) Non-EU business ........................... 0%, outside scope of EU VAT Never apply reverse charge to a Dutch customer — domestic supplies are always 21% regardless of whether they supply a VAT number. STRIPE IS NOT ENOUGH — this is the core requirement. Stripe Tax computes rates but does NOT verify a VAT number against VIES. It applies whatever tax_exempt flag we set. A customer can enter a well-formed but invalid or borrowed number and Stripe will zero-rate it without complaint, and the liability lands on us. Build validation ourselves in a Worker. VIES VALIDATION — Worker endpoint, called from step 5 of /start: · Server-side only. Never call from client JS. · Store the full validation result in D1 against the order: vat_number, valid true/false, company_name, company_address, country_code, timestamp, and the raw response. Tax authorities can demand proof that we validated BEFORE applying reverse charge. This record is the proof — it is not optional and it is not a nice-to-have. · KNOWN VIES QUIRKS, handle all of them explicitly: – Greece is "EL" in VIES, not "GR" per ISO 3166. Map it. – Germany and Spain never return company names (data protection). A null company_name must NOT be treated as an invalid result. – VIES goes down regularly, and individual member-state endpoints fail independently. On failure: do NOT silently zero-rate. Either charge 21% and refund on later successful validation, or hold the order in a "vat_pending" state. Log the failure either way. · Studio retainer (recurring): re-validate quarterly. VAT numbers get revoked, and a stale validation from signup is not a defence. PRICING DISPLAY — mixed audience, so this must be explicit per price: · Tier 1 (Drop Pilot, Full Drop, Brand Model, Studio retainer): display EXCLUDING VAT, labelled "excl. btw" / "excl. VAT" next to every figure. · Tier 0 (Catalog €39.99, Lifestyle €59.99, Video €49, the €0.99 sample): display INCLUDING VAT. EU consumer law requires consumer-facing prices to be shown inclusive, and these are reachable by consumers and sole traders. · Never show an unlabelled price. The comparison table and pricing page must carry the label on every number. · Shoot-day comparison figures (€2,500-8,000) are excl. VAT — say so once. /start STEP 5 — where the VAT field lives: · The VAT number field belongs on the CONFIRM step, not step 2, because entering it CHANGES THE PRICE. An EU business seeing €1,850 become €2,238.50 and then drop back is good UX; discovering it three steps later is not. · Show the breakdown explicitly: net, VAT line, total. When reverse charge applies, the VAT line reads "0,00 — btw verlegd / VAT reverse charged" rather than disappearing. · Live validation with visible state: checking / valid (show the returned company name where available) / not valid / VIES unavailable. INVOICING — generate from our own data, do not rely on Stripe's template: · Sequential invoice numbers, no gaps. · Our VAT number and KVK number on every invoice. · Reverse-charge invoices: customer's VAT number + the phrase "btw verlegd / VAT reverse charged" + reference to art. 44 EU VAT Directive 2006/112/EC. · Non-EU: state the supply is outside the scope of EU VAT. · Both EN and NL invoice templates. · Deposit invoices (50% on a drop) carry VAT on the deposit amount at the moment of invoicing, not deferred to final delivery. REPORTING SUPPORT — build the export, it is a quarterly obligation: · A dashboard export listing, per quarter: total domestic (21%), total EU reverse-charged per customer VAT number, total non-EU. · The EU reverse-charge total must reconcile exactly with box 3b of the VAT return, because it feeds the ICP-opgaaf, which is filed per customer VAT number per quarter and is separately mandatory. · Flag any order where reverse charge was applied but validation evidence is missing or failed. That list is an audit liability — surface it loudly. DO NOT · Do not zero-rate on an unvalidated or format-only-checked VAT number. · Do not apply reverse charge to Dutch customers. · Do not treat a null company_name from DE/ES as a validation failure. · Do not display any price without an incl./excl. label. · Do not implement the KOR small-business exemption unless explicitly told to — it is incompatible with the model above.
```
