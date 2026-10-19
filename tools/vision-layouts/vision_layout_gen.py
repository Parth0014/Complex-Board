#!/usr/bin/env python3
"""Vision-board-first procedural template generator (Pillow only).

Features: 12 art-directed families, seeded variation, semantic image roles,
printable/text/decor layers, masked image previews, compatible polygons,
photo-only legacy JSON, local-photo support, and validation.

Coordinates: x in 0..1, y in 0..aspect (aspect = canvas height / width),
matching the previous grid_gen.py actual output convention. The optional
`poly_normalized` uses 0..1 on BOTH axes.
"""
from __future__ import annotations
import argparse
import json
import html
import math
import random
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

PALETTES = {
    'linen': {'bg':'#EDE5D8', 'paper':'#FFF9ED','ink':'#2D3330','muted':'#69736A','accent':'#BD6B54','light':'#E6CEAC','line':'#F4E8D6'},
    'sage': {'bg':'#CDD9C8', 'paper':'#F6F6E9','ink':'#283C36','muted':'#526C61','accent':'#B7775D','light':'#AFC4AE','line':'#DFE5D6'},
    'rose': {'bg':'#F0D8D0', 'paper':'#FFF5EC','ink':'#4B313B','muted':'#936F73','accent':'#B25473','light':'#D7A6AA','line':'#F9E7E0'},
    'nocturne': {'bg':'#29363F', 'paper':'#F5E9D9','ink':'#F9F1DC','muted':'#C9C7B9','accent':'#E8AC7C','light':'#596671','line':'#334852'},
    'lilac': {'bg':'#DAD2E7', 'paper':'#FCF7F1','ink':'#3D3651','muted':'#736481','accent':'#9D698A','light':'#C6B0D9','line':'#E9E2F0'},
    'sun': {'bg':'#EED39F', 'paper':'#FFF6DD','ink':'#4B352A','muted':'#8C6C50','accent':'#C45E44','light':'#E8AD69','line':'#F6E5BC'},
}
TAGS = ['EXPLORE','CREATE','BECOME','GROW','BELONG','THRIVE','DISCOVER','BREATHE','WONDER','FLOURISH','LOVE','BEGIN','WANDER','ROOT','BUILD','SOAR','FEEL','SHINE']


def polyrect(x,y,w,h):
    return [(x,y),(x+w,y),(x+w,y+h),(x,y+h)]


def ellipse(cx,cy,rx,ry,n=32):
    return [(cx+rx*math.cos(2*math.pi*i/n),cy+ry*math.sin(2*math.pi*i/n)) for i in range(n)]


def arch(x,y,w,h):
    # Rounded upper corners, straight foot. Works as a polygon clipping path.
    r = min(w/2, h*.45)
    # Upper semicircle from left spring to right spring.
    p = [(x,y+h),(x,y+r)]
    for i in range(25):
        ang = math.pi - math.pi*(i/24)
        p.append((x+w/2+(w/2)*math.cos(ang), y+r-(r)*math.sin(ang)))
    p.append((x+w,y+h))
    return p


def rotatebox(cx,cy,w,h,angle):
    c,s=math.cos(math.radians(angle)),math.sin(math.radians(angle))
    return [(cx+dx*c-dy*s,cy+dx*s+dy*c) for dx,dy in [(-w/2,-h/2),(w/2,-h/2),(w/2,h/2),(-w/2,h/2)]]


def boundpoly(poly, aspect, pad=0.002):
    # Uniform translation only: keep a rotated card's real shape and orientation.
    minx=min(x for x,_ in poly); maxx=max(x for x,_ in poly)
    miny=min(y for _,y in poly); maxy=max(y for _,y in poly)
    dx=(pad-minx) if minx<pad else (1-pad-maxx) if maxx>1-pad else 0
    dy=(pad-miny) if miny<pad else (aspect-pad-maxy) if maxy>aspect-pad else 0
    return [(x+dx,y+dy) for x,y in poly]


class Board:
    def __init__(self, rng, aspect, density='balanced'):
        self.rng=rng; self.a=aspect; self.density=density; self.layers=[]; self.next_id=0
        self.title='';self.subtitle='';self.family=''
        self.variation=0;self.goals=[]

    def add(self, kind, pts, role='', z=10, text='', style=None, label=''):
        self.next_id+=1
        item={'id':f'layer_{self.next_id:02d}','kind':kind,
              'poly': [[round(x,6),round(y,6)] for x,y in pts],
              'role':role, 'z':z}
        if text: item['text']=text
        if label: item['label']=label
        if style: item['style']=style
        self.layers.append(item)
        return item

    def tile(self, x,y,w,h, role='support', shape='rect', z=10, gap=.004, label='', angle=0):
        # Design in fractional canvas units; output into legacy x:1, y:aspect space.
        x=x+gap; y=y+gap; w=w-2*gap; h=h-2*gap
        if w<=.012 or h<=.012: return
        y*=self.a; h*=self.a
        if shape=='circle':
            pts=ellipse(x+w/2,y+h/2,w/2,h/2)
        elif shape=='arch':
            pts=arch(x,y,w,h)
        elif shape=='oval':
            pts=ellipse(x+w/2,y+h/2,w/2,h/2)
        elif angle:
            pts=boundpoly(rotatebox(x+w/2,y+h/2,w,h,angle),self.a)
        else:
            pts=polyrect(x,y,w,h)
        return self.add('photo',pts,role=role,z=z,label=label or self.rng.choice(TAGS),
                        style={'shape':shape,'fit':'cover'})

    def paper(self,x,y,w,h,z=20,angle=0,color='paper',role='paper'):
        x=x+.002; y=y+.002; w-=.004; h-=.004
        if angle:
            pts=boundpoly(rotatebox(x+w/2,(y+h/2)*self.a,w,h*self.a,angle),self.a)
        else: pts=polyrect(x,y*self.a,w,h*self.a)
        return self.add('frame',pts,role,z,style={'fill':color, 'shadow':True})

    def framed(self,x,y,w,h,angle=0,z=25,role='support'):
        # Translate frame+window together to retain physical registration.
        cx=(x+w/2); cy=(y+h/2)*self.a; wh=h*self.a
        raw=rotatebox(cx,cy,w,wh,angle)
        corrected=boundpoly(raw,self.a,.008)
        dx=corrected[0][0]-raw[0][0];dy=corrected[0][1]-raw[0][1]
        self.add('frame',corrected,role,z,style={'fill':'paper','shadow':True})
        pad=w*.065
        rad=math.radians(angle)
        window=rotatebox(cx+dx+math.sin(rad)*wh*.06,cy+dy-math.cos(rad)*wh*.06,w-pad*2,wh*.75,angle)
        self.add('photo',window,role,z+1,label=self.rng.choice(TAGS),style={'shape':'rect','fit':'cover'})
        caption=rotatebox(cx+dx-math.sin(rad)*wh*.38,cy+dy+math.cos(rad)*wh*.38,w*.72,wh*.065,angle)
        self.add('text',caption,'caption',z+2,text=self.rng.choice(['a life I love','moments of magic','future memory','in my element']),style={'font':'hand','color':'dark','align':'center'})

    def text(self,x,y,w,h,text,role='quote',z=30,bg=None,align='center',size=1,color=None):
        p=polyrect(x,y*self.a,w,h*self.a)
        style={'align':align,'font':'display' if role in ('title','quote','hero_text') else 'small',
               'fontSize':size,'color':color or 'ink'}
        if bg:style['fill']=bg
        return self.add('text',p,role,z,text=text,style=style)

    def shape(self,x,y,w,h,shape='circle',z=20,fill='accent',stroke=None):
        x0=x; y0=y*self.a; w0=w;h0=h*self.a
        p=ellipse(x0+w0/2,y0+h0/2,w0/2,h0/2) if shape=='circle' else polyrect(x0,y0,w0,h0)
        return self.add('shape',p,'decoration',z,style={'fill':fill,'stroke':stroke,'shape':shape})

    def path(self,points,z=35,color='accent',width=2):
        self.add('line',[(x,y*self.a) for x,y in points],'connection',z,style={'stroke':color,'width':width})

    def headline(self,top='THE LIFE I IMAGINE',bottom='A VISION IN THE MAKING'):
        self.title=top;self.subtitle=bottom


def layout_editorial(b):
    b.headline('THE ART OF BECOMING','A LIFE, BEAUTIFULLY INTENTIONAL')
    fw=b.rng.uniform(.56,.65)
    b.tile(0,.16,fw,.67,'hero',label='MY FUTURE')
    b.tile(fw,.16,1-fw,.33,label='CREATE')
    b.tile(fw,.49,1-fw,.34,label='THRIVE')
    for i in range(4): b.tile(i*.25,.83,.25,.17,'detail')
    b.text(.045,.025,.91,.105,'THE ART OF BECOMING','title',size=1.25,align='left')
    b.text(.03,.58,.54,.18,'Make room for\nwhat makes you feel alive.','hero_text',z=31,color='white',size=.95,align='left')
    b.shape(.96,.095,.025,.025,z=1,fill='accent')
    b.text(.815,.111,.155,.035,'VOL. 01','tiny',align='right',size=.7)


def layout_maximalist(b):
    b.headline('EVERYTHING, EVERYWHERE','THE BIG, BEAUTIFUL DREAM WALL')
    cols=7 if b.density=='dense' else 6
    rows=7 if b.density=='dense' else 6
    occ=[[False]*cols for _ in range(rows)]
    anchors=[(1,1,3,2),(cols-3,rows-3,2,2)]
    def place(c,r,cw,rh,role):
        if c+cw>cols or r+rh>rows:return False
        if any(occ[y][x] for y in range(r,r+rh) for x in range(c,c+cw)):return False
        for y in range(r,r+rh):
            for x in range(c,c+cw):occ[y][x]=True
        b.tile(c/cols,r/rows,cw/cols,rh/rows,role,gap=.0025)
        return True
    for i,(c,r,w,h) in enumerate(anchors): place(c,r,w,h,'hero' if not i else 'feature')
    for r in range(rows):
        for c in range(cols):
            if occ[r][c]:continue
            options=[(2,2),(2,1),(1,2),(1,1)] if b.density=='airy' else [(2,1),(1,2),(2,2),(1,1)]
            b.rng.shuffle(options)
            for w,h in options:
                if place(c,r,w,h,'detail'):break
    b.paper(.19,.39,.60,.12,z=40,angle=b.rng.uniform(-2,2))
    b.text(.205,.404,.57,.087,'DREAM WILDLY. LIVE FULLY.','title',z=41,size=.9)
    b.text(.02,.95,.29,.037,'2027 / OUR NEXT CHAPTER','tiny',z=44,bg='paper',size=.7)


def layout_archways(b):
    b.headline('DOORS TO POSSIBILITY','EVERY DOOR OPENS SOMEWHERE')
    b.text(.055,.022,.89,.09,'OPEN TO POSSIBILITY','title',size=1.1)
    widths=[.31,.32,.31]; xs=[.025,.34,.665]
    heights=[b.rng.uniform(.47,.57), b.rng.uniform(.57,.65), b.rng.uniform(.44,.55)]
    for i,(x,w,h) in enumerate(zip(xs,widths,heights)):
        b.tile(x,.135,w,h,'hero' if i==1 else 'feature',shape='arch',gap=.006)
        b.text(x+.025,.15+h,w-.05,.052,['WANDER','BECOME','BLOOM'][i],'small',bg='paper',size=.8)
    y=.81
    for i in range(5): b.tile(.022+i*.193,y,.192,.18,'detail',gap=.003)
    b.shape(.015,.07,.045,.045,fill='accent')
    b.shape(.93,.75,.065,.065,fill='accent')


def layout_compass(b):
    b.headline('THE INNER COMPASS','DREAMS WITH DIRECTION')
    # dense backing tessellation, fully bleed edge-to-edge
    for row in range(4):
        for col in range(4):
            b.tile(col*.25,row*.25,.25,.25,'detail',z=2,gap=.002)
    b.shape(.245,.235,.51,.53,fill='paper',z=12)
    b.shape(.276,.266,.448,.466,fill='light',z=13)
    b.tile(.29,.28,.42,.44,'hero',shape='oval',z=14,gap=.002)
    b.shape(.36,.365,.28,.265,'circle',z=17,fill='paper')
    b.text(.38,.42,.24,.16,'TRUE\nNORTH','title',z=19,size=.95)
    for x,y,s in [(.085,.09,'GROW'),(.69,.1,'BELIEVE'),(.062,.84,'FEEL'),(.73,.82,'GO')]:
        b.text(x,y,.23,.065,s,'small',z=25,bg='paper')
    b.path([(.5,.035),(.5,.17)],z=22,width=3)
    b.path([(.5,.83),(.5,.965)],z=22,width=3)


def layout_chapters(b):
    b.headline('THE NEXT CHAPTER','ONE DREAM AT A TIME')
    chapters=[0,1,2]
    if b.variation%3 == 1:chapters=[2,0,1]
    if b.variation%3 == 2:chapters=[1,2,0]
    for i in range(3):
        chapter=chapters[i]
        y=i/3;flip=(chapter%2==1)
        if flip:
            b.tile(0,y,.36,1/3,'support',gap=.004)
            b.tile(.36,y,.64,1/3,'hero',gap=.004)
        else:
            b.tile(0,y,.64,1/3,'hero',gap=.004)
            b.tile(.64,y,.36,1/3,'support',gap=.004)
        tx=.39 if flip else .025
        b.text(tx,y+.06,.55,.095,['01 / THE COURAGE TO BEGIN','02 / THE ROOM TO GROW','03 / THE JOY OF ARRIVING'][chapter],
               'small',z=18,bg='paper',align='center',size=.74)
    b.text(.28,.453,.44,.09,'ONE BEAUTIFUL LIFE','title',z=33,bg='paper',size=.93)


def layout_scrapbook(b):
    b.headline('LITTLE BEAUTIFUL THINGS','COLLECT THE MOMENTS')
    # Wallpaper of cropped images, then real layered scrapbook cards.
    for y in range(4):
        for x in range(3):b.tile(x/3,y/4,1/3,1/4,'background',z=1,gap=.001)
    positions=[(.03,.06,.44,.36,-7),(.54,.07,.39,.34,8),(.12,.41,.40,.35,7),(.54,.45,.42,.38,-8),(.11,.72,.4,.26,-5)]
    for i,(x,y,w,h,angle) in enumerate(positions):
        b.framed(x,y,w,h,angle+b.rng.uniform(-2,2),z=8+i*5,role='hero' if i==2 else 'feature')
    b.paper(.265,.365,.48,.10,z=40,angle=-3)
    b.text(.28,.385,.44,.06,'I AM HERE. I AM GROWING.','quote',z=41,size=.78)
    for x,y in [(.022,.12),(.915,.38),(.85,.81)]:
        b.shape(x,y,.055,.055,z=43,fill='accent')


def layout_quilt(b):
    b.headline('A TAPESTRY OF TOMORROWS','EVERY SMALL DREAM MATTERS')
    # Intentional patchwork with stitched seams, no random BSP.
    widths = [[.42,.19,.39],[.20,.40,.40],[.35,.35,.30],[.53,.24,.23]]
    if b.variation%2: widths=widths[::-1]
    if b.variation%3 == 2: widths=[row[::-1] for row in widths]
    strips=[[(sum(row[:j]),row[j]) for j in range(3)] for row in widths]
    for row, intervals in enumerate(strips):
        y=row*.25
        for c,(x,w) in enumerate(intervals):
            b.tile(x,y,w,.25,'feature' if (row,c) in ((0,0),(1,1),(3,0)) else 'detail',gap=.003)
    b.paper(.18,.405,.63,.185,z=28)
    b.text(.21,.435,.57,.12,'PIECES OF\nA BEAUTIFUL LIFE','title',z=30,size=1.05,color='dark')
    for x in [.2,.4,.6,.8]:
        b.shape(x-.008,.404,.014,.014,z=31,fill='accent')
        b.shape(x-.008,.579,.014,.014,z=31,fill='accent')


def layout_staircase(b):
    b.headline('THE ASCENT','SMALL STEPS / BIG DREAMS')
    # Grid-based stair-step big images + fully covered support imagery.
    C=6;R=7;occ=[[False]*C for _ in range(R)]
    anchors=[(0,0,3,2),(2,2,3,2),(3,4,3,2)]
    def put(c,r,w,h,role):
        if c+w>C or r+h>R:return False
        if any(occ[rr][cc] for rr in range(r,r+h) for cc in range(c,c+w)):return False
        for rr in range(r,r+h):
            for cc in range(c,c+w):occ[rr][cc]=True
        b.tile(c/C,r/R,w/C,h/R,role,gap=.003)
        return True
    for k,anc in enumerate(anchors):put(*anc,'hero' if k==1 else 'feature')
    for r in range(R):
        for c in range(C):
            if occ[r][c]:continue
            for w,h in [(2,1),(1,2),(1,1)]:
                if put(c,r,w,h,'detail'):break
    for i,(x,y) in enumerate([(.05,.17),(.39,.46),(.57,.74)]):
        b.text(x,y,.3,.065,['01  IMAGINE','02  BEGIN','03  BECOME'][i],'small',z=30,bg='paper')
    b.path([(.14,.235),(.28,.32),(.45,.40),(.6,.56),(.76,.7),(.9,.86)],z=31,width=3)


def layout_moon(b):
    b.headline('MOONSHOT / BIG DREAMS','THE IMPOSSIBLE IS A DIRECTION')
    # 3+3 image ribbons and circular portal focal in middle.
    for i in range(4):
        b.tile(i*.25,0,.25,.36,'support',gap=.002)
        b.tile(i*.25,.64,.25,.36,'support',gap=.002)
    for i in range(3):b.tile(i/3,.36,1/3,.28,'detail',z=1,gap=.002)
    b.shape(.235,.26,.53,.48,z=12,fill='paper')
    b.shape(.254,.276,.492,.448,z=13,fill='accent')
    b.tile(.272,.293,.456,.414,'hero',shape='circle',gap=0,z=14)
    b.paper(.19,.462,.62,.12,z=27)
    b.text(.22,.484,.56,.082,'DREAM BIGGER','title',size=1.1,z=28)
    for x,y,r in [(.105,.388,.018),(.858,.414,.021),(.766,.16,.022),(.15,.75,.013)]:
        b.shape(x,y,r,r,z=27,fill='accent')


def layout_ribbon(b):
    b.headline('THE GOLDEN THREAD','CONNECT THE THINGS THAT MATTER')
    # Strong typographic ribbon through a dense column arrangement.
    widths=[.26,.22,.3,.22]
    if b.variation%2:widths=widths[::-1]
    x=0
    for col,w in enumerate(widths):
        lengths=[[.26,.44,.3],[.42,.24,.34],[.24,.29,.47],[.32,.39,.29]][(col+b.variation)%4]
        y=0
        for j,h in enumerate(lengths):
            b.tile(x,y,w,h,'hero' if (col,j) in ((0,1),(2,2)) else 'support',gap=.003)
            y+=h
        x+=w
    b.paper(.05,.365,.9,.24,z=40,angle=b.rng.uniform(-2,2))
    b.text(.075,.405,.85,.15,'FOLLOW WHAT\nSETS YOU ALIVE','title',z=41,size=1.1)
    b.path([(.06,.88),(.21,.76),(.34,.81),(.51,.73),(.72,.79),(.91,.67)],z=43,width=3)


def layout_focus(b):
    b.headline('THE FOUR CORNERS OF A DREAM','WORK / LOVE / WELLBEING / WONDER')
    midx=b.rng.uniform(.46,.54);midy=b.rng.uniform(.46,.54)
    for i in range(2):
        for j in range(2):
            x=[0,midx][j];y=[0,midy][i]
            w=([midx,1-midx][j]);h=([midy,1-midy][i])
            b.tile(x,y,w,h,'hero' if i==j else 'feature',gap=.003)
            b.text(x+.035,y+.055,.32,.07,[['01 / CREATE','02 / WANDER'],['03 / BELONG','04 / GROW']][i][j],
                   'small',z=15,bg='paper',size=.85)
    b.shape(.312,.31,.376,.38,'circle',z=21,fill='paper')
    b.shape(.332,.331,.336,.34,'circle',z=22,fill='light')
    b.text(.352,.409,.296,.18,'MY\nWHY','title',z=23,size=1.15)


def layout_diary(b):
    b.headline('POSTCARDS FROM THE FUTURE','THIS IS WHAT IT FELT LIKE')
    # Pages and photo windows make this a memorabilia story rather than a grid.
    b.tile(0,0,1,1,'background',gap=0,z=1)
    b.paper(.025,.045,.95,.91,z=10)
    b.tile(.056,.09,.55,.48,'hero',z=12,gap=0)
    b.tile(.632,.09,.305,.22,'feature',z=12,gap=0)
    b.tile(.632,.324,.305,.255,'support',z=12,gap=0)
    b.text(.07,.601,.68,.09,'DEAR FUTURE ME,','title',z=20,align='left',size=1.05)
    b.text(.07,.70,.80,.11,'I HOPE YOU REMEMBER\nHOW BEAUTIFULLY IT ALL BEGAN.','quote',z=20,align='left',size=.85)
    for i in range(4): b.tile(.06+i*.22,.84,.213,.105,'detail',z=14,gap=.002)
    b.shape(.836,.663,.085,.085,'circle',z=21,fill='accent')



def layout_sunburst(b):
    """Radial image wedges are clipped exactly to the board; no empty corners."""
    b.headline('LIGHT UP YOUR FUTURE','GATHER ALL THE THINGS THAT MAKE YOU SHINE')
    n=9 if b.density!='dense' else 12
    cx,cy=.5,.5
    outer=[(0,0),(1,0),(1,1),(0,1)]
    phase=b.rng.uniform(-.18,.18)
    def half_clip(poly, vx,vy, positive):
        if not poly:return []
        def cross(p):return vx*(p[1]-cy)-vy*(p[0]-cx)
        out=[]
        for pa,pb in zip(poly,poly[1:]+poly[:1]):
            fa=cross(pa)*(1 if positive else -1)
            fb=cross(pb)*(1 if positive else -1)
            a=fa>=-1e-10;b_=fb>=-1e-10
            if a:out.append(pa)
            if a!=b_:
                t=fa/(fa-fb) if abs(fa-fb)>1e-12 else 0
                out.append((pa[0]+t*(pb[0]-pa[0]),pa[1]+t*(pb[1]-pa[1])))
        return out
    for i in range(n):
        a=phase+2*math.pi*i/n
        z=phase+2*math.pi*(i+1)/n
        p=half_clip(outer,math.cos(a),math.sin(a),True)
        p=half_clip(p,math.cos(z),math.sin(z),False)
        if len(p)>2:
            b.add('photo',[(x,y*b.a) for x,y in p],role='feature',z=5,
                  label=b.rng.choice(TAGS),style={'shape':'wedge','fit':'cover'})
    b.shape(.334,.335,.332,.33,z=13,fill='paper')
    b.shape(.35,.351,.3,.298,z=14,fill='light')
    b.text(.376,.415,.25,.166,'I WILL\nSHINE','title',z=17,size=1.12,color='dark')
    b.text(.14,.075,.72,.07,'ALL MY BRIGHT POSSIBILITIES','small',z=20,bg='paper')
    for x,y in [(.085,.74),(.815,.15)]:
        b.shape(x,y,.065,.065,z=24,fill='accent')


def layout_papercut(b):
    """Shared jittered grid vertices form an organic no-gap tessellation."""
    b.headline('CUT FROM A DIFFERENT CLOTH','A NONLINEAR KIND OF DREAM')
    C,R=(5,5) if b.density=='dense' else (4,5)
    pts=[]
    for row in range(R+1):
        line=[]
        for col in range(C+1):
            dx=0 if col in (0,C) else b.rng.uniform(-.035,.035)
            dy=0 if row in (0,R) else b.rng.uniform(-.023,.023)
            line.append((col/C+dx,row/R+dy))
        pts.append(line)
    for row in range(R):
        for col in range(C):
            p=[pts[row][col],pts[row][col+1],pts[row+1][col+1],pts[row+1][col]]
            b.add('photo',[(x,y*b.a) for x,y in p],role='detail' if (row+col)%3 else 'feature',
                  z=5,label=b.rng.choice(TAGS),style={'shape':'irregular','fit':'cover'})
    b.paper(.065,.348,.875,.29,z=22,angle=b.rng.uniform(-3,3))
    b.text(.10,.406,.8,.16,'BELIEVE IN\nTHE UNSEEN','title',z=23,size=1.15,color='dark')
    b.shape(.02,.055,.09,.09,z=24,fill='accent')
    b.shape(.885,.84,.072,.072,z=24,fill='accent')
    b.text(.02,.925,.32,.047,'2027 / IN PROGRESS','tiny',z=26,bg='paper')


LAYOUTS={
    'editorial':layout_editorial,
    'maximalist':layout_maximalist,
    'archways':layout_archways,
    'compass':layout_compass,
    'chapters':layout_chapters,
    'scrapbook':layout_scrapbook,
    'quilt':layout_quilt,
    'staircase':layout_staircase,
    'moonshot':layout_moon,
    'ribbon':layout_ribbon,
    'four_corners':layout_focus,
    'future_diary':layout_diary,
    'sunburst':layout_sunburst,
    'paper_cut':layout_papercut,
}

DESCRIPTIONS={
 'editorial':'Magazine cover: cinematic hero, supporting imagery and editorial headline',
 'maximalist':'Edge-to-edge dense image wall with an expressive manifesto banner',
 'archways':'Architectural arches: destinations, life doors and atmospheric windows',
 'compass':'Orbit-inspired goal map with a meaningful central intention',
 'chapters':'Three story chapters, built for multi-stage vision journeys',
 'scrapbook':'Layered printed memories, overlapping paper photos and tactile labels',
 'quilt':'Stitched pictorial tapestry with a center affirmation',
 'staircase':'A progressive visual journey built around ascending milestones',
 'moonshot':'A cinematic circular portal with surrounding memory imagery',
 'ribbon':'Dense photo ribbons behind a sweeping emotional quote',
 'four_corners':'Four goal pillars orbiting a central personal why',
 'future_diary':'Handwritten-style future postcard with mementos and hero photography',
 'sunburst':'Radiant image wedges around a central intention, no empty corner gaps',
 'paper_cut':'Organic irregular hand-cut photo tessellation behind a statement',
}

ART_COLORS=[
    ('#C1D5D9','#E2C0A5','#6E8891','#4B6D68'),
    ('#9EBBC5','#DEC5A7','#627D84','#647C63'),
    ('#DDD2BD','#EAC29D','#A67C5B','#896D57'),
    ('#C7BAC9','#DAA99F','#977985','#6D5E79'),
    ('#A9CCC0','#E4D0A0','#7D9D79','#5B756C'),
    ('#AFC3D2','#F2D4B2','#BC8F81','#657D9F'),
    ('#D3C7A9','#B9C9B4','#7C917E','#556F6A'),
    ('#A1B0C3','#D5B9AE','#748DA0','#4A657C'),
]


def hexrgb(h): return tuple(int(h[i:i+2],16) for i in (1,3,5))

def blend(a,b,t):return tuple(int(x*(1-t)+y*t) for x,y in zip(a,b))


def font_file(style='display'):
    options={
     'display':['/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf','/usr/share/fonts/truetype/liberation2/LiberationSerif-Bold.ttf'],
     'small':['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf','/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf'],
     'hand':['/usr/share/fonts/truetype/dejavu/DejaVuSerif-Italic.ttf'],
    }
    for p in options[style]:
        if Path(p).exists():return p
    return None


def font(size,style='small'):
    path=font_file(style)
    try:return ImageFont.truetype(path,max(8,int(size))) if path else ImageFont.load_default()
    except OSError:return ImageFont.load_default()


def draw_fit_text(draw,box,text,style,fill,alignment,preferred):
    x0,y0,x1,y1=map(int,box)
    if x1<=x0 or y1<=y0:return
    paragraphs=text.split('\n')
    # Automatically wrap long individual lines to the available region.
    max_w=(x1-x0)*.94
    best=None;lines=[]
    for sz in range(max(9,int(preferred)),7,-1):
        f=font(sz,style)
        lines=[]
        for para in paragraphs:
            words=para.split(); line=''
            for word in words:
                candidate=(line+' '+word).strip()
                if line and draw.textbbox((0,0),candidate,font=f)[2]>max_w:
                    lines.append(line);line=word
                else:line=candidate
            lines.append(line)
        lh=sz*1.23
        if lh*len(lines)<=(y1-y0)*.93:
            best=f;break
    if best is None:best=font(8,style)
    lh=best.size*1.23 if hasattr(best,'size') else 12
    y=(y0+y1-lh*len(lines))/2
    for line in lines:
        tw=draw.textbbox((0,0),line,font=best)[2]
        x= x0+(x1-x0-tw)/2 if alignment=='center' else x1-tw-(x1-x0)*.035 if alignment=='right' else x0+(x1-x0)*.035
        draw.text((x,y),line,font=best,fill=fill,stroke_width=0)
        y+=lh


def abstract_scene(w,h,index):
    # Deterministic, offline photo-like art. Replace with --images for user photos.
    w=max(4,int(w));h=max(4,int(h))
    colors=ART_COLORS[index%len(ART_COLORS)]
    a,b,c,d=[hexrgb(v) for v in colors]
    im=Image.new('RGB',(w,h));dr=ImageDraw.Draw(im)
    horizon=int(h*(.42+(index%5)*.065))
    for y in range(h):
        t=y/max(1,h-1)
        val=blend(a,b,min(1,t*1.4)) if y<horizon else blend(b,c,min(1,(y-horizon)/max(1,h-horizon)))
        dr.line([(0,y),(w,y)],fill=val)
    cx=int(w*(.24+(index*7%8)*.07));cy=int(h*(.18+index%3*.07));rr=int(min(w,h)*(.11+index%3*.026))
    dr.ellipse((cx-rr,cy-rr,cx+rr,cy+rr),fill=colors[1])
    # Organic landscape silhouettes, varied per index and geometry.
    phase=index%6
    if phase in (0,3,5):
        mountain=[(0,h*.75),(w*.1,h*.56),(w*.22,h*.69),(w*.41,h*.44),(w*.63,h*.72),(w*.84,h*.49),(w,h*.64),(w,h),(0,h)]
        dr.polygon(mountain,fill=colors[2]);dr.polygon([(0,h*.9),(w*.2,h*.77),(w*.38,h*.88),(w*.7,h*.73),(w,h*.86),(w,h),(0,h)],fill=colors[3])
    elif phase==1:
        dr.rectangle((0,h*.76,w,h),fill=colors[3])
        for j in range(4):
            x=int(w*(.12+j*.25));wid=int(w*(.13+(.03*j%3)));top=int(h*(.36+(.13*j%3)))
            dr.rectangle((x,top,x+wid,h*.77),fill=colors[2]);dr.rectangle((x+wid*.25,top+wid*.2,x+wid*.38,top+wid*.55),fill=colors[1])
    elif phase==2:
        for j in range(7):
            xx=w*(j/6);y=h*(.66+math.sin(j*1.6)*.07)
            dr.ellipse((xx-w*.18,y-h*.09,xx+w*.18,y+h*.2),fill=colors[3] if j%2 else colors[2])
    else:
        dr.polygon([(0,h*.7),(w*.28,h*.59),(w*.6,h*.77),(w,h*.54),(w,h),(0,h)],fill=colors[3])
    return im


def render(b:Board,width=500,palette='linen',images=None,show_labels=False):
    colors=PALETTES[palette]; W=int(width);H=max(1,int(round(width*b.a)))
    im=Image.new('RGB',(W,H),colors['bg']);d=ImageDraw.Draw(im)
    # Poster-like faint paper ruled surface.
    for n in range(8):
        y=int((n+.5)*H/8)
        d.line((0,y,W,y),fill=blend(hexrgb(colors['bg']),hexrgb(colors['paper']),.06),width=1)
    count=0
    photo_files=list(images or [])
    for layer in sorted(b.layers,key=lambda it:it['z']):
        poly=[(round(x*W),round(y*W)) for x,y in layer['poly']]
        if not poly:continue
        bb=(min(x for x,_ in poly),min(y for _,y in poly),max(x for x,_ in poly),max(y for _,y in poly))
        kind=layer['kind'];sty=layer.get('style',{})
        if kind=='line':
            d.line(poly,fill=colors.get(sty.get('stroke','accent'),colors['accent']),width=max(1,int(sty.get('width',2)*W/500)),joint='curve')
        elif kind=='shape':
            name=sty.get('fill','accent');fill=colors.get(name,name)
            d.polygon(poly,fill=fill)
        elif kind=='frame':
            fill=colors.get(sty.get('fill','paper'),colors['paper'])
            if sty.get('shadow'):
                offset=max(2,W//130)
                d.polygon([(x+offset,y+offset) for x,y in poly],fill=blend(hexrgb(colors['bg']),(0,0,0),.26))
            d.polygon(poly,fill=fill)
        elif kind=='photo':
            count+=1
            x0,y0,x1,y1=bb;pw=max(2,x1-x0+1);ph=max(2,y1-y0+1)
            if photo_files:
                goal=layer.get('goal_id','').lower()
                matched=[p for p in photo_files if goal and (goal in p.stem.lower() or goal in p.parent.name.lower())]
                library=matched or photo_files
                f=library[(count-1)%len(library)]
                try:
                    with Image.open(f) as src:
                        tile=ImageOps.fit(ImageOps.exif_transpose(src.convert('RGB')),(pw,ph),method=Image.Resampling.LANCZOS)
                except Exception:
                    tile=abstract_scene(pw,ph,count)
            else:tile=abstract_scene(pw,ph,count)
            mask=Image.new('L',(pw,ph),0)
            ImageDraw.Draw(mask).polygon([(px-x0,py-y0) for px,py in poly],fill=255)
            im.paste(tile,(x0,y0),mask)
            d=ImageDraw.Draw(im)
            if show_labels and layer.get('role')!='background':
                label=layer.get('label',str(count))
                f=font(max(9,W//65),'small')
                # Label only when the bounding box is large enough; avoids noisy tiles.
                if pw>W*.18 and ph>H*.08:
                    d.rectangle((x0+5,y0+5,x0+9+min(pw-12,int(len(label)*W/76)),y0+7+W//38),fill=colors['paper'])
                    d.text((x0+9,y0+7),label[:18],font=f,fill=colors['ink'])
        elif kind=='text':
            fillname=sty.get('fill')
            if fillname:
                d.polygon(poly,fill=colors.get(fillname,fillname))
            col=sty.get('color','ink')
            tcolor='#FFFFFF' if col=='white' else '#2D3330' if col=='dark' or fillname=='paper' else colors.get(col,col)
            fstyle=sty.get('font','small')
            size=round(W*(.061 if fstyle=='display' else .030 if fstyle=='small' else .026)*float(sty.get('fontSize',1)))
            draw_fit_text(d,bb,layer.get('text',''),fstyle,tcolor,sty.get('align','center'),size)
    return im


def assign_goals(b, config):
    """Attach optional user goal IDs to editable photo slots.

    Example schema:
      {"vision_title":"MY 2027", "affirmation":"I am becoming...",
       "goals":[{"id":"travel","label":"Explore","weight":2}, ...]}
    A filename like travel_01.jpg in --images is preferred for travel slots.
    """
    if not isinstance(config, dict):raise ValueError('goals file must be a JSON object')
    categories=config.get('goals',[])
    pool=[]
    for item in categories:
        if not isinstance(item,dict) or not str(item.get('id','')).strip():
            raise ValueError('each goal requires an id')
        weight=max(1,min(8,int(item.get('weight',1))))
        pool.extend([item]*weight)
    b.goals=[{'id':str(c['id']),'label':str(c.get('label',c['id']))} for c in categories]
    photos=[it for it in b.layers if it['kind']=='photo']
    # Important focal content first, supporting slots then environmental backgrounds.
    rank={'hero':0,'feature':1,'support':2,'detail':3,'background':4}
    photos.sort(key=lambda it:(rank.get(it['role'],3), int(it['id'].split('_')[-1])))
    if pool:
        for i,layer in enumerate(photos):
            goal=pool[i%len(pool)]
            layer['goal_id']=str(goal['id'])
            layer['label']=str(goal.get('label',goal['id']))
    if config.get('vision_title'):
        b.title=str(config['vision_title'])
        candidates=[l for l in b.layers if l['kind']=='text' and l['role']=='title' and max(y for x,y in l['poly'])<=b.a*.24]
        if candidates:candidates[0]['text']=b.title
    if config.get('affirmation'):
        quote=next((l for l in b.layers if l['kind']=='text' and l['role'] in ('quote','hero_text')),None)
        if quote:quote['text']=str(config['affirmation'])
    return b


def vary_geometry(b, rng, variation):
    """Small monotone boundary deformation; keeps tessellations gap-free.

    Polygons are warped together so neighboring edges remain aligned. Mirror
    choices change the visual reading order but never mirror actual text glyphs.
    """
    if not variation:return
    horizontal=(variation%2==1)
    vertical=False  # Vision boards keep their top-to-bottom editorial reading order.
    amp=.016 if b.density=='airy' else .026
    xp=[0]+[i/5+rng.uniform(-amp,amp) for i in range(1,5)]+[1]
    yp=[0]+[i/5+rng.uniform(-amp,amp) for i in range(1,5)]+[1]
    def piece(t,p):
        t=max(0,min(1,t));k=min(4,int(t*5));f=t*5-k
        return p[k]*(1-f)+p[k+1]*f
    for layer in b.layers:
        # Metadata in the outer margin should not collide with mirrored headings.
        if layer['role']=='tiny':continue
        new=[]
        for x,y in layer['poly']:
            x=piece(x,xp);y=piece(y/b.a,yp)
            if horizontal:x=1-x
            if vertical:y=1-y
            new.append([round(x,6),round(y*b.a,6)])
        layer['poly']=new

def generate(name,seed=42,aspect=4/3,density='balanced',variation=0):
    if name not in LAYOUTS:raise ValueError(f'Unknown template: {name}')
    if aspect<=0 or aspect>4:raise ValueError('aspect must be >0 and <=4')
    rng=random.Random(f'{seed}-{name}-{aspect}-{density}')
    b=Board(rng,aspect,density)
    b.family=name
    b.variation=variation
    LAYOUTS[name](b)
    vary_geometry(b,rng,variation)
    # Strict coordinates and data shape. Tolerance is for float rounding.
    for layer in b.layers:
        for x,y in layer['poly']:
            if not (-1e-5<=x<=1+1e-5 and -1e-5<=y<=aspect+1e-5):
                raise ValueError(f'{name}: out-of-bounds {layer["id"]}: {x},{y} / {aspect}')
    return b


def export(b, include_normalized=True):
    result={'id':b.family,'name':b.title,'description':DESCRIPTIONS[b.family],
            'aspect':b.a,'coordinate_space':{'x':[0,1], 'y':[0,b.a]},
            'image_count':sum(layer['kind']=='photo' for layer in b.layers),
            'goals':b.goals,
            'layers':[]}
    for layer in b.layers:
        v=dict(layer)
        if include_normalized:
            v['poly_normalized']=[[round(x,6),round(y/b.a,6)] for x,y in v['poly']]
        result['layers'].append(v)
    return result


def contact_sheet(items,columns=4,width=330):
    if not items:return None
    cell_width=width+24;cell_h=max(im.height for _,im,_ in items)+85
    rows=math.ceil(len(items)/columns)
    out=Image.new('RGB',(columns*cell_width+28, rows*cell_h+40),'#F2EFEA')
    d=ImageDraw.Draw(out)
    for idx,(name,im,count) in enumerate(items):
        x=26+(idx%columns)*cell_width;y=24+(idx//columns)*cell_h
        out.paste(im,(x,y))
        d.text((x,y+im.height+11),name.replace('_',' ').upper(),font=font(17,'display'),fill='#28312D')
        d.text((x,y+im.height+37),f'{count} imagery slots  /  editable',font=font(12,'small'),fill='#847E72')
    return out



def write_gallery(folder, items):
    cards=[]
    for tag,img,count in items:
        family=tag.rsplit('_',1)[0]
        cards.append(f'''<a class="template" href="{html.escape(tag)}.png" target="_blank">
          <div class="preview"><img src="{html.escape(tag)}.png" alt="{html.escape(family)} vision board template"></div>
          <div class="detail"><div><h2>{html.escape(family.replace('_',' ').title())}</h2><p>{html.escape(DESCRIPTIONS.get(family,''))}</p></div><span>{count} photo slots</span></div>
        </a>''')
    document='''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Vision Board Templates · Gallery</title><style>
:root{color-scheme:light}*{box-sizing:border-box}body{margin:0;background:#efebe4;color:#272d29;font-family:ui-sans-serif,system-ui,Arial}
header{padding:72px max(24px,6vw) 38px;max-width:1100px}header small{color:#90634c;letter-spacing:.19em;font-size:12px;font-weight:700}
h1{font-family:Georgia,serif;font-size:clamp(38px,5vw,76px);line-height:1.02;letter-spacing:-.035em;max-width:900px;margin:20px 0}
header p{max-width:680px;color:#77766d;font-size:17px;line-height:1.6}
.gallery{padding:5px max(24px,6vw) 100px;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,255px),1fr));gap:25px}
.template{text-decoration:none;color:inherit;background:#fffdf8;overflow:hidden;border-radius:15px;box-shadow:0 10px 34px #282c2410;transition:transform .2s,box-shadow .2s}
.template:hover{transform:translateY(-6px);box-shadow:0 20px 44px #282c2426}.preview{height:360px;padding:16px;background:#f4f1ed;display:flex;align-items:center;justify-content:center}
.preview img{max-width:100%;max-height:100%;object-fit:contain;box-shadow:0 4px 20px #1112}
.detail{padding:17px 19px 21px;display:flex;flex-direction:column;gap:15px}.detail h2{font:700 24px Georgia,serif;margin:0 0 8px}.detail p{font-size:13px;color:#737771;line-height:1.5;margin:0;min-height:42px}
.detail span{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#a46953;font-weight:700}
</style></head><body><header><small>THE VISION BOARD STUDIO / 01</small><h1>Layouts that feel like a story, not a grid.</h1>
<p>A gallery of art-directed, editable vision board compositions. Click any layout for a detailed preview. Use templates.json to bring photo, typography and decoration layers into your app.</p></header>
<main class="gallery">''' + '\n'.join(cards) + '''</main></body></html>'''
    (folder/'index.html').write_text(document,encoding='utf-8')

def main():
    ap=argparse.ArgumentParser(description='Art-directed vision board template generator')
    ap.add_argument('-l','--layout',choices=sorted(LAYOUTS),help='single family (default: all)')
    ap.add_argument('-n','--count',type=int,default=1,help='seeded variations per family')
    ap.add_argument('-s','--seed',type=int,default=42)
    ap.add_argument('--aspect',type=float,default=4/3,help='height/width: 1 square; 1.333 3:4; 1.778 9:16; .5625 16:9')
    ap.add_argument('--density',choices=['airy','balanced','dense'],default='balanced')
    ap.add_argument('--palette',choices=list(PALETTES),default=None)
    ap.add_argument('--width',type=int,default=540)
    ap.add_argument('--columns','--cols',type=int,default=4)
    ap.add_argument('--images',type=Path,default=None,help='folder containing local .png/.jpg/.webp files')
    ap.add_argument('--goals',type=Path,default=None,help='JSON with vision_title, affirmation, goal ids and weights')
    ap.add_argument('--labels',action='store_true',help='show tiny intent labels on photo slots')
    ap.add_argument('--json',action='store_true',help='export full metadata and legacy photo-only slots')
    ap.add_argument('--list',action='store_true',help='list visual families')
    ap.add_argument('-o','--out',type=Path,default=Path('vision_out'))
    args=ap.parse_args()
    if args.list:
        for key,desc in DESCRIPTIONS.items():print(f'{key:14s} {desc}')
        return
    if args.count<1 or args.width<80 or args.columns<1:ap.error('count >=1, width>=80, columns>=1 required')
    if not 0.35<=args.aspect<=3.0:ap.error('aspect must be 0.35..3.0')
    args.out.mkdir(parents=True,exist_ok=True)
    files=sorted(p for p in args.images.rglob('*') if p.is_file() and p.suffix.lower() in ('.png','.jpg','.jpeg','.webp')) if args.images and args.images.is_dir() else []
    goal_config=json.loads(args.goals.read_text(encoding='utf-8')) if args.goals else None
    items=[];full={};legacy={}
    for name in ([args.layout] if args.layout else LAYOUTS):
        for v in range(args.count):
            b=generate(name,args.seed+v,args.aspect,args.density,variation=v)
            if goal_config:assign_goals(b,goal_config)
            palette=args.palette or list(PALETTES)[(len(items)//2)%len(PALETTES)]
            img=render(b,args.width,palette,files,args.labels)
            tag=f'{name}_{v+1:02d}'
            img.save(args.out/f'{tag}.png',optimize=True)
            items.append((tag,img,export(b)['image_count']))
            full[tag]=export(b)
            legacy[tag]=[{'kind':'photo','poly':q['poly']} for q in b.layers if q['kind']=='photo']
    contact_sheet(items,args.columns,args.width).save(args.out/'_contact_sheet.png',optimize=True)
    write_gallery(args.out,items)
    if args.json:
        (args.out/'templates.json').write_text(json.dumps({'seed':args.seed,'aspect':args.aspect,'templates':full},indent=2),encoding='utf-8')
        (args.out/'legacy_photo_slots.json').write_text(json.dumps({'aspect':args.aspect,'layouts':legacy},indent=2),encoding='utf-8')
    print(f'Generated {len(items)} boards ({args.aspect:.3f} H/W) into {args.out.resolve()}')
    print(f'Preview: {args.out / "_contact_sheet.png"}')


if __name__=='__main__':main()
