import sys, random
sys.path.insert(0,'.')
from hsg_sim import *
from collections import Counter
rng=random.Random(2026); cfg=Cfg()
tr=[]; n=2500; allg=[]
for g in range(n):
    r=play(cfg,(BOTS['aggro'],BOTS['aggro']),rng)
    allg.append(r)
    if r['reason']=='truce': tr.append(r)
print('truces',len(tr),'of',n)
tot=[sum(r['left'][0].values())+sum(r['left'][1].values()) for r in tr]
h=Counter(min(t,22)//2*2 for t in tot)
print('total pieces on board at truce (both clans):',sorted(h.items()))
print('mean total %.1f of 30 squares -> %.0f%% empty'%(sum(tot)/len(tot),100*(1-sum(tot)/len(tot)/30)))
print('crowded (>=16 pieces):',sum(t>=16 for t in tot)/len(tot))
print('unveiled-all:',sum(r['shrouds']==0 for r in tr)/len(tr))
print('Kunoichi alive either side:',sum(any(r['left'][c]['Kn'] for c in (0,1)) for r in tr)/len(tr))
print('Geisha alive both sides:',sum(all(r['left'][c]['Gs'] for c in (0,1)) for r in tr)/len(tr))
print('both Daimyo gone both sides:',sum(all(r['left'][c]['Dm']==0 for c in (0,1)) for r in tr)/len(tr))
print('mean night cmd', sum(r['night_cmd'] for r in tr)/len(tr), 'mean cmds', sum(r['cmds'] for r in tr)/len(tr))
sh=[r for r in tr if r['shrouds']>0]
print('truces with shrouds left: mean pieces/clan %.1f ; shrouds left dist %s'%(sum(sum(r['left'][0].values())+sum(r['left'][1].values()) for r in sh)/len(sh)/2, Counter(r['shrouds'] for r in sh)))
# unveil-or-not: in those truces was an Unveil available (yes by definition) -> what did mover choose?
