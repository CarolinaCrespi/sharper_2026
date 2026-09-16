/* =========================================================
   Come Impara una Macchina — core: canvas, modes, HUD, data
========================================================= */
const canvas = $('#canvas');
const ctx = canvas.getContext('2d');
let W = 0, H = 0;

const MODES = {};
let mode = null;
function registerMode(m) { MODES[m.id] = m; }

/* ---------- theme-aware colors (read from CSS tokens) ---------- */
function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
function isLight() { return document.documentElement.getAttribute('data-theme') === 'light'; }
function pal() {
  return {
    ink: cssVar('--ink'), ink2: cssVar('--ink-2'), muted: cssVar('--muted'),
    border: cssVar('--border'), panel: cssVar('--panel'), panel2: cssVar('--panel-2'),
    teal: cssVar('--teal'), coral: cssVar('--coral'), yellow: cssVar('--yellow'),
    purple: cssVar('--purple'), orange: cssVar('--orange'), magenta: cssVar('--magenta'),
    bg: isLight() ? '#FFFFFF' : '#100E21'
  };
}

/* ---------- fruits: the dataset shared by supervised + unsupervised ---------- */
// the first three are the starting dataset; the others the player can teach
const FRUIT_EMOJI = ['🍎', '🍋', '🍉', '🍓', '🍌', '🍍'];
const N_FRUITS = FRUIT_EMOJI.length;
// centre of each class in (size, sweetness), both in 0..1
const FRUIT_CENTER = [[0.40, 0.72], [0.24, 0.24], [0.78, 0.58], [0.12, 0.84], [0.54, 0.92], [0.66, 0.28]];
function fruitColor(c, P) { return [P.coral, P.yellow, P.teal, P.magenta, P.orange, P.purple][c]; }
function fruitName(c) { return t('c' + c); }

function mulberry32(a) {
  return function() { let x = a += 0x6D2B79F5; x = Math.imul(x ^ x >>> 15, x | 1); x ^= x + Math.imul(x ^ x >>> 7, x | 61); return ((x ^ x >>> 14) >>> 0) / 4294967296; };
}
function gauss(rng) { let u = 0, v = 0; while (!u) u = rng(); while (!v) v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
const clamp01 = v => Math.min(0.97, Math.max(0.03, v));

function sampleFruit(c, rng = Math.random) {
  const [cx, cy] = FRUIT_CENTER[c];
  return { x: clamp01(cx + gauss(rng) * 0.085), y: clamp01(cy + gauss(rng) * 0.085), c };
}
function makeFruits(perClass, seed, classes = 3) {
  const rng = mulberry32(seed), out = [];
  for (let c = 0; c < classes; c++) for (let i = 0; i < perClass; i++) out.push(sampleFruit(c, rng));
  return out;
}

/* ---------- plot area for the fruit modes (x = size, y = sweetness) ---------- */
function plotRect() { return { x0: 46, y0: 18, x1: W - 18, y1: H - 38 }; }
function toPx(p) { const r = plotRect(); return { x: r.x0 + p.x * (r.x1 - r.x0), y: r.y1 - p.y * (r.y1 - r.y0) }; }
function fromPx(x, y) {
  const r = plotRect();
  return { x: (x - r.x0) / (r.x1 - r.x0), y: (r.y1 - y) / (r.y1 - r.y0) };
}
function insidePlot(p) { return p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1; }

function drawPlotFrame(P) {
  const r = plotRect();
  ctx.save();
  ctx.strokeStyle = P.border; ctx.lineWidth = 1;
  ctx.globalAlpha = 0.6;
  for (let i = 1; i < 5; i++) {
    const gx = r.x0 + (r.x1 - r.x0) * i / 5, gy = r.y0 + (r.y1 - r.y0) * i / 5;
    ctx.beginPath(); ctx.moveTo(gx, r.y0); ctx.lineTo(gx, r.y1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(r.x0, gy); ctx.lineTo(r.x1, gy); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = P.muted; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(r.x0, r.y0); ctx.lineTo(r.x0, r.y1); ctx.lineTo(r.x1, r.y1); ctx.stroke();
  ctx.fillStyle = P.ink2; ctx.font = "600 12px 'DM Sans', system-ui";
  ctx.textAlign = 'right'; ctx.textBaseline = 'top';
  ctx.fillText(t('axis_x'), r.x1, r.y1 + 10);
  ctx.save(); ctx.translate(r.x0 - 14, r.y0); ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
  ctx.fillText(t('axis_y'), 0, 0);
  ctx.restore();
  ctx.restore();
}

function drawEmoji(emoji, x, y, size) {
  ctx.font = `${size}px 'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji',sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(emoji, x, y);
}

/* ---------- sizing ---------- */
function resize() {
  const r = canvas.parentElement.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  W = Math.max(240, Math.floor(r.width));
  H = Math.max(200, Math.floor(r.height));
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  requestDraw();
}
window.addEventListener('resize', resize);

let drawQueued = false;
function requestDraw() {
  if (drawQueued) return;
  drawQueued = true;
  requestAnimationFrame(() => {
    drawQueued = false;
    if (!mode || !W) return;
    ctx.clearRect(0, 0, W, H);
    mode.draw(pal());
  });
}

/* ---------- caption, HUD, help, info ---------- */
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

function renderHUD() {
  if (!mode) return;
  $('#hud').innerHTML = mode.hud().map(([label, value, cls]) =>
    `<span class="hud-chip${cls ? ' ' + cls : ''}">${label}: <b>${value}</b></span>`).join('');
}

function renderPanels() {
  if (!mode) return;
  $('#modeHelp').innerHTML = t('help.' + mode.id, mode.helpVars && mode.helpVars());
  $('#algoInfo').innerHTML = t('info.' + mode.id);
}

/* ---------- toast on the board ---------- */
let toastTimer = null;
// ms = 0 keeps the toast until it is closed (or the mode changes)
function toast(html, ms = 2600) {
  const fb = $('#feedback');
  fb.innerHTML = html;
  fb.classList.add('show');
  clearTimeout(toastTimer);
  if (ms) toastTimer = setTimeout(() => fb.classList.remove('show'), ms);
}
function hideToast() { clearTimeout(toastTimer); $('#feedback').classList.remove('show'); }
// buttons inside a toast: data-act="close" or an action handled by the mode
$('#feedback').addEventListener('click', ev => {
  const b = ev.target.closest('[data-act]');
  if (!b) return;
  hideToast();
  if (b.dataset.act !== 'close' && mode && mode.act) mode.act(b.dataset.act);
});

/* ---------- mode switching ---------- */
function setMode(id) {
  if (!MODES[id]) id = 'sup';
  if (mode && mode.leave) mode.leave();
  mode = MODES[id];
  $$('.mode-group').forEach(g => { g.hidden = g.dataset.group !== id; });
  $$('[data-mode]').forEach(b => b.classList.toggle('active', b.dataset.mode === id));
  hideToast();
  try { localStorage.setItem('ml_mode', id); } catch (e) {}
  renderPanels();
  mode.enter();
  renderHUD();
  requestDraw();
}
$$('[data-mode]').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));

/* ---------- board clicks → current mode ---------- */
canvas.addEventListener('click', ev => {
  if (!mode || !mode.click) return;
  const r = canvas.getBoundingClientRect();
  mode.click(ev.clientX - r.left, ev.clientY - r.top, ev);
});

/* language switch re-renders everything text-based */
function onLangChange() {
  renderPanels();
  renderCaption();
  renderHUD();
  if (mode && mode.onLang) mode.onLang();
  requestDraw();
}

/* boot after every mode script has registered itself */
window.addEventListener('load', () => {
  resize();
  let start = 'sup';
  try { start = localStorage.getItem('ml_mode') || 'sup'; } catch (e) {}
  setMode(start);
});
