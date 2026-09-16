/* =========================================================
   Rover su Marte — autonomous navigation in an unknown map

   Every agent (you or an algorithm) starts from the same landing
   site, sees only the cells within its sensor range and pays energy
   for each move: 1 on ground, 3 on sand, rocks can't be crossed.
   The algorithms are simulated in full first, then replayed frame
   by frame on the board.
========================================================= */
const COLS = 22, ROWS = 14, N = COLS * ROWS;
const FLAT = 0, SAND = 1, ROCK = 2;
const COST = [1, 3, Infinity];
const MOVES = [[0, -1], [1, 0], [0, 1], [-1, 0]];   // up, right, down, left
const MAX_STEPS = 400;
// the battery holds 2.5× the energy of the best route (+ a margin):
// enough for the replanner even on unlucky random maps
const BATTERY_FACTOR = 2.5, BATTERY_EXTRA = 6;
// stars for your run: ⭐⭐⭐ = as good as the replanner, which has no map either
const STAR2 = 1.3;

const ALGO_COLORS = { you: '#FFE66D', greedy: '#FF6B81', replan: '#4FD1FF', astar: '#9B8CFF' };

/* '.' ground · '~' sand · '#' rock · S landing site · B base */
const MAPS = {
  // open ground: greedy gets there, but drives straight through the sand
  plain: [
    '......................',
    '.....#.........~~.....',
    '.....#.........~~~....',
    '..................~.B.',
    '..~~~.................',
    '..~~~..........~~.....',
    '..........~~...~~.....',
    '.S.......~~~..........',
    '.....#.......#........',
    '.....##......##...#...',
    '...........~~~....#...',
    '..#.......~~~.........',
    '.........#.......~~...',
    '......................'
  ],
  // a U-shaped crater open towards the landing site: a trap for greedy
  crater: [
    '......................',
    '......................',
    '..~~..............~~..',
    '........######....~~..',
    '.............#........',
    '.............#...~~...',
    '.............#...~~...',
    '.S...........#......B.',
    '.............#........',
    '.............#........',
    '........######........',
    '..~~..................',
    '.........~~~~.........',
    '......................'
  ],
  canyon: [
    '......#.......#.......',
    '......#...~~..#.......',
    '......#...~~..#...B...',
    '......#.......#.......',
    '......#..###..#..###..',
    '......#.......#.......',
    '..........#...~~......',
    '.S....#...#...#.......',
    '......#...#...#.......',
    '......#...#...#.......',
    '......#~~~#...#####...',
    '......#~~~#...........',
    '......#...######......',
    '......#...............'
  ]
};

const canvas = $('#canvas');
const ctx = canvas.getContext('2d');
let W = 0, H = 0;

const G = {
  level: 'plain',
  seed: 1,
  grid: new Uint8Array(N),
  start: 0,
  base: 0,
  best: null,          // { cost, path } with the complete map
  battery: 0,
  sensor: 2,
  speed: 3,
  noFog: false,
  agents: {},          // key → agent
  active: 'you',       // whose view is on the board
  frame: 0,            // replay position of the active algorithm
  timer: null,
  results: {}          // key → { status, energy, steps }
};

const idx = (x, y) => y * COLS + x;
const xOf = i => i % COLS, yOf = i => Math.floor(i / COLS);

/* ---------- maps ---------- */
function loadMap(rows) {
  rows.forEach((r, y) => [...r].forEach((ch, x) => {
    const i = idx(x, y);
    G.grid[i] = ch === '#' ? ROCK : ch === '~' ? SAND : FLAT;
    if (ch === 'S') G.start = i;
    if (ch === 'B') G.base = i;
  }));
}

function mulberry32(a) {
  return function () { let x = a += 0x6D2B79F5; x = Math.imul(x ^ x >>> 15, x | 1); x ^= x + Math.imul(x ^ x >>> 7, x | 61); return ((x ^ x >>> 14) >>> 0) / 4294967296; };
}

// rock ridges + sand patches, retried until the base is reachable
function randomMap(seed) {
  const rng = mulberry32(seed);
  const pick = n => Math.floor(rng() * n);
  for (let attempt = 0; attempt < 100; attempt++) {
    G.grid.fill(FLAT);
    G.start = idx(1, 2 + pick(ROWS - 4));
    G.base = idx(COLS - 2, 1 + pick(ROWS - 2));
    for (let k = 0; k < 10; k++) {
      const horiz = rng() < 0.4, len = 3 + pick(7);
      const x = 3 + pick(COLS - 6), y = pick(ROWS);
      for (let s = 0; s < len; s++) {
        const cx = horiz ? x + s : x, cy = horiz ? y : y + s;
        if (cx < COLS && cy < ROWS) G.grid[idx(cx, cy)] = ROCK;
      }
    }
    for (let k = 0; k < 6; k++) {
      const x = pick(COLS - 3), y = pick(ROWS - 2), w = 2 + pick(3), h = 2 + pick(2);
      for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) {
        const i = idx(Math.min(COLS - 1, x + dx), Math.min(ROWS - 1, y + dy));
        if (G.grid[i] === FLAT) G.grid[i] = SAND;
      }
    }
    // keep the landing site and the base clear
    [G.start, G.base].forEach(c => {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const x = xOf(c) + dx, y = yOf(c) + dy;
        if (x >= 0 && y >= 0 && x < COLS && y < ROWS) G.grid[idx(x, y)] = FLAT;
      }
    });
    const route = shortestPath(G.start, G.base, i => COST[G.grid[i]]);
    // not too easy: the best route must not be almost a straight line
    const straight = Math.abs(xOf(G.base) - xOf(G.start)) + Math.abs(yOf(G.base) - yOf(G.start));
    if (route && route.cost > straight + 2) return;
  }
}

/* ---------- Dijkstra on the 4-connected grid ---------- */
function shortestPath(from, to, costOf) {
  const dist = new Float64Array(N).fill(Infinity);
  const prev = new Int16Array(N).fill(-1);
  const done = new Uint8Array(N);
  dist[from] = 0;
  for (;;) {
    let u = -1, best = Infinity;
    for (let i = 0; i < N; i++) if (!done[i] && dist[i] < best) { best = dist[i]; u = i; }
    if (u < 0 || u === to) break;
    done[u] = 1;
    const ux = xOf(u), uy = yOf(u);
    for (const [dx, dy] of MOVES) {
      const nx = ux + dx, ny = uy + dy;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
      const v = idx(nx, ny), c = costOf(v);
      if (c === Infinity) continue;
      if (dist[u] + c < dist[v]) { dist[v] = dist[u] + c; prev[v] = u; }
    }
  }
  if (dist[to] === Infinity) return null;
  const path = [];
  for (let v = to; v !== -1; v = prev[v]) path.push(v);
  return { cost: dist[to], path: path.reverse() };
}

/* ---------- agents ---------- */
// reveal[i] = step at which cell i was first seen (-1 = never)
function newAgent(key) {
  const a = { key, pos: G.start, path: [G.start], energy: [0], plans: [null], reveal: new Int16Array(N).fill(-1), status: 'running', replans: 0 };
  sense(a);
  return a;
}
function sense(a) {
  const step = a.path.length - 1, r = G.sensor, x0 = xOf(a.pos), y0 = yOf(a.pos);
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (dx * dx + dy * dy > r * r + 1) continue;
    const x = x0 + dx, y = y0 + dy;
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) continue;
    const i = idx(x, y);
    if (a.reveal[i] < 0) a.reveal[i] = step;
  }
}
const energyOf = a => a.energy[a.energy.length - 1];

// one move; false if the battery can't pay for it
function move(a, to, plan = null) {
  const e = energyOf(a) + COST[G.grid[to]];
  if (e > G.battery) { a.status = 'battery'; return false; }
  a.pos = to;
  a.path.push(to);
  a.energy.push(e);
  a.plans.push(plan);
  sense(a);
  if (to === G.base) a.status = 'arrived';
  return true;
}
function neighbours(i) {
  const out = [];
  for (const [dx, dy] of MOVES) {
    const x = xOf(i) + dx, y = yOf(i) + dy;
    if (x >= 0 && y >= 0 && x < COLS && y < ROWS) out.push(idx(x, y));
  }
  return out;
}
const airDist = i => Math.hypot(xOf(i) - xOf(G.base), yOf(i) - yOf(G.base));

/* Greedy: always to the free neighbour closest to the base; stuck when none is closer */
function runGreedy() {
  const a = newAgent('greedy');
  while (a.status === 'running' && a.path.length < MAX_STEPS) {
    let best = -1, bd = airDist(a.pos);
    for (const v of neighbours(a.pos)) {
      if (G.grid[v] === ROCK) continue;
      const d = airDist(v);
      if (d < bd - 1e-9 || (best >= 0 && Math.abs(d - bd) < 1e-9 && COST[G.grid[v]] < COST[G.grid[best]])) { best = v; bd = d; }
    }
    if (best < 0) { a.status = 'stuck'; break; }
    move(a, best);
  }
  return a;
}

/* Replanning (the D* Lite strategy): shortest route on what it knows,
   unseen cells assumed to be free ground; one step, look, plan again */
function runReplan() {
  const a = newAgent('replan');
  let prevPlan = null;
  while (a.status === 'running' && a.path.length < MAX_STEPS) {
    const known = i => a.reveal[i] >= 0;
    const p = shortestPath(a.pos, G.base, i => known(i) ? COST[G.grid[i]] : 1);
    if (!p) { a.status = 'stuck'; break; }
    // a replan = the new route is not the rest of the previous one
    if (prevPlan) {
      const rest = prevPlan.slice(1);
      if (rest.length !== p.path.length || rest.some((v, k) => v !== p.path[k])) a.replans++;
    }
    a.plans[a.plans.length - 1] = p.path;
    prevPlan = p.path;
    if (!move(a, p.path[1])) break;
  }
  return a;
}

/* A* with the complete map: it sees everything from the start */
function runAstar() {
  const a = newAgent('astar');
  a.reveal.fill(0);
  const p = G.best;
  a.plans[0] = p.path;
  for (let k = 1; k < p.path.length && a.status === 'running'; k++) move(a, p.path[k], p.path.slice(k));
  return a;
}

const RUNNERS = { greedy: runGreedy, replan: runReplan, astar: runAstar };

/* ---------- game setup ---------- */
function setupLevel() {
  stopReplay();
  if (G.level === 'random') randomMap(G.seed);
  else loadMap(MAPS[G.level]);
  G.best = shortestPath(G.start, G.base, i => COST[G.grid[i]]);
  G.battery = Math.ceil(G.best.cost * BATTERY_FACTOR) + BATTERY_EXTRA;
  // reference for your stars: what a rover without the map manages here
  const ref = runReplan();
  G.ref = ref.status === 'arrived' ? energyOf(ref) : Math.ceil(G.best.cost * 1.5);
  newPlayer();
}

// a fresh start on the same map: the algorithms' trails and results go too
function newPlayer() {
  stopReplay();
  G.agents = { you: newAgent('you') };
  G.results = {};
  G.active = 'you';
  G.frame = 0;
  $$('.algo-btn').forEach(b => b.classList.remove('active'));
  $('#algoInfo').classList.remove('show');
  hideToast();
  caption('cap_you_start', { bat: G.battery });
  renderBoard(); renderHUD(); requestDraw();
}

/* ---------- your moves ---------- */
function playerMove(dir) {
  if (G.timer) return;                          // an algorithm is on screen
  const a = G.agents.you;
  if (G.active !== 'you') { G.active = 'you'; requestDraw(); }
  if (a.status !== 'running') { caption('cap_you_over'); return; }
  const x = xOf(a.pos) + MOVES[dir][0], y = yOf(a.pos) + MOVES[dir][1];
  if (MOVES[dir][0]) a.face = MOVES[dir][0];   // turn even when bumping into a rock
  if (x < 0 || y < 0 || x >= COLS || y >= ROWS) { requestDraw(); return; }
  const to = idx(x, y);
  if (G.grid[to] === ROCK) { caption('cap_you_rock'); bump(); return; }
  move(a, to);
  const e = energyOf(a);
  if (a.status === 'arrived') youWon();
  else if (a.status === 'battery') youLost();
  else if (G.battery - e < 1) { a.status = 'battery'; youLost(); }
  else caption(G.grid[to] === SAND ? 'cap_you_sand' : 'cap_you_move', { e, left: G.battery - e });
  renderHUD(); requestDraw();
}

let bumpUntil = 0;
function bump() { bumpUntil = performance.now() + 220; animateBump(); }
function animateBump() { requestDraw(); if (performance.now() < bumpUntil) requestAnimationFrame(animateBump); }

function youWon() {
  const a = G.agents.you, e = energyOf(a), opt = G.best.cost;
  const s3 = G.ref, s2 = Math.floor(G.ref * STAR2);
  const stars = e <= s3 ? 3 : e <= s2 ? 2 : 1;
  G.results.you = { status: 'arrived', energy: e, steps: a.path.length - 1 };
  caption('cap_you_won', { e, opt });
  toast(`<button class="close-toast" type="button" data-act="close" aria-label="×">✕</button>
    <div class="score">🚀 ${t('toast_won')}</div>
    <div class="stars">${[1, 2, 3].map(i => i <= stars ? '⭐' : '<span class="off">⭐</span>').join('')}</div>
    <div class="challenge">${t('toast_used', { e, opt })}</div>
    <div class="rules">${t('toast_stars', { s3, s2 })}</div>`, 0);
  renderBoard();
}
function youLost() {
  const a = G.agents.you;
  G.results.you = { status: 'battery', energy: energyOf(a), steps: a.path.length - 1 };
  caption('cap_you_battery');
  toast(`<button class="close-toast" type="button" data-act="close" aria-label="×">✕</button>
    <div class="score">🪫 ${t('toast_battery')}</div>
    <div class="challenge">${t('toast_battery_sub')}</div>
    <button type="button" data-act="retry">${t('btn_retry')}</button>`, 0);
  renderBoard();
}

/* ---------- algorithms: simulate, then replay ---------- */
const SPEED_MS = [0, 260, 160, 100, 55, 25];

function runAlgo(key) {
  stopReplay();
  hideToast();
  const a = RUNNERS[key]();
  G.agents[key] = a;
  G.active = key;
  G.frame = 0;
  $$('.algo-btn').forEach(b => b.classList.toggle('active', b.dataset.algo === key));
  $('#algoInfo').innerHTML = t('info.' + key);
  $('#algoInfo').classList.add('show');
  caption('cap_running', { name: () => t('n_' + key) });
  const tick = () => {
    if (G.frame >= a.path.length - 1) { stopReplay(); finishRun(key); return; }
    G.frame++;
    renderHUD(); requestDraw();
    G.timer = setTimeout(tick, SPEED_MS[G.speed]);
  };
  renderHUD(); requestDraw();
  G.timer = setTimeout(tick, SPEED_MS[G.speed]);
}
function stopReplay() { clearTimeout(G.timer); G.timer = null; }

function pctText(e) {
  const p = Math.round((e / G.best.cost - 1) * 100);
  return p <= 0 ? t('pct_best') : t('pct_more', { p });
}

function finishRun(key) {
  const a = G.agents[key], e = energyOf(a);
  G.results[key] = { status: a.status === 'running' ? 'stuck' : a.status, energy: e, steps: a.path.length - 1 };
  const name = () => t('n_' + key);
  if (a.status === 'arrived') {
    if (key === 'replan') caption('cap_replan_done', { e, pct: () => pctText(e), n: a.replans });
    else if (key === 'astar') caption('cap_astar_done', { e });
    else caption('cap_algo_done', { name, e, pct: () => pctText(e) });
  } else if (a.status === 'battery') caption('cap_algo_battery', { name });
  else if (key === 'greedy') caption('cap_greedy_stuck', { steps: a.path.length - 1 });
  else caption('cap_algo_noroute', { name });
  renderBoard(); renderHUD(); requestDraw();
}

/* ---------- scoreboard ---------- */
function renderBoard() {
  const el = $('#scoreboard');
  const keys = Object.keys(G.results);
  if (!keys.length) { el.innerHTML = `<p class="board-empty">${t('board_empty')}</p>`; return; }
  const ok = r => r.status === 'arrived';
  keys.sort((a, b) => (ok(G.results[b]) - ok(G.results[a])) || G.results[a].energy - G.results[b].energy);
  el.innerHTML = keys.map((k, n) => {
    const r = G.results[k];
    const value = ok(r) ? `${r.energy} ⚡` : (r.status === 'battery' ? '🪫 ' + t('st_battery') : '✗ ' + t('st_stuck'));
    const extra = ok(r) ? ` · ${r.energy === G.best.cost ? t('board_best') : '+' + Math.round((r.energy / G.best.cost - 1) * 100) + '%'}` : '';
    return `<div class="board-row${k === G.active ? ' current' : ''}">
      <span class="board-pos">${ok(r) ? n + 1 : '–'}</span>
      <span class="dot" style="background:${ALGO_COLORS[k]}"></span>
      <span class="board-name">${t('n_' + k)}</span>
      <span class="board-depth">${value}</span>
      <span class="board-cells">${r.steps} ${t('board_steps')}${extra}</span>
    </div>`;
  }).join('');
}

/* ---------- caption, HUD, toast ---------- */
let captionState = null;
function caption(key, vars) { captionState = { key, vars }; renderCaption(); }
function renderCaption() {
  if (!captionState) return;
  const vars = {};
  for (const k in (captionState.vars || {})) {
    const v = captionState.vars[k];
    vars[k] = typeof v === 'function' ? v() : v;
  }
  $('#caption').innerHTML = t(captionState.key, vars);
}

// the step of the active agent that is on screen
function shownStep(a) { return a.key === 'you' ? a.path.length - 1 : Math.min(G.frame, a.path.length - 1); }

function renderHUD() {
  const a = G.agents[G.active];
  if (!a) { $('#hud').innerHTML = ''; return; }
  const s = shownStep(a), e = a.energy[s], left = G.battery - e;
  const chips = [
    [t('hud_energy'), `${e} ⚡`],
    [t('hud_battery'), `${left}/${G.battery}`, left < G.battery * 0.2 ? 'warn' : ''],
    [t('hud_steps'), s]
  ];
  if (a.key === 'replan') chips.push([t('hud_replans'), a.replans]);
  $('#hud').innerHTML = chips.map(([l, v, c]) =>
    `<span class="hud-chip${c ? ' ' + c : ''}">${l}: <b>${v}</b></span>`).join('');
}

let toastTimer = null;
function toast(html, ms = 2600) {
  const fb = $('#feedback');
  fb.innerHTML = html;
  fb.classList.add('show');
  clearTimeout(toastTimer);
  if (ms) toastTimer = setTimeout(() => fb.classList.remove('show'), ms);
}
function hideToast() { clearTimeout(toastTimer); $('#feedback').classList.remove('show'); }
$('#feedback').addEventListener('click', ev => {
  const b = ev.target.closest('[data-act]');
  if (!b) return;
  hideToast();
  if (b.dataset.act === 'retry') newPlayer();
});

/* ---------- drawing ---------- */
function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
// terrain colours live in style.css, so they follow the light/dark theme
function pal() {
  return {
    flat: cssVar('--mars-flat'), flat2: cssVar('--mars-flat-2'), sand: cssVar('--mars-sand'),
    sandDot: cssVar('--mars-sand-dot'), rock: cssVar('--mars-rock'), rockHi: cssVar('--mars-rock-hi'),
    fog: cssVar('--mars-fog'), fogLine: cssVar('--mars-fog-line'), edge: cssVar('--mars-edge'), teal: cssVar('--teal')
  };
}

function geom() {
  const cell = Math.max(8, Math.floor(Math.min((W - 12) / COLS, (H - 12) / ROWS)));
  return { cell, x0: Math.floor((W - cell * COLS) / 2), y0: Math.floor((H - cell * ROWS) / 2) };
}
const center = (i, g) => ({ x: g.x0 + (xOf(i) + 0.5) * g.cell, y: g.y0 + (yOf(i) + 0.5) * g.cell });

// horizontal direction of the rover at step s: +1 right, -1 left (last sideways move wins)
function facing(a, s) {
  if (a.key === 'you' && a.face) return a.face;
  for (let i = Math.min(s, a.path.length - 1); i > 0; i--) {
    const dx = xOf(a.path[i]) - xOf(a.path[i - 1]);
    if (dx) return Math.sign(dx);
  }
  return Math.sign(xOf(G.base) - xOf(G.start)) || 1;
}

function drawEmoji(emoji, x, y, size) {
  ctx.font = `${size}px 'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji',sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(emoji, x, y);
}

function drawPath(cells, g, color, width, alpha, dash) {
  if (!cells || cells.length < 2) return;
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.globalAlpha = alpha;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  cells.forEach((c, k) => { const p = center(c, g); if (k) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); });
  ctx.stroke();
  ctx.restore();
}

let drawQueued = false;
function requestDraw() {
  if (drawQueued) return;
  drawQueued = true;
  requestAnimationFrame(() => { drawQueued = false; draw(); });
}

function draw() {
  if (!W) return;
  const P = pal(), g = geom(), c = g.cell;
  const a = G.agents[G.active];
  const s = a ? shownStep(a) : 0;
  const seen = i => G.noFog || !a || (a.reveal[i] >= 0 && a.reveal[i] <= s);
  ctx.clearRect(0, 0, W, H);

  // terrain
  for (let i = 0; i < N; i++) {
    const px = g.x0 + xOf(i) * c, py = g.y0 + yOf(i) * c;
    if (!seen(i)) {
      ctx.fillStyle = P.fog; ctx.fillRect(px, py, c, c);
      ctx.strokeStyle = P.fogLine; ctx.lineWidth = 1;
      ctx.strokeRect(px + 0.5, py + 0.5, c - 1, c - 1);
      continue;
    }
    const type = G.grid[i];
    ctx.fillStyle = (xOf(i) + yOf(i)) % 2 ? P.flat : P.flat2;
    ctx.fillRect(px, py, c, c);
    if (type === SAND) {
      ctx.fillStyle = P.sand; ctx.fillRect(px, py, c, c);
      ctx.fillStyle = P.sandDot;
      const d = Math.max(1, c * 0.07);
      [[.25, .3], [.7, .22], [.5, .6], [.2, .8], [.8, .75]].forEach(([u, v]) => ctx.fillRect(px + u * c, py + v * c, d, d));
    } else if (type === ROCK) {
      ctx.fillStyle = P.rock;
      ctx.beginPath(); ctx.ellipse(px + c * .5, py + c * .56, c * .44, c * .38, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = P.rockHi;
      ctx.beginPath(); ctx.ellipse(px + c * .4, py + c * .42, c * .2, c * .13, -0.4, 0, Math.PI * 2); ctx.fill();
    }
  }

  // edge of the explorable area
  ctx.save();
  ctx.strokeStyle = P.edge; ctx.lineWidth = 2;
  ctx.strokeRect(g.x0 - 1, g.y0 - 1, c * COLS + 2, c * ROWS + 2);
  ctx.restore();

  // other agents' finished routes, faint
  for (const k in G.agents) {
    if (k === G.active) continue;
    drawPath(G.agents[k].path, g, ALGO_COLORS[k], Math.max(2, c * 0.12), 0.35);
  }
  if (a) {
    // the plan it is following (dashed), then the route so far
    const plan = a.plans[s];
    if (plan && s < a.path.length - 1) drawPath(plan, g, ALGO_COLORS[a.key], Math.max(2, c * 0.1), 0.8, [c * 0.3, c * 0.25]);
    drawPath(a.path.slice(0, s + 1), g, ALGO_COLORS[a.key], Math.max(3, c * 0.18), 0.9);
  }

  // landing site and base (the base position is known: GPS)
  drawEmoji('🏁', center(G.start, g).x, center(G.start, g).y, c * 0.6);
  const b = center(G.base, g);
  ctx.save(); ctx.shadowColor = '#FFE66D'; ctx.shadowBlur = 14;
  drawEmoji('🚀', b.x, b.y, c * 0.85);
  ctx.restore();

  if (a) {
    const p = center(a.path[s], g);
    // sensor range
    ctx.save();
    ctx.strokeStyle = P.teal; ctx.globalAlpha = 0.55; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.arc(p.x, p.y, (G.sensor + 0.5) * c, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    // the rover, with a small shake when it hits a rock
    const shake = performance.now() < bumpUntil && a.key === 'you' ? Math.sin(performance.now() / 18) * c * 0.12 : 0;
    ctx.save(); ctx.shadowColor = ALGO_COLORS[a.key]; ctx.shadowBlur = 12;
    // the 🚙 glyph faces left: mirror it while the rover heads right
    ctx.translate(p.x + shake, p.y);
    if (facing(a, s) > 0) ctx.scale(-1, 1);
    drawEmoji('🚙', 0, 0, c * 0.8);
    ctx.restore();
    const over = a.key === 'you' || s >= a.path.length - 1;
    if (over && a.status === 'stuck') drawEmoji('❓', p.x + c * 0.45, p.y - c * 0.5, c * 0.55);
    if (over && a.status === 'battery') drawEmoji('🪫', p.x + c * 0.45, p.y - c * 0.5, c * 0.55);
  }
}

/* ---------- sizing ---------- */
function resize() {
  const r = canvas.parentElement.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  W = Math.max(240, Math.floor(r.width)); H = Math.max(160, Math.floor(r.height));
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  canvas.width = Math.floor(W * dpr); canvas.height = Math.floor(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  requestDraw();
}
window.addEventListener('resize', resize);

/* ---------- input ---------- */
const KEYS = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3, w: 0, d: 1, s: 2, a: 3, W: 0, D: 1, S: 2, A: 3 };
window.addEventListener('keydown', ev => {
  if (ev.target.closest && ev.target.closest('input, select, textarea')) return;
  if (!(ev.key in KEYS)) return;
  ev.preventDefault();
  playerMove(KEYS[ev.key]);
});
$$('.dpad button').forEach(b => b.addEventListener('click', () => playerMove(Number(b.dataset.dir))));

// a click moves one cell towards the clicked point
canvas.addEventListener('click', ev => {
  const a = G.agents.you;
  if (!a) return;
  const r = canvas.getBoundingClientRect(), g = geom(), p = center(a.pos, g);
  const dx = ev.clientX - r.left - p.x, dy = ev.clientY - r.top - p.y;
  if (Math.hypot(dx, dy) < g.cell * 0.4) return;
  playerMove(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0));
});

$('#levelSel').addEventListener('change', e => { G.level = e.target.value; setupLevel(); });
$('#btnNewMap').addEventListener('click', () => {
  G.seed = Math.floor(Math.random() * 1e9);
  G.level = 'random';
  $('#levelSel').value = 'random';
  setupLevel();
});
$('#sensor').addEventListener('input', e => {
  G.sensor = Number(e.target.value);
  $('#sensorVal').textContent = G.sensor;
  setupLevel();            // results depend on how far the rovers see
});
$('#speed').addEventListener('input', e => { G.speed = Number(e.target.value); $('#speedVal').textContent = G.speed; });
$('#noFog').addEventListener('change', e => { G.noFog = e.target.checked; requestDraw(); });
$('#btnYou').addEventListener('click', newPlayer);
$$('[data-algo]').forEach(b => b.addEventListener('click', () => runAlgo(b.dataset.algo)));

function onLangChange() {
  renderCaption(); renderHUD(); renderBoard();
  const k = G.active;
  if (k !== 'you' && $('#algoInfo').classList.contains('show')) $('#algoInfo').innerHTML = t('info.' + k);
  requestDraw();
}

/* ---------- boot ---------- */
G.seed = Math.floor(Math.random() * 1e9);
setupLevel();
window.addEventListener('load', resize);
resize();
