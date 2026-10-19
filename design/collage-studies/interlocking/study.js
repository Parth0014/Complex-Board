(() => {
  const photos=["download (1).jpg","download (2).jpg","download (3).jpg","download.jpg","Dreamy Light Blue Apple Devices\ud83d\udc99 With Amazing Color.jpg","manifested.jpg","Mount Fuji, Japan Travel Inspiration.jpg","Porsche 911 GT3\ud83e\udec0.jpg","Varanasi.jpg","\u0644\u064a\u0648\u0648\u0648.jpg"];
  const {designs,frames}=globalThis.InterlockingLayouts;
  const state={count:7,ratio:9/16,mode:'photos',order:photos.map((_,i)=>i)};
  const params=new URLSearchParams(location.search);
  if(params.has('sheet'))document.body.classList.add('sheet');
  if(params.has('count'))state.count=Math.max(5,Math.min(10,Math.round(Number(params.get('count')))||7));
  const tones=['#d4dfd4','#a7bfb5','#e1d3b8','#b6c5d7','#e3c1bb','#c9c4d8','#b8d1c8','#e1d9cb','#c1cfaa','#d8c2ab'];
  let serial=0;
  const svgNode=(tag,attrs={})=>{const el=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));return el;};
  const familyNotes={Flow:'Shared curves. Soft rhythm. Every photo stays visible.',Cut:'Angular joins, balanced cells and a little tension.',Inlay:'Recognisable shapes with neighbours fitted around them.'};
  function art(design,n) {
    const W=900,H=W/state.ratio;
    const svg=svgNode('svg',{class:'art',viewBox:`0 0 ${W} ${H}`,role:'img','aria-label':`${design.name}, ${n} photos, ${state.mode}`});
    const defs=svgNode('defs');svg.append(defs);
    const id=serial++;
    const shapes=frames(design,n,state.ratio);
    shapes.forEach((b,i)=>{
      const path=`M${b.points.map(([x,y])=>`${x*W} ${y*H}`).join('L')}Z`;
      const clipId=`piece-${id}-${i}`,clip=svgNode('clipPath',{id:clipId});
      clip.append(svgNode('path',{d:path}));defs.append(clip);
      const g=svgNode('g',{'data-photo':state.order[i],'data-visible-area':b.area.toFixed(5)});
      g.append(svgNode('path',{d:path,fill:tones[i]}));
      if(state.mode==='photos')g.append(svgNode('image',{href:`../photos/${encodeURIComponent(photos[state.order[i]]).replace(/%2C/gi,',')}`,x:b.x*W,y:b.y*H,width:b.w*W,height:b.h*H,preserveAspectRatio:'xMidYMid slice','clip-path':`url(#${clipId})`}));
      // Only the seam is painted above a neighbour, never another photograph.
      g.append(svgNode('path',{d:path,fill:'none',stroke:'#fffdf8','stroke-width':1,'stroke-linejoin':'round','vector-effect':'non-scaling-stroke'}));
      if(state.mode==='diagram'){
        // Concave inlays have centroids near the cutout; find a deep interior point.
        const pos=labelPoint(b);
        const label=svgNode('text',{class:'frame-label',x:pos[0]*W,y:pos[1]*H,'font-size':Math.min(W,H)*.047});label.textContent=String(i+1).padStart(2,'0');g.append(label);
      }
      svg.append(g);
    });
    return svg;
  }
  function inside(p,poly){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
  function labelPoint(b){
    let best=[b.x+b.w/2,b.y+b.h/2],score=-1;
    const distance=(p,a,b)=>{const dx=(b[0]-a[0])*state.ratio,dy=b[1]-a[1],t=Math.max(0,Math.min(1,(((p[0]-a[0])*state.ratio)*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot((p[0]-a[0])*state.ratio-t*dx,p[1]-a[1]-t*dy);};
    for(let x=1;x<15;x++)for(let y=1;y<15;y++){
      const p=[b.x+x*b.w/15,b.y+y*b.h/15];if(!inside(p,b.points))continue;
      const d=Math.min(...b.points.map((a,i)=>distance(p,a,b.points[(i+1)%b.points.length])));
      if(d>score){score=d;best=p;}
    }
    return best;
  }
  function draw(){
    document.querySelector('#count').value=state.count;document.querySelector('#count-value').textContent=state.count;
    const gallery=document.querySelector('#gallery');gallery.replaceChildren();
    Object.entries(familyNotes).forEach(([family,note])=>{
      const section=document.createElement('section');section.className='family';
      const heading=document.createElement('div');heading.className='family-heading';
      const h=document.createElement('h2');h.textContent=family;const p=document.createElement('p');p.textContent=note;heading.append(h,p);
      const cards=document.createElement('div');cards.className='cards';
      designs.filter(d=>d.family===family).forEach(d=>{
        const card=document.createElement('article');card.className='card';
        const open=document.createElement('button');open.className='open';open.setAttribute('aria-label',`Compare ${d.name}`);open.append(art(d,state.count));open.onclick=()=>inspect(d);
        const title=document.createElement('div');title.className='card-heading';const num=document.createElement('span');num.textContent=String(designs.indexOf(d)+1).padStart(2,'0');const name=document.createElement('h3');name.textContent=d.name;title.append(num,name);
        const note=document.createElement('p');note.textContent=d.note;card.append(open,title,note);cards.append(card);
      });
      section.append(heading,cards);gallery.append(section);
    });
  }
  function inspect(d){
    document.querySelector('#detail-title').textContent=d.name;document.querySelector('#detail-family').textContent=d.family;
    document.querySelector('#detail-note').textContent=d.note;
    const variants=document.querySelector('#variants');variants.replaceChildren();
    [5,7,10].forEach(n=>{const figure=document.createElement('figure'),caption=document.createElement('figcaption');caption.textContent=`${n} PHOTOS`;figure.append(caption,art(d,n));variants.append(figure);});
    document.querySelector('#detail').showModal();
  }
  document.querySelector('#count').oninput=e=>{state.count=Number(e.target.value);draw();};
  document.querySelector('#format').onchange=e=>{state.ratio=Number(e.target.value);draw();};
  document.querySelector('#shuffle').onclick=()=>{const before=state.order.join();for(let i=state.count-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[state.order[i],state.order[j]]=[state.order[j],state.order[i]];}if(state.order.join()===before){[state.order[0],state.order[1]]=[state.order[1],state.order[0]];}draw();};
  document.querySelectorAll('[data-mode]').forEach(b=>{b.onclick=()=>{state.mode=b.dataset.mode;document.querySelectorAll('[data-mode]').forEach(a=>a.setAttribute('aria-pressed',String(a===b)));draw();};});
  document.querySelector('#close').onclick=()=>document.querySelector('#detail').close();
  document.querySelector('#detail').onclick=e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.currentTarget.close();}};
  globalThis.InterlockingStudy={state,draw,art,inspect,photos};draw();
})();
