import cv2,numpy as np,os,glob,sys
C=np.load('grade.npy'); GRADE=len(sys.argv)>1 and sys.argv[1]=='grade'
def feat(x):
    r,g,b=x[...,0],x[...,1],x[...,2]
    return np.stack([np.ones_like(r),r,g,b,r*r,g*g,b*b,r*g,g*b,r*b,r**3,g**3,b**3],-1)
fs=sorted(glob.glob('W2/*.png'))
x0=960-432
F=[cv2.imread(f,cv2.IMREAD_UNCHANGED)[:,x0:x0+864].astype(np.float32)/65535 for f in fs]
n=len(F); N=15; L=n-N
d='lus2'+('g' if GRADE else ''); os.makedirs(d,exist_ok=True)
for t in range(L):
    fr=F[t] if t>=N else F[t+L]*(1-(t+1)/(N+1))+F[t]*((t+1)/(N+1))
    if GRADE: fr=np.clip(feat(fr[...,::-1])@C,0,1)[...,::-1]
    fr=cv2.resize(fr,(1080,1350),interpolation=cv2.INTER_LANCZOS4); bl=cv2.GaussianBlur(fr,(0,0),1.2); fr=np.clip(fr+0.35*(fr-bl),0,1)
    cv2.imwrite(f'{d}/{t:03d}.png',(fr*255+.5).astype(np.uint8))
f=[cv2.imread(f'{d}/{i:03d}.png').astype(float) for i in range(L)]
dd=[np.abs(f[i+1]-f[i]).mean() for i in range(L-1)]
print(L,'gewoon',round(np.mean(dd),2),round(max(dd),2),'naad',round(np.abs(f[0]-f[-1]).mean(),2))
