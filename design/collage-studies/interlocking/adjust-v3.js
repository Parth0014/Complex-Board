(() => {
  const E = globalThis.StructuredDividers,
    L = globalThis.InterlockingLayouts,
    copy = (v) => JSON.parse(JSON.stringify(v));
  const files = [
    'download (1).jpg',
    'download (2).jpg',
    'download (3).jpg',
    'download.jpg',
    'Dreamy Light Blue Apple Devices\ud83d\udc99 With Amazing Color.jpg',
    'manifested.jpg',
    'Mount Fuji, Japan Travel Inspiration.jpg',
    'Porsche 911 GT3\ud83e\udec0.jpg',
    'Varanasi.jpg',
    '\u0644\u064a\u0648\u0648\u0648.jpg',
  ];
  const photos = files.map((file) => ({
    url: `../photos/${encodeURIComponent(file).replace(/%2C/gi, ',')}`,
    natural: [736, 1308],
  }));
  const state = {
    layout: 'honeycomb',
    count: 7,
    ratio: 9 / 16,
    diagram: false,
    model: null,
    params: null,
    result: null,
    history: [],
    drag: null,
    anchors: [],
    affected: [],
  };
  const colors = [
    '#d4dfd4',
    '#a7bfb5',
    '#e1d3b8',
    '#b6c5d7',
    '#e3c1bb',
    '#c9c4d8',
    '#b8d1c8',
    '#e1d9cb',
    '#c1cfaa',
    '#d8c2ab',
  ];
  const svgNode = (tag, attrs = {}) => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
  };
  let svg,
    parts = [],
    controls = new Map(),
    W = 900,
    H = 1600;
  const point = (p) => [p[0] * W, p[1] * H];
  const path = (p) => (p.length ? `M${p.map((p) => point(p).join(' ')).join('L')}` : '');
  const physical = (p) => {
    const b = E.bounds(p);
    return { x: b.x * W, y: b.y * H, w: b.w * W, h: b.h * H };
  };
  const snapshot = () => copy(state.params);
  function message(text) {
    if (document.querySelector('#status').textContent !== text)
      document.querySelector('#status').textContent = text;
  }
  for (const family of ['Flow', 'Cut', 'Inlay']) {
    const group = document.createElement('optgroup');
    group.label = family;
    L.designs
      .filter((d) => d.family === family)
      .forEach((d) => {
        const option = document.createElement('option');
        option.value = d.id;
        option.textContent = d.name;
        group.append(option);
      });
    document.querySelector('#layout').append(group);
  }
  document.querySelector('#layout').value = state.layout;
  function reset() {
    state.drag = null;
    state.history = [];
    state.affected = [];
    H = W / state.ratio;
    const design = L.designs.find((d) => d.id === state.layout);
    state.model = E.create(design, state.count, state.ratio);
    state.params = copy(state.model.initialParams);
    state.result = E.build(state.model, state.params);
    state.anchors = state.result.polygons.map((p, i) => {
      const b = physical(p),
        n = photos[i].natural,
        scale = Math.max(b.w / n[0], b.h / n[1]) * 1.06;
      return { x: b.x + b.w / 2, y: b.y + b.h / 2, scale };
    });
    const board = document.querySelector('#board');
    board.style.setProperty(
      '--board-width',
      `${Math.min(740, Math.max(320, 650 * state.ratio))}px`,
    );
    svg = svgNode('svg', {
      viewBox: `0 0 ${W} ${H}`,
      'aria-label': 'Collage with structured shared dividers',
    });
    parts = [];
    controls = new Map();
    const defs = svgNode('defs');
    svg.append(defs);
    state.result.polygons.forEach((p, i) => {
      const clip = svgNode('clipPath', { id: `v3-clip-${i}` }),
        mask = svgNode('path');
      clip.append(mask);
      defs.append(clip);
      const group = svgNode('g', { 'clip-path': `url(#v3-clip-${i})` }),
        background = svgNode('path', { fill: colors[i] }),
        image = svgNode('image', { href: photos[i].url, preserveAspectRatio: 'xMidYMid slice' }),
        label = svgNode('text', {
          'text-anchor': 'middle',
          'dominant-baseline': 'middle',
          fill: '#294d40',
          'font-size': 32,
          'font-family': 'Georgia',
        });
      label.textContent = String(i + 1).padStart(2, '0');
      const outline = svgNode('path', {
        fill: 'none',
        stroke: '#fffdf8',
        'stroke-width': 1,
        'vector-effect': 'non-scaling-stroke',
        'pointer-events': 'none',
      });
      group.append(background, image, label);
      svg.append(group, outline);
      parts.push({ mask, background, image, label, outline });
    });
    svg.onpointermove = drag;
    svg.onpointerup = finish;
    svg.onpointercancel = cancel;
    svg.onlostpointercapture = () => {
      if (state.drag) cancel();
    };
    board.replaceChildren(svg);
    document.querySelector('#areas').replaceChildren(
      ...Array.from({ length: state.count }, (_, i) => {
        const row = document.createElement('div');
        row.className = 'area-row';
        row.innerHTML = `<span>${String(i + 1).padStart(2, '0')}</span><span class="bar"><i></i></span><span class="percent"></span>`;
        return row;
      }),
    );
    document.querySelector('#count-value').textContent = state.count;
    document.querySelector('#family').textContent = design.family + ' / structured adjustment';
    document.querySelector('#principle').textContent =
      state.model.type === 'rails'
        ? 'Move a whole shared rail.'
        : state.model.type === 'power'
          ? 'Straight cuts. Sliding junctions.'
          : 'Adjust both ends of each join.';
    message(
      state.model.type === 'rails'
        ? 'Drag a shared rail to resize its adjacent rows or columns. The curve follows the original layout.'
        : state.model.type === 'power'
          ? 'Drag a white divider. It moves parallel to itself, and its junctions find their new intersections.'
          : 'Drag the boundary grips to adjust neighbouring photos. The inner joins stay fixed. Use the diagonal grip to resize the centre shape.',
    );
    update();
  }
  function imagePlane(p, i) {
    const b = physical(p),
      a = state.anchors[i],
      n = photos[i].natural;
    const scale = Math.max(
      a.scale,
      (2 * (a.x - b.x)) / n[0],
      (2 * (b.x + b.w - a.x)) / n[0],
      (2 * (a.y - b.y)) / n[1],
      (2 * (b.y + b.h - a.y)) / n[1],
    );
    return {
      x: a.x - (n[0] * scale) / 2,
      y: a.y - (n[1] * scale) / 2,
      w: n[0] * scale,
      h: n[1] * scale,
    };
  }
  function update(affected = state.affected) {
    state.affected = affected;
    state.result.polygons.forEach((p, i) => {
      const d = path(p) + 'Z',
        part = parts[i];
      [part.mask, part.background, part.outline].forEach((el) => el.setAttribute('d', d));
      const im = imagePlane(p, i);
      for (const key of ['x', 'y']) part.image.setAttribute(key, im[key]);
      part.image.setAttribute('width', im.w);
      part.image.setAttribute('height', im.h);
      part.image.style.display = state.diagram ? 'none' : '';
      part.label.style.display = state.diagram ? '' : 'none';
      const b = physical(p);
      part.label.setAttribute('x', b.x + b.w / 2);
      part.label.setAttribute('y', b.y + b.h / 2);
      const row = document.querySelector('#areas').children[i],
        area = E.area(p) * 100;
      row.querySelector('.percent').textContent = `${area.toFixed(1)}%`;
      row.querySelector('i').style.width = `${Math.min(100, area * 3)}%`;
      row.classList.toggle('affected', affected.includes(i));
    });
    const ids = new Set(state.result.dividers.map((d) => d.id));
    for (const [id, el] of controls)
      if (!ids.has(id)) {
        el.remove();
        controls.delete(id);
      }
    const scale = W / (svg.getBoundingClientRect().width || 360);
    state.result.dividers.forEach((d) => {
      let group = controls.get(d.id);
      if (!group) {
        group = svgNode('g', {
          class: `control${d.type === 'shape' ? ' shape-control' : ''}${d.type === 'outer' ? ' outer-control' : ''}`,
          'data-control': d.id,
        });
        const highlight = svgNode('path', { class: 'divider-highlight', fill: 'none' }),
          hit = svgNode('path', { class: 'divider-hit' }),
          handle = svgNode('g', {
            class: 'divider-handle',
            role: 'button',
            tabindex: 0,
            'aria-label': d.label,
            'data-handle': d.id,
          });
        handle.append(
          svgNode('circle', { class: 'knob', r: 11, fill: '#fffdf8', stroke: '#315e4c' }),
          svgNode('path', {
            class: 'arrows',
            d: 'M-6 0H6M-3 -3L-6 0 -3 3M3 -3L6 0 3 3',
            fill: 'none',
            stroke: '#315e4c',
            'stroke-width': 1.3,
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round',
          }),
        );
        group.append(highlight, hit, handle);
        if (d.fixedAnchor)
          group.append(
            svgNode('circle', {
              class: 'inlay-fixed-junction',
              r: 3.5,
              fill: '#fffdf8',
              stroke: '#315e4c',
              'stroke-width': 1.4,
              'pointer-events': 'none',
            }),
          );
        svg.append(group);
        controls.set(d.id, group);
        group.onpointerdown = (e) => begin(e, d.id);
        handle.onkeydown = (e) => keyboard(e, d.id);
      }
      const dpath = path(d.points);
      group.querySelector('.divider-hit').setAttribute('d', (d.type === 'shape' || d.type === 'outer') ? '' : dpath);
      group.querySelector('.divider-highlight').setAttribute('d', dpath);
      const [x, y] = point(d.point),
        angle = (Math.atan2(d.normal[1], d.normal[0]) * 180) / Math.PI;
      group
        .querySelector('.divider-handle')
        .setAttribute('transform', `translate(${x} ${y}) rotate(${angle}) scale(${scale})`);
      if (d.fixedAnchor) {
        const [px, py] = point(d.fixedAnchor);
        group
          .querySelector('.inlay-fixed-junction')
          .setAttribute('transform', `translate(${px} ${py}) scale(${scale})`);
      }
      group.classList.toggle('active', state.drag?.id === d.id);
    });
    document.querySelector('#undo').disabled = !state.history.length;
    document.querySelector('#reset').disabled = !state.history.length && !state.drag;
  }
  function cursor(e) {
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
    return [(p.x / W) * state.ratio, p.y / H];
  }
  function begin(e, id) {
    if (e.button !== 0 || state.drag) return;
    e.preventDefault();
    const divider = state.result.dividers.find((d) => d.id === id);
    state.drag = {
      id,
      divider,
      params: snapshot(),
      point: cursor(e),
      pointerId: e.pointerId,
      changed: false,
      areas: state.result.polygons.map(E.area),
    };
    svg.append(
      svgNode('path', {
        id: 'original-seam',
        d: path(divider.points),
        fill: 'none',
        stroke: '#b47d48',
        'stroke-width': 1,
        'stroke-dasharray': '4 4',
        'vector-effect': 'non-scaling-stroke',
        'pointer-events': 'none',
      }),
    );
    svg.setPointerCapture(e.pointerId);
    svg.classList.add('dragging');
    update();
  }
  function apply(divider, params, distance, areas) {
    const result = E.move(state.model, params, divider, distance);
    state.params = result.params;
    state.result = result;
    const changed = result.polygons
      .map((p, i) => (Math.abs(E.area(p) - areas[i]) > 1e-7 ? i : null))
      .filter((i) => i !== null);
    message(
      result.limited
        ? 'Comfort limit reached. Keeping every photo comfortably sized.'
        : state.model.type === 'inlay'
          ? divider.type === 'outer'
            ? 'The outside join slides along the boundary. Only its two neighbouring photos change.'
            : 'The silhouette scales evenly. Outside junctions keep their chosen positions.'
          : `${changed.length} photo regions are sharing space. The layout keeps its structure.`,
    );
    update(changed);
    for (const [id, el] of controls)
      el.classList.toggle('limited', id === divider.id && result.limited);
    return JSON.stringify(state.params) !== JSON.stringify(params);
  }
  function drag(e) {
    const s = state.drag;
    if (!s || s.pointerId !== e.pointerId) return;
    e.preventDefault();
    const p = cursor(e);
    s.changed = apply(
      s.divider,
      s.params,
      (p[0] - s.point[0]) * s.divider.normal[0] + (p[1] - s.point[1]) * s.divider.normal[1],
      s.areas,
    );
  }
  function finish(e) {
    const s = state.drag;
    if (!s || e.pointerId !== s.pointerId) return;
    if (s.changed) {
      state.history.push(s.params);
      if (state.history.length > 50) state.history.shift();
    }
    state.drag = null;
    svg.querySelector('#original-seam')?.remove();
    svg.classList.remove('dragging');
    svg.releasePointerCapture(e.pointerId);
    update();
  }
  function cancel() {
    const s = state.drag;
    if (!s) return;
    state.params = s.params;
    state.result = E.build(state.model, state.params);
    state.drag = null;
    svg.querySelector('#original-seam')?.remove();
    svg.classList.remove('dragging');
    message('Adjustment cancelled.');
    update([]);
  }
  function keyboard(e, id) {
    const arrows = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (!arrows[e.key] || state.drag) return;
    e.preventDefault();
    const d = state.result.dividers.find((d) => d.id === id),
      key = arrows[e.key],
      params = snapshot(),
      step = (e.shiftKey ? 0.002 : 0.01) * Math.min(1, state.ratio);
    if (
      apply(
        d,
        params,
        (key[0] * d.normal[0] + key[1] * d.normal[1]) * step,
        state.result.polygons.map(E.area),
      )
    )
      state.history.push(params);
    update();
  }
  document.querySelector('#undo').onclick = () => {
    const params = state.history.pop();
    if (!params) return;
    state.params = params;
    state.result = E.build(state.model, params);
    message('Last adjustment undone.');
    update([]);
  };
  document.querySelector('#reset').onclick = reset;
  for (const [id, key] of [
    ['layout', 'layout'],
    ['count', 'count'],
    ['format', 'ratio'],
  ])
    document.querySelector(`#${id}`).addEventListener(id === 'count' ? 'input' : 'change', (e) => {
      state[key] = key === 'layout' ? e.target.value : Number(e.target.value);
      reset();
    });
  document.querySelector('#diagram').onclick = (e) => {
    state.diagram = !state.diagram;
    e.currentTarget.setAttribute('aria-pressed', String(state.diagram));
    update();
  };
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cancel();
  });
  new ResizeObserver(() => {
    if (svg) update();
  }).observe(document.querySelector('#board'));
  globalThis.StructuredExperiment = { state, reset, snapshot, imagePlane };
  reset();
  Promise.all(
    photos.map(
      (photo) =>
        new Promise((resolve) => {
          const image = new Image();
          image.onload = () => {
            photo.natural = [image.naturalWidth, image.naturalHeight];
            resolve();
          };
          image.onerror = resolve;
          image.src = photo.url;
        }),
    ),
  ).then(() => {
    if (!state.history.length && !state.drag) reset();
  });
})();
