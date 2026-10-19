/* V2 experiment: local seams, pinned junctions and a fixed photograph plane. */
(() => {
  const E=globalThis.SmartDividers,base={create:E.create,valid:E.valid,move:E.move,fitImage:E.fitImage};
  const len=(a,b,r)=>Math.hypot((a[0]-b[0])*r,a[1]-b[1]);
  function conform(polygons,r){
    // The visual study samples long and short curves separately. Insert their
    // T-junctions into both sides before editing, so a pinned junction is a real
    // shared vertex rather than a point lying partway along a neighbour's edge.
    const points=[...new Map(polygons.flat().map(p=>[p.map(v=>Math.round(v*1e8)).join(':'),p])).values()];
    const tolerance=.00003*Math.min(r,1);
    return polygons.map(poly=>poly.flatMap((a,i)=>{
      const b=poly[(i+1)%poly.length],dx=(b[0]-a[0])*r,dy=b[1]-a[1],length2=dx*dx+dy*dy;
      if(length2<1e-14)return[a];
      const additions=[];
      for(const p of points){
        if(p===a||p===b||p[0]<Math.min(a[0],b[0])-tolerance/r||p[0]>Math.max(a[0],b[0])+tolerance/r||p[1]<Math.min(a[1],b[1])-tolerance||p[1]>Math.max(a[1],b[1])+tolerance)continue;
        const t=(((p[0]-a[0])*r)*dx+(p[1]-a[1])*dy)/length2;
        if(t<=1e-6||t>=1-1e-6)continue;
        if(Math.hypot((p[0]-a[0])*r-t*dx,p[1]-a[1]-t*dy)<tolerance)additions.push({t,p});
      }
      additions.sort((a,b)=>a.t-b.t);
      return [a,...additions.map(v=>v.p)];
    }));
  }
  E.create=(polygons,ratio,design)=>{
    if(design.family!=='Inlay'&&!['facets','honeycomb','crystal'].includes(design.id))polygons=conform(polygons,ratio);
    const mesh=base.create(polygons,ratio,design);
    mesh.angular=design.family==='Cut';
    // Original-shape baseline makes repeated drags obey the same size budget.
    mesh.original=mesh.vertices.map(p=>p.slice());
    for(const edge of mesh.edges){
      if(mesh.mode!=='flow')continue;
      const neighbours=new Map();
      for(const [a,b] of edge.segments){if(!neighbours.has(a))neighbours.set(a,[]);if(!neighbours.has(b))neighbours.set(b,[]);neighbours.get(a).push(b);neighbours.get(b).push(a);}
      const ends=[...neighbours].filter(([,v])=>v.length===1).map(([i])=>i);
      let current=ends[0],previous=-1;
      const chain=[];
      while(current!==undefined&&chain.length<=neighbours.size){chain.push(current);const next=neighbours.get(current)?.find(i=>i!==previous);previous=current;current=next;}
      edge.chain=chain.length===neighbours.size&&ends.length===2?chain:[];
      edge.total=edge.chain.reduce((s,j,i)=>i?s+len(mesh.vertices[j],mesh.vertices[edge.chain[i-1]],ratio):0,0);
    }
    // Do not offer a drag handle for a tiny or branched corner contact that
    // does not form one unambiguous seam between two pinned junctions.
    if(mesh.mode==='flow')mesh.edges=mesh.edges.filter(edge=>edge.chain.length>=3);
    return mesh;
  };
  E.fitImage=(box,natural,previous)=>{
    if(previous)return {...previous};
    const image=base.fitImage(box,natural),factor=1.18;
    // Modest crop reserve lets the divider reveal more image without zooming
    // or repositioning any of the photos while a user adjusts the layout.
    return {x:image.x-image.w*(factor-1)/2,y:image.y-image.h*(factor-1)/2,w:image.w*factor,h:image.h*factor,scale:image.scale*factor};
  };
  E.valid=(mesh,vertices)=>{
    if(!base.valid(mesh,vertices))return false;
    return E.polygons(mesh,vertices).every((p,i)=>{
      if(E.area(p)<Math.max(.045,mesh.limits[i].area*.65))return false;
      if(!mesh.cropBounds)return true;
      const box=E.bounds(p),image=mesh.cropBounds[i];
      return box.x>=image.x-1e-8&&box.y>=image.y-1e-8&&box.x+box.w<=image.x+image.w+1e-8&&box.y+box.h<=image.y+image.h+1e-8;
    });
  };
  function intersect(a,b,c,d){
    const cross=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);
    return cross(a,b,c)*cross(a,b,d)<-1e-16&&cross(c,d,a)*cross(c,d,b)<-1e-16;
  }
  function safeSeam(mesh,edge,next){
    if(!E.valid(mesh,next))return false;
    // A moved curve must not cross itself or a different cell boundary.
    // Bounding boxes discard most segment pairs before the orientation test.
    const moved=new Set(edge.chain),pairs=mesh.edgeLimits;
    for(const segment of edge.segments){
      const [ai,bi]=segment,a=next[ai],b=next[bi];
      for(const pair of pairs){
        if(ai===pair.a||ai===pair.b||bi===pair.a||bi===pair.b)continue;
        if(moved.has(pair.a)&&moved.has(pair.b)&&ai>pair.a)continue;
        const c=next[pair.a],d=next[pair.b];
        if(Math.max(a[0],b[0])<Math.min(c[0],d[0])||Math.min(a[0],b[0])>Math.max(c[0],d[0])||Math.max(a[1],b[1])<Math.min(c[1],d[1])||Math.min(a[1],b[1])>Math.max(c[1],d[1]))continue;
        if(intersect(a,b,c,d))return false;
      }
    }
    return true;
  }
  E.move=(mesh,edge,requested,start=mesh.vertices)=>{
    let candidate,check=next=>E.valid(mesh,next);
    if(mesh.mode==='flow'){
      if(edge.chain.length<3)return {vertices:start.map(p=>p.slice()),distance:0,limited:true};
      const normal=E.normal(mesh,edge,start),weights=new Map();
      let total=0;
      const positions=edge.chain.map((j,i)=>{if(i)total+=len(start[j],start[edge.chain[i-1]],mesh.ratio);return total;});
      edge.chain.forEach((j,i)=>{
        const t=positions[i]/total;
        weights.set(j,mesh.angular?1-Math.abs(2*t-1):16*t*t*(1-t)*(1-t));
      });
      candidate=d=>start.map((p,i)=>{
        const weight=weights.get(i)||0;
        return weight?[p[0]+normal[0]*d*weight/mesh.ratio,p[1]+normal[1]*d*weight]:p.slice();
      });
      check=next=>safeSeam(mesh,edge,next);
    }else if(mesh.mode==='inlay'){
      const radius=len(E.handle(mesh,edge,start).point,[.5,.5],mesh.ratio);
      candidate=d=>{
        const scale=1+d/radius;
        if(scale<=0)return null;
        const next=start.map((p,i)=>mesh.centre.has(i)?[.5+(p[0]-.5)*scale,.5+(p[1]-.5)*scale]:p.slice());
        const first=mesh.cells[0][0],original=len(mesh.original[first],[.5,.5],mesh.ratio);
        const overall=len(next[first],[.5,.5],mesh.ratio)/original;
        return overall<.82||overall>1.18?null:next;
      };
    }else{
      // The original straight-edge solver already moves just the two shared
      // junctions. Apply the tighter area and crop budget to its result too.
      candidate=d=>base.move(mesh,edge,d,start).vertices;
    }
    const request=Math.max(-.35,Math.min(.35,requested));
    let low=0,high=1,blocked=false;
    for(let i=1;i<=12;i++){
      const t=i/12,v=candidate(request*t);
      if(!v||!check(v)){high=t;blocked=true;break;}low=t;
    }
    if(blocked)for(let i=0;i<18;i++){const t=(low+high)/2,v=candidate(request*t);if(v&&check(v))low=t;else high=t;}
    const amount=request*low;
    return {vertices:candidate(amount)||start.map(p=>p.slice()),distance:amount,limited:Math.abs(amount-requested)>1e-6};
  };
})();
