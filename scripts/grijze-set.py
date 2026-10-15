"""
VISUAILS — de roze-jeans-set op lichtgrijs. 15 oktober 2026.

Lucas: "Ik wil alle roze broek voorbeelden toch licht grijs maken … Zorg ervoor dat
alle achtergrond kleuren gemeten zijn en niet gegokt."

    python scripts/grijze-set.py            → .render/grijze-set/*.png
    daarna: sharp → webp (quality 86, effort 6) in public/img, en npm run avif

Wat het doet:
  1 · METEN. De grijswaarde is de mediaan van de studiogrond van de echte modelfoto
      (ba2-na-model.webp), over de pixels die in de witte versie (ba2-na-model-wit)
      wit gemaakt zijn en geen shirt of schoen zijn. Uitkomst: #EFEFEF.
  2 · VOORKANT, ACHTERKANT, DETAIL. Alles wat geen broek is (het wit en de natuurlijke
      schaduw) wordt met die waarde vermenigvuldigd; de broek blijft pixel voor pixel.
      De voorkant gebruikt de bestaande uitsnede (ba2-na-front-uitgeknipt); achterkant
      en detail een masker op roodheid (R−G), met gevulde gaten (de knoop) en een zachte
      rand. Op de voorkant komt dat masker op 99,7 % overlap met de uitsnede.
  3 · DE MODELFOTO. Vlakgetrokken: de grond als glad oppervlak geschat (polynoom van
      graad 4, daarna een fijne stap) en het beeld erdoor gedeeld, zodat de grond overal
      #EFEFEF is en de schaduw onder de schoenen zijn verhouding houdt.
Na het opslaan gemeten in webp en avif: #EFEFEF langs alle randen (zie
tests/doorloop-27c.test.mjs).
"""
import os
from PIL import Image
import numpy as np
from scipy import ndimage as ndi

IMG = os.path.join(os.path.dirname(__file__), '..', 'public', 'img')
UIT = os.path.join(os.path.dirname(__file__), '..', '.render', 'grijze-set')
# Een masker van de roze jeans op wit: roodheid (R-G), gaten gevuld, zachte rand.
def masker(pad):
    a=np.asarray(Image.open(pad).convert('RGB')).astype(float)
    r,g,b=a[...,0],a[...,1],a[...,2]
    rood=r-g
    licht=255-a.mean(axis=2)
    ruw=np.clip((rood-3)/10,0,1)
    kern=ndi.binary_fill_holes(ndi.binary_closing(ruw>0.5, iterations=3))
    kern=ndi.binary_opening(kern, iterations=2)
    # alleen de grootste vorm(en)
    lab,n=ndi.label(kern); 
    if n>1:
        maten=ndi.sum(kern,lab,range(1,n+1)); houd=[i+1 for i,m in enumerate(maten) if m>0.02*kern.sum()]
        kern=np.isin(lab,houd)
    binnen=ndi.binary_erosion(kern, iterations=2)
    zacht=ndi.gaussian_filter(kern.astype(float),0.8)
    A=np.maximum(np.where(ndi.binary_dilation(kern,iterations=2), np.maximum(ruw,zacht), 0), binnen.astype(float))
    return a, np.clip(A,0,1)

# Vlakveld: schat de achtergrond B(x,y) als glad oppervlak (polynoom) uit de
# achtergrondpixels en deel het beeld erdoor: out = beeld * T / B. De achtergrond
# wordt dan overal T, schaduw en voorgrond houden hun verhouding ertegen.
def veld(a, masker, graad=3, rondes=4):
    h,w,_=a.shape
    yy,xx=np.mgrid[0:h,0:w]
    X=(xx/(w-1))*2-1; Y=(yy/(h-1))*2-1
    termen=[X**i*Y**j for i in range(graad+1) for j in range(graad+1-i)]
    M=np.stack([t[masker] for t in termen],1)
    B=np.zeros_like(a)
    for c in range(3):
        v=a[...,c][masker]; keep=np.ones(len(v),bool)
        for _ in range(rondes):
            coef,*_=np.linalg.lstsq(M[keep],v[keep],rcond=None)
            res=v-M@coef
            keep=res>-3.5   # schaduw en voorgrondresten eruit
        B[...,c]=sum(cf*t for cf,t in zip(coef,termen))
    return B
def vlak(a, masker, T, graad=3):
    B=veld(a,masker,graad)
    return np.clip(a*(np.asarray(T,float)/B),0,255), B

def fijn(a, masker, T, sigma=30):
    """Tweede stap: wat het polynoom laat liggen, glad uitgemiddeld over de
    achtergrondpixels (genormaliseerde convolutie), en daardoor delen."""
    m=masker.astype(float)
    uit=a.copy()
    for c in range(3):
        som=ndi.gaussian_filter(a[...,c]*m, sigma); gew=ndi.gaussian_filter(m, sigma)
        B=np.where(gew>1e-3, som/np.maximum(gew,1e-3), T[c])
        # onder de persoon: verder uitsmeren
        gg=ndi.gaussian_filter(m, sigma*4)
        groot=np.where(gg>1e-2, ndi.gaussian_filter(a[...,c]*m, sigma*4)/np.maximum(gg,1e-2), T[c])
        w=np.clip(gew/0.3,0,1)
        B=w*B+(1-w)*groot
        uit[...,c]=a[...,c]*T[c]/B
    return np.clip(uit,0,255)

def lees(n):
    return np.asarray(Image.open(os.path.join(IMG, n)).convert('RGB')).astype(float)

def main():
    os.makedirs(UIT, exist_ok=True)
    g, w = lees('ba2-na-model.webp'), lees('ba2-na-model-wit.webp')
    d = np.abs(g - w).mean(axis=2)
    bg = (d > 8) & (g.mean(axis=2) < 246) & (w.mean(axis=2) >= 253)
    T = np.round(np.median(g[bg], axis=0))
    print('gemeten grond: #%02X%02X%02X' % tuple(int(x) for x in T))
    k = T / 255.
    def zet(naam, A):
        a = lees(naam + '.webp')
        uit = A[..., None] * a + (1 - A[..., None]) * a * k
        Image.fromarray(np.clip(np.round(uit), 0, 255).astype(np.uint8)).save(os.path.join(UIT, naam + '-grijs.png'))
    uitsnede = np.asarray(Image.open(os.path.join(IMG, 'ba2-na-front-uitgeknipt.webp')))[..., 3] / 255.
    zet('ba2-na-front', uitsnede)
    zet('ba2-na-achter', masker(os.path.join(IMG, 'ba2-na-achter.webp'))[1])
    zet('ba2-na-detail', masker(os.path.join(IMG, 'ba2-na-detail.webp'))[1])
    bg3 = ndi.binary_erosion(bg, iterations=3)
    o1, _ = vlak(g, bg3, T, graad=4)
    o2 = fijn(o1, bg3 & (np.abs(o1.mean(2) - T.mean()) < 5), T)
    Image.fromarray(np.round(o2).astype(np.uint8)).save(os.path.join(UIT, 'ba2-na-model-grijs.png'))

if __name__ == '__main__':
    main()
