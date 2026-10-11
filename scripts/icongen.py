import math, json
from pathlib import Path

def n(v):
    s = f"{v:.2f}".rstrip('0').rstrip('.')
    return '0' if s in ('-0', '') else s

def rr(x, y, w, h, r=2):
    return (f"M{n(x+r)} {n(y)}h{n(w-2*r)}a{n(r)} {n(r)} 0 0 1 {n(r)} {n(r)}v{n(h-2*r)}"
            f"a{n(r)} {n(r)} 0 0 1 -{n(r)} {n(r)}h-{n(w-2*r)}a{n(r)} {n(r)} 0 0 1 -{n(r)} -{n(r)}"
            f"v-{n(h-2*r)}a{n(r)} {n(r)} 0 0 1 {n(r)} -{n(r)}Z")

def circ(cx, cy, r):
    return f"M{n(cx-r)} {n(cy)}a{n(r)} {n(r)} 0 1 0 {n(2*r)} 0a{n(r)} {n(r)} 0 1 0 -{n(2*r)} 0Z"

def poly(pts):
    return "M" + "L".join(f"{n(x)} {n(y)}" for x, y in pts) + "Z"

def star(cx, cy, R, r, k, rot=-90):
    pts = []
    for i in range(k * 2):
        a = math.radians(rot + i * 180 / k)
        rad = R if i % 2 == 0 else r
        pts.append((cx + rad * math.cos(a), cy + rad * math.sin(a)))
    return poly(pts)

def ngon(cx, cy, R, k, rot=-90):
    return poly([(cx + R * math.cos(math.radians(rot + i * 360 / k)),
                  cy + R * math.sin(math.radians(rot + i * 360 / k))) for i in range(k)])

def sparkle(cx, cy, R):
    k = R * 0.1
    return (f"M{n(cx)} {n(cy-R)}c{n(k*2.2)} {n(R*.62)} {n(R*.38)} {n(R-k*2.2)} {n(R)} {n(R)}"
            f"c-{n(R*.62)} {n(k*2.2)} -{n(R-k*2.2)} {n(R*.38)} -{n(R)} {n(R)}"
            f"c-{n(k*2.2)} -{n(R*.62)} -{n(R*.38)} -{n(R-k*2.2)} -{n(R)} -{n(R)}"
            f"c{n(R*.62)} -{n(k*2.2)} {n(R-k*2.2)} -{n(R*.38)} {n(R)} -{n(R)}Z")

G = {}
def g(name, d=None, t=None, s=None, dots=None, sw=None):
    e = {}
    if d: e['d'] = d
    if t: e['t'] = t
    if s: e['s'] = s
    if dots: e['dots'] = dots
    if sw: e['sw'] = sw
    G[name] = e

# ── Rail tabs ───────────────────────────────────────────────
g('tab-templates',
  d=rr(3.5, 4, 17, 16, 2.5) + "M3.5 9.5h17M10 9.5V20",
  t="M3.5 9.5H10V20H6a2.5 2.5 0 0 1-2.5-2.5Z")
big = sparkle(10.5, 10.5, 6.5)
g('tab-elements', d=big + sparkle(18.2, 17.8, 3), t=big)
g('tab-uploads',
  d="M13.5 4.5H6.5A2.5 2.5 0 0 0 4 7v11a2.5 2.5 0 0 0 2.5 2.5h11A2.5 2.5 0 0 0 20 18v-6.5"
    "M4 16.5l4.2-4.2a1.6 1.6 0 0 1 2.2 0L15 17M18 3.5v6M15 6.5h6",
  t="M4 16.5l4.2-4.2a1.6 1.6 0 0 1 2.2 0L15 17l.4 3.5H6.5A2.5 2.5 0 0 1 4 18Z",
  dots=[[8.5, 8.5]])
g('tab-text', d="M5 7.5V5.5h14v2M12 5.5v13M9 18.5h6", t="M5 5.5h14v2H5Z")
g('tab-create',
  d="M12 3.5l3.8 6.3H8.2Z" + circ(7, 17, 3.5) + rr(13, 13.5, 7.5, 7, 1.8),
  t=circ(7, 17, 3.5) + "M12 3.5l3.8 6.3H8.2Z")
g('tab-background',
  d="M12 3.5a8.5 8.5 0 1 0 0 17c1.2 0 1.9-.8 1.9-1.8 0-.5-.2-.9-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1 .8-1.8 1.8-1.8H17a3.5 3.5 0 0 0 3.5-3.5C20.5 7.1 16.7 3.5 12 3.5Z",
  t="M12 3.5a8.5 8.5 0 1 0 0 17c1.2 0 1.9-.8 1.9-1.8 0-.5-.2-.9-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1 .8-1.8 1.8-1.8H17a3.5 3.5 0 0 0 3.5-3.5C20.5 7.1 16.7 3.5 12 3.5Z",
  dots=[[7.6, 12], [9.6, 7.8], [14.4, 7.4]])
sp = sparkle(17, 7, 3.6)
g('tab-ai', d="M4.5 19.5L13 11" + sp + "M6.5 4v3M5 5.5h3M19 15.5v3M17.5 17h3", t=sp)

# ── Canvas tools ────────────────────────────────────────────
cur = "M5.2 4.8l5.4 14.2 2.1-5.9 5.9-2.1Z"
g('select', d=cur, t=cur)
g('hand',
  d="M7.5 13V8.2a1.25 1.25 0 0 1 2.5 0V12M10 11V5.7a1.25 1.25 0 0 1 2.5 0V11.5M12.5 11V6.7a1.25 1.25 0 0 1 2.5 0V12"
    "M15 12V9.2a1.25 1.25 0 0 1 2.5 0v5.3c0 3.6-2.3 6-5.6 6-2.2 0-3.6-.9-4.8-2.6l-2.8-4a1.3 1.3 0 0 1 2-1.6L7.5 15",
  t="M7.5 12.5h10v2c0 3.6-2.3 6-5.6 6-2.2 0-3.6-.9-4.8-2.6L7.5 15Z")
pen = "M4.5 19.5l.9-3.9L16 5a2.1 2.1 0 0 1 3 3L8.4 18.6Z"
g('pen', d=pen + "M14 7l3 3M12.5 20.5h7", t=pen)
bristle = "M10.6 10.8C8.3 10.5 6.6 12 6.5 14c-.1 1.6-.9 2.8-2 3.6 3.4 1.5 7.6.7 8.5-2.4Z"
g('marker', d="M19 4.8a1.7 1.7 0 0 1 0 2.4l-6 6-2.4-2.4 6-6a1.7 1.7 0 0 1 2.4 0Z" + bristle, t=bristle)
hl = "M14.8 4.8l4.4 4.4-6.7 6.7-4.4-4.4Z"
g('highlighter', d=hl + "M8.1 11.5l-1.8 4.1-.6 2.7 2.7-.6 4.1-1.8M13 20.5h7.5", t=hl)
g('eraser',
  d="M4.8 14.2L14 5a1.8 1.8 0 0 1 2.5 0l3.5 3.5a1.8 1.8 0 0 1 0 2.5L11.8 19.2H8L4.8 16a1.1 1.1 0 0 1 0-1.8ZM9.5 9.5l5.5 5.5M12 19.5h8",
  t="M9.5 9.5l5.5 5.5-3.2 4.2H8L4.8 16a1.1 1.1 0 0 1 0-1.8Z")

# ── Header / history ────────────────────────────────────────
g('undo', d="M9 5L5 9l4 4M5 9h9.5a5 5 0 0 1 0 10H10")
g('redo', d="M15 5l4 4-4 4M19 9H9.5a5 5 0 0 0 0 10H14")
g('plus', d="M12 5v14M5 12h14")
g('minus', d="M5 12h14")
g('close', d="M6 6l12 12M18 6L6 18")
g('check', d="M5 12.5l4.5 4.5L19 7.5")
g('chevron-down', d="M6 9.5l6 6 6-6")
g('chevron-right', d="M9.5 6l6 6-6 6")
g('arrow-right', d="M5 12h14M13 6l6 6-6 6")
tray = "M4.5 15h15v3a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 18Z"
g('upload', d="M12 15V4.5M7.5 9L12 4.5 16.5 9M4.5 15v3a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-3", t=tray)
g('download', d="M12 4.5V15M7.5 10.5L12 15l4.5-4.5M4.5 15v3a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-3", t=tray)
nodes = circ(6.5, 12, 2.5) + circ(17.5, 6, 2.5) + circ(17.5, 18, 2.5)
g('share', d=nodes + "M8.7 10.8l6.6-3.7M8.7 13.2l6.6 3.7", t=nodes)
g('dots', dots=[[6, 12], [12, 12], [18, 12]])
heart = "M12 19.5c-4.7-3-8-6.2-8-9.8a4.2 4.2 0 0 1 8-1.9 4.2 4.2 0 0 1 8 1.9c0 3.6-3.3 6.8-8 9.8Z"
g('heart', d=heart, t=heart)
g('save', d=rr(4, 4, 16, 16, 2.5) + "M8 4v4.5h6.5V4M8 20v-5.5h8V20", t="M8 14.5h8V20H8Z")
flap = "M4 18.5l2.2-6.3A1.5 1.5 0 0 1 7.6 11H20a1 1 0 0 1 1 1.3L19 18a1.5 1.5 0 0 1-1.4 1H5.5A1.5 1.5 0 0 1 4 18.5Z"
g('restore', d="M4 18.5V6.5A1.5 1.5 0 0 1 5.5 5H9l2 2.5h6.5A1.5 1.5 0 0 1 19 9v2" + flap, t=flap)
file_ = "M14 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8ZM14 3.5V8h4.5"
fill_ = "M14 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8Z"
g('backup-up', d=file_ + "M12 17v-5M9.8 14l2.2-2.2 2.2 2.2", t=fill_)
g('backup-down', d=file_ + "M12 12v5M9.8 15l2.2 2.2 2.2-2.2", t=fill_)
g('file-text', d=file_ + "M9 12.5h6M9 16h6M9 9h2", t=fill_)

# ── Selection / inspector ───────────────────────────────────
front = rr(4.5, 8.5, 11, 11, 2)
back = "M8.5 8.5V6.5a2 2 0 0 1 2-2H17.5a2 2 0 0 1 2 2V13.5a2 2 0 0 1-2 2h-2"
g('duplicate', d=front + back, t=front)
g('duplicate-item', d=front + back + "M10 11.5v5M7.5 14h5", t=front)
g('trash',
  d="M5 7h14M9.5 7V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2M6.5 7l.8 11.2a1.5 1.5 0 0 0 1.5 1.3h6.4a1.5 1.5 0 0 0 1.5-1.3L17.5 7M10 11v5M14 11v5",
  t="M6.5 7h11l-.8 11.2a1.5 1.5 0 0 1-1.5 1.3H8.8a1.5 1.5 0 0 1-1.5-1.3Z")
dia = "M12 4l8.5 4.5L12 13 3.5 8.5Z"
g('layers', d=dia + "M3.5 12.2L12 16.7l8.5-4.5M3.5 15.7L12 20.2l8.5-4.5", t=dia)
g('crop', d="M6.5 3v13.5A1.5 1.5 0 0 0 8 18h13M3 6.5h13.5A1.5 1.5 0 0 1 18 8v13", t="M8 8h10v10H8Z")
lockbody = rr(5, 10.5, 14, 9.5, 2)
g('lock', d=lockbody + "M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5M12 14.5v2", t=lockbody)
g('unlock', d=lockbody + "M8.5 10.5V8a3.5 3.5 0 0 1 6.8-1.2M12 14.5v2", t=lockbody)
brackets = "M4 8.5V6a2 2 0 0 1 2-2h2.5M15.5 4H18a2 2 0 0 1 2 2v2.5M20 15.5V18a2 2 0 0 1-2 2h-2.5M8.5 20H6a2 2 0 0 1-2-2v-2.5"
sq2 = rr(8, 8, 4, 4, 1) + rr(12, 12, 4, 4, 1)
g('group', d=brackets + sq2, t=sq2)
sq3 = rr(4.5, 4.5, 6, 6, 1.5) + rr(13.5, 13.5, 6, 6, 1.5)
g('ungroup', d=sq3, t=sq3)
def align(name, line, bars):
    g(name, d=line + "".join(bars), t="".join(bars))
align('align-center-h', "M12 3.5v17", [rr(6, 6.5, 12, 3.5, 1), rr(8.5, 13.5, 7, 3.5, 1)])
align('align-left', "M4.5 3.5v17", [rr(7.5, 6.5, 12, 3.5, 1), rr(7.5, 13.5, 7, 3.5, 1)])
align('align-right', "M19.5 3.5v17", [rr(4.5, 6.5, 12, 3.5, 1), rr(9.5, 13.5, 7, 3.5, 1)])
align('align-top', "M3.5 4.5h17", [rr(6.5, 7.5, 3.5, 12, 1), rr(13.5, 7.5, 3.5, 7, 1)])
align('align-middle', "M3.5 12h17", [rr(6.5, 6, 3.5, 12, 1), rr(13.5, 8.5, 3.5, 7, 1)])
align('align-bottom', "M3.5 19.5h17", [rr(6.5, 4.5, 3.5, 12, 1), rr(13.5, 9.5, 3.5, 7, 1)])
align('distribute-h', "M4.5 4v16M19.5 4v16", [rr(9.5, 6.5, 5, 11, 1)])
align('distribute-v', "M4 4.5h16M4 19.5h16", [rr(6.5, 9.5, 11, 5, 1)])
eye = "M2.8 12C4.8 8 8.2 5.8 12 5.8S19.2 8 21.2 12c-2 4-5.4 6.2-9.2 6.2S4.8 16 2.8 12Z"
g('eye', d=eye + circ(12, 12, 3), t=eye)
g('eye-off', d=eye + "M4 4l16 16", t=eye)
g('paste', d=rr(5, 5.5, 14, 15, 2.5) + "M9 5.5V4.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M9 12h6M9 15.5h4", t=rr(5, 5.5, 14, 15, 2.5))
g('search', d=circ(10.5, 10.5, 6) + "M15 15l5 5", t=circ(10.5, 10.5, 6))
g('sliders', d="M4 7h9M17 7h3M4 17h3M11 17h9" + circ(15, 7, 2) + circ(9, 17, 2), t=circ(15, 7, 2) + circ(9, 17, 2))
g('fit', d="M4 9V6a2 2 0 0 1 2-2h3M15 4h3a2 2 0 0 1 2 2v3M20 15v3a2 2 0 0 1-2 2h-3M9 20H6a2 2 0 0 1-2-2v-3", t=rr(8.5, 8.5, 7, 7, 1.5))
g('printer', d="M7 9V4.5h10V9" + rr(4, 9, 16, 8, 2) + "M7.5 14.5h9V19.5h-9Z", t=rr(4, 9, 16, 8, 2))
tri = "M12 4.5L20.5 19h-17Z"
g('alert', d=tri + "M12 10v4", t=tri, dots=[[12, 16.7]])
g('info', d=circ(12, 12, 8.5) + "M12 11.2v5", t=circ(12, 12, 8.5), dots=[[12, 8]])
g('magnet', d="M5 4.5v7a7 7 0 0 0 14 0v-7h-4.5v7a2.5 2.5 0 0 1-5 0v-7ZM5 8.5h4.5M14.5 8.5H19",
  t=rr(5, 4.5, 4.5, 4, .5) + rr(14.5, 4.5, 4.5, 4, .5))

# ── Text formatting ─────────────────────────────────────────
g('bold', d="M8 4.5v15M8 4.5h4.6a3.5 3.5 0 0 1 0 7H8m0 0h5.4a3.5 3.5 0 0 1 0 7H8", sw=2)
g('italic', d="M10 4.5h7M7 19.5h7M14.5 4.5l-5 15")
g('underline', d="M7 4.5v7a5 5 0 0 0 10 0v-7M5 20h14")
g('strike', d="M16.5 7C16 5.5 14.3 4.5 12 4.5 9.6 4.5 7.8 5.7 7.8 7.5c0 1.4 1 2.2 2.6 2.7M4.5 12h15M13.6 13.8c1.7.5 2.6 1.4 2.6 2.7 0 1.9-1.9 3-4.3 3-2.4 0-4-1-4.4-2.7")
g('uppercase', d="M3.5 19L8.5 5.5 13.5 19M5.3 14.5h6.4M14.8 19l3.2-8.5 3.2 8.5M15.9 16.4h4.2")
g('lowercase', d=circ(7, 15.5, 3.2) + "M10.2 12.3V19M14.5 5v14" + circ(17.7, 15.5, 3.2))
g('baseline', d="M6 17l6-12 6 12M8.5 12h7M4.5 20.5h15", t="M6 17l6-12 6 12Z")

# ── Media / transform ───────────────────────────────────────
g('image', d=rr(4, 4.5, 16, 15, 2.5) + "M4 16l4.5-4.5a1.6 1.6 0 0 1 2.2 0L16 17M14 14.5l2-2a1.6 1.6 0 0 1 2.2 0L20 14.3",
  t="M4 16l4.5-4.5a1.6 1.6 0 0 1 2.2 0L14 14.7l2-2a1.6 1.6 0 0 1 2.2 0L20 14.3V17a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17Z",
  dots=[[8.5, 9]])
g('flip-h', d="M12 4v16M9.5 6.5l-5 11h5ZM14.5 6.5l5 11h-5Z", t="M9.5 6.5l-5 11h5Z")
g('flip-v', d="M4 12h16M6.5 9.5L12 4.5l5.5 5ZM6.5 14.5h11L12 19.5Z", t="M6.5 9.5L12 4.5l5.5 5Z")
g('rotate', d="M19 12a7 7 0 1 1-2.1-5M19 4.5V8h-3.5")
g('move', d="M12 3.5v17M3.5 12h17M9 6.5l3-3 3 3M9 17.5l3 3 3-3M6.5 9l-3 3 3 3M17.5 9l3 3-3 3")
g('sun', d=circ(12, 12, 3.8) + "M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4", t=circ(12, 12, 3.8))
g('contrast', d=circ(12, 12, 8), s="M12 4a8 8 0 0 1 0 16Z")
drop = "M12 3.8c3.6 4 6 6.7 6 9.7a6 6 0 0 1-12 0c0-3 2.4-5.7 6-9.7Z"
g('droplet', d=drop + "M9.2 14.2a3 3 0 0 0 2.4 2.4", t=drop)
g('scissors', d=circ(6.5, 6.5, 2.5) + circ(6.5, 17.5, 2.5) + "M8.3 8.3L19.5 17.5M8.3 15.7L19.5 6.5", t=circ(6.5, 6.5, 2.5) + circ(6.5, 17.5, 2.5))
g('replace', d="M4 7.5h12M13 4.5l3 3-3 3M20 16.5H8M11 13.5l-3 3 3 3")
g('link', d="M10 14a4.2 4.2 0 0 0 6 0l3-3a4.2 4.2 0 0 0-6-6l-1 1M14 10a4.2 4.2 0 0 0-6 0l-3 3a4.2 4.2 0 0 0 6 6l1-1")
g('unlink', d="M10.5 7.5l1-1a4.2 4.2 0 0 1 6 6l-1.5 1.5M13.5 16.5l-1 1a4.2 4.2 0 0 1-6-6l1.5-1.5M8 3.5L9 6.2M3.5 8l2.7 1M16 20.5l-1-2.7M20.5 16l-2.7-1")
g('bring-front', d="M15.5 8.5h2a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-2" + rr(4.5, 4.5, 11, 11, 2), t=rr(4.5, 4.5, 11, 11, 2))
g('send-back', d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2" + rr(8.5, 8.5, 11, 11, 2), t=rr(8.5, 8.5, 11, 11, 2))
g('forward', d="M12 11V4M8.5 7.5L12 4l3.5 3.5" + rr(5, 14, 14, 5.5, 1.5), t=rr(5, 14, 14, 5.5, 1.5))
g('backward', d="M12 13v7M8.5 16.5L12 20l3.5-3.5" + rr(5, 4.5, 14, 5.5, 1.5), t=rr(5, 4.5, 14, 5.5, 1.5))
bolt = "M13 3.5L5.5 13.5H12l-1 7 7.5-10H12Z"
g('zap', d=bolt, t=bolt)
g('aperture', d=circ(12, 12, 8.5) + "M12 9V3.5M9.4 13.5l-4.8 2.75M14.6 13.5l4.8 2.75" + circ(12, 12, 3), t=circ(12, 12, 3))

# ── Shapes (Create panel fallbacks) ─────────────────────────
def shp(name, d): g('shape-' + name, d=d, t=d)
shp('rectangle', rr(3.5, 6, 17, 12, 2.5))
shp('circle', circ(12, 12, 8.5))
shp('triangle', "M12 4.5L20.5 19h-17Z")
shp('star', star(12, 12.6, 9, 4, 5))
shp('heart', heart)
shp('cloud', "M7 18.5a4 4 0 0 1-.6-7.9 5.5 5.5 0 0 1 10.6-1.4A4.6 4.6 0 0 1 17.5 18.5Z")
shp('blob', "M12.5 4.5c3.8-.3 7.3 2.6 7 6.6-.2 2.3 1.3 3.2.4 5.2-1 2.2-4 3.2-7 3.2-2.8 0-4.5-.6-6-2.2-1.8-1.9-2.5-3.8-2-6.2.6-3 3.6-6.3 7.6-6.6Z")
shp('burst', star(12, 12, 9.2, 5.6, 8, -90))
g('shape-line', d="M5 19L19 5")
g('shape-arrow', d="M5 19L19 5M10 5h9v9")
shp('diamond', "M12 3.5L20.5 12 12 20.5 3.5 12Z")
shp('hexagon', ngon(12, 12, 9, 6, 0))

output = Path(__file__).resolve().parents[1] / 'src' / 'studio' / 'icon-set' / 'glyphs.ts'
header = """// Generated by scripts/icongen.py.
export type GlyphData = {
  d?: string;
  t?: string;
  s?: string;
  dots?: ReadonlyArray<readonly [number, number]>;
  sw?: number;
};
"""
output.write_text(header + 'export const GLYPHS = ' + json.dumps(G, indent=2) +
                  ' as const satisfies Record<string, GlyphData>;\n' +
                  'export type GlyphName = keyof typeof GLYPHS;\n', encoding='utf-8')
print(len(G), 'glyphs')
