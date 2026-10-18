import json, collections
W=[1440,1181,1180,1000,901,900,641,640,621,620,381,380,320]
SNUG=12
def sleutel(m): return (m['el'].split(' > ')[-1].split('.vs-')[0].replace('.is-in','').replace('.h-in',''), m['c'].split('.vs-')[0].replace('.is-in','').replace('.h-in',''))
def verwacht(m, licht=None):
    rr=m['rr']; R=m['crr']; i=m['ins']
    if any(v>=400 for v in rr) or min(i.values())< -1: return None
    nz=[v for v in rr if v>0.5]; lo=licht if licht is not None else (min(nz) if nz else 0)
    hoek=[(i['l'],i['t']),(i['r'],i['t']),(i['r'],i['b']),(i['l'],i['b'])]
    zone=[(R[k]-(dx+dy)/2) if (dx<=R[k] and dy<=R[k]) else None for k,(dx,dy) in enumerate(hoek)]
    inC=any(z is not None and z>lo+1.5 for z in zone) or min(i.values())<=SNUG
    if not inC: return None
    return tuple(0 if rr[k]<=0.5 else (round(zone[k]*2)/2 if (zone[k] is not None and zone[k]>lo+1.5) else lo) for k in range(4))
if __name__=='__main__':
    M=[m for m in json.load(open(__import__('sys').argv[1] if len(__import__('sys').argv)>1 else 'meting12.json')) if m.get('el')]
    g=collections.defaultdict(lambda: collections.defaultdict(list))
    for m in M: g[sleutel(m)][m['w']].append(m)
    for k,per in sorted(g.items(), key=lambda kv: kv[0][1]):
        rij=[]; wijzig=False
        for w in W:
            ms=per.get(w,[])
            if not ms: rij.append('  -  '); continue
            vs=collections.Counter(verwacht(m) for m in ms); v,n=vs.most_common(1)[0]
            cur=collections.Counter(tuple(m['rr']) for m in ms).most_common(1)[0][0]
            if v is not None and any(abs(a-b)>1.5 for a,b in zip(v,cur)): wijzig=True
            rij.append(('free' if v is None else '/'.join(f'{x:g}' for x in v))+('*' if len(vs)>1 else ''))
        if wijzig: print(f"{k[0][:40]:40s} | {k[1][:30]:30s} | "+' '.join(f'{x:>11s}' for x in rij))
