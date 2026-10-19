(() => {
  const files=["download (1).jpg","download (2).jpg","download (3).jpg","download.jpg","Dreamy Light Blue Apple Devices\ud83d\udc99 With Amazing Color.jpg","manifested.jpg","Mount Fuji, Japan Travel Inspiration.jpg","Porsche 911 GT3\ud83e\udec0.jpg","Varanasi.jpg","\u0644\u064a\u0648\u0648\u0648.jpg"];
  const photos=files.map(file=>({url:`../photos/${encodeURIComponent(file).replace(/%2C/gi,',')}`,natural:[736,1308]}));
  const E=globalThis.SmartDividers, L=globalThis.InterlockingLayouts;
  const state={layout:'tide',count:7,ratio:9/16,diagram:false,mesh:null,images:[],history:[],drag:null};
  for(const family of ['Flow','Cut','Inlay']){
    const group=document.createElement('optgroup');group.label=family;
    L.designs.filter(d=>d.family===family).forEach(d=>{const option=document.createElement('option');option.value=d.id;option.textContent=d.name;group.append(option);});
    document.querySelector('#layout').append(group);
  }

  const colors=['#d4dfd4','#a7bfb5','#e1d3b8','#b6c5d7','#e3c1bb','#c9c4d8','#b8d1c8','#e1d9cb','#c1cfaa','#d8c2ab'];
  const node=(tag,attrs={})=>{const el=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));return el;};
  const clone=v=>JSON.parse(JSON.stringify(v));
  let svg,parts=[],handles=[],W=900,H=1600;
  function message(text){const el=document.querySelector('#status');if(el.textContent!==text)el.textContent=text;}
  function snapshot(){return {vertices:clone(state.mesh.vertices),images:clone(state.images)};}
  function physicalBox(p){const b=E.bounds(p);return {x:b.x*W,y:b.y*H,w:b.w*W,h:b.h*H};}
  function reset(){
    state.drag=null;state.history=[];
    const design=L.designs.find(d=>d.id===state.layout);
    state.mesh=E.create(L.frames(design,state.count,state.ratio).map(f=>f.points),state.ratio,design);
    H=W/state.ratio;state.images=E.polygons(state.mesh).map((p,i)=>E.fitImage(physicalBox(p),photos[i].natural));
    state.mesh.cropBounds=state.images.map(image=>({x:image.x/W,y:image.y/H,w:image.w/W,h:image.h/H}));
    const board=document.querySelector('#board');board.style.setProperty('--board-width',`${Math.min(740,Math.max(320,650*state.ratio))}px`);
    svg=node('svg',{viewBox:`0 0 ${W} ${H}`,'aria-label':'Collage with adjustable shared dividers'});
    const defs=node('defs');svg.append(defs);parts=[];handles=[];
    E.polygons(state.mesh).forEach((p,i)=>{
      const path=node('path'),clip=node('clipPath',{id:`adjust-clip-${i}`});clip.append(path);defs.append(clip);
      const group=node('g',{'clip-path':`url(#adjust-clip-${i})`}),back=node('path',{fill:colors[i]});
      const image=node('image',{href:photos[i].url,preserveAspectRatio:'xMidYMid slice'});
      const label=node('text',{'text-anchor':'middle','dominant-baseline':'middle',fill:'#294d40','font-size':32,'font-family':'Georgia'});label.textContent=String(i+1).padStart(2,'0');
      const line=node('path',{fill:'none',stroke:'#fffdf8','stroke-width':1,'vector-effect':'non-scaling-stroke','pointer-events':'none'});
      group.append(back,image,label);svg.append(group,line);parts.push({path,back,image,label,line});
    });
    state.mesh.edges.forEach((edge,i)=>{
      const hit=node('path',{class:'divider-hit','data-divider':i}),highlight=node('path',{class:'divider-highlight'});
      const handle=node('g',{class:'divider-handle',tabindex:0,role:'button','aria-label':edge.shape?'Resize centre shape':`Adjust divider between photo ${edge.cells[0]+1} and ${edge.cells[1]+1}`,'data-handle':i});
      const knob=node('circle',{class:'knob',r:11,fill:'#fffdf8',stroke:'#315e4c','stroke-width':1.5});
      const arrows=node('path',{class:'arrows',d:'M-6 0H6M-3 -3L-6 0 -3 3M3 -3L6 0 3 3',fill:'none',stroke:'#315e4c','stroke-width':1.3,'stroke-linecap':'round','stroke-linejoin':'round'});
      handle.append(knob,arrows);svg.append(highlight,hit,handle);handles.push({hit,highlight,handle});
      for(const el of [hit,handle])el.onpointerdown=e=>begin(e,i);
      handle.onkeydown=e=>keyboard(e,i);
      handle.onfocus=()=>{highlight.style.opacity='1';};handle.onblur=()=>{highlight.style.opacity='0';};
    });
    svg.onpointermove=drag;svg.onpointerup=finish;svg.onpointercancel=cancel;
    svg.onlostpointercapture=()=>{if(state.drag)cancel();};
    board.replaceChildren(svg);
    document.querySelector('#areas').replaceChildren(...Array.from({length:state.count},(_,i)=>{
      const row=document.createElement('div');row.className='area-row';row.innerHTML=`<span>${String(i+1).padStart(2,'0')}</span><span class="bar"><i></i></span><span class="percent"></span>`;return row;
    }));
    document.querySelector('#count-value').textContent=state.count;
    message(state.mesh.mode==='inlay'?'Resize the centre shape within a small range. The outer junctions and photo positions remain fixed.':state.mesh.mode==='flow'?'Drag a shared seam. Its ends stay pinned; only the two photos sharing it change.':'Move a straight divider and its two junctions. Only the frames touching those junctions adjust.');update();
  }
  function update(affected=[]){
    E.polygons(state.mesh).forEach((p,i)=>{
      const d=`M${p.map(([x,y])=>`${x*W} ${y*H}`).join('L')}Z`,part=parts[i];
      [part.path,part.back,part.line].forEach(el=>el.setAttribute('d',d));
      const image=state.images[i];for(const k of ['x','y'])part.image.setAttribute(k,image[k]);part.image.setAttribute('width',image.w);part.image.setAttribute('height',image.h);
      part.image.style.display=state.diagram?'none':'';part.label.style.display=state.diagram?'':'none';
      const center=p.reduce((v,q)=>[v[0]+q[0]/p.length,v[1]+q[1]/p.length],[0,0]);part.label.setAttribute('x',center[0]*W);part.label.setAttribute('y',center[1]*H);
      const row=document.querySelector('#areas').children[i],area=E.area(p)*100;
      row.querySelector('.percent').textContent=`${area.toFixed(1)}%`;row.querySelector('i').style.width=`${Math.min(100,area*3)}%`;row.classList.toggle('affected',affected.includes(i));
    });
    const screenScale=W/(svg.getBoundingClientRect().width||360);
    state.mesh.edges.forEach((edge,i)=>{
      const info=E.handle(state.mesh,edge),h=handles[i];
      let total=0;
      const d=info.segments.map(([ai,bi])=>{const a=state.mesh.vertices[ai],b=state.mesh.vertices[bi];total+=Math.hypot((a[0]-b[0])*W,(a[1]-b[1])*H);return `M${a[0]*W} ${a[1]*H}L${b[0]*W} ${b[1]*H}`;}).join('');h.hit.setAttribute('d',d);h.highlight.setAttribute('d',d);
      const n=info.normal,angle=Math.atan2(n[1],n[0])*180/Math.PI;
      h.handle.setAttribute('transform',`translate(${info.point[0]*W} ${info.point[1]*H}) rotate(${angle}) scale(${screenScale})`);
      const short=total/screenScale<26;
      h.handle.style.display=short?'none':'';h.hit.style.display=short?'none':'';
      h.handle.classList.toggle('active',state.drag?.index===i);
    });
    document.querySelector('#undo').disabled=!state.history.length;document.querySelector('#reset').disabled=!state.history.length&&!state.drag;
  }
  function pointer(e){const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse());return[p.x/W*state.ratio,p.y/H];}
  function begin(e,index){
    if(e.button!==0||state.drag)return;e.preventDefault();
    const start=snapshot();state.drag={...start,index,pointerId:e.pointerId,point:pointer(e),normal:E.normal(state.mesh,state.mesh.edges[index]),changed:false};
    const guide=node('path',{id:'original-seam',d:handles[index].hit.getAttribute('d'),fill:'none',stroke:'#b47d48','stroke-width':1,'stroke-dasharray':'4 4','vector-effect':'non-scaling-stroke','pointer-events':'none',opacity:.8});svg.append(guide);
    svg.setPointerCapture(e.pointerId);svg.classList.add('dragging');update();
  }
  function apply(index,distance,base){
    const result=E.move(state.mesh,state.mesh.edges[index],distance,base.vertices);state.mesh.vertices=result.vertices;
    const affected=[];
    E.polygons(state.mesh).forEach((p,i)=>{
      if(state.mesh.cells[i].some(j=>Math.hypot(result.vertices[j][0]-base.vertices[j][0],result.vertices[j][1]-base.vertices[j][1])>1e-9))affected.push(i);
      state.images[i]=E.fitImage(physicalBox(p),photos[i].natural,base.images[i]);
    });
    handles.forEach((h,i)=>h.handle.classList.toggle('limited',i===index&&result.limited));
    message(result.limited?'Limit reached — protecting frame proportions and the locked photo crops.':`Adjusting ${affected.length} connected frames. All other photo regions stay still.`);
    update(affected);return Math.abs(result.distance)>1e-8;
  }
  function drag(e){const s=state.drag;if(!s||s.pointerId!==e.pointerId)return;e.preventDefault();const p=pointer(e);s.changed=apply(s.index,(p[0]-s.point[0])*s.normal[0]+(p[1]-s.point[1])*s.normal[1],s);}
  function finish(e){const s=state.drag;if(!s||e.pointerId!==s.pointerId)return;if(s.changed){state.history.push({vertices:s.vertices,images:s.images});if(state.history.length>50)state.history.shift();}state.drag=null;svg.querySelector('#original-seam')?.remove();svg.classList.remove('dragging');svg.releasePointerCapture(e.pointerId);update();}
  function cancel(){const s=state.drag;if(!s)return;state.mesh.vertices=s.vertices;state.images=s.images;state.drag=null;svg.querySelector('#original-seam')?.remove();svg.classList.remove('dragging');handles.forEach(h=>h.handle.classList.remove('limited'));message('Adjustment cancelled.');update();}
  function keyboard(e,index){
    const keys={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};if(!keys[e.key]||state.drag)return;e.preventDefault();
    const n=E.normal(state.mesh,state.mesh.edges[index]),key=keys[e.key],step=(e.shiftKey?.0015:.008)*Math.min(1,state.ratio),base=snapshot();
    if(apply(index,(key[0]*n[0]+key[1]*n[1])*step,base))state.history.push(base);update();
  }
  document.querySelector('#undo').onclick=()=>{const previous=state.history.pop();if(!previous)return;state.mesh.vertices=previous.vertices;state.images=previous.images;handles.forEach(h=>h.handle.classList.remove('limited'));message('Last adjustment undone.');update();};
  document.querySelector('#reset').onclick=reset;
  for(const [id,key] of [['layout','layout'],['count','count'],['format','ratio']])document.querySelector(`#${id}`).addEventListener(id==='count'?'input':'change',e=>{state[key]=key==='layout'?e.target.value:Number(e.target.value);reset();});
  document.querySelector('#diagram').onclick=e=>{state.diagram=!state.diagram;e.currentTarget.setAttribute('aria-pressed',String(state.diagram));update();};
  document.addEventListener('keydown',e=>{if(e.key==='Escape')cancel();});
  new ResizeObserver(()=>{if(svg)update();}).observe(document.querySelector('#board'));
  globalThis.DividerExperiment={state,reset,snapshot};
  reset();
  Promise.all(photos.map(photo=>new Promise(resolve=>{const image=new Image();image.onload=()=>{photo.natural=[image.naturalWidth,image.naturalHeight];resolve();};image.onerror=resolve;image.src=photo.url;}))).then(()=>{if(!state.history.length&&!state.drag)reset();});
})();
