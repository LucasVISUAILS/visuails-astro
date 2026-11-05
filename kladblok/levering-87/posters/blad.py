import glob, sys
from PIL import Image
map_=sys.argv[2] if len(sys.argv)>2 else 'uit-nl'
fs=sorted(glob.glob(map_+'/[0-9]*.png'))
t=[Image.open(f) for f in fs]
for i in t: i.thumbnail((480,600))
blad=Image.new('RGB',(480*4+60,600*2+30),'#E4E7ED')
for k,i in enumerate(t): blad.paste(i,(12+(k%4)*492,10+(k//4)*610))
blad.save(sys.argv[1] if len(sys.argv)>1 else 'blad.jpg',quality=88)
