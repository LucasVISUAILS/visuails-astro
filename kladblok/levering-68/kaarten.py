import re,sys
p=sys.argv[1]
s=open(p,encoding='utf-8').read()
delen=re.split(r'(/\*.*?\*/)',s,flags=re.S)
n=0
def regel(m):
    global n
    sel,dec=m.group(1),m.group(2)
    if not re.search(r'background(-color)?\s*:\s*var\(--h-nevel\)',dec): return m.group(0)
    if re.search(r':hover|:focus|:active|aria-pressed|:checked|is-gekozen|:disabled|is-over|is-nu',sel): return m.group(0)
    r=re.search(r'border-radius\s*:\s*(\d+)px',dec)
    if not r: return m.group(0)
    rad=int(r.group(1))
    if rad<20 or rad>=999: return m.group(0)
    dec2=re.sub(r'(background(?:-color)?\s*:\s*)var\(--h-nevel\)',r'\1var(--h-kaart)',dec,count=1)
    zonder=re.sub(r'transition\s*:[^;]*;?','',dec2)
    if not re.search(r'(^|;|\s)box-shadow\s*:',zonder):
        dec2=dec2.rstrip()
        if not dec2.endswith(';'): dec2+=';'
        dec2+=' box-shadow: var(--h-kaart-rand); '
    n+=1
    return sel+'{'+dec2+'}'
uit=[d if d.startswith('/*') else re.sub(r'([^{}]+)\{([^{}]*)\}',regel,d) for d in delen]
open(p,'w',encoding='utf-8',newline='').write(''.join(uit))
print(p,'kaarten',n)
