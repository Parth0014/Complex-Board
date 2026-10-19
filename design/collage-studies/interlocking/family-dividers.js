/* Family-specific rules for the HTML experiment only. */
(() => {
  const E=globalThis.SmartDividers, base={create:E.create,valid:E.valid,normal:E.normal,move:E.move};
  const distance=(a,b,r)=>Math.hypot((a[0]-b[0])*r,a[1]-b[1]);
  const signed=p=>p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1];},0)/2;
  E.create=(polygons,ratio,design)=>{
    const mesh=base.create(polygons,ratio);
    mesh.mode=!design||['facets','honeycomb','crystal'].includes(design.id)?'straight':design.family==='Inlay'?'inlay':'flow';
    mesh.signs=polygons.map(p=>Math.sign(signed(p)));
    if(mesh.mode==='straight')return mesh;
    if(mesh.mode==='inlay'){
      mesh.centre=new Set(mesh.cells[0]);
      mesh.edges=Array.from({length:4},(_,index)=>{
        const angle=index*Math.PI/2,n=[Math.cos(angle),Math.sin(angle)];
        const anchor=mesh.cells[0].reduce((best,j)=>{
          const a=mesh.vertices[j],b=mesh.vertices[best];
          return (a[0]-b[0])*ratio*n[0]+(a[1]-b[1])*n[1]>0?j:best;
        },mesh.cells[0][0]);
        const segments=mesh.cells[0].flatMap((a,i)=>{
          const b=mesh.cells[0][(i+1)%mesh.cells[0].length],p=mesh.vertices[a],q=mesh.vertices[b];
          const theta=Math.atan2((p[1]+q[1])/2-.5,((p[0]+q[0])/2-.5)*ratio);
          const quadrant=(Math.round(theta/(Math.PI/2))+4)%4;
          return quadrant===index?[[a,b]]:[];
        });
        return {anchor,segments,cells:[0],shape:true};
      });
    }else{
      // A curved seam may contain hundreds of tiny segments. Give the whole
      // shared boundary one handle rather than exposing its sampling points.
      const groups=new Map();
      for(const edge of mesh.edges){
        const key=edge.cells.slice().sort((a,b)=>a-b).join(':');
        if(!groups.has(key))groups.set(key,{cells:edge.cells,segments:[]});
        groups.get(key).segments.push([edge.a,edge.b]);
      }
      mesh.edges=[...groups.values()].map(edge=>{
        const total=edge.segments.reduce((s,[a,b])=>s+distance(mesh.vertices[a],mesh.vertices[b],ratio),0);
        let travelled=0,segment=edge.segments[0];
        for(const pair of edge.segments){travelled+=distance(mesh.vertices[pair[0]],mesh.vertices[pair[1]],ratio);if(travelled>=total/2){segment=pair;break;}}
        return {...edge,a:segment[0],b:segment[1]};
      });
    }
    return mesh;
  };
  E.handle=(mesh,edge,vertices=mesh.vertices)=>{
    if(edge.shape){
      const point=vertices[edge.anchor],v=[(point[0]-.5)*mesh.ratio,point[1]-.5],d=Math.hypot(...v);
      return {point,normal:v.map(x=>x/d),segments:edge.segments};
    }
    const a=vertices[edge.a],b=vertices[edge.b];
    return {point:[(a[0]+b[0])/2,(a[1]+b[1])/2],normal:base.normal(mesh,edge,vertices),segments:edge.segments||[[edge.a,edge.b]]};
  };
  E.normal=(mesh,edge,vertices=mesh.vertices)=>E.handle(mesh,edge,vertices).normal;
  E.valid=(mesh,vertices)=>{
    if(mesh.mode==='straight')return base.valid(mesh,vertices);
    if(vertices.some(p=>p.some(v=>!Number.isFinite(v)||v< -1e-8||v>1+1e-8)))return false;
    for(const e of mesh.edgeLimits)if(distance(vertices[e.a],vertices[e.b],mesh.ratio)<e.min*.75)return false;
    const polygons=E.polygons(mesh,vertices);
    if(Math.abs(polygons.reduce((s,p)=>s+E.area(p),0)-1)>2e-5)return false;
    return polygons.every((p,i)=>{
      const area=E.area(p),perimeter=p.reduce((s,a,j)=>s+distance(a,p[(j+1)%p.length],mesh.ratio),0);
      return Math.sign(signed(p))===mesh.signs[i]&&area>=Math.max(.035,mesh.limits[i].area*.45)&&2*area*mesh.ratio/perimeter>=mesh.limits[i].thickness*.5;
    });
  };
  E.move=(mesh,edge,requested,start=mesh.vertices)=>{
    if(mesh.mode==='straight')return base.move(mesh,edge,requested,start);
    const handle=E.handle(mesh,edge,start),r=mesh.ratio;
    const candidate=d=>{
      if(mesh.mode==='inlay'){
        const radius=distance(handle.point,[.5,.5],r),scale=1+d/radius;
        if(scale<=0)return null;
        // Identical scale in both axes retains circles, hearts and petals.
        // Shared inner vertices move once; the surrounding cells inherit them.
        return start.map((p,i)=>mesh.centre.has(i)?[.5+(p[0]-.5)*scale,.5+(p[1]-.5)*scale]:p.slice());
      }
      const axis=Math.abs(handle.normal[0])>Math.abs(handle.normal[1])?0:1,other=1-axis;
      const origin=handle.point[axis],target=origin+d/(handle.normal[axis]*(axis===0?r:1));
      if(target<=.015||target>=.985||origin<=0||origin>=1)return null;
      const logK=Math.log(target*(1-origin)/(origin*(1-target)));
      const radius=.42*Math.min(r,1)/(other===0?r:1);
      // Each cross-section uses a strictly increasing fractional transform.
      // Its strength tapers smoothly along the seam. This preserves ordering,
      // the outside rectangle, and the same curve for both neighbouring cells.
      return start.map(p=>{
        const t=Math.abs(p[other]-handle.point[other])/radius;
        const weight=t>=1?0:(1+Math.cos(Math.PI*t))/2,k=Math.exp(logK*weight),v=p[axis];
        const next=p.slice();next[axis]=v*k/(1-v+v*k);return next;
      });
    };
    let low=0,high=1,blocked=false;
    const requestedDistance=Math.max(-2,Math.min(2,requested));
    for(let i=1;i<=16;i++){const t=i/16,p=candidate(requestedDistance*t);if(!p||!E.valid(mesh,p)){high=t;blocked=true;break;}low=t;}
    if(blocked)for(let i=0;i<22;i++){const t=(low+high)/2,p=candidate(requestedDistance*t);if(p&&E.valid(mesh,p))low=t;else high=t;}
    const amount=requestedDistance*low;
    return {vertices:candidate(amount)||start.map(p=>p.slice()),distance:amount,limited:Math.abs(amount-requested)>1e-6};
  };
})();
