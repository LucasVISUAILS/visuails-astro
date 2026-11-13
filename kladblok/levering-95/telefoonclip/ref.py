import cv2,numpy as np,json
R=30
a=cv2.imread('in/%03d.png'%R,cv2.IMREAD_UNCHANGED); g=cv2.cvtColor((a/257).astype(np.uint8),cv2.COLOR_BGR2GRAY)
d=(g<90).astype(np.uint8); d=cv2.morphologyEx(d,cv2.MORPH_CLOSE,np.ones((5,5),np.uint8))
n,lab,st,_=cv2.connectedComponentsWithStats(1-d,8)
h,w=g.shape; best=None
for k in range(1,n):
    x,y,bw,bh,ar=st[k]
    if x==0 or y==0 or x+bw>=w or y+bh>=h or ar<30000: continue
    if best is None or ar>st[best][4]: best=k
m=(lab==best).astype(np.uint8)*255
x,y,bw,bh,_=st[best]; print('bbox',x,y,bw,bh)
cs,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE); c=max(cs,key=cv2.contourArea).reshape(-1,2).astype(float)
# fit 4 lines on the side points (exclude corners 12%)
def side(sel):
    p=c[sel]; vx,vy,x0,y0=cv2.fitLine(p.astype(np.float32),cv2.DIST_HUBER,0,0.01,0.01).ravel(); return (vx,vy,x0,y0)
cx,cy=x+bw/2,y+bh/2
L=side((c[:,0]<x+6)&(c[:,1]>y+bh*.15)&(c[:,1]<y+bh*.85))
Rr=side((c[:,0]>x+bw-7)&(c[:,1]>y+bh*.15)&(c[:,1]<y+bh*.85))
T=side((c[:,1]<y+6)&(c[:,0]>x+bw*.15)&(c[:,0]<x+bw*.85))
B=side((c[:,1]>y+bh-7)&(c[:,0]>x+bw*.15)&(c[:,0]<x+bw*.85))
def snij(l1,l2):
    (a1,b1,x1,y1),(a2,b2,x2,y2)=l1,l2
    A=np.array([[a1,-a2],[b1,-b2]]); t=np.linalg.solve(A,[x2-x1,y2-y1]); return [x1+a1*t[0], y1+b1*t[0]]
q=[[float(v) for v in p] for p in [snij(T,L),snij(T,Rr),snij(B,Rr),snij(B,L)]]
print(np.round(q,2).tolist())
json.dump({'ref':R,'quad':q,'bbox':[int(x),int(y),int(bw),int(bh)]},open('ref.json','w'))
v=(a/257).astype(np.uint8).copy(); cv2.polylines(v,[np.round(np.array(q)*4).astype(np.int32)],True,(0,0,255),1,cv2.LINE_AA,shift=2)
for i,(px,py) in enumerate(q):
    px,py=int(px),int(py); cr=v[py-20:py+20,px-20:px+20]; cv2.imwrite(f'hoek{i}.png',cv2.resize(cr,(160,160),interpolation=cv2.INTER_NEAREST))
cv2.imwrite('hoeken.png',np.hstack([cv2.imread(f'hoek{i}.png') for i in range(4)]))
