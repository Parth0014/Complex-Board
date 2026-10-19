/* HTML experiment: a shared mesh, not independently resized photo frames. */
(() => {
  const area = p => Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1];},0))/2;
  const bounds = p => {
    const xs=p.map(v=>v[0]),ys=p.map(v=>v[1]),x=Math.min(...xs),y=Math.min(...ys);
    return {x,y,w:Math.max(...xs)-x,h:Math.max(...ys)-y};
  };
  const length=(a,b,r)=>Math.hypot((b[0]-a[0])*r,b[1]-a[1]);
  function metrics(p,r) {
    const a=area(p)*r,perimeter=p.reduce((s,v,i)=>s+length(v,p[(i+1)%p.length],r),0);
    return {area:area(p),thickness:2*a/perimeter};
  }
  function create(polygons,ratio) {
    const vertices=[],lookup=new Map();
    const cells=polygons.map(p=>p.map(v=>{
      const key=v.map(x=>Math.round(x*1e8)).join(':');
      if(!lookup.has(key)){lookup.set(key,vertices.length);vertices.push(v.slice());}
      return lookup.get(key);
    }));
    const all=new Map();
    cells.forEach((cell,i)=>cell.forEach((a,j)=>{
      const b=cell[(j+1)%cell.length],key=[a,b].sort((x,y)=>x-y).join(':');
      if(!all.has(key))all.set(key,{a,b,cells:[]});all.get(key).cells.push(i);
    }));
    const edges=[...all.values()].filter(e=>e.cells.length===2);
    const limits=cells.map(c=>metrics(c.map(i=>vertices[i]),ratio));
    const edgeLimits=[...all.values()].map(e=>({...e,min:length(vertices[e.a],vertices[e.b],ratio)*.3}));
    return {vertices,cells,edges,limits,edgeLimits,ratio};
  }
  function polygons(mesh,vertices=mesh.vertices){return mesh.cells.map(c=>c.map(i=>vertices[i]));}
  function valid(mesh,vertices) {
    if(vertices.some(p=>p.some(v=>!Number.isFinite(v)||v< -1e-8||v>1+1e-8)))return false;
    // Existing tiny corner bevels are valid; constrain their relative shrinkage
    // instead of rejecting a sound initial layout with an absolute edge floor.
    for(const e of mesh.edgeLimits)if(length(vertices[e.a],vertices[e.b],mesh.ratio)<e.min)return false;
    return polygons(mesh,vertices).every((p,i)=>{
      const m=metrics(p,mesh.ratio),base=mesh.limits[i];
      if(m.area<Math.max(.035,base.area*.45)||m.thickness<base.thickness*.5)return false;
      let sign=0;
      for(let j=0;j<p.length;j++){
        const a=p[j],b=p[(j+1)%p.length],c=p[(j+2)%p.length];
        const cross=(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]);
        if(Math.abs(cross)<1e-9)return false;
        if(sign&&sign*cross<0)return false;sign=Math.sign(cross);
      }
      return true;
    });
  }
  function normal(mesh,edge,vertices=mesh.vertices){
    const a=vertices[edge.a],b=vertices[edge.b],dx=(b[0]-a[0])*mesh.ratio,dy=b[1]-a[1],d=Math.hypot(dx,dy);
    return [-dy/d,dx/d];
  }
  function move(mesh,edge,distance,start=mesh.vertices) {
    const [nx,ny]=normal(mesh,edge,start),r=mesh.ratio;
    const candidate=d=>{
      const next=start.map(p=>p.slice());
      for(const index of [edge.a,edge.b]){
        const [x,y]=start[index];
        // Junctions on the outside slide along that same side of the board.
        if(x<1e-8||x>1-1e-8){if(Math.abs(ny)<1e-8)return null;next[index]=[x,y+d/ny];}
        else if(y<1e-8||y>1-1e-8){if(Math.abs(nx)<1e-8)return null;next[index]=[x+d/(nx*r),y];}
        else next[index]=[x+nx*d/r,y+ny*d];
      }
      return next;
    };
    // Walk along the requested motion first: do not jump across an invalid
    // region to a different, inverted configuration after a very large drag.
    const requested=Math.max(-2,Math.min(2,distance));
    let low=0,high=1,found=false;
    for(let k=1;k<=32;k++){
      const t=k/32,v=candidate(requested*t);
      if(!v||!valid(mesh,v)){high=t;found=true;break;}low=t;
    }
    if(found)for(let k=0;k<28;k++){const t=(low+high)/2,v=candidate(requested*t);if(v&&valid(mesh,v))low=t;else high=t;}
    const amount=requested*low;
    return {vertices:candidate(amount)||start.map(p=>p.slice()),distance:amount,limited:Math.abs(amount-distance)>1e-6};
  }
  // Minimum uniform image scale needed to cover the new frame. Keep the old
  // photo position unless it would expose an empty edge; never stretch pixels.
  function fitImage(box,natural,previous) {
    const scale=Math.max(previous?.scale||0,box.w/natural[0],box.h/natural[1]);
    const w=natural[0]*scale,h=natural[1]*scale;
    const x=previous?previous.x+(previous.w-w)/2:box.x+(box.w-w)/2;
    const y=previous?previous.y+(previous.h-h)/2:box.y+(box.h-h)/2;
    return {x:Math.max(box.x+box.w-w,Math.min(box.x,x)),y:Math.max(box.y+box.h-h,Math.min(box.y,y)),w,h,scale};
  }
  globalThis.SmartDividers={create,polygons,valid,normal,move,area,bounds,fitImage};
})();
