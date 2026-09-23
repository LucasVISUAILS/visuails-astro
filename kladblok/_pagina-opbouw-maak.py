# Maakt kladblok/pagina-opbouw.html uit de meting (_opbouw-meting.json) en de
# voorstellen hieronder. Links "nu" (gemeten), rechts "voorstel" (geschat), op
# dezelfde schaal. Draaien: python3 kladblok/_pagina-opbouw-maak.py
import json, html, os

HIER = os.path.dirname(os.path.abspath(__file__))
M = json.load(open(os.path.join(HIER, '_opbouw-meting.json')))

# (label, hoogte in px op 1440, status) — status: blijft | nieuw | kleiner | samen | slot
V = {
 '/nl/catalog/': ('Wat krijg ik voor mijn product, en hoe ziet het eruit?', [
   ('Opening — laptop, feiten, twee knoppen', 1190, 'blijft'),
   ('Voor-en-na (was blok 5)', 800, 'nieuw'),
   ('Stijlen als strook — Classic, Op maat, wat eraan komt', 650, 'kleiner'),
   ('Prijs in één regel → Prijzen', 250, 'kleiner'),
   ('Vragen (4)', 650, 'blijft'),
   ('Slot — twee knoppen', 340, 'slot')],
   ['Drie stappen naar een strakke catalogus (staat op /how-it-works)']),
 '/nl/lifestyle/': ('Welke scène past bij mijn merk?', [
   ('Opening', 1050, 'blijft'),
   ('Het assortiment, in beweging (was blok 5)', 750, 'nieuw'),
   ('Vier sferen als strook — één echte foto per sfeer', 700, 'kleiner'),
   ('Eén product, drie foto’s + prijs in één regel', 500, 'samen'),
   ('Vragen', 650, 'blijft'),
   ('Slot — twee knoppen', 340, 'slot')],
   ['Drie stappen naar een carousel', 'de lege tegels in de sferen (4 per sfeer)']),
 '/nl/video/': ('Kan ik dit krijgen, en hoe vraag ik het aan?', [
   ('Opening — aanvragen als hoofdknop', 990, 'blijft'),
   ('Drie soorten als kaarten, één “clip volgt” elk', 750, 'kleiner'),
   ('Strakke beweging + twee manieren om te kopen', 520, 'kleiner'),
   ('Vragen', 650, 'blijft'),
   ('Slot — twee knoppen', 340, 'slot')],
   ['Drie stappen naar een bewegend product']),
 '/nl/how-it-works/': ('Wat gebeurt er van bestelling tot levering?', [
   ('Opening', 600, 'blijft'),
   ('Je bestelling, van begin tot eind (de stations)', 1380, 'blijft'),
   ('Meer dan AI. Met de hand afgewerkt.', 620, 'blijft'),
   ('De details + overal waar hij heen moet — één blok', 850, 'samen'),
   ('Slot', 520, 'slot')], []),
 '/nl/pricing/': ('Wat kost het voor mijn aantal producten?', [
   ('Opening', 700, 'blijft'),
   ('De prijs per product — de tabel (was blok 3)', 1300, 'nieuw'),
   ('Wat er verder een tarief heeft — twee kolommen', 900, 'kleiner'),
   ('Abonnementen als smalle band → /plans', 280, 'kleiner'),
   ('Slot met de proef', 360, 'slot')],
   ['Dit is één product (de laptop, 1.078 px) → één regel onder de tabel', 'Voordat je een bestelling plaatst (gaat op in het slot)']),
 '/nl/plans/': ('Wat kost een abonnement en wat zit erin?', [
   ('Opening', 460, 'blijft'),
   ('De drie abonnementen (was blok 4)', 1240, 'nieuw'),
   ('Wat een abonnement eigenlijk is — ingekort', 600, 'kleiner'),
   ('En wat eraan komt (#binnenkort)', 670, 'blijft'),
   ('Toch liever niet elke maand + slot', 480, 'samen')],
   ['Elk product krijgt dit (de laptop, 1.129 px)']),
 '/nl/start/': ('Wat wil ik laten maken?', [
   ('Wat gaan we maken? — zonder de Hooks- en Editions-kaart', 1900, 'kleiner'),
   ('Ook: Hooks · Editions — één regel', 60, 'nieuw'),
   ('Of betaal er maandelijks voor', 310, 'blijft'),
   ('Wat er gebeurt nadat je erop drukt', 790, 'blijft'),
   ('Merkmodel — één regel', 120, 'kleiner'),
   ('Slot', 380, 'slot')], []),
 '/nl/test-sample/': ('Hoe probeer ik het voor €1?', [
   ('Opening', 630, 'blijft'),
   ('Wat maken we voor je? (formulier)', 1170, 'blijft'),
   ('Wat je krijgt', 380, 'blijft'),
   ('Hoe de proef werkt + kleine lettertjes', 560, 'samen'),
   ('Slot', 380, 'slot')], []),
 '/nl/gallery/': ('Wat krijg ik, als ik mijn foto’s stuur?', [
   ('Vandaag herbouwd: “Zo ziet een levering eruit” + Alle beelden', 2570, 'blijft')], []),
 '/nl/about/': ('Wie zit hierachter?', [
   ('Opening = “Ik ben Lucas.” (foto + twee alinea’s)', 700, 'nieuw'),
   ('Drie dingen waar we aan vasthouden', 890, 'blijft'),
   ('Eén rij van drie beelden', 600, 'kleiner'),
   ('Slot', 330, 'slot')],
   ['De hero “Studiobeelden, zonder studio” (dat is de voorpagina)', 'Voor merken met meer producten dan shootdagen (staat op de voorpagina)']),
 '/nl/contact/': ('Hoe bereik ik jullie het snelst?', [
   ('Direct contact (met “Je spreekt Lucas”) · bericht', 1200, 'nieuw'),
   ('Slot', 430, 'slot')],
   ['De opening met de grote modelfoto (904 px)']),
 '/nl/faq/': ('Staat mijn vraag erbij?', [
   ('Opening', 630, 'blijft'),
   ('Categorieën als tabs — één tegelijk, zonder JS alles', 1900, 'kleiner'),
   ('Slot', 350, 'slot')], []),
 '/nl/guides/': ('Wat moet ik weten vóór ik bestel?', [
   ('Opening + vijf gidsen', 1300, 'blijft'),
   ('Studiobrief (vandaag)', 210, 'blijft'),
   ('Slot', 350, 'slot')], []),
 '/nl/models/': ('Welke gezichten kan ik kiezen?', [
   ('Opening', 700, 'blijft'),
   ('De volledige bibliotheek', 1030, 'blijft'),
   ('Inbegrepen, niet erbij kopen', 760, 'blijft'),
   ('Slot — twee knoppen', 330, 'slot')], []),
 '/nl/custom-models/': ('Wat is een merkmodel en wat kost het?', [
   ('Opening', 810, 'blijft'),
   ('Echt geleverd werk (was onderin blok 4)', 600, 'nieuw'),
   ('Jouw model, niet een model + wat het kost', 900, 'samen'),
   ('Hoe een merkmodel tot stand komt — één rij', 650, 'kleiner'),
   ('De negen richtingen — korte rij', 350, 'kleiner'),
   ('Slot', 330, 'slot')],
   ['De standaardbibliotheek als blok → één regel naar /models']),
 '/nl/compare/': ('Waarom niet gewoon een shootdag?', [
   ('Opening', 540, 'blijft'),
   ('De tabel — zonder de twee lege beeldvakken', 900, 'kleiner'),
   ('Wat op één lijn moet komen + de week eromheen', 900, 'samen'),
   ('Waar een shootdag nog steeds wint', 700, 'blijft'),
   ('Self-serve tool', 700, 'kleiner'),
   ('Slot', 390, 'slot')], []),
 '/nl/studio/': ('Hoe komen jullie aan een datum?', [
   ('Opening', 800, 'blijft'),
   ('De agenda (kamer)', 1430, 'blijft'),
   ('Reken terug vanaf livegang (was blok 5)', 980, 'nieuw'),
   ('Eén tabel + de laatste stap is een specialist', 900, 'samen'),
   ('Wat dit niet doet', 450, 'kleiner'),
   ('Slot', 410, 'slot')], []),
 '/nl/per-product/': ('Wat krijg ik per product?', [
   ('Blijft zoals hij is', 2200, 'blijft')], []),
 '/nl/upload-guidelines/': ('Hoe maak ik de foto die jullie nodig hebben?', [
   ('Opening', 650, 'blijft'),
   ('Welke foto welk beeld wordt', 1130, 'blijft'),
   ('Wel doen / vermijden — met echte telefoonfoto’s', 1180, 'blijft'),
   ('De set die we aanraden', 1430, 'blijft'),
   ('Slot', 350, 'slot')], []),
 '/nl/hooks/': ('Wat is een hook, en kan ik er een krijgen?', [
   ('Opening', 950, 'blijft'),
   ('Wat het is (kamer) — ingekort', 900, 'kleiner'),
   ('Wat er in je map komt + wat het kost', 800, 'samen'),
   ('Vragen', 650, 'blijft'),
   ('Slot — aanvragen + Studiobrief', 520, 'slot')],
   ['De formats', 'Vier stappen', 'Wat er verandert bij 10 producten', 'Waar je op kunt rekenen (gaat op in het slot)']),
 '/nl/editions/': ('Wat is Editions, en wanneer kan het?', [
   ('Opening', 1110, 'blijft'),
   ('Twee sets, en maar één ervan kost iets', 900, 'blijft'),
   ('Er zit geen product in (kamer) — ingekort', 800, 'kleiner'),
   ('Vragen', 650, 'blijft'),
   ('Slot — aanvragen + Studiobrief', 620, 'slot')],
   ['De maand waarin niets nieuws zit', 'Eén keer opzetten', 'Het twaalf-maandenblok', 'Waar je op kunt rekenen', 'Gedeeld betekent gedeeld (naar de FAQ)']),
 '/nl/ai-act/': ('Wat zeggen jullie over AI?', [
   ('Juridisch — niet aanraken', 3580, 'blijft')], []),
 '/nl/lifestyle/dunes/': ('Hoe ziet Dunes eruit?', [
   ('Opening', 770, 'blijft'),
   ('Band', 660, 'blijft'),
   ('Vlak vs. Dunes', 990, 'blijft'),
   ('Raster — alleen de beelden die er zijn', 800, 'kleiner'),
   ('Hoe Dunes voelt + ideaal voor', 600, 'samen'),
   ('Slot', 260, 'slot')], ['Hoe Dunes tot stand komt (staat op /how-it-works)']),
 '/nl/catalog/classic/': ('Hoe ziet Classic eruit?', [
   ('Opening', 750, 'blijft'),
   ('Wat Classic met een echte foto doet (was blok 4)', 830, 'nieuw'),
   ('Raster — alleen de beelden die er zijn', 800, 'kleiner'),
   ('Wat er in elk kader gaat + ideaal voor', 800, 'samen'),
   ('Slot', 320, 'slot')], ['Hoe Classic voelt (gaat op in de opening)']),
 '/nl/video/motion/': ('Hoe ziet Motion eruit?', [
   ('Opening', 920, 'blijft'),
   ('Strook + Motion in beweging', 1300, 'samen'),
   ('Wat er in elk kader gaat + ideaal voor', 800, 'samen'),
   ('Slot', 320, 'slot')], ['Hoe Motion voelt (gaat op in de opening)']),
}

KLEUR = {'blijft': '#E4E7EC', 'nieuw': '#E4DFFF', 'kleiner': '#FFF1D6', 'samen': '#DDF1E4', 'slot': '#1A1A1A'}
SCHAAL = 0.055   # px op de tekening per px op de site

def punt(n):
    return f'{n:,}'.replace(',', '.')

def blok(label, h, status, weg=False):
    kleur = '#FBE3E3' if weg else KLEUR.get(status, '#E4E7EC')
    tekst = '#F2F3F5' if status == 'slot' and not weg else '#000'
    rand = 'border:1px dashed #B42318;' if weg else ''
    hh = max(22, round(h * SCHAAL))
    return f'<div class="b" style="height:{hh}px;background:{kleur};color:{tekst};{rand}"><span>{html.escape(label)}</span><i>{punt(h)}</i></div>'

rijen = []
tot_nu = tot_v = 0
for pad, (vraag, blokken, weg) in V.items():
    m = M.get(pad, {}).get('1440')
    if not m: continue
    nu = m['hoogte']; v = sum(h for _, h, _ in blokken) + 900  # + kop en voettekst, ongeveer
    if pad in ('/nl/ai-act/', '/nl/per-product/', '/nl/gallery/'): v = nu
    tot_nu += nu; tot_v += v
    links = ''.join(blok((lambda t: t[:1].upper() + t[1:].lower())((s['kop'] or s['tag'].split('.')[-1])[:70]), s['h'], 'blijft') for s in m['secties'])
    rechts = ''.join(blok(l, h, st) for l, h, st in blokken)
    wegl = ''.join(f'<li>{html.escape(w)}</li>' for w in weg)
    verschil = round((v - nu) / nu * 100)
    rijen.append(f'''
  <section class="pg">
    <header><h2>{html.escape(pad.replace('/nl', '') or '/')}</h2><p>“{html.escape(vraag)}”</p>
      <span class="mono">nu {punt(nu)} px · {len(m['secties'])} blokken → voorstel ±{punt(v)} px · {len(blokken)} blokken ({verschil:+d} %)</span></header>
    <div class="twee">
      <div><p class="mono">Nu (gemeten)</p>{links}</div>
      <div><p class="mono">Voorstel</p>{rechts}{f'<p class="mono weg">Weg of naar één regel</p><ul class="weg">{wegl}</ul>' if wegl else ''}</div>
    </div>
  </section>''')

pagina = f'''<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Alle pagina’s — opbouw</title>
<style>
  :root {{ --vel:#F2F3F5; --inkt:#000; --inkt-2:rgb(0 0 0/.62); --lijn:rgb(0 0 0/.16); --accent:#4A1FFF; }}
  * {{ box-sizing:border-box }}
  body {{ margin:0; background:#CFD3DA; font-family:"Figtree","Helvetica Neue",Arial,sans-serif; color:var(--inkt); font-size:14px; line-height:1.45 }}
  .mono {{ font-family:ui-monospace,Menlo,monospace; font-size:11px; letter-spacing:.05em; text-transform:uppercase; color:var(--inkt-2) }}
  .vel {{ width:min(100%,1180px); margin:28px auto; background:var(--vel) }}
  .kop {{ padding:22px 28px; background:#fff; border-bottom:1px solid var(--lijn) }}
  .kop h1 {{ margin:0 0 6px; font-size:20px }}
  .kop p {{ margin:0; color:var(--inkt-2); max-width:78ch }}
  .legenda {{ display:flex; flex-wrap:wrap; gap:14px; margin-top:12px; font-size:12px; color:var(--inkt-2) }}
  .legenda i {{ display:inline-block; width:14px; height:14px; border-radius:3px; vertical-align:-2px; margin-right:6px; border:1px solid var(--lijn) }}
  .pg {{ padding:22px 28px; border-bottom:1px solid var(--lijn) }}
  .pg header h2 {{ margin:0; font-size:18px }}
  .pg header p {{ margin:2px 0 6px; font-style:italic; color:var(--inkt-2) }}
  .twee {{ display:grid; grid-template-columns:1fr 1fr; gap:22px; margin-top:12px; align-items:start }}
  .b {{ display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:3px; padding:0 10px; border-radius:4px; font-size:12px; overflow:hidden }}
  .b span {{ white-space:nowrap; overflow:hidden; text-overflow:ellipsis }}
  .b i {{ font-style:normal; font-family:ui-monospace,Menlo,monospace; font-size:10px; opacity:.7 }}
  .weg {{ color:#B42318 }}
  ul.weg {{ margin:4px 0 0; padding-left:18px; font-size:12px }}
  p.weg {{ margin:12px 0 0 }}
  @media (max-width:760px) {{ .twee {{ grid-template-columns:1fr }} }}
</style></head><body><div class="vel">
  <div class="kop">
    <h1>Alle pagina’s — nu en voorstel</h1>
    <p>Links wat er nu staat (gemeten op 1440, gebouwde site), rechts het voorstel, op dezelfde schaal. De uitleg per pagina staat in PAGINA-OPBOUW.md. Samen: nu {str(f'{tot_nu:,}').replace(',', '.')} px → voorstel ±{str(f'{tot_v:,}').replace(',', '.')} px ({round((tot_v-tot_nu)/tot_nu*100):+d} %).</p>
    <div class="legenda"><span><i style="background:#E4E7EC"></i>blijft</span><span><i style="background:#E4DFFF"></i>nieuw of naar voren</span><span><i style="background:#FFF1D6"></i>kleiner</span><span><i style="background:#DDF1E4"></i>samengevoegd</span><span><i style="background:#1A1A1A"></i>slot</span><span><i style="background:#FBE3E3;border:1px dashed #B42318"></i>weg</span></div>
  </div>
  {''.join(rijen)}
</div></body></html>'''
open(os.path.join(HIER, 'pagina-opbouw.html'), 'w').write(pagina)
print(tot_nu, tot_v, round((tot_v - tot_nu) / tot_nu * 100))
