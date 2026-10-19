/* Standalone design study. Not imported by the application. */
(() => {
  const row = (weights, ...children) => ({ axis: 'y', weights, children });
  const col = (weights, ...children) => ({ axis: 'x', weights, children });
  const bands = (counts, offset = false) => row(counts.map(() => 1), ...counts.map((k, i) =>
    col(Array.from({ length: k }, (_, j) => offset && k > 1 ? (j === i % k ? 1.35 : 1) : 1), ...Array(k).fill(1))));

  const designs = window.CreativeStudy.designs;

  // Supporting groups use a bounded row arrangement chosen for their physical
  // region, rather than slicing the last tile repeatedly or stretching photos.
  function grid(n, box, ratio) {
    if (n === 1) return [box];
    let best;
    for (let r = 1; r <= n; r++) {
      const counts = Array.from({ length: r }, (_, i) => Math.floor(n / r) + (i < n % r ? 1 : 0));
      if (counts.some((k) => !k)) continue;
      // An odd row sits between its neighbors, not as an accidental last row.
      if (r === 3 && counts[0] !== counts[2]) [counts[0], counts[1]] = [counts[1], counts[0]];
      const cost = counts.reduce((sum, k) => {
        const aspect = (box.w * ratio / k) / (box.h / r);
        return sum + k * Math.log(aspect / .95) ** 2;
      }, 0) / n + .035 * (Math.max(...counts) - Math.min(...counts));
      if (!best || cost < best.cost) best = { counts, cost };
    }
    return resolve(bands(best.counts), box, ratio);
  }
  function resolve(plan, box, ratio) {
    if (typeof plan === 'number') return grid(plan, box, ratio);
    const total = plan.weights.reduce((a, b) => a + b, 0);
    let offset = 0;
    return plan.children.flatMap((child, i) => {
      const share = plan.weights[i] / total;
      const part = plan.axis === 'x'
        ? { x: box.x + box.w * offset, y: box.y, w: box.w * share, h: box.h }
        : { x: box.x, y: box.y + box.h * offset, w: box.w, h: box.h * share };
      offset += share;
      return resolve(child, part, ratio);
    });
  }
  function frames(design, count, ratio) {
    return window.CreativeStudy.frames(design, count, ratio, grid);
  }
  const sets = {
    visionboard: ["download (1).jpg", "download (2).jpg", "download (3).jpg", "download.jpg", "Dreamy Light Blue Apple Devices\ud83d\udc99 With Amazing Color.jpg", "manifested.jpg", "Mount Fuji, Japan Travel Inspiration.jpg", "Porsche 911 GT3\ud83e\udec0.jpg", "Varanasi.jpg", "\u0644\u064a\u0648\u0648\u0648.jpg"],
  };
  const assetRoot = 'photos/';
  const state = { count: 10, ratio: 9 / 16, mode: 'photos', set: 'visionboard', focus: null, favorites: new Set() };
  let drawingSerial = 0;
  const svgNode = (tag, attributes = {}) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
    return node;
  };
  function art(design, count, ratio, mode) {
    const node = document.createElement('div');
    node.className = `board ${mode}`;
    node.style.aspectRatio = ratio;
    node.setAttribute('aria-label', `${design.name}, ${count} photos`);
    const width = 900, height = width / ratio;
    const svg = svgNode('svg', { viewBox: `0 0 ${width} ${height}`, width: '100%', height: '100%', 'aria-hidden': 'true' });
    const defs = svgNode('defs');
    svg.append(defs);
    const serial = drawingSerial++;
    const shadowId = `shadow-${serial}`;
    const filter = svgNode('filter', { id: shadowId, x: '-30%', y: '-30%', width: '160%', height: '160%' });
    filter.append(svgNode('feDropShadow', { dx: '0', dy: '7', stdDeviation: '9', 'flood-color': '#152b25', 'flood-opacity': '.25' }));
    defs.append(filter);
    frames(design, count, ratio).forEach((b, i) => {
      const w = b.w * width, h = b.h * height;
      const group = svgNode('g', { class: 'photo-piece', transform: `translate(${b.x * width} ${b.y * height}) rotate(${b.rotation || 0} ${w/2} ${h/2})` });
      const clipId = `clip-${serial}-${i}`;
      const pathTransform = b.transposed ? `matrix(0 ${h} ${w} 0 0 0)` : `scale(${w} ${h})`;
      const clip = svgNode('clipPath', { id: clipId });
      clip.append(svgNode('path', { d: b.path, transform: pathTransform }));
      defs.append(clip);
      const back = svgNode('path', { d:b.path, transform:pathTransform, fill:`hsl(151 12% ${[85,76,89,79,70][b.photo % 5]}%)`, ...(b.shadow ? { filter:`url(#${shadowId})` } : {}) });
      group.append(back);
      const img = svgNode('image', { class:'photo', href:`${assetRoot}${encodeURIComponent(sets[state.set][b.photo]).replace(/%2C/gi, ',')}`, width:w, height:h, preserveAspectRatio:'xMidYMid slice', 'clip-path':`url(#${clipId})` });
      group.append(img);
      group.append(svgNode('path', { d:b.path, transform:pathTransform, fill:'none', stroke:'#fffdf8', 'stroke-width':b.featured ? 1.5 : .7, 'stroke-linejoin':'round', 'vector-effect':'non-scaling-stroke' }));
      const label = svgNode('text', { class:'frame-number', x:w/2, y:h/2, 'text-anchor':'middle', 'dominant-baseline':'middle', 'font-size':Math.max(25,Math.min(w,h)*.13), fill:'#264535', 'font-family':'Georgia,serif' });
      label.textContent = String(b.photo+1).padStart(2,'0');
      group.append(label);
      svg.append(group);
    });
    node.append(svg);
    return node;
  }
  function draw() {
    document.documentElement.dataset.mode = state.mode;
    document.querySelector('#count-display').textContent = `${state.count} photos`;
    const root = document.querySelector('#designs');
    root.replaceChildren();
    designs.forEach((design, i) => {
      const card = document.createElement('article');
      card.className = 'design';
      const open = document.createElement('button');
      open.className = 'open-study';
      open.setAttribute('aria-label', `Inspect ${design.name} at 5, 7 and 10 photos`);
      open.append(art(design, state.count, state.ratio, state.mode));
      open.onclick = () => inspect(design);
      const title = document.createElement('div');
      title.className = 'card-title';
      const number = document.createElement('span');
      number.className = 'number';
      number.textContent = String(i + 1).padStart(2, '0');
      const name = document.createElement('h2');
      name.textContent = design.name;
      const save = document.createElement('button');
      save.className = 'shortlist';
      save.textContent = state.favorites.has(design.id) ? '★' : '☆';
      save.setAttribute('aria-label', `Shortlist ${design.name}`);
      save.setAttribute('aria-pressed', state.favorites.has(design.id));
      save.onclick = () => {
        state.favorites.has(design.id) ? state.favorites.delete(design.id) : state.favorites.add(design.id);
        draw();
      };
      title.append(number, name, save);
      const note = document.createElement('p');
      note.textContent = design.note;
      card.append(open, title, note);
      root.append(card);
    });
    document.querySelector('#shortlisted').textContent = state.favorites.size
      ? `Shortlisted: ${designs.filter((d) => state.favorites.has(d.id)).map((d) => d.name).join(', ')}`
      : 'Select a design to compare 5, 7 and 10 photos. Star your favorites.';
  }
  function inspect(design) {
    state.focus = design;
    const dialog = document.querySelector('#inspect');
    document.querySelector('#inspect-title').textContent = design.name;
    document.querySelector('#inspect-rule').textContent = design.rule;
    const variants = document.querySelector('#variants');
    variants.replaceChildren();
    [5, 7, 10].forEach((count) => {
      const figure = document.createElement('figure');
      const caption = document.createElement('figcaption');
      caption.textContent = `${count} PHOTOS`;
      figure.append(caption, art(design, count, state.ratio, state.mode));
      variants.append(figure);
    });
    if (!dialog.open) dialog.showModal();
  }
  document.querySelector('#photo-count').addEventListener('input', (e) => {
    state.count = Number(e.target.value); draw();
  });
  document.querySelector('#format').addEventListener('change', (e) => {
    state.ratio = Number(e.target.value); draw();
  });
  document.querySelectorAll('[data-view]').forEach((button) => {
    button.onclick = () => {
      state.mode = button.dataset.view;
      document.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', b === button));
      draw();
    };
  });
  document.querySelector('#close-inspect').onclick = () => document.querySelector('#inspect').close();
  document.querySelector('#inspect').addEventListener('click', (event) => {
    if (event.target === event.currentTarget) event.currentTarget.close();
  });
  window.CollageStudy = { designs, frames, state, draw, inspect };
  draw();
})();
