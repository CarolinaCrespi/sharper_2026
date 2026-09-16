/* =========================================================
   Caccia al Punto più Profondo — core: map, fog, player,
   run engine, leaderboard
========================================================= */
const canvas = $('#canvas');
const ctx = canvas.getContext('2d');
let W = 0, H = 0;

const COLS = 48, ROWS = 30, N = COLS * ROWS;
const TRIES = 30;
const ALGO_COLOR = { exact: '#FF6B81', ls: '#4FD1FF', sa: '#9B8CFF', ga: '#FF8FC7', aco: '#3FE0C5', pso: '#FFB067' };
const LEVELS = [
  { key: 'lvl_valley', kind: 'valley', seed: 4 },
  { key: 'lvl_holes',  kind: 'holes',  seed: 21 },
  { key: 'lvl_trap',   kind: 'trap',   seed: 9 }
];

/* ---------- helpers ---------- */
function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
function isLight() { return document.documentElement.getAttribute('data-theme') === 'light'; }
function pal() {
  return { ink: cssVar('--ink'), ink2: cssVar('--ink-2'), muted: cssVar('--muted'), border: cssVar('--border'),
    panel: cssVar('--panel'), panel2: cssVar('--panel-2'), yellow: cssVar('--yellow'), teal: cssVar('--teal'),
    coral: cssVar('--coral'), bg: isLight() ? '#FFFFFF' : '#100E21' };
}
function mulberry32(a) {
  return function() { let x = a += 0x6D2B79F5; x = Math.imul(x ^ x >>> 15, x | 1); x ^= x + Math.imul(x ^ x >>> 7, x | 61); return ((x ^ x >>> 14) >>> 0) / 4294967296; };
}
const ix = (x, y) => y * COLS + x;
const xOf = i => i % COLS, yOf = i => Math.floor(i / COLS);
const clampX = x => Math.max(0, Math.min(COLS - 1, Math.round(x)));
const clampY = y => Math.max(0, Math.min(ROWS - 1, Math.round(y)));

/* ---------- the map: depth in 0..1 (1 = deepest) ---------- */
const Env = {
  f: new Float32Array(N),
  maxIdx: 0, maxV: 1,
  revealed: new Uint8Array(N),
  cells: 0,
  best: -1, bestV: -1,
  owner: 'you',            // 'you' or an algorithm key
  running: false,
  algo: null               // current algorithm instance (for its drawing)
};

function generate(level) {
  const rng = mulberry32(level.seed);
  const wells = [];   // [cx, cy, amplitude, sigma] in cell units
  const R = (a, b) => a + rng() * (b - a);
  if (level.kind === 'valley') {
    wells.push([R(18, 30), R(10, 20), 1.0, 9]);
    for (let k = 0; k < 4; k++) wells.push([R(3, 45), R(3, 27), R(0.12, 0.25), R(2, 3.5)]);
  } else if (level.kind === 'holes') {
    wells.push([R(30, 44), R(4, 12), 1.0, 3]);
    for (let k = 0; k < 11; k++) wells.push([R(3, 45), R(3, 27), R(0.45, 0.85), R(2.2, 4)]);
  } else {
    // a wide, inviting basin … and a narrow deeper hole far away from it
    wells.push([12, 18, 0.78, 8]);
    wells.push([42, 5, 1.0, 1.7]);
    for (let k = 0; k < 5; k++) wells.push([R(20, 36), R(3, 27), R(0.2, 0.35), R(2, 3)]);
  }
  const p1 = R(0, 6), p2 = R(0, 6);
  let lo = Infinity, hi = -Infinity;
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    let v = 0.06 * Math.sin(x / 5 + p1) * Math.cos(y / 4 + p2);
    for (const [cx, cy, a, s] of wells) v += a * Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (2 * s * s));
    Env.f[ix(x, y)] = v;
    lo = Math.min(lo, v); hi = Math.max(hi, v);
  }
  Env.maxV = -1;
  for (let i = 0; i < N; i++) {
    Env.f[i] = (Env.f[i] - lo) / (hi - lo);
    if (Env.f[i] > Env.maxV) { Env.maxV = Env.f[i]; Env.maxIdx = i; }
  }
}

const depthM = v => Math.round(20 + v * 980);
const pctOf = v => Math.round(100 * depthM(v) / depthM(Env.maxV)) + '%';

/* explore one cell: reveal it, count it once, track the deepest */
function probe(i) {
  if (!Env.revealed[i]) { Env.revealed[i] = 1; Env.cells++; }
  const v = Env.f[i];
  if (v > Env.bestV) { Env.bestV = v; Env.best = i; }
  return v;
}

/* cells within Chebyshev distance r (the square around i) */
function neighbours(i, r) {
  const x = xOf(i), y = yOf(i), out = [];
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (!dx && !dy) continue;
    const nx = x + dx, ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < COLS && ny < ROWS) out.push(ix(nx, ny));
  }
  return out;
}
function randomNeighbour(i, r) { const n = neighbours(i, r); return n[Math.floor(Math.random() * n.length)]; }
const radius = () => Number($('#radius').value);

function clearFog() {
  Env.revealed.fill(0);
  Env.cells = 0; Env.best = -1; Env.bestV = -1;
  Env.algo = null;
}

/* ---------- player ---------- */
const You = { left: TRIES, last: -1, hover: -1 };

function startYou() {
  stopRun();
  clearFog();
  Env.owner = 'you';
  You.left = TRIES; You.last = -1;
  $$('[data-algo]').forEach(b => b.classList.remove('active'));
  $('#algoInfo').classList.remove('show');
  caption('cap_you_start', { n: TRIES });
  renderHUD(); requestDraw();
}

/* ---------- algorithms: registered by algos.js ---------- */
const ALGOS = {};
function registerAlgo(key, def) { ALGOS[key] = def; }
const DELAY = [0, 260, 140, 70, 30, 8];   // ms between steps, by speed

let runTimer = null;
function stopRun() {
  if (runTimer) clearTimeout(runTimer);
  runTimer = null;
  Env.running = false;
}

function runAlgo(key) {
  stopRun();
  clearFog();
  Env.owner = key;
  Env.running = true;
  $$('[data-algo]').forEach(b => b.classList.toggle('active', b.dataset.algo === key));
  const box = $('#algoInfo');
  box.innerHTML = t('info.' + key); box.classList.add('show');
  $('#feedback').classList.remove('show');
  Env.algo = ALGOS[key].create();
  caption('cap_running', { name: () => t('n_' + key) });

  const tick = () => {
    const done = Env.algo.step();
    renderHUD(); requestDraw();
    if (done) { finishRun(key); return; }
    // each algorithm sets how "big" one step is: a generation is slower to watch than a single move
    runTimer = setTimeout(tick, DELAY[Number($('#speed').value)] * (Env.algo.slow || 1));
  };
  tick();
}

function finishRun(key) {
  Env.running = false;
  runTimer = null;
  record(key);
  const a = Env.algo;
  if (a && a.finalCaption) a.finalCaption();
  else caption('cap_algo_done', {
    name: () => t('n_' + key), best: depthM(Env.bestV), pct: pctOf(Env.bestV), cells: Env.cells, total: N
  });
  resultToast();
  renderHUD(); requestDraw();
}

function resultToast() {
  const found = Env.best === Env.maxIdx;
  toast(`<div class="score">${depthM(Env.bestV)} m</div>
    <div class="challenge">${found ? t('fb_found') : t('fb_close') + ' · ' + pctOf(Env.bestV)}<br>${t('hud_cells')}: <b>${Env.cells}</b> / ${N}</div>`, 3200);
}

/* ---------- leaderboard ---------- */
const Results = {};   // key → { v, cells }
function record(key) { Results[key] = { v: Env.bestV, cells: Env.cells }; renderBoard(); }
function renderBoard() {
  const rows = Object.entries(Results).sort((a, b) => (b[1].v - a[1].v) || (a[1].cells - b[1].cells));
  const el = $('#scoreboard');
  if (!rows.length) { el.innerHTML = `<p class="board-empty">${t('board_empty')}</p>`; return; }
  el.innerHTML = rows.map(([k, r], n) => {
    const color = k === 'you' ? cssVar('--yellow') : ALGO_COLOR[k];
    const star = r.v >= Env.maxV ? ' 💎' : '';
    return `<div class="board-row${k === Env.owner ? ' current' : ''}">
      <span class="board-pos">${n + 1}</span>
      <span class="dot" style="background:${color}"></span>
      <span class="board-name">${t('n_' + k)}</span>
      <span class="board-depth">${depthM(r.v)} m${star}</span>
      <span class="board-cells">${r.cells} ${t('board_cells')}</span>
    </div>`;
  }).join('');
}

/* ---------- caption / HUD / toast ---------- */
let captionState = null;
function caption(key, vars) { captionState = { key, vars }; renderCaption(); }
function renderCaption() {
  if (!captionState) return;
  const vars = {};
  for (const k in (captionState.vars || {})) { const v = captionState.vars[k]; vars[k] = typeof v === 'function' ? v() : v; }
  $('#caption').innerHTML = t(captionState.key, vars);
}
function renderHUD() {
  const chips = [];
  if (Env.owner === 'you') chips.push([t('hud_left'), You.left, You.left === 0 ? 'success' : '']);
  chips.push([t('hud_cells'), Env.cells]);
  chips.push([t('hud_depth'), Env.bestV < 0 ? '–' : depthM(Env.bestV) + ' m', Env.best === Env.maxIdx ? 'success' : '']);
  if (Env.algo && Env.algo.hud) chips.push(...Env.algo.hud());
  $('#hud').innerHTML = chips.map(([l, v, c]) => `<span class="hud-chip${c ? ' ' + c : ''}">${l}: <b>${v}</b></span>`).join('');
}
let toastTimer = null;
function toast(html, ms) {
  const fb = $('#feedback');
  fb.innerHTML = html; fb.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => fb.classList.remove('show'), ms || 2600);
}

/* ---------- drawing ---------- */
// deeper = brighter, so a good find pops out of the dark fog in both themes
const DEPTH_STOPS = [[0, [72, 40, 120]], [0.3, [59, 82, 139]], [0.55, [33, 145, 140]], [0.8, [94, 201, 98]], [1, [205, 232, 60]]];
function depthColor(v) {
  for (let k = 1; k < DEPTH_STOPS.length; k++) {
    const [v1, c1] = DEPTH_STOPS[k];
    if (v <= v1) {
      const [v0, c0] = DEPTH_STOPS[k - 1], u = (v - v0) / (v1 - v0);
      return `rgb(${c0.map((c, j) => Math.round(c + (c1[j] - c) * u)).join(',')})`;
    }
  }
  return 'rgb(205,232,60)';
}

// room under the grid for the depth legend; on narrow boards (phones) the
// fog swatch and the depth gradient don't fit side by side: two rows
const LEGEND_NARROW = 480;
const legendH = () => W < LEGEND_NARROW ? 48 : 30;
function geom() {
  const LH = legendH();
  const cell = Math.max(4, Math.floor(Math.min((W - 8) / COLS, (H - 8 - LH) / ROWS)));
  return { cell, x0: Math.floor((W - cell * COLS) / 2), y0: Math.floor((H - LH - cell * ROWS) / 2) };
}

function drawLegend(P, G) {
  ctx.save();
  ctx.font = "600 11px 'DM Sans', system-ui";
  const narrow = W < LEGEND_NARROW;
  const deepW = ctx.measureText(t('legend_deep') + ' 💎').width + 6;
  const w = Math.min(200, G.cell * COLS * (narrow ? 0.4 : 0.3)), h = 9;
  const x = G.x0 + G.cell * COLS - deepW - w, y = G.y0 + G.cell * ROWS + (narrow ? 30 : 12);
  const grad = ctx.createLinearGradient(x, 0, x + w, 0);
  DEPTH_STOPS.forEach(([v, c]) => grad.addColorStop(v, `rgb(${c.join(',')})`));
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = P.border; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.fillStyle = P.ink2; ctx.textBaseline = 'middle';
  ctx.textAlign = 'right'; ctx.fillText(t('legend_shallow'), x - 8, y + h / 2);
  ctx.textAlign = 'left'; ctx.fillText(t('legend_deep') + ' 💎', x + w + 6, y + h / 2);
  // fog swatch on the left
  const fx = G.x0, fy = (narrow ? G.y0 + G.cell * ROWS + 12 : y) - 2;
  ctx.fillStyle = isLight() ? '#E4E0F3' : '#1A1834';
  ctx.fillRect(fx, fy, 13, 13);
  ctx.strokeRect(fx + 0.5, fy + 0.5, 12, 12);
  ctx.fillStyle = P.ink2; ctx.textAlign = 'left';
  ctx.fillText(t('legend_fog'), fx + 19, fy + 2 + h / 2);
  ctx.restore();
}
function cellCenter(i, G) { return { x: G.x0 + (xOf(i) + 0.5) * G.cell, y: G.y0 + (yOf(i) + 0.5) * G.cell }; }
function pointCenter(x, y, G) { return { x: G.x0 + (x + 0.5) * G.cell, y: G.y0 + (y + 0.5) * G.cell }; }

function drawSquare(i, r, color, G, dashed) {
  const x = Math.max(0, xOf(i) - r), y = Math.max(0, yOf(i) - r);
  const x2 = Math.min(COLS - 1, xOf(i) + r), y2 = Math.min(ROWS - 1, yOf(i) + r);
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = 2.5;
  if (dashed) ctx.setLineDash([5, 4]);
  ctx.strokeRect(G.x0 + x * G.cell + 1, G.y0 + y * G.cell + 1, (x2 - x + 1) * G.cell - 2, (y2 - y + 1) * G.cell - 2);
  ctx.restore();
}
function drawDot(p, rad, color, P, glow) {
  ctx.save();
  if (glow) { ctx.shadowColor = color; ctx.shadowBlur = 12; }
  ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
  ctx.fillStyle = color; ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 1.5; ctx.strokeStyle = P.bg; ctx.stroke();
  ctx.restore();
}

let drawQueued = false;
function requestDraw() {
  if (drawQueued) return;
  drawQueued = true;
  requestAnimationFrame(() => { drawQueued = false; if (W) draw(); });
}

function draw() {
  const P = pal(), G = geom(), noFog = $('#noFog').checked;
  ctx.clearRect(0, 0, W, H);
  const fogA = isLight() ? '#E4E0F3' : '#1A1834', fogB = isLight() ? '#DCD7EE' : '#1E1C3B';

  for (let i = 0; i < N; i++) {
    const x = G.x0 + xOf(i) * G.cell, y = G.y0 + yOf(i) * G.cell;
    if (Env.revealed[i] || noFog) {
      ctx.fillStyle = depthColor(Env.f[i]);
      ctx.fillRect(x, y, G.cell, G.cell);
      if (!Env.revealed[i]) {                    // seen through the fog: dimmed
        ctx.fillStyle = isLight() ? 'rgba(255,255,255,.55)' : 'rgba(13,11,26,.6)';
        ctx.fillRect(x, y, G.cell, G.cell);
      }
    } else {
      ctx.fillStyle = (xOf(i) + yOf(i)) % 2 ? fogA : fogB;
      ctx.fillRect(x, y, G.cell, G.cell);
    }
  }
  drawLegend(P, G);

  // the true deepest point, only once it is known
  if (noFog || Env.revealed[Env.maxIdx]) {
    const c = cellCenter(Env.maxIdx, G);
    ctx.font = `${Math.max(12, G.cell * 1.3)}px 'Segoe UI Emoji','Apple Color Emoji',sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('💎', c.x, c.y);
  }

  // current algorithm's own drawing
  if (Env.algo && Env.algo.draw) Env.algo.draw(P, G);

  // player: neighbourhood under the mouse + last probe
  if (Env.owner === 'you') {
    if (You.hover >= 0 && You.left > 0) drawSquare(You.hover, radius(), P.yellow, G, true);
    if (You.last >= 0) drawDot(cellCenter(You.last, G), G.cell * 0.32, P.yellow, P, true);
  }

  // deepest point found so far
  if (Env.best >= 0) {
    const c = cellCenter(Env.best, G);
    const color = Env.owner === 'you' ? P.yellow : ALGO_COLOR[Env.owner];
    ctx.save();
    ctx.shadowColor = color; ctx.shadowBlur = 14;
    ctx.strokeStyle = color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(c.x, c.y, G.cell * 0.9, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    const label = depthM(Env.bestV) + ' m';
    ctx.font = "800 11px 'Orbitron', system-ui";
    const w = ctx.measureText(label).width + 10;
    const lx = Math.min(W - w - 4, c.x + G.cell), ly = Math.max(4, c.y - G.cell * 2);
    ctx.fillStyle = P.bg; ctx.fillRect(lx, ly, w, 17);
    ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.strokeRect(lx + 0.5, ly + 0.5, w - 1, 16);
    ctx.fillStyle = P.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(label, lx + 5, ly + 9);
  }
}

/* ---------- sizing ---------- */
function resize() {
  const r = canvas.parentElement.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  W = Math.max(240, Math.floor(r.width)); H = Math.max(180, Math.floor(r.height));
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  canvas.width = Math.floor(W * dpr); canvas.height = Math.floor(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  requestDraw();
}
window.addEventListener('resize', resize);

/* ---------- input ---------- */
function cellAt(ev) {
  const r = canvas.getBoundingClientRect(), G = geom();
  const x = Math.floor((ev.clientX - r.left - G.x0) / G.cell), y = Math.floor((ev.clientY - r.top - G.y0) / G.cell);
  return x >= 0 && y >= 0 && x < COLS && y < ROWS ? ix(x, y) : -1;
}
canvas.addEventListener('mousemove', ev => {
  if (Env.owner !== 'you') return;
  const i = cellAt(ev);
  if (i !== You.hover) { You.hover = i; requestDraw(); }
});
canvas.addEventListener('mouseleave', () => { You.hover = -1; requestDraw(); });
canvas.addEventListener('click', ev => {
  if (Env.owner !== 'you' || You.left <= 0) return;
  const i = cellAt(ev);
  if (i < 0) return;
  const before = Env.bestV;
  if (!Env.revealed[i]) You.left--;      // exploring an already-seen cell is free
  const v = probe(i);
  You.last = i;
  if (You.left === 0) {
    record('you');
    caption('cap_you_done', { best: depthM(Env.bestV), pct: pctOf(Env.bestV) });
    resultToast();
  } else {
    const deeper = v > before;
    caption('cap_you_probe', {
      d: depthM(v),
      hint: () => deeper ? t('cap_you_deeper') : t('cap_you_notdeeper', { best: depthM(Env.bestV) })
    });
  }
  renderHUD(); requestDraw();
});

/* ---------- controls ---------- */
function fillLevels() {
  const sel = $('#levelSel'), cur = sel.value;
  sel.innerHTML = LEVELS.map((l, n) => `<option value="${n}">${t(l.key)}</option>`).join('');
  if (cur) sel.value = cur;
}
$('#levelSel').addEventListener('change', e => {
  generate(LEVELS[Number(e.target.value)]);
  for (const k in Results) delete Results[k];
  renderBoard();
  startYou();
});
$('#radius').addEventListener('input', e => { $('#radiusVal').textContent = e.target.value; requestDraw(); });
$('#speed').addEventListener('input', e => { $('#speedVal').textContent = e.target.value; });
$('#noFog').addEventListener('change', requestDraw);
$('#btnYou').addEventListener('click', startYou);
$$('[data-algo]').forEach(b => b.addEventListener('click', () => runAlgo(b.dataset.algo)));

function onLangChange() {
  fillLevels();
  renderBoard(); renderCaption(); renderHUD();
  if (Env.owner !== 'you') $('#algoInfo').innerHTML = t('info.' + Env.owner);
  requestDraw();
}

window.addEventListener('load', () => {
  fillLevels();
  generate(LEVELS[0]);
  resize();
  renderBoard();
  startYou();
});
