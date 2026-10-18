# Hoekregel (levering 56): uit de meting op 12 breedtes (de meting van hoekmeting.mjs op 12 breedtes, regel.py).
# Bereiken: R1 >=1181, R2 901-1180, R3 641-900, R4 621-640, R5 381-620, R6 <=380.
MQ = {1:'(min-width: 1181px)',2:'(min-width: 901px) and (max-width: 1180px)',3:'(min-width: 641px) and (max-width: 900px)',4:'(min-width: 621px) and (max-width: 640px)',5:'(min-width: 381px) and (max-width: 620px)',6:'(max-width: 380px)'}
def alle(v): return {k:v for k in range(1,7)}
def r(d): return d
S = [
 # (selector zonder prefix, {bereik: 'tl tr br bl'}, opmerking)
 ('.h-look .h-look-pijl', alle('3 18 3 3'), 'plaatje rechtsboven in de lookkaart: 32 - 14'),
 ('.h-look .h-pil-nr', alle('18 3 3 3'), 'pil linksboven in de lookkaart: 32 - 14'),
 ('.h-ls-beeld .h-pil-nr', {1:'18 3 3 3',2:'18 3 3 3',3:'12 3 3 3',4:'12 3 3 3',5:'12 3 3 3',6:'12 3 3 3'}, 'lifestylebeeld: 32 - 14, op de telefoon 26 - 14'),
 ('.h-weten-boven .h-cirkel', alle('3 6 3 3'), 'plaatje rechtsboven in een kaart: 32 - 26, 28 - 22'),
 ('.h-dk-a .h-cirkel-klein', {1:'3 3 13 3',2:'3 3 13 3',3:'3 3 12 3',4:'3 3 12 3',5:'3 3 12 3',6:'3 3 12 3'}, 'dienstkaart rechtsonder'),
 ('.h-gd-kaart .h-pil', {4:'6 3 3 3',5:'6 3 3 3',6:'6 3 3 3'}, 'gidskaart linksboven, alleen op de telefoon in de hoek'),
 ('.h-hw-dienst .h-cirkel', {1:'3 10 3 3',2:'3 10 3 3',3:'3 10 3 3',4:'3 6 3 3',5:'3 6 3 3',6:'3 6 3 3'}, ''),
 ('.h-st-vk-a .h-cirkel', alle('3 3 6 3'), ''),
 ('.h-bm-een .h-bm-een-pil', alle('3 3 3 10'), 'pil linksonder op de foto: 22 - 12'),
 ('.h-cmp-kopregel > .is-ons', {1:'3 24 0 0',2:'3 24 0 0'}, 'de kolom van VISUAILS volgt rechts de tabel; links licht'),
 ('.h-cmp-rij.is-laatst > .is-ons', {1:'0 0 28 3',2:'0 0 28 3'}, ''),
 ('.h-ct-wa .h-knop', {1:'3 3 3 5',2:'3 3 3 5',3:'3 3 5 5',4:'3 3 7 7',5:'3 3 7 7',6:'3 3 7 7'}, 'WhatsApp-knop onderaan het vak'),
 ('.h-faq-nog .h-knop-inkt', {3:'3 0 0 8',4:'3 0 0 6',5:'3 0 0 6'}, 'knoppaar onderaan'),
 ('.h-faq-nog .h-knop-lijn', {3:'0 3 8 0',4:'0 3 6 0',5:'0 3 6 0',6:'3 3 6 6'}, ''),
 ('.h-faq-nog .h-faq-nog-ik', {4:'6 3 3 3',5:'6 3 3 3',6:'6 3 3 3'}, ''),
 ('.h-kopbeeld-getal .h-cirkel', {1:'3 9 3 3',2:'3 9 3 3',3:'3 8 3 3'}, ''),
 ('.h-lk-slot .h-knop-inkt', {3:'3 0 0 6',4:'3 0 0 6',5:'3 0 0 6'}, ''),
 ('.h-lk-slot .h-knop-lijn', {5:'3 3 6 6',6:'3 3 6 6'}, ''),
 ('.h-bm-bieb .h-knop-lijn', {4:'3 3 3 6',5:'3 3 3 6',6:'3 3 3 6'}, 'knop linksonder in het vak'),
 ('.h-ov-ctrl-balk > .h-pil', {1:'17.5 3 3 3',2:'17.5 3 3 3',3:'17.5 3 3 3',4:'13.5 3 3 3',5:'13.5 3 3 3',6:'13.5 3 3 3'}, ''),
 ('.h-ov-ctrl-paar figcaption.h-pil', {1:'3 3 3 14',2:'3 3 3 14',3:'3 3 3 14',4:'3 3 3 12',5:'3 3 3 12',6:'3 3 3 12'}, ''),
 ('.h-kopbeeld-paar figure figcaption.h-pil', {1:'3 3 3 16',2:'3 3 3 16',3:'3 3 3 16',4:'3 3 3 18',5:'3 3 3 18',6:'3 3 3 18'}, 'bijschrift linksonder op elk van de twee fotos'),
 ('.h-kopbeeld-foto figcaption.h-pil', {1:'3 3 3 16',2:'3 3 3 16',3:'3 3 3 16',4:'3 3 3 18',5:'3 3 3 18',6:'3 3 3 18'}, ''),
 ('.h-pr-band .h-knop-lijn', {3:'3 3 6 6',4:'3 3 6 6',5:'3 3 6 6',6:'3 3 6 6'}, 'op de telefoon onderaan over de hele breedte'),
 ('.h-pr-tarief .h-knop', {2:'3 3 3 11',3:'3 3 3 7',4:'3 3 3 7',5:'3 3 3 7'}, ''),
 ('.h-vd-kopen .h-knop-inkt', {4:'3 3 6 6',5:'3 3 6 6',6:'3 3 6 6'}, ''),
 ('.h-vd-kopen .h-knop-lijn', {4:'0 3 6 0',5:'0 3 6 0',6:'3 3 6 6'}, ''),
 ('.hl-bediening .h-paar > .h-cirkel:first-child', alle('3 0 0 3'), 'de bediening is een balk: langs zijn rechte randen geen zware hoek'),
 ('.jur-uit .h-knop-inkt', {3:'3 0 0 6',4:'3 0 0 6',5:'3 0 0 6',6:'3 0 0 6'}, ''),
 ('.jur-uit .h-knop-lijn', {5:'3 3 6 6',6:'3 3 6 6'}, ''),
 ('.h-pp-beeld .h-vink', {1:'2 8 2 2',2:'2 8 2 2',3:'2 8 2 2',4:'2 8 2 2',5:'2 14 2 2',6:'2 14 2 2'}, ''),
 ('.h-pp-schets .h-pp-plus', {1:'2 12 2 2',2:'2 12 2 2',3:'2 12 2 2',4:'2 12 2 2',5:'2 16 2 2',6:'2 16 2 2'}, ''),
 ('.h-ug-vraag .h-ug-vakje', {1:'6 3 3 3',2:'6 3 3 3',3:'6 3 3 3',4:'7 3 3 7',5:'7 3 3 7',6:'7 3 3 7'}, 'op de telefoon is de vraag een rij: links beide hoeken'),
 ('.h-rest-rij > li > i', {1:'6 3 3 3',2:'6 3 3 3',3:'8 3 3 3',4:'8 3 3 3',5:'8 3 3 3',6:'8 3 3 3'}, ''),
 ('.h-sd-onderweg-boven .h-cirkel', {3:'6 3 3 3',4:'6 3 3 3',5:'6 3 3 3',6:'6 3 3 3'}, ''),
 ('.h-sd-sl .h-cirkel', {3:'6 3 3 3',4:'6 3 3 3',5:'6 3 3 3',6:'6 3 3 3'}, ''),
 ('.h-dienst-eigen .h-cirkel', alle('8 3 3 3'), ''),
 ('.h-dienst-eigen .h-knop', {3:'3 3 3 8',4:'3 3 3 8',5:'3 3 3 8'}, ''),
 ('.h-ov-cijfer .h-cirkel', {1:'3 6 3 3',2:'3 6 3 3',3:'3 6 3 3',4:'3 7 3 3',5:'3 7 3 3',6:'3 7 3 3'}, ''),
 ('.h-ov-cijfer .h-pil', {1:'6 3 3 3',2:'6 3 3 3',3:'6 3 3 3',4:'7 3 3 3',5:'7 3 3 3',6:'7 3 3 3'}, ''),
 ('.h-hw-chips > li:last-child', {4:'3 3 8 8',5:'3 3 8 8',6:'3 3 8 8'}, 'het onderste kenmerk volgt beide hoeken van het vak'),
 ('.h-pk .h-knop', {2:'3 3 8 8',3:'3 3 8 8',4:'3 3 8 8',5:'3 3 8 8',6:'3 3 8 8'}, 'knop onderaan het plan'),
 ('.h-st-set .h-pil', {1:'6 3 3 3',2:'6 3 3 3',3:'6 3 3 3',4:'6 3 3 3',5:'12 3 3 3',6:'12 3 3 3'}, ''),
 ('.cc .cc-btn', {1:'3 3 3 3',2:'3 3 3 3',3:'3 3 3 3'}, 'de cookieknoppen: allebei dezelfde lichte hoeken. Weigeren moet er precies zo uitzien als toestaan (AVG, tests/cookie-consent), dus de eerste volgt de hoek van de balk hier niet'),
 ('.h-lagen li > i', alle('2 2 2 2'), 'de vinkjes in de animatie: de middelste recht'),
 ('.h-lagen li:first-child > i', alle('7 2 2 2'), 'het bovenste wijst naar de hoek linksboven: 16 - 9'),
 ('.h-lagen li:last-child > i', alle('2 2 2 7'), 'het onderste naar linksonder'),
]
def px(v): return ' '.join(('0' if x=='0' else f'{x}px') for x in v.split())
uit=[]
uit.append('''/* ══ DE HOEKREGEL — levering 56 (17 oktober 2026) ═══════════════════════════════
   Lucas (09:20): "Nieuwe regel is dat de ronde rand altijd met de hoek/rand mee gaat
   dus als de rand recht is is er geen ronde hoek. Dit geld alleen wanneer het in een
   container zit [...] Bij 'Start an order / Go to VISUAILS Studio' wel gewoon het
   huidige houden omdat die knoppen los zijn en groot in het midden staan."
   Dus, voor een plaatje, pil, knop of vakje binnen een vlak met ronde hoeken:
   - zit het in een hoek van dat vlak (beide afstanden kleiner dan de straal), dan
     loopt die hoek concentrisch mee: de straal van het vlak min de afstand;
   - de andere hoeken (langs een rechte rand, of naar binnen) zijn licht (3 px, 2 px
     bij een klein vakje); aan de kant van een snede blijft het 0;
   - staat het los in het vlak (verder dan 12 px van elke rand en niet in een hoek),
     dan houdt het zijn eigen zachte hoek linksboven. Pillen houden hun ronde
     uiteinden, en wat over de rand steekt (de brug tussen de stappen) blijft.
   Gemeten met kladblok/hoek/hoekmeting.mjs op 89 pagina's en 12 breedtes, net aan beide
   kanten van elk breekpunt; de waarden hieronder komen uit die meting, niet uit het
   oog. Dit vervangt de halve regel uit levering 54, die er een ronde hoek bij gaf
   maar de zware hoek linksboven liet staan (twee zachte hoeken). Het bestelformulier
   krijgt zijn hoeken met het nieuwe ontwerp. */''')
# basis (alle breedtes) eerst, dan per bereik
for sel,d,noot in S:
    if len(d)==6 and len(set(d.values()))==1:
        uit.append(f"html body.hal.hal {sel} {{ border-radius: {px(d[1])}; }}{('  /* '+noot+' */') if noot else ''}")
groepen={}
for sel,d,noot in S:
    if len(d)==6 and len(set(d.values()))==1: continue
    # voeg aaneengesloten bereiken met dezelfde waarde samen
    ks=sorted(d); i=0
    while i<len(ks):
        j=i
        while j+1<len(ks) and ks[j+1]==ks[j]+1 and d[ks[j+1]]==d[ks[i]]: j+=1
        lo,hi=ks[i],ks[j]
        mn={1:None,2:901,3:641,4:621,5:381,6:None}[hi]   # ondergrens hoort bij het laagste bereik (hi)
        mx={1:None,2:1180,3:900,4:640,5:620,6:380}[lo]
        conds=[]
        if hi!=6: conds.append(f'(min-width: {[None,1181,901,641,621,381][hi]}px)')
        if lo!=1: conds.append(f'(max-width: {[None,None,1180,900,640,620,380][lo]}px)')
        mq=' and '.join(conds) if conds else ''
        groepen.setdefault(mq,[]).append(f"  html body.hal.hal {sel} {{ border-radius: {px(d[lo])}; }}" + (f'  /* {noot} */' if noot and i==0 else ''))
        i=j+1
for mq,rs in groepen.items():
    if mq=='': uit.extend(x.strip() for x in rs)
    else: uit.append(f'@media {mq} {{\n'+'\n'.join(rs)+'\n}')
uit.append('''/* De kenmerken in het vak "met de hand" (how-it-works): op de telefoon allemaal even
   breed. Ze waren zo breed als hun tekst, en dan hing het van de tekst af of het
   onderste in de hoek rechtsonder kwam; nu staat het er altijd en loopt het mee. */
@media (max-width: 640px) {
  html body.hal.hal .h-hw-chips { align-items: stretch; }
}''')
uit.append('''/* De vinkjes: hun vak wordt in een smal vak (container query, zie boven bij .h-lagen)
   krapper (8 en 6 px in plaats van 10 en 8), dus loopt de hoek daar ruimer mee: 16 - 7. */
@container (max-width: 300px) {
  html body.hal.hal .h-lagen li:first-child > i { border-radius: 9px 2px 2px 2px; }
  html body.hal.hal .h-lagen li:last-child > i { border-radius: 2px 2px 2px 9px; }
}''')
uit.append('''/* Order in de topbalk: de balk is een pil (straal 26 op 52 hoog); de knop zit er 3 px
   onder de boven- en onderrand. Zijn rechterkant loopt dus mee als halve cirkel (26 - 3
   = 23 = de halve hoogte van de knop), links alleen de lichte hoeken. De balk krijgt
   rechts dezelfde 3 px als boven en onder (was 7), anders lopen de bogen niet gelijk. */
@media (min-width: 1181px) {
  body.hal .site-header .nav-cta { border-radius: 3px 23px 23px 3px !important; padding-right: 18px !important; }
  html body.hal .site-header .container.nav { padding-right: 3px; }
}''')
open('hoekregel.css','w').write('\n'.join(uit)+'\n')
print('\n'.join(uit)[:3500])
