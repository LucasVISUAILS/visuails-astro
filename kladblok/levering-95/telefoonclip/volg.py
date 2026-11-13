import cv2,numpy as np,json
J=json.load(open('ref.json')); R=J['ref']; q=np.array(J['quad'],np.float32)
def g(i):
    a=cv2.imread('in/%03d.png'%i,cv2.IMREAD_UNCHANGED); return cv2.GaussianBlur(cv2.cvtColor((a/65535).astype(np.float32),cv2.COLOR_BGR2GRAY),(0,0),1.0)
T=g(R); h,w=T.shape
mask=np.zeros((h,w),np.uint8)
x0,y0=int(q[:,0].min())-70,int(q[:,1].min())-120; x1,y1=int(q[:,0].max())+70,int(q[:,1].max())+30
mask[max(0,y0):y1,max(0,x0):x1]=255
inner=q.copy(); c=q.mean(0); inner=c+(q-c)*0.97
cv2.fillConvexPoly(mask,np.round(inner).astype(np.int32),0)
# alleen het bovenste deel (de duim komt onderaan), en de tekst/zoomknopjes in de zoeker doen niet mee
Hs={R:np.eye(3,dtype=np.float32)}
crit=(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,200,1e-6)
for rng in (range(R+1,122), range(R-1,0,-1)):
    prev=R
    for i in rng:
        I=g(i); W=Hs[prev].copy()
        try:
            cc,W=cv2.findTransformECC(T,I,W,cv2.MOTION_HOMOGRAPHY,crit,mask,5)
        except cv2.error as e:
            print('ECC faalt',i); cc=0
        Hs[i]=W; prev=i
        if i%10==0: print(i,round(cc,4))
out={}
for i,H in Hs.items():
    p=cv2.perspectiveTransform(q.reshape(-1,1,2),H).reshape(-1,2)
    out[i]=p.tolist()
json.dump(out,open('quads.json','w'))
