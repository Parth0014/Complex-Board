/* Standalone composition studies. All coordinates describe visible photo regions. */
(() => {
  const TAU = Math.PI * 2;
  const polygonArea = p => Math.abs(p.reduce((a, v, i) => {
    const q = p[(i + 1) % p.length];
    return a + v[0] * q[1] - v[1] * q[0];
  }, 0)) / 2;
  const bounds = p => {
    const xs = p.map(v => v[0]), ys = p.map(v => v[1]);
    const x = Math.min(...xs), y = Math.min(...ys);
    return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
  };
  const rect = (x, y, w, h) => [[x, y], [x+w, y], [x+w, y+h], [x, y+h]];
  // Choose bands by physical tile aspect ratio, then balance odd counts across them.
  function mosaic(n, ratio, variant = 0) {
    let best;
    for (let rows = 2; rows <= Math.ceil(n / 2); rows++) {
      const counts = Array.from({length:rows}, (_,i) => Math.floor(n/rows) + (i < n%rows ? 1:0));
      const score = counts.reduce((s,k) => s + k*Math.log(ratio*rows/k/.9)**2, 0)/n;
      if (!best || score < best.score) best = { counts, score };
    }
    const counts = best.counts;
    if (variant % 2) counts.reverse();
    return counts.flatMap((k, row) => {
      const weights = Array.from({length:k}, (_,j) => variant ? 1 + .18*Math.sin((j+row)*2.1+variant) : 1);
      const total = weights.reduce((a,b) => a+b, 0);
      let x = 0;
      return weights.map(v => { const w=v/total, p=rect(x,row/counts.length,w,1/counts.length); x+=w; return p; });
    });
  }
  // Subdivide axis-aligned edges on a shared coordinate lattice. Neighbours
  // therefore use identical curved samples even where three cells meet.
  function warp(polys, fn) {
    return polys.map(p => p.flatMap((a,i) => {
      const b=p[(i+1)%p.length], axis=Math.abs(a[0]-b[0])>.00001?0:1;
      const lo=Math.min(a[axis],b[axis]), hi=Math.max(a[axis],b[axis]);
      const ts=[];
      for(let k=Math.ceil(lo*240); k<hi*240; k++) {
        const t=(k/240-a[axis])/(b[axis]-a[axis]);
        if(t>1e-8 && t<1-1e-8) ts.push(t);
      }
      ts.sort((u,v)=>u-v);
      return [0,...ts].map(t=>fn(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t));
    }));
  }
  const triangle = x => 2/Math.PI*Math.asin(Math.sin(x));
  const flowing = [
    (x,y)=>[x,y+.055*Math.sin(Math.PI*y)*Math.sin(TAU*x)],
    (x,y)=>[x+.075*Math.sin(Math.PI*x)*Math.sin(TAU*y),y],
    (x,y)=>[x,y+.062*Math.sin(Math.PI*y)*Math.cos(TAU*x)],
    (x,y)=>[x+.045*Math.sin(Math.PI*x)*Math.sin(3*Math.PI*y),y+.035*Math.sin(Math.PI*y)*Math.sin(TAU*x)],
    (x,y)=>[x,y+.06*Math.sin(Math.PI*y)*Math.sin(3*Math.PI*x)],
    (x,y)=>[x+.055*Math.sin(Math.PI*x)*Math.cos(TAU*y),y+.035*Math.sin(Math.PI*y)*Math.sin(Math.PI*x)],
  ];
  function cut(poly, a, b, c) {
    const result=[];
    poly.forEach((p,i)=>{
      const q=poly[(i+1)%poly.length], u=a*p[0]+b*p[1]-c, v=a*q[0]+b*q[1]-c;
      if(u<=1e-9) result.push(p);
      if((u<0 && v>0)||(u>0 && v<0)) { const t=u/(u-v); result.push([p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])]); }
    });
    return result;
  }
  function cells(seeds, ratio) {
    return seeds.map((p,i)=>seeds.reduce((poly,q,j)=> i===j?poly:cut(poly,
      2*(q[0]-p[0])*ratio**2,2*(q[1]-p[1]),(q[0]**2-p[0]**2)*ratio**2+q[1]**2-p[1]**2),rect(0,0,1,1)));
  }
  function centroid(p) {
    let area=0,x=0,y=0;
    p.forEach((v,i)=>{const q=p[(i+1)%p.length],a=v[0]*q[1]-q[0]*v[1];area+=a;x+=(v[0]+q[0])*a;y+=(v[1]+q[1])*a;});
    return [x/(3*area),y/(3*area)];
  }
  function facets(n,r,variant) {
    let seeds=mosaic(n,r,variant+1).map((p,i)=>{
      const b=bounds(p);
      return [b.x+b.w*(.5+.2*Math.sin(i*2.4+variant)),b.y+b.h*(.5+.2*Math.cos(i*1.9+variant))];
    });
    for(let i=0;i<variant;i++) seeds=cells(seeds,r).map(centroid);
    return cells(seeds,r);
  }
  function split(n,box,depth=0) {
    if(n===1) return [rect(...box)];
    const [x,y,w,h]=box, a=Math.floor(n/2), t=a/n;
    return w>h*(depth%2?1.15:.85)
      ? [...split(a,[x,y,w*t,h],depth+1),...split(n-a,[x+w*t,y,w*(1-t),h],depth+1)]
      : [...split(a,[x,y,w,h*t],depth+1),...split(n-a,[x,y+h*t,w,h*(1-t)],depth+1)];
  }
  // Shape and surrounding cells share the very same inner contour. There is
  // no background image beneath the shape, and no z-order-dependent masking.
  function inlay(n,r,kind) {
    const cx=.5, cy=.5, size=.36*Math.min(r,1), rx=size/r, ry=size;
    let heart;
    if(kind==='heart') heart=Array.from({length:720},(_,i)=>{
      const t=i*TAU/720;
      return [Math.sin(t)**3,-(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t))/17];
    });
    const radial = a => {
      const x=Math.cos(a),y=Math.sin(a);
      if(kind==='diamond') return 1/(Math.abs(x)+Math.abs(y));
      if(kind==='hexagon') return Math.cos(Math.PI/6)/Math.cos((a+Math.PI/6)%(Math.PI/3)-Math.PI/6);
      if(kind==='petal') return .88+.12*Math.cos(5*a);
      if(kind==='soft-square') return (Math.abs(x)**4+Math.abs(y)**4)**(-.25)*.9;
      if(kind==='heart') {
        let distance=0;
        heart.forEach((p,i)=>{
          const q=heart[(i+1)%heart.length], dx=q[0]-p[0],dy=q[1]-p[1],den=x*dy-y*dx;
          if(Math.abs(den)<1e-9) return;
          const t=(p[0]*dy-p[1]*dx)/den,u=(p[0]*y-p[1]*x)/den;
          if(t>0 && u>=0 && u<=1) distance=Math.max(distance,t);
        });
        return distance;
      }
      return 1;
    };
    const cornerAngles=rect(0,0,1,1).map(p=>(Math.atan2((p[1]-.5)/ry,(p[0]-.5)/rx)+TAU)%TAU);
    const k=n-1, start=-Math.PI/2;
    const inner=a=>{const d=radial((a+TAU)%TAU);return[cx+rx*d*Math.cos(a),cy+ry*d*Math.sin(a)];};
    const outer=a=>{const x=rx*Math.cos(a),y=ry*Math.sin(a),d=Math.min(.5/Math.abs(x),.5/Math.abs(y));return[cx+x*d,cy+y*d];};
    // Equal angles make tiny side slivers on tall boards. Divide the area
    // around the shape instead, so each supporting photo gets equal space.
    const samples=[start,start+TAU];
    for(let j=1;j<720;j++) samples.push(start+j*TAU/720);
    cornerAngles.forEach(a=>{while(a<start)a+=TAU;while(a>start+TAU)a-=TAU;samples.push(a);});
    samples.sort((a,b)=>a-b);
    const cumulative=[0];
    for(let i=1;i<samples.length;i++) cumulative.push(cumulative[i-1]+polygonArea([outer(samples[i-1]),outer(samples[i]),inner(samples[i]),inner(samples[i-1])]));
    const cuts=Array.from({length:k+1},(_,i)=>{
      if(i===0)return start;if(i===k)return start+TAU;
      const target=cumulative[cumulative.length-1]*i/k;
      const j=cumulative.findIndex(a=>a>=target);
      const t=(target-cumulative[j-1])/(cumulative[j]-cumulative[j-1]);
      return samples[j-1]+t*(samples[j]-samples[j-1]);
    });
    const all=[];
    const surround=Array.from({length:k},(_,i)=>{
      const a=cuts[i],b=cuts[i+1];
      const angles=[a,b];
      for(let j=Math.ceil(a/TAU*720);j<b/TAU*720;j++) if(j*TAU/720>a) angles.push(j*TAU/720);
      cornerAngles.forEach(t=>{while(t<a)t+=TAU;while(t>b)t-=TAU;if(t>a&&t<b)angles.push(t);});
      angles.sort((u,v)=>u-v);
      all.push(...angles.slice(0,-1).map(inner));
      return [...angles.map(outer),...angles.slice().reverse().map(inner)];
    });
    return [all,...surround];
  }
  const definitions = [
    ['tide','Tide','Flow','Quiet waves across staggered photo bands.',(n,r)=>warp(mosaic(n,r,1),flowing[0])],
    ['river','River','Flow','An S-shaped seam connects two photo streams.',(n,r)=>warp(mosaic(n,1/r,2).map(p=>p.map(([x,y])=>[y,x])),flowing[1])],
    ['arcade','Arcade','Flow','Broad curved shoulders instead of stacked arches.',(n,r)=>warp(mosaic(n,r,2),flowing[2])],
    ['silk','Silk','Flow','Softly interlocking corners and an even rhythm.',(n,r)=>warp(mosaic(n,r,3),flowing[3])],
    ['scallop','Scallop','Flow','A repeating scalloped seam, shared by both photos.',(n,r)=>warp(mosaic(n,r,0),flowing[4])],
    ['ribbon','Ribbon','Flow','Rounded vertical ribbons with offset joins.',(n,r)=>warp(mosaic(n,1/r,1).map(p=>p.map(([x,y])=>[y,x])),flowing[5])],
    ['facets','Facets','Cut','Uneven stone-like tiles, each with its own centre.',(n,r)=>facets(n,r,1)],
    ['honeycomb','Honeycomb','Cut','Relaxed polygon cells with softly balanced sizes.',(n,r)=>facets(n,r,3)],
    ['crystal','Crystal','Cut','Sharper angles and a deliberately irregular rhythm.',(n,r)=>facets(n,r,0)],
    ['chevron','Chevron','Cut','Folded zigzag seams through broad photo bands.',(n,r)=>warp(mosaic(n,r,2),(x,y)=>[x,y+.075*Math.sin(Math.PI*y)*triangle(TAU*x)])],
    ['fold','Fold','Cut','A tilted paper-fold join runs through the mosaic.',(n,r)=>warp(split(n,[0,0,r,1]).map(p=>p.map(([x,y])=>[x/r,y])),(x,y)=>[x+.08*Math.sin(Math.PI*x)*(2*y-1),y])],
    ['kite','Kite','Cut','Opposing diagonal cuts, with space for every subject.',(n,r)=>warp(mosaic(n,r,4),(x,y)=>[x+.055*Math.sin(Math.PI*x)*triangle(TAU*y),y+.045*Math.sin(Math.PI*y)*triangle(TAU*x)])],
    ['moon','Moon','Inlay','A circular photo with neighbours cut to meet its edge.',(n,r)=>inlay(n,r,'circle')],
    ['heart','Heart','Inlay','A heart fitted into the composition, with no photo underneath.',(n,r)=>inlay(n,r,'heart')],
    ['gem','Gem','Inlay','A diamond and its surrounding pieces fit edge to edge.',(n,r)=>inlay(n,r,'diamond')],
    ['blossom','Blossom','Inlay','Five gentle petals meet matching neighbouring curves.',(n,r)=>inlay(n,r,'petal')],
    ['hex','Hex','Inlay','A hexagonal centre with a ring of individual photo spaces.',(n,r)=>inlay(n,r,'hexagon')],
    ['cushion','Cushion','Inlay','A soft square fitted between the surrounding moments.',(n,r)=>inlay(n,r,'soft-square')],
  ];
  const designs=definitions.map(([id,name,family,note,build])=>({id,name,family,note,build}));
  function frames(design,n,ratio) {
    if(!Number.isInteger(n)||n<5||n>10||!Number.isFinite(ratio)||ratio<=0) throw new Error('Use 5–10 photos and a positive aspect ratio.');
    // Compose in a portrait-oriented space and transpose for landscape.
    const r=Math.min(ratio,1/ratio), p=design.build(n,r);
    return p.map(points=>{
      if(ratio>1) points=points.map(([x,y])=>[y,x]);
      return {points, ...bounds(points), area:polygonArea(points)};
    });
  }
  globalThis.InterlockingLayouts={designs,frames,polygonArea};
})();
