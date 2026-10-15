"""
VISUAILS — de tien modelportretten gelijk: dezelfde grond, dezelfde maat. 15 oktober 2026.

Lucas: "alle modelfoto's van de modellen alle achtergrondkleuren precies gelijk maakt en
de modellen dezelfde hoogte geeft zodat ze zo consistent mogelijk naast elkaar ogen.
Sommige modellen staan namelijk iets verder van de camera dan anderen."

    YUNET=pad/naar/face_detection_yunet_2023mar.onnx python scripts/modellen-gelijk.py [factor]
    → .render/modellen/model-<naam>.png en plan.json
    LET OP: draai het op de ORIGINELEN (git, de versie van vóór 15 oktober 2026). Op de
    bewerkte foto's zoomt het opnieuw 3 % in.
    daarna: sharp → webp (quality 84, effort 5) op 1195, 800, 380 en 160 breed, en npm run avif

  1 · DE GROND. Per foto de pixels die bij de rand horen, licht en zonder kleur (min > 222,
      max−min < 16), niet in de onderste 20 % (het shirt). Gemeten: tien verschillende
      tinten, van #F5FAFB tot #FDFFFE. Het doel is de mediaan over alle tien: #F8FCFE.
      Elke foto wordt vlakgetrokken (glad oppervlak geschat, beeld erdoor gedeeld), zodat
      de grond overal precies dat is; het gezicht verschuift daarbij minder dan 2 %.
  2 · DE MAAT. YuNet (OpenCV, opencv_zoo, MIT-licentie) vindt de ogen; het midden van elke
      iris wordt daarna zelf gezocht (het donkerste vlekje rond het oogpunt). De maat is de
      pupilafstand. Alle tien worden opgeschaald naar 3 % boven de grootste, met de ogen op
      één lijn en in het midden; nergens wordt er verkleind, zodat er onderin geen rand
      onder het shirt ontstaat (uitgerekend, niet gehoopt: zie de bedekkingstoets).
  3 · NAMETEN. Na de bewerking opnieuw gemeten: ogen op (597 ± 3, 661 ± 3), pupilafstand
      394 ± 2 px, grond #F8FCFE; na webp/avif ±1 in één kanaal (afronding van het formaat).
"""
import os, sys, json
import numpy as np, cv2
from PIL import Image
from scipy import ndimage as ndi

IMG = os.path.join(os.path.dirname(__file__), '..', 'public', 'img')
UIT = os.path.join(os.path.dirname(__file__), '..', '.render', 'modellen')
os.makedirs(UIT, exist_ok=True)
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

M=os.environ.get('YUNET', os.path.join(os.path.dirname(__file__), '..', '.render', 'yunet.onnx'))
SCHALEN=(288,320,352,384,416,448,480,512,560,640)
def punten(rgb):
    """De vijf punten van YuNet, als mediaan over tien beeldmaten (één maat is te
    onrustig: ±20 px op een oog bij 1195 px breed)."""
    h,w,_=rgb.shape
    rijen=[]
    for doel in SCHALEN:
        s=doel/w
        klein=cv2.resize(rgb[:,:,::-1],(int(round(w*s)),int(round(h*s))),interpolation=cv2.INTER_AREA)
        det=cv2.FaceDetectorYN.create(M,"",(klein.shape[1],klein.shape[0]),0.5,0.3,5000)
        _,f=det.detect(klein)
        if f is None: continue
        f=f[0].copy()
        if f[14]<0.8: continue
        f[:14]/=s; rijen.append(f)
    if not rijen: return None
    f=np.median(np.stack(rijen),0)
    return {'oogR':f[4:6],'oogL':f[6:8],'neus':f[8:10],'mondR':f[10:12],'mondL':f[12:14],'box':f[:4],'score':float(f[14]),'n':len(rijen),
            'spreiding':float(np.median(np.std(np.stack(rijen)[:,4:14],0)))}

def verfijn(rgb):
    """Precies: de irissen (het donkerste vlekje rond elk oogpunt) en de lijn tussen
    de lippen (de donkerste rij rond de mond). Geeft oog-midden, pupilafstand en
    oog-tot-lippen."""
    p=punten(rgb)
    if p is None: return None
    g=ndi.gaussian_filter(rgb.astype(float).mean(2),1.5)
    def iris(x,y):
        x0,x1=int(x-45),int(x+45); y0,y1=int(y-22),int(y+22)
        v=g[y0:y1,x0:x1]
        drempel=np.percentile(v,7)
        m=v<=drempel
        lab,n=ndi.label(m)
        if n>1:
            grootte=ndi.sum(m,lab,range(1,n+1)); m=lab==(np.argmax(grootte)+1)
        yy,xx=np.nonzero(m)
        w=(drempel-v[m]+1)
        return np.array([x0+(xx*w).sum()/w.sum(), y0+(yy*w).sum()/w.sum()])
    oR=iris(*p['oogR']); oL=iris(*p['oogL'])
    oog=(oR+oL)/2
    mx=(p['mondR'][0]+p['mondL'][0])/2; my=(p['mondR'][1]+p['mondL'][1])/2
    v=g[int(my-40):int(my+40), int(mx-60):int(mx+60)]
    lip=int(my-40)+int(np.argmin(v.mean(1)))
    return {'oog':oog,'ipd':float(np.linalg.norm(oR-oL)),'oogLip':float(lip-oog[1]),'maat':float((np.linalg.norm(oR-oL)+(lip-oog[1]))/2),'oR':oR,'oL':oL,'lip':lip}

NAMEN=['aaron','ava','dana','elias','fabi','lisa','maegan','rae','ryan','seme']
def grondmasker(a):
    mn=a.min(2); mx=a.max(2)
    kand=(mn>222)&((mx-mn)<16)
    lab,n=ndi.label(kand)
    h,w=kand.shape
    rand=set(np.unique(np.concatenate([lab[0,:],lab[:,0],lab[:,-1],lab[:h//2,0],lab[:h//2,-1]])))-{0}
    m=np.isin(lab,list(rand))
    m[int(h*0.80):,:]=False   # onderin zit het shirt
    return ndi.binary_erosion(m,iterations=4)
beeld={}; maskers={}; alle=[]
for n in NAMEN:
    a=np.asarray(Image.open(os.path.join(IMG, f'model-{n}.webp')).convert('RGB')).astype(float)
    m=grondmasker(a); beeld[n]=a; maskers[n]=m; alle.append(a[m])
    med=np.median(a[m],0)
    print(f'{n:7s} grond voor #%02X%02X%02X' % tuple(int(round(x)) for x in med), f'spreiding p5-p95 {np.percentile(a[m].mean(1),5):.0f}-{np.percentile(a[m].mean(1),95):.0f}', f'masker {m.mean():.2f}')
T=np.round(np.median(np.concatenate(alle),0))
print('DOEL grond (mediaan van alle tien) #%02X%02X%02X' % tuple(int(x) for x in T))
# maat en ogen: de irissen (verfijn), de pupilafstand als maat
info={}
for n in NAMEN:
    r=verfijn(beeld[n].astype(np.uint8))
    info[n]=dict(oog=r['oog'],maat=r['ipd'])
    print(f"{n:7s} ogen op {r['oog'].round(1)}, pupilafstand {r['ipd']:.1f}")
FACTOR=float(sys.argv[1]) if len(sys.argv)>1 else 1.03
mt=max(v['maat'] for v in info.values())*FACTOR
h,w=1600,1195
for n,v in info.items():
    s=mt/v['maat']; v['s']=s
    ex,ey=v['oog']
    v['ty']=(h - s*(h-ey), s*ey); v['tx']=(w - s*(w-ex), s*ex)
lo=max(v['ty'][0] for v in info.values()); hi=min(v['ty'][1] for v in info.values())
lox=max(v['tx'][0] for v in info.values()); hix=min(v['tx'][1] for v in info.values())
print(f'oogregel kan tussen y {lo:.0f} en {hi:.0f}, x {lox:.0f}-{hix:.0f}')
Ty=hi-2; Tx=min(max(w/2,lox),hix)
print(f'gekozen oog op ({Tx:.0f}, {Ty:.0f}), maat {mt:.0f}')
json.dump({'T':T.tolist(),'Tx':float(Tx),'Ty':float(Ty),'mt':float(mt),'info':{n:{'s':float(v['s']),'oog':[float(x) for x in v['oog']],'maat':float(v['maat'])} for n,v in info.items()}},open(os.path.join(UIT,'plan.json'),'w'),indent=1)
for n in NAMEN:
    a=beeld[n]; m=maskers[n]; v=info[n]
    o1,_=vlak(a,m,T,graad=3)
    o2=fijn(o1,m&(np.abs(o1.mean(2)-T.mean())<6),T)
    s=v['s']; ex,ey=v['oog']
    M=np.array([[s,0,Tx-s*ex],[0,s,Ty-s*ey]],np.float32)
    uit=cv2.warpAffine(o2.astype(np.float32),M,(w,h),flags=cv2.INTER_LANCZOS4,borderMode=cv2.BORDER_REPLICATE)
    # bedekking, uitgerekend: de hoeken van het uitvoervak vallen binnen het origineel
    for X,Y in [(0,0),(w,0),(0,h),(w,h)]:
        bx=(X-(Tx-s*ex))/s; by=(Y-(Ty-s*ey))/s
        assert -0.5<=bx<=w+0.5 and -0.5<=by<=h+0.5, (n,X,Y,bx,by)
    Image.fromarray(np.clip(np.round(uit),0,255).astype(np.uint8)).save(os.path.join(UIT, f'model-{n}.png'))
    print(n,'schaal',round(s,3))
