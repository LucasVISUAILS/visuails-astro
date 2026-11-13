"""De telefoonclip (levering 95): de hele clip C1 telefoon.mov, met in de zoeker vanaf de zwaai een productfoto van NONSTD.
   python3 maak.py <foto> <naam>"""
import cv2, numpy as np, json, sys, os, subprocess
from scipy.ndimage import gaussian_filter
FOTO, NAAM = sys.argv[1], sys.argv[2]
Q = {int(k): np.array(v, np.float32) for k, v in json.load(open('quads.json')).items()}
J = json.load(open('ref.json')); R = J['ref']; qR = np.array(J['quad'], np.float32)
# de homografie per beeld uit de hoeken (ref -> beeld)
H = {i: cv2.getPerspectiveTransform(qR, Q[i]) for i in Q}
ref = cv2.imread('in/%03d.png' % R, cv2.IMREAD_UNCHANGED).astype(np.float32) / 65535
h, w = ref.shape[:2]
# ── de knopjes in de zoeker (0,5 · 1 · 2) als een laag uit het referentiebeeld: donker = alfa naar zwart, licht = alfa naar wit
U = cv2.getPerspectiveTransform(qR, np.float32([[0, 0], [1, 0], [1, 1], [0, 1]]))
yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
uv = cv2.perspectiveTransform(np.dstack([xx, yy]).reshape(-1, 1, 2), U).reshape(h, w, 2)
zone = (uv[..., 0] > .3) & (uv[..., 0] < .7) & (uv[..., 1] > .84) & (uv[..., 1] < .985)
L = cv2.cvtColor(ref, cv2.COLOR_BGR2GRAY)
vloer = cv2.medianBlur((L * 255).astype(np.uint8), 31).astype(np.float32) / 255
a_d = np.clip((vloer - L) / np.maximum(vloer, 1e-3), 0, 1) * zone
a_l = np.clip((L - vloer) / np.maximum(1 - vloer, 1e-3), 0, 1) * zone
a_d = np.where(a_d > .06, a_d, 0); a_l = np.where(a_l > .06, a_l, 0)
# ── de foto: 3 : 4 uit het midden
F = cv2.imread(FOTO, cv2.IMREAD_COLOR).astype(np.float32) / 255
fh, fw = F.shape[:2]; ch = int(fw * 4 / 3); y0 = (fh - ch) // 2
def ease(t): return 1 - (1 - t) ** 3
# ── de duimnagel (de laatste foto) linksonder, in het referentiebeeld
dn = np.float32([[825.5, 658.5], [853.5, 658.5], [853.5, 687.5], [825.5, 687.5]])
duim = F[y0 + ch // 2 - fw // 2: y0 + ch // 2 + fw // 2, :]   # vierkant uit het midden
os.makedirs(f'uit-{NAAM}', exist_ok=True)
N = 121; A0, A1 = 54, 64   # de wissel tijdens de zwaai
basis = {}
for i in range(1, N + 1):
    I = cv2.imread('in/%03d.png' % i, cv2.IMREAD_UNCHANGED).astype(np.float32) / 65535
    if i >= A0 and i in H:
        Hi = H[i]; q = Q[i]
        t = min(1, max(0, (i - A0) / (74 - A0))); e = ease(t)
        al = min(1, max(0, (i - A0) / (A1 - A0)))
        # de foto schuift van links in beeld, zoals de echte zwaai (een derde breedte), met bewegingsonscherpte
        dx = (1 - e) * 0.33 * fw
        # na de zwaai beweegt de inhoud een klein beetje tegen de hand in (zoals een echte zoeker)
        hand = (q.mean(0) - Q[90].mean(0)) if 90 in Q else np.zeros(2)
        px = -hand[0] * 0.5 * fw / 254; py = -hand[1] * 0.5 * ch / 345
        src = np.float32([[dx + px, y0 + py], [fw + dx + px, y0 + py], [fw + dx + px, y0 + ch + py], [dx + px, y0 + ch + py]])
        M = cv2.getPerspectiveTransform(src, q)
        Fb = F
        v = (1 - e) * 60
        if v > 1:
            k = np.zeros((1, int(v) | 1), np.float32); k[:] = 1 / k.size; Fb = cv2.filter2D(F, -1, k)
        W = cv2.warpPerspective(Fb, M, (w, h), flags=cv2.INTER_AREA, borderMode=cv2.BORDER_REFLECT)
        m = np.zeros((h * 4, w * 4), np.uint8)
        cv2.fillConvexPoly(m, np.round(q * 16).astype(np.int32), 255, lineType=cv2.LINE_AA, shift=2)
        m = cv2.resize(m, (w, h), interpolation=cv2.INTER_AREA).astype(np.float32) / 255
        # de sluiter: de zoeker wordt even zwart (beeld 104 – 108); de helderheid van het origineel ten opzichte van normaal
        mm = cv2.fillConvexPoly(np.zeros((h, w), np.uint8), np.round(q).astype(np.int32), 1) > 0
        lum = cv2.cvtColor(I, cv2.COLOR_BGR2GRAY)[mm].mean()
        f = min(1, lum / 0.42) if 100 <= i <= 110 else 1
        W = W * f
        # de knopjes terug, meegewarpt
        Hr = Hi
        ad = cv2.warpPerspective(a_d, Hr, (w, h)); alw = cv2.warpPerspective(a_l, Hr, (w, h))
        W = W * (1 - ad[..., None]); W = W * (1 - alw[..., None]) + alw[..., None]
        mi = (m * al)[..., None]
        I = I * (1 - mi) + W * mi
        # de duimnagel: na de sluiter (beeld 107) de nieuwe foto
        if i >= 107:
            dq = cv2.perspectiveTransform(dn.reshape(-1, 1, 2), Hi).reshape(-1, 2)
            Md = cv2.getPerspectiveTransform(np.float32([[0, 0], [fw, 0], [fw, fw], [0, fw]]), dq)
            Wd = cv2.warpPerspective(duim, Md, (w, h), flags=cv2.INTER_AREA)
            md = np.zeros((h * 4, w * 4), np.uint8)
            cv2.fillConvexPoly(md, np.round(dq * 16).astype(np.int32), 255, lineType=cv2.LINE_AA, shift=2)
            md = cv2.resize(md, (w, h), interpolation=cv2.INTER_AREA).astype(np.float32)[..., None] / 255
            I = I * (1 - md) + Wd * md
    basis[i] = I
    # wit naar zuiver wit (de site legt de clip met multiply op de grond), dan 4 : 5 rond de telefoon
    O = np.clip((I - 0) / (0.975), 0, 1)
    x0 = 700   # 700 – 1564: de hele arm, die verlaat het beeld via de onderkant (gemeten: 736 – 1521)
    O = O[:, x0:x0 + 864]
    # lus: de laatste 8 beelden vervagen naar wit (het begin is al wit: de telefoon komt van onder)
    if i > N - 8: O = O + (1 - O) * ((i - (N - 8)) / 8)
    cv2.imwrite(f'uit-{NAAM}/{i:03d}.png', (O * 255 + .5).astype(np.uint8))
print('klaar')
