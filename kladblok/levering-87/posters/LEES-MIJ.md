# Posters 13 – 20 (levering 87, 4 november 2026)

Acht posters van 1200 × 1500 (gefotografeerd op 1,6 × = 1920 × 2400), in het Nederlands en het Engels, met de foto's
uit `images\Before & After\Catalog Custom styles` (NONSTD en Room 84). Om en om bewogen (13, 15, 17, 19) en stil. De
teksten komen van de site, de prijzen uit `src/data/pricing.js`, de kleuren uit `docs/KLEURENSCHEMA.md`, het V-merk en
het woordmerk alleen herkleurd.

Opnieuw maken (Python 3 met numpy, scipy en Pillow; Node met Playwright):

    python3 beeld.py          # de bewogen beelden in img\ (15 gebruikt img\p15-masker.png, het uitgeknipte figuur)
    python3 maak.py           # posters-nl.html en posters-en.html
    set TAAL=nl & node render.cjs   (en TAAL=en)   # uit-nl\ en uit-en\, plus een kale versie zonder tekst
    python3 contrast.py nl    # het contrast van elke tekst tegen wat eronder ligt: 0 te laag
    python3 blad.py blad.jpg uit-nl

Staan de foto's ergens anders, zet dan VISUAILS_BEELDEN op die map.
