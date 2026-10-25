# Het nieuwe woordmerk (merkletter, hoekig) voor het plan en de posters, uit design/woordmerk/hoek.json.
import json, pathlib
HIER = pathlib.Path(__file__).parent
HJ = json.loads((HIER / 'hoek-woordmerk.json').read_text())      # kopie van design/woordmerk/hoek.json
B = HJ['woord']['b']                      # y omhoog: [minx, miny, maxx, maxy]
KAP = 781.25                              # kaphoogte in eenheden van het merk
WM_X, WM_Y, WM_W, WM_H = B[0], -B[3], B[2] - B[0], B[3] - B[1]
WM_KAP = (B[3] - KAP) / WM_H              # van de bovenkant van het symbool tot de kaplijn (deel van de hoogte)
WM_BASIS = B[3] / WM_H                    # van de bovenkant tot de basislijn
VB = f'0 0 {WM_W:.2f} {WM_H:.2f}'
VLAG = 702 - 507.25                       # de vlag uit het merk: vrije ruimte rondom
LETTERS = HJ['letters']
MATEN = HJ['maten']
KADERS = HJ['woord']['kaders']
D = HJ['woord']['d']

def symbool():
    return f'<symbol id="l-wm" viewBox="{WM_X:.2f} {WM_Y:.2f} {WM_W:.2f} {WM_H:.2f}"><path fill-rule="evenodd" d="{D}"/></symbol>'

def letter_pad(k):
    """SVG-pad van één letter (y = −y omhoog, basislijn 0) en zijn kader."""
    v = LETTERS[k]
    return v['d'], v['b']
