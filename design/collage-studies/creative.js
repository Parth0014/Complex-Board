/* Shape and overlap studies; intentionally independent of editor code. */
(() => {
  const paths = {
    rect: 'M0 0H1V1H0Z',
    circle: 'M.5 0A.5 .5 0 1 1 .49999 0Z',
    heart: 'M.5 .96C.39 .84 .02 .59 .02 .28C.02 -.02 .36 -.03 .5 .2C.64 -.03 .98 -.02 .98 .28C.98 .59 .61 .84 .5 .96Z',
    diamond: 'M.5 0L1 .5 .5 1 0 .5Z',
    hexagon: 'M.25 0H.75L1 .5 .75 1H.25L0 .5Z',
    rounded: 'M.07 0H.93Q1 0 1 .07V.93Q1 1 .93 1H.07Q0 1 0 .93V.07Q0 0 .07 0Z',
    cloud: 'M.16 .85C-.08 .85 -.02 .44 .15 .43C.04 .05 .42 -.05 .53 .23C.73 -.05 .96 .19 .87 .43C1.12 .5 1 .9 .81 .86C.7 1 .55 .99 .47 .86C.35 1 .2 .98 .16 .85Z',
    torn: 'M0 .045L.04 .022 .09 .052 .15 .015 .2 .04 .26 .01 .31 .04 .37 .02 .42 .047 .49 .01 .55 .04 .61 .015 .68 .04 .74 .01 .81 .05 .88 .018 .94 .042 1 .02L.99 .12 1 .2 .985 .31 1 .44 .99 .55 1 .66 .985 .78 1 .88 .99 .98 .93 .96 .87 .995 .8 .97 .73 .99 .67 .96 .6 .99 .54 .967 .47 .99 .41 .96 .34 .99 .28 .97 .21 1 .15 .965 .08 .99 0 .97 .01 .86 0 .75 .015 .63 0 .53 .01 .42 0 .31 .012 .2Z',
  };
  const polygon = (points) => `M${points.map(([x, y]) => `${x} ${y}`).join('L')}Z`;
  paths.flower = polygon(Array.from({ length: 160 }, (_, i) => {
    const a = i * Math.PI * 2 / 160, r = .425 + .075 * Math.cos(a * 8);
    return [.5 + Math.cos(a) * r, .5 + Math.sin(a) * r];
  }));
  paths.torn = polygon([
    ...Array.from({ length: 91 }, (_, i) => [i/90, .018 + .009*Math.sin(i*2.3) + .006*Math.sin(i*.7)]),
    ...Array.from({ length: 31 }, (_, i) => [.99 + .008*Math.sin(i*1.8), i/30]),
    ...Array.from({ length: 91 }, (_, i) => [1-i/90, .98 + .01*Math.sin(i*1.9) + .005*Math.sin(i*.8)]),
    ...Array.from({ length: 31 }, (_, i) => [.01 + .007*Math.sin(i*2.1), 1-i/30]),
  ]);
  function shape(name, w, h, ratio) {
    if (name === 'arch') {
      const cap = Math.min(.5, w * ratio / (2 * h));
      return `M0 1V${cap}A.5 ${cap} 0 0 1 1 ${cap}V1Z`;
    }
    if (name === 'capsule') {
      const cap = Math.min(.5, w * ratio / (2 * h));
      return `M0 ${cap}A.5 ${cap} 0 0 1 1 ${cap}V${1-cap}A.5 ${cap} 0 0 1 0 ${1-cap}Z`;
    }
    return paths[name] || paths.rect;
  }
  function foreground(kind, x, y, w, h, ratio, rotation = 0) {
    return { x, y, w, h, path: shape(kind, w, h, ratio), kind, rotation, featured: true, outline: true, shadow: true };
  }
  function localPolygon(points) {
    const x = Math.min(...points.map(p => p[0])), y = Math.min(...points.map(p => p[1]));
    const w = Math.max(...points.map(p => p[0])) - x, h = Math.max(...points.map(p => p[1])) - y;
    return { x, y, w, h, path: polygon(points.map(p => [(p[0]-x)/w, (p[1]-y)/h])), outline: true };
  }
  function outer(n, ratio, grid) {
    if (n < 4) return grid(n, { x: 0, y: 0, w: 1, h: 1 }, ratio);
    const counts = {
      4: [1, 1, 1, 1], 5: [2, 1, 1, 1], 6: [2, 1, 1, 2],
      7: [2, 2, 1, 2], 8: [2, 2, 2, 2], 9: [3, 2, 2, 2],
    }[n];
    // Each supporting frame reaches a left or right outside edge. A tiny
    // central cell behind the shaped hero is never introduced at high counts.
    return counts.flatMap((count, i) => Array.from({ length: count }, (_, j) => ({
      x: i % 2 * .5, y: Math.floor(i/2) * .5 + j*.5/count, w:.5, h:.5/count,
    })));
  }
  function ring(n, ratio) {
    // Sectors meet at the center; their outside edges cover the complete board.
    const length = 2 * (ratio + 1);
    const point = (t) => {
      if (t <= ratio) return [t / ratio, 0];
      if (t <= ratio + 1) return [1, t - ratio];
      if (t <= 2 * ratio + 1) return [1 - (t - ratio - 1) / ratio, 1];
      return [0, 1 - (t - 2 * ratio - 1)];
    };
    return Array.from({ length: n }, (_, i) => {
      const a = i * length / n, b = (i + 1) * length / n;
      const corners = [ratio, ratio + 1, 2 * ratio + 1].filter(t => t > a && t < b);
      return localPolygon([[.5, .5], point(a), ...corners.map(point), point(b)]);
    });
  }
  function columns(n,ratio,grid) {
    const left = Math.floor(n/2), right=n-left;
    return [left,right].flatMap((count,i) => Array.from({length:count},(_,j) => ({x:i*.5,y:j/count,w:.5,h:1/count})));
  }
  function warped(n, ratio, grid, angular = false, perimeter = false, supplied) {
    const transform = (x, y) => {
      const wave = angular ? 1 - 4 * Math.abs(((x * 2) % 1) - .5) : Math.sin(x * 2 * Math.PI);
      return [x + .045 * Math.sin(Math.PI * x) * Math.sin(y * Math.PI * 2), y + .045 * Math.sin(Math.PI * y) * wave];
    };
    const base = supplied || (perimeter ? outer(n,ratio,grid) : grid(n, { x: 0, y: 0, w: 1, h: 1 }, ratio));
    return base.map(b => {
      const p = [];
      const steps = 32;
      for (let i = 0; i < steps; i++) p.push(transform(b.x + b.w * i / steps, b.y));
      for (let i = 0; i < steps; i++) p.push(transform(b.x + b.w, b.y + b.h * i / steps));
      for (let i = 0; i < steps; i++) p.push(transform(b.x + b.w * (1-i/steps), b.y+b.h));
      for (let i = 0; i < steps; i++) p.push(transform(b.x, b.y+b.h * (1-i/steps)));
      return localPolygon(p);
    });
  }
  const make = (id, name, note, rule, compose) => ({ id, name, note, rule, compose });
  const designs = [
    make('orbit', 'Orbit', 'A circular focal photo floats over the mosaic.',
      'The circle stays generous. Additional photos split the four exposed outer regions.',
      (n, r, g) => [...outer(n-1,r,g), foreground('circle',.15,.5-.35*r,.7,.7*r,r)]),
    make('heartstrings', 'Heartstrings', 'One oversized heart, held by your other moments.',
      'A single heart remains the focal point; outer photo regions adapt from four to nine.',
      (n,r,g) => [...outer(n-1,r,g), foreground('heart',.055,.5-.445*r,.89,.89*r,r,-4)]),
    make('portal', 'Portal', 'An arched portrait opens into a layered world.',
      'The arch keeps its silhouette. Supporting photos divide around its exposed edges.',
      (n,r,g) => [...columns(n-1,r,g), foreground('arch',.19,.19,.62,.62,r)]),
    make('bloom', 'Bloom', 'A scalloped flower photo at the center.',
      'The flower is one real photo, not a decorative sticker. The outer mosaic carries the remaining images.',
      (n,r) => [...ring(n-1,r), foreground('flower',.07,.5-.43*r,.86,.86*r,r,8)]),
    make('prism', 'Prism', 'Angular photo rays meet a calm circular center.',
      'Each ray reaches an outside edge. The circular center covers their pointed joins, never an entire photo.',
      (n,r) => [...ring(n-1,r), foreground('circle',.25,.5-.25*r,.5,.5*r,r)]),
    make('honey', 'Honeycomb', 'A crisp hexagon over an off-center mosaic.',
      'The six-sided feature stays fixed while the surrounding photos grow into smaller, usable regions.',
      (n,r,g) => [...warped(n-1,r,g,true,true), foreground('hexagon',.055,.45-.425*r*.866,.85,.85*r*.866,r)]),
    make('diamond', 'Diamond days', 'A diamond interrupts the grid with a bold cut.',
      'One diamond anchors the middle. Thin edges separate it from the four surrounding photo groups.',
      (n,r,g) => [...outer(n-1,r,g), foreground('diamond',.035,.5-.465*r,.93,.93*r,r)]),
    make('lunar', 'Lunar pair', 'Two overlapping circles, balanced on a diagonal.',
      'Both circular photos keep their scale. New supporting images divide the background, rather than shrinking the circles.',
      (n,r,g) => [...outer(n-2,r,g), foreground('circle',.035,.15,.67,.67*r,r), foreground('circle',.35,.45,.61,.61*r,r)]),
    make('ripple', 'Ripple', 'Flowing seams turn the grid into soft puzzle pieces.',
      'Shared curved edges keep the entire board filled. Each image occupies one continuous, interlocking region.',
      (n,r,g) => warped(n,r,g)),
    make('cloud-nine', 'Cloud nine', 'A cloud-shaped memory above a quiet backdrop.',
      'A single soft cloud shape creates the focal layer. Extra photos stay in the surrounding mosaic.',
      (n,r,g) => [...warped(n-1,r,g,false,true), foreground('cloud',.035,.5-.42*r,.93,.84*r,r)]),
    make('sweethearts', 'Sweethearts', 'Two heart photos cross like little keepsakes.',
      'Two generous hearts overlap slightly. Supporting photos fill every edge and remain separate images.',
      (n,r,g) => [...outer(n-2,r,g), foreground('heart',.005,.15,.7,.7*r,r,-10), foreground('heart',.32,.44,.66,.66*r,r,9)]),
    make('cut-keep', 'Cut & keep', 'Tilted photo cards and a small circular detail.',
      'Two overlapping cards and one circle keep their positions. The background absorbs additional photos.',
      (n,r,g) => [...outer(n-3,r,g), foreground('rounded',.075,.12,.65,.34,r,-6), foreground('rounded',.27,.49,.65,.34,r,7), foreground('circle',.02,.69,.32,.32*r,r)]),
    make('torn-journal', 'Torn journal', 'Layered photo scraps with tactile torn edges.',
      'Two torn-paper photos sit over an edge-to-edge photo background. Extra images divide the exposed background regions.',
      (n,r,g) => [...outer(n-2,r,g), foreground('torn',.06,.16,.86,.29,r,-5), foreground('torn',.08,.56,.86,.29,r,5)]),
    make('fan', 'Fan club', 'Three photos spread out like a hand of cards.',
      'Three overlapping cards form the fan. Supporting photos remain visible around its outer edge.',
      (n,r,g) => [...outer(n-3,r,g), foreground('rounded',.045,.29,.42,.43,r,-13), foreground('rounded',.535,.29,.42,.43,r,13), foreground('rounded',.29,.23,.42,.43,r)]),
    make('arch-halo', 'Arch & halo', 'An arched hero with a circular photo crossing its edge.',
      'The arch and circle act as a stable pair. The remaining photos occupy the surrounding regions.',
      (n,r,g) => [...outer(n-2,r,g), foreground('arch',.08,.13,.62,.61,r,-3), foreground('circle',.51,.59,.43,.43*r,r)]),
    make('offbeat', 'Offbeat', 'A tilted card, a circle and a diamond in conversation.',
      'Three different foreground shapes form a loose vertical rhythm, with supporting photos behind them.',
      (n,r,g) => [...outer(n-3,r,g), foreground('rounded',.08,.105,.59,.28,r,-7), foreground('circle',.4,.39,.54,.54*r,r), foreground('diamond',.04,.65,.57,.57*r,r)]),
    make('capsules', 'Capsules', 'Two rounded portraits glide past one another.',
      'Capsule frames preserve their tall silhouette. Additional photos fill the exposed outer areas.',
      (n,r,g) => [...outer(n-2,r,g), foreground('capsule',.06,.12,.5,.56,r,-5), foreground('capsule',.44,.4,.5,.49,r,5)]),
    make('fold', 'Fold', 'A zigzag photo surface with a diamond on top.',
      'The shared zigzag seams keep the base filled. A central diamond adds one controlled foreground layer.',
      (n,r,g) => [...warped(n-1,r,g,true,true), foreground('diamond',.25,.5-.25*r,.5,.5*r,r)]),
  ];
  function edgeMosaic(n,ratio,overlays) {
    // Allocate equal *visible* area to photos around the overlapping shapes.
    // Every background photo owns an outside edge; none is a hidden center tile.
    const ctx=document.createElement('canvas').getContext('2d');
    const shapes=overlays.map(f=>({...f,mask:new Path2D(f.path)}));
    const covered=(x,y)=>shapes.some(f=>{
      const a=-(f.rotation||0)*Math.PI/180,dx=(x-f.x-f.w/2)*ratio,dy=y-f.y-f.h/2;
      return ctx.isPointInPath(f.mask,(dx*Math.cos(a)-dy*Math.sin(a))/(f.w*ratio)+.5,(dx*Math.sin(a)+dy*Math.cos(a))/f.h+.5);
    });
    return [Math.floor(n/2),Math.ceil(n/2)].flatMap((count,side)=>{
      const bins=Array.from({length:240},(_,y)=>{
        let free=0;
        for(let x=0;x<24;x++)if(!covered(side*.5+(x+.5)/48,(y+.5)/240))free++;
        return free;
      });
      const sum=bins.reduce((a,b)=>a+b,0),cuts=[0];
      let cumulative=0,next=1;
      bins.forEach((value,i)=>{
        cumulative+=value;
        if(next<count&&cumulative>=sum*next/count){cuts.push((i+1)/240);next++;}
      });
      cuts.push(1);
      return Array.from({length:count},(_,i)=>({x:side*.5,y:cuts[i],w:.5,h:cuts[i+1]-cuts[i]}));
    });
  }
  const geometryCache=new Map();
  function frames(design,count,ratio,grid) {
    const cacheKey=`${design.id}:${count}:${ratio}`;
    if(geometryCache.has(cacheKey))return geometryCache.get(cacheKey);
    const canonical = Math.min(ratio, 1/ratio);
    let result = design.compose(count,canonical,grid);
    // Keep roughly the same foreground area in square and portrait formats.
    // Scaling the normalized portrait geometry directly would nearly double
    // the circle/heart area in square and obscure the supporting photos.
    const scale = Math.min(1,Math.sqrt(.5625/canonical));
    result = result.map(f => {
      if (!f.featured) return f;
      const w=f.w*scale,h=f.h*scale;
      return {...f,w,h,x:Math.min(1-w-.015,Math.max(.015,f.x+(f.w-w)/2)),y:Math.min(1-h-.015,Math.max(.015,f.y+(f.h-h)/2))};
    });
    if(!['prism','bloom','ripple'].includes(design.id)){
      const foregrounds=result.filter(f=>f.featured);
      let background=edgeMosaic(count-foregrounds.length,canonical,foregrounds);
      if(['honey','cloud-nine','fold'].includes(design.id))background=warped(background.length,canonical,grid,design.id!=='cloud-nine',false,background);
      result=[...background,...foregrounds];
    }
    const featured = result.filter(f => f.featured).length;
    let main = 0, supporting = featured;
    result = result.map(f => ({ ...f, photo: f.featured ? main++ : supporting++, path:f.path || paths.rect }));
    if (ratio > 1) result = result.map(f => ({ ...f, x:f.y, y:f.x, w:f.h, h:f.w,
      path: f.kind ? shape(f.kind, f.h, f.w,ratio) : f.path, transposed: !f.kind, rotation: -(f.rotation || 0),
    }));
    geometryCache.set(cacheKey,result);
    return result;
  }
  window.CreativeStudy = { designs, frames, paths };
})();
