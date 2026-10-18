import math, json
from shapely.geometry import Polygon, box
from shapely import affinity
from shapely.geometry.polygon import orient

A = math.radians(66.5)                 # staart op het rechterbeen van de V
d = (math.cos(A), math.sin(A))         # omlaag-rechts
p = (math.sin(A), -math.cos(A))        # loodrecht erop
H = 64.0
KIER = 0.076*H                         # 4,86: de kier van het merk

def add(a,b,s=1): return (a[0]+s*b[0], a[1]+s*b[1])
def dot(a,b): return a[0]*b[0]+a[1]*b[1]
def rot(v,deg):
    r=math.radians(deg); return (v[0]*math.cos(r)-v[1]*math.sin(r), v[0]*math.sin(r)+v[1]*math.cos(r))

def silhouet(Rc=(44,37), Lb=(0,54), Nl=(14,41), Ny=None, eind_y=64.0):
    # Nr ligt op de horizontale onderrand van de kop (y=Ny), op de rechterlijn van de staart
    # die evenwijdig aan d loopt op de klassieke breedte.
    w = 11.7
    # rechterlijn: Nl + w*p + t*d ; snijden met y=Ny
    Nr = add(Nl,p,w)            # hals precies loodrecht op de staart
    if Rc[1] is None: Rc=(Rc[0], Nr[1])
    a = (eind_y-Nl[1])/d[1]; E1 = add(Nl,d,a); E2 = add(E1,p,w)
    return [(0,0), Lb, Nl, E1, E2, Nr, Rc], Nl, Nr, E1, E2

def halfvlak(n, c, kant):
    # groot vlak {x : x·n <= c} (kant=-1) of >= c (kant=+1)
    t=(-n[1], n[0]); P0=(n[0]*c, n[1]*c); R=400
    a=add(P0,t,-R); b=add(P0,t,R)
    c1=add(b,n,kant*R); c2=add(a,n,kant*R)
    return Polygon([a,b,c1,c2])

def strook(Nl, w):
    q=add(Nl,p,-0.02); a=add(q,d,-200); b=add(q,d,200); c=add(b,p,w+0.04); e=add(a,p,w+0.04)
    return Polygon([a,b,c,e])

def snij(poly_pts, n, c0, Nl, w=11.7, g=KIER):
    P=Polygon(poly_pts); S=strook(Nl,w)
    kop=P.difference(S.intersection(halfvlak(n,c0,+1)))
    st=P.intersection(S).intersection(halfvlak(n,c0+g,+1))
    return kop, st

def pts(g):
    g = orient(g, 1.0)
    c=list(g.exterior.coords)[:-1]
    # weg met bijna-dubbele punten
    out=[]
    for q in c:
        if not out or math.hypot(q[0]-out[-1][0], q[1]-out[-1][1])>0.05: out.append(q)
    return out

def pad(ps, zacht=None, r=3.0):
    if zacht is not None:
        i=min(range(len(ps)), key=lambda k: math.hypot(ps[k][0]-zacht[0], ps[k][1]-zacht[1]))
        prev,c,nxt=ps[i-1],ps[i],ps[(i+1)%len(ps)]
        def unit(v): n=math.hypot(*v); return (v[0]/n,v[1]/n)
        u1=unit((prev[0]-c[0],prev[1]-c[1])); u2=unit((nxt[0]-c[0],nxt[1]-c[1]))
        ang=math.acos(max(-1,min(1,dot(u1,u2)))); t=r/math.tan(ang/2)
        a=add(c,u1,t); b=add(c,u2,t)
        s=f"M{a[0]:.2f} {a[1]:.2f} Q{c[0]:.2f} {c[1]:.2f} {b[0]:.2f} {b[1]:.2f}"
        k=(i+1)%len(ps); rest=ps[k:]+ps[:i]
        rest=rest[:]  # van nxt rond tot prev
        s+=''.join(f" L{q[0]:.2f} {q[1]:.2f}" for q in rest)+" Z"
        return s
    return "M"+" L".join(f"{q[0]:.2f} {q[1]:.2f}" for q in ps)+" Z"

V={}
def variant(naam, Rc=(44,None), snede=None, zacht=None, r=3.0, g=KIER):
    poly,Nl,Nr,E1,E2=silhouet(Rc=Rc); Rc=poly[-1]
    n = d if snede is None else rot(d, snede)
    c0 = (dot(Nl,n)+dot(Nr,n))/2
    kop,st=snij(poly,n,c0,Nl,g=g)
    kp,sp=pts(kop),pts(st)
    zk = Rc if zacht=='Rc' else None
    zs = E1 if zacht=='E1' else (E2 if zacht=='E2' else None)
    V[naam]=[pad(kp,zk,r), pad(sp,zs,r)]

variant('K1 recht')
variant('K1 smalle kier', g=0.05*H)
variant('K1 zacht achter', zacht='Rc', r=3.2)
variant('K1 zacht staart', zacht='E1', r=2.9)
variant('K2 snede +', snede=+36.87)
variant('K2 snede -', snede=-36.87)
json.dump(V, open('varianten2.json','w'), indent=0)
for k,v in V.items(): print(k, '|', v[0], '|', v[1])

# K4: rechte kier tussen kop en schacht (zoals de pijl in de knoppen), en de snede
# van 53,13° aan het eind van de schacht (zoals de schacht van de kitpijl).
def eind_snede(naam, draai, zacht=None, r=2.9, g=KIER):
    poly,Nl,Nr,E1,E2=silhouet(Rc=(44,None)); Rc=poly[-1]
    n=d; c0=(dot(Nl,n)+dot(Nr,n))/2
    kop,st=snij(poly,n,c0,Nl,g=g)
    # eind: lijn door het midden van het oude eind, onder 53,13° met de as
    mid=((E1[0]+E2[0])/2,(E1[1]+E2[1])/2)
    q=rot(d, draai)                      # richting van de eindlijn
    nq=(-q[1],q[0])                      # normaal
    if dot(add(mid,d,-5),nq)>dot(mid,nq): nq=(-nq[0],-nq[1])
    c=dot(mid,nq)
    st=st.intersection(halfvlak(nq,c,-1)) if True else st
    # het eind moet de staart ook kunnen verlengen: bouw de staart opnieuw als strook
    S=strook(Nl,11.7).intersection(halfvlak(d,c0+g,+1)).intersection(halfvlak(nq,c,-1))
    kp,sp=pts(kop),pts(S)
    zs=None
    if zacht=='punt':
        zs=max(sp,key=lambda v: dot(v,d))   # de verste (spitse) punt
    V[naam]=[pad(kp,None), pad(sp,zs,r)]

V.clear()
variant('K1 recht')
variant('K1 zacht achter', zacht='Rc', r=3.2)
variant('K1 zacht staart', zacht='E1', r=2.9)
eind_snede('K4 eind 53 (a)', +53.13)
eind_snede('K4 eind 53 (b)', -53.13)
eind_snede('K4 (a) zacht punt', +53.13, zacht='punt')
eind_snede('K4 (b) zacht punt', -53.13, zacht='punt')
json.dump(V, open('varianten2.json','w'), indent=0)
for k,v in V.items(): print(k, '|', v[0], '|', v[1])

# Gekozen (levering 56): 'K1 zacht achter' met eind_y=68 (zichtbare staart 24,6;
# de oude pijl 25,1). Kop:  M37.14 30.67 Q44 36.33 35.1 36.33 L24.75 36.33 L14 41 L0 54 L0 0 Z
# Staart: M25.74 68 L15.94 45.46 L26.67 40.8 L36.47 63.33 Z
