"""VISUAILS — de herkleuringen voor de catalogusanimatie op de kaart Productfoto's (levering 96, lijst 98 A2 a).

    python3 scripts/catalogus-kleuren-96.py

Alleen de stof kleurt (in HSV, met een zachte maskerrand); de vilten letters, het label, de rits en de grond blijven.
Bron: de voorkanten in public/img/hal/opening/galerij/. Uit: public/img/hal/maken/catalogus/<naam>.{webp,avif}, 480 × 600
(lijst 98 a: hoodie blauw en zwart, jeans zwart en indigo, sokken wit en zwart). Plus foto.{webp,avif}: de telefoonfoto
van de hoodie (public/img/hoodie-voor.webp), in 4 : 5 uit het midden, 720 × 900.
"""
import os
WORTEL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import colorsys
G=os.path.join(WORTEL,'public','img','hal','opening','galerij')+'/'
U=os.path.join(WORTEL,'public','img','hal','maken','catalogus')+'/'
GROND=np.array([251,253,255.])
def laad(n): return np.asarray(Image.open(G+n+'.webp').convert('RGB')).astype(float)/255
def hsv(a):
    import matplotlib.colors as mc
    return mc.rgb_to_hsv(a)
def rgb(h):
    import matplotlib.colors as mc
    return mc.hsv_to_rgb(h)
ZES={'hoodie-blauw','hoodie-zwart','jeans-zwart','jeans-indigo','sokken-wit','sokken-zwart'}
def bewaar(a,n):
    if n not in ZES: return
    im=Image.fromarray((np.clip(a,0,1)*255).astype('uint8')).resize((480,600),Image.LANCZOS)
    im.save(U+n+'.webp',quality=80,method=6); im.save(U+n+'.avif',quality=60)
# hoodie: blauw -> zwart en -> salie
a=laad('hoodie-0'); h=hsv(a)
blauw=(h[...,0]>0.55)&(h[...,0]<0.78)&(h[...,1]>0.18)
w=np.clip((h[...,1]-0.12)/0.2,0,1)*blauw
def herkleur(a,h,w,tint,licht,sat):
    h2=h.copy(); h2[...,0]=np.where(w>0,tint,h[...,0]); h2[...,1]=h[...,1]*sat; h2[...,2]=h[...,2]*licht
    b=rgb(h2); return a*(1-w[...,None])+b*w[...,None]
bewaar(a,'hoodie-blauw')
bewaar(herkleur(a,h,w,0.62,0.42,0.12),'hoodie-zwart')
bewaar(herkleur(a,h,w,0.28,0.95,0.22),'hoodie-salie')
bewaar(herkleur(a,h,w,0.02,0.80,0.80),'hoodie-bordeaux')
# jeans: zwart -> indigo
a=laad('broek-0'); h=hsv(a)
denim=(h[...,2]<0.8)&(np.abs(a-GROND/255).max(2)>0.06)
w=denim.astype(float)
h2=h.copy(); h2[...,0]=np.where(denim,0.61,h[...,0]); h2[...,1]=np.where(denim,np.clip(h[...,1]+0.38,0,1),h[...,1]); h2[...,2]=np.where(denim,h[...,2]*1.05,h[...,2])
bewaar(a,'jeans-zwart'); bewaar(rgb(h2),'jeans-indigo')
# sokken: gebroken wit -> zwart (de wol), het logo en de hiel blijven
a=laad('sokken-0'); h=hsv(a)
wol=(h[...,2]>0.72)&(h[...,1]<0.18)&(np.abs(a-GROND/255).max(2)>0.025)
w=wol.astype(float)
from PIL import ImageFilter
w=np.asarray(Image.fromarray((w*255).astype('uint8')).filter(ImageFilter.GaussianBlur(1.2))).astype(float)/255
zwart=a.copy(); zwart=1-a; zwart=zwart*0.0+ (a.mean(2,keepdims=True)*0.0)+0.16*(a/ a.max())
zwart=np.clip(0.11+ (a-0.85)*0.6,0,1)
bewaar(a,'sokken-wit'); bewaar(a*(1-w[...,None])+zwart*w[...,None],'sokken-zwart')

f=Image.open(os.path.join(WORTEL,'public','img','hoodie-voor.webp')).convert('RGB'); w,h=f.size; nh=int(w*1.25); t=(h-nh)//2
f=f.crop((0,t,w,t+nh)).resize((720,900),Image.LANCZOS); f.save(U+'foto.webp',quality=80,method=6); f.save(U+'foto.avif',quality=60)
