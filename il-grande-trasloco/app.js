// =========================================================
// Il Grande Trasloco — app.js (riempi lo zaino senza superare il peso)
// =========================================================

/* ===========================
 * 0) CONSTANTS & DATA
 * =========================== */
// Item catalog shown on each gear card (full name + emoji), indexed by each
// level's own item.itemIdx (set in levels.json)
const ITEMS = {
  it: ['Smartphone','Laptop','Fotocamera','Console','Orologio','Scarpe','Libro','Cuffie','Pallone','Giacca',
       'Gioiello','Powerbank','Monitor','Chitarra','Borraccia','Occhiali da sole','Tastiera','Manubrio','Peluche','Quaderno',
       'Attrezzi','Cioccolato','Calzini','Monete','Tenda'],
  en: ['Smartphone','Laptop','Camera','Console','Watch','Shoes','Book','Headphones','Ball','Jacket',
       'Jewel','Power bank','Monitor','Guitar','Water bottle','Sunglasses','Keyboard','Dumbbell','Plush toy','Notebook',
       'Tools','Chocolate','Socks','Coins','Tent']
};
const ITEM_EMOJI = ['📱','💻','📷','🎮','⌚','👟','📚','🎧','⚽','🧥',
  '💎','🔋','🖥️','🎸','🧴','🕶️','⌨️','🏋️','🧸','📖',
  '🔧','🍫','🧦','🪙','⛺'];
function itemEmoji(itemIdx) { return ITEM_EMOJI[itemIdx % ITEM_EMOJI.length]; }
function itemLabel(itemIdx) {
  const arr = ITEMS[lang()] || ITEMS.it;
  return arr[itemIdx % arr.length];
}

const ALGO_KEYS = ['bnb','ls','ts'];
const ALGO_STYLES = {
  bnb: { color:'#FF4081', label:'Branch & Bound' },
  ls:  { color:'#4ECDC4', label:'Local Search' },
  ts:  { color:'#F97316', label:'Tabu Search' }
};

/* ===========================
 * 1) STATE
 * =========================== */
let LEVELS = [];
let current = null;        // {goal, capacity, timeLimitSec, items}
let hintNode = -1;
let idToIndex = new Map();
let undoStack = [];
let lastRenderInBag = [];  // previous render's inBag flags, to detect what just moved (pop-in)

// Algo state
let algoResults = {};      // key → { inBag: [...], value: N }
let visibility = {};       // key → bool
let currentAlgoInfoKey = null;
let animRunning = false;   // true while an algorithm animation is playing

// Timer
let timerInterval = null;
let timerRemaining = 0;

// Animation (used by the Local Search / Tabu Search stepper loops)
let _anim = { handle: null, running: false };

function resetAlgoState() {
  algoResults = {};
  visibility = {};
  ALGO_KEYS.forEach(k => { algoResults[k] = null; visibility[k] = false; });
  currentAlgoInfoKey = null;
  animRunning = false;
  ALGO_KEYS.forEach(k => setAlgoRunningUI(k, false));
  hideAlgoInfo();
  refreshButtonStates();
}

/* ===========================
 * 2) DOM REFS
 * =========================== */
const elBagZone  = document.getElementById('bagZone');
const elPool     = document.getElementById('pool');
const elWeight   = document.getElementById('weightCount');
const elValue    = document.getElementById('valueCount');
const elGoal     = document.getElementById('goalCount');
const elLevel    = document.getElementById('levelSel');
const elFeedback = document.getElementById('feedback');

/* ===========================
 * 3) i18n helpers
 * =========================== */
function lang() { return typeof gcLang !== 'undefined' ? gcLang : 'it'; }
function tr(key, fallback) {
  try { return GC_I18N[lang()][key] ?? fallback ?? key; }
  catch { return fallback ?? key; }
}
function trInfo(key) {
  try { return GC_I18N[lang()].info[key] ?? ''; }
  catch { return ''; }
}

/* ===========================
 * 4) INIT
 * =========================== */
init();
async function init() {
  await loadLevelsJSON();
  populateLevelSelect();
  wireEvents();
  if (LEVELS.length) loadLevel(LEVELS[0].id);
}

/* ===========================
 * 5) LEVELS
 * =========================== */
async function loadLevelsJSON() {
  try {
    const res = await fetch('levels.json', { cache: 'no-store' });
    LEVELS = await res.json();
  } catch(e) { console.error('Failed to load levels:', e); }
}

function populateLevelSelect() {
  const prev = elLevel.value;
  elLevel.innerHTML = '';
  // levels have no names: identify them by size — item count + capacity
  LEVELS.forEach(l => {
    const opt = document.createElement('option');
    opt.value = l.id;
    opt.textContent = tr('level_opt_tpl')
      .replace('{n}', l.items.length)
      .replace('{cap}', l.capacity);
    elLevel.appendChild(opt);
  });
  if (prev) elLevel.value = prev;
}

// ids in levels.json are numbers, but <select>.value is always a string:
// compare loosely so both the boot call and the change handler match
function levelById(id) { return LEVELS.find(l => String(l.id) === String(id)); }

function loadLevel(id) {
  stopAnimation();
  stopTimer();
  const L = levelById(id);
  if (!L) return;

  current = {
    goal: L.goal,
    capacity: L.capacity,
    timeLimitSec: L.timeLimitSec || 120,
    items: L.items.map(v => ({ ...v, inBag: false }))
  };

  idToIndex = new Map();
  current.items.forEach((v, idx) => idToIndex.set(v.id, idx));

  elGoal.textContent = current.goal;
  hintNode = -1;
  undoStack = [];
  lastRenderInBag = [];
  resetAlgoState();
  hideFeedback();
  startTimer(current.timeLimitSec);
  updateExactButtons();
  renderBoard();
}

/* ===========================
 * 6) BAG HELPERS
 * =========================== */
function bagWeight() {
  if (!current) return 0;
  return current.items.reduce((s, v) => s + (v.inBag ? v.weight : 0), 0);
}
function bagValue() {
  if (!current) return 0;
  return current.items.reduce((s, v) => s + (v.inBag ? v.value : 0), 0);
}
function resetBag() {
  if (!current) return;
  current.items.forEach(v => v.inBag = false);
  hintNode = -1;
  undoStack = [];
  hideFeedback();
  renderBoard();
}
function computeAlgoSuggestion() {
  const sugg = new Array(current.items.length).fill(false);
  ALGO_KEYS.forEach(k => {
    if (!visibility[k] || !algoResults[k]) return;
    algoResults[k].inBag.forEach((b, idx) => { if (b) sugg[idx] = true; });
  });
  return sugg;
}

/* ===========================
 * 7) BOARD RENDERING (DOM: pool + single bag zone)
 * =========================== */
function buildItemEl(v, suggestion) {
  const idx = idToIndex.get(v.id);
  const el = document.createElement('div');
  el.className = 'gear-card';
  if (v.id === hintNode) el.classList.add('hint');
  if (lastRenderInBag[idx] !== v.inBag) el.classList.add(v.inBag ? 'drop-in' : 'pop-out');
  if (!v.inBag && suggestion[idx]) el.classList.add('suggested');

  const eyelet = document.createElement('div');
  eyelet.className = 'gear-eyelet';
  el.appendChild(eyelet);

  const emoji = document.createElement('div');
  emoji.className = 'item-emoji';
  emoji.textContent = itemEmoji(v.itemIdx);
  emoji.style.animationDelay = ((v.id % 5) * 0.15) + 's';
  el.appendChild(emoji);

  const name = document.createElement('div');
  name.className = 'item-name';
  name.textContent = itemLabel(v.itemIdx);
  el.appendChild(name);

  const stats = document.createElement('div');
  stats.className = 'item-stats';
  stats.innerHTML = `<span class="stat w">⚖ ${v.weight} kg</span><span class="stat v">★ ${v.value}</span>`;
  el.appendChild(stats);

  el.addEventListener('click', (e) => {
    e.stopPropagation();
    onItemClick(idx, el);
  });
  return el;
}

function updateCapacityBar() {
  const w = bagWeight();
  const cap = current ? current.capacity : 0;
  const label = document.getElementById('capLabel');
  const fill = document.getElementById('capFill');
  if (label) label.textContent = `🎒 ${w} / ${cap} kg`;
  if (fill) {
    const pct = cap > 0 ? Math.min(100, (w / cap) * 100) : 0;
    fill.style.width = pct + '%';
    fill.classList.toggle('full', cap > 0 && w >= cap);
  }
}

// Fires the moment the bag is saturated — nothing left in the pool fits. That
// is when the real lesson lands: filling the bag is not the goal, carrying the
// most value is, so spell out weight, value and whether it can still be beaten.
function updateBagStatus() {
  const el = document.getElementById('bagStatus');
  if (!el) return;
  el.className = 'bag-status';

  if (!current || animRunning) { el.innerHTML = ''; return; }

  const w = bagWeight();
  const v = bagValue();
  const out = current.items.filter(i => !i.inBag);
  const packedCount = current.items.length - out.length;
  const lightest = out.length ? Math.min(...out.map(i => i.weight)) : Infinity;
  const saturated = packedCount > 0 && (out.length === 0 || w + lightest > current.capacity);

  if (!saturated) { el.innerHTML = ''; return; }

  const head = tr('bag_full_tpl')
    .replace('{w}', w).replace('{cap}', current.capacity).replace('{v}', v);
  const optimal = v >= current.goal;
  const tail = (optimal ? tr('bag_full_optimal') : tr('bag_full_better'))
    .replace('{goal}', current.goal).replace('{v}', v);
  el.innerHTML = `<b>${head}</b><span>${tail}</span>`;
  el.classList.add('show', optimal ? 'ok' : 'improve');
}

function renderBoard() {
  if (!current) return;
  const suggestion = computeAlgoSuggestion();

  // pool: items not yet in the bag
  elPool.innerHTML = '';
  const poolItems = current.items.filter(v => !v.inBag);
  if (!poolItems.length) {
    const p = document.createElement('div');
    p.className = 'pool-empty';
    p.textContent = tr('pool_empty_hint');
    elPool.appendChild(p);
  } else {
    poolItems.forEach(v => elPool.appendChild(buildItemEl(v, suggestion)));
  }

  // bag: rebuild the packed items inside the compartment
  elBagZone.querySelectorAll('.gear-card, .bag-empty').forEach(n => n.remove());
  const bagItems = current.items.filter(v => v.inBag);
  if (!bagItems.length) {
    const empty = document.createElement('div');
    empty.className = 'bag-empty';
    empty.textContent = tr('bag_empty_hint');
    elBagZone.appendChild(empty);
  } else {
    bagItems.forEach(v => elBagZone.appendChild(buildItemEl(v, suggestion)));
  }

  updateCapacityBar();
  updateHUD();
  updateBagStatus();
  lastRenderInBag = current.items.map(v => v.inBag);
}

/* ===========================
 * 8) INTERACTION (click an item to toggle it in/out of the bag)
 * =========================== */
function onItemClick(idx, el) {
  if (!current) return;
  const v = current.items[idx];

  if (v.inBag) {
    pushUndo(idx, true);
    v.inBag = false;
    hintNode = -1;
    hideFeedback();
    renderBoard();
    return;
  }

  if (bagWeight() + v.weight > current.capacity) {
    // doesn't fit — a quick shake + red flash on the card itself, no state change
    if (el) {
      el.classList.remove('no-fit');
      void el.offsetWidth; // restart the animation even on repeated rapid clicks
      el.classList.add('no-fit');
      setTimeout(() => el.classList.remove('no-fit'), 450);
    }
    return;
  }

  pushUndo(idx, false);
  v.inBag = true;
  hintNode = -1;
  hideFeedback();
  renderBoard();
  checkWin(); // only a real move by the player can complete the puzzle
}

/* ===========================
 * 9) HUD
 * =========================== */
function updateHUD() {
  const w = bagWeight();
  const v = bagValue();
  elWeight.textContent = current ? `${w}/${current.capacity} kg` : '–';
  elValue.textContent = v || '–';
  const weightChip = elWeight.closest('.hud-chip');
  const valueChip = elValue.closest('.hud-chip');
  if (weightChip && current) {
    weightChip.classList.toggle('success', w > 0 && w === current.capacity);
  }
  if (valueChip && current) {
    valueChip.classList.toggle('success', v > 0 && v >= current.goal);
  }
}

/* ===========================
 * 10) TIMER
 * =========================== */
function startTimer(seconds) {
  stopTimer();
  timerRemaining = seconds;
  const el = document.getElementById('timer');
  if (!el) return;
  function tick() {
    if (timerRemaining <= 0) { stopTimer(); return; }
    const m = Math.floor(timerRemaining / 60);
    const s = timerRemaining % 60;
    el.textContent = m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
    el.classList.toggle('warn', timerRemaining <= 10);
    timerRemaining--;
  }
  tick();
  timerInterval = setInterval(tick, 1000);
}
function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
  const el = document.getElementById('timer');
  if (el) { el.textContent = ''; el.classList.remove('warn'); }
}

/* ===========================
 * 11) UNDO
 * =========================== */
function pushUndo(itemIdx, prevInBag) {
  undoStack.push({ idx: itemIdx, inBag: prevInBag });
}
function undoLast() {
  if (!undoStack.length || !current) return;
  const { idx, inBag } = undoStack.pop();
  current.items[idx].inBag = inBag;
  hintNode = -1;
  hideFeedback();
  renderBoard();
  checkWin();
}

/* ===========================
 * 12) ALGORITHMS
 * =========================== */

// --- Greedy by value/weight ratio (used internally as the seed for
//     Local Search and Tabu Search) ---
function algoGreedy() {
  const n = current.items.length;
  const order = current.items
    .map((it, i) => ({ weight: it.weight, value: it.value, i }))
    .sort((a, b) => (b.value / b.weight) - (a.value / a.weight));

  const inBag = new Array(n).fill(false);
  let w = 0;
  for (const it of order) {
    if (w + it.weight <= current.capacity) { inBag[it.i] = true; w += it.weight; }
  }
  const value = current.items.reduce((s, v, i) => s + (inBag[i] ? v.value : 0), 0);
  return { inBag, value };
}

function bagNeighbor(inBag, weight) {
  const n = current.items.length;
  const trial = [...inBag];
  if (Math.random() < 0.5) {
    // toggle a single item
    const i = Math.floor(Math.random() * n);
    if (trial[i]) {
      trial[i] = false;
    } else {
      if (weight + current.items[i].weight > current.capacity) return null;
      trial[i] = true;
    }
  } else {
    // swap: remove one in-bag item, add one out-of-bag item
    const inIdxs = trial.map((b, i) => b ? i : -1).filter(i => i >= 0);
    const outIdxs = trial.map((b, i) => !b ? i : -1).filter(i => i >= 0);
    if (!inIdxs.length || !outIdxs.length) return null;
    const ri = inIdxs[Math.floor(Math.random() * inIdxs.length)];
    const ro = outIdxs[Math.floor(Math.random() * outIdxs.length)];
    const trialWeight = weight - current.items[ri].weight + current.items[ro].weight;
    if (trialWeight > current.capacity) return null;
    trial[ri] = false; trial[ro] = true;
  }
  return trial;
}
function bagValueOf(inBag) {
  return current.items.reduce((s, v, i) => s + (inBag[i] ? v.value : 0), 0);
}
function bagWeightOf(inBag) {
  return current.items.reduce((s, v, i) => s + (inBag[i] ? v.weight : 0), 0);
}

/* ===========================
 * 13) LOCAL SEARCH (greedy — only ever accepts non-worsening moves,
 *     so unlike Tabu Search it can get stuck and stop early)
 * =========================== */
function algoLocalSearch_stepper() {
  const seed = algoGreedy();
  let inBag = [...seed.inBag];
  let weight = bagWeightOf(inBag);
  let value = seed.value;
  let bestInBag = [...inBag];
  let bestValue = value;

  let iter = 0;
  const maxIter = 400;
  let stuck = 0;
  const maxStuck = 60; // stop once it can't find any further improving move for a while

  return {
    step() {
      if (iter >= maxIter || stuck >= maxStuck) {
        return { done: true, inBag: bestInBag, value: bestValue, iter, stuck: stuck >= maxStuck };
      }
      iter++;

      const trial = bagNeighbor(inBag, weight);
      if (!trial) {
        stuck++;
        return { done: false, inBag: bestInBag, currentInBag: inBag, value: bestValue, iter, stuck, progress: iter / maxIter };
      }
      const trialValue = bagValueOf(trial);
      if (trialValue >= value) { // greedy: never accepts a move that lowers the value
        inBag = trial;
        weight = bagWeightOf(inBag);
        if (trialValue > value) { value = trialValue; stuck = 0; } else { stuck++; }
        if (value > bestValue) { bestValue = value; bestInBag = [...inBag]; }
      } else {
        stuck++;
      }

      return { done: false, inBag: bestInBag, currentInBag: inBag, value: bestValue, iter, stuck, progress: iter / maxIter };
    }
  };
}

// --- Tabu Search ---
// Unlike the two above it does not sample the neighbourhood at random: every
// iteration it scans ALL feasible moves — same moves as Local Search, add /
// remove / swap an item — and takes the best one, even when that move lowers
// the value. What keeps it from immediately undoing that move is the tabu
// list — every item it touches stays forbidden for `tenure` iterations — so
// the search is pushed away from the local optimum instead of oscillating
// around it. A tabu move is still allowed if it would beat the best solution
// ever seen (aspiration criterion).
function algoTabu_stepper() {
  const n = current.items.length;
  const seed = algoGreedy();
  let inBag = [...seed.inBag];
  let weight = bagWeightOf(inBag);
  let value = seed.value;
  let bestInBag = [...inBag];
  let bestValue = value;

  const tenure = Math.max(2, Math.round(n / 4));
  const tabuUntil = new Array(n).fill(0); // iteration at which item i becomes free again
  let iter = 0;
  const maxIter = 260;

  return {
    step() {
      if (iter >= maxIter) {
        return { done: true, inBag: bestInBag, value: bestValue, iter, tabu: 0 };
      }
      iter++;

      // scan the whole neighbourhood and keep the best admissible move
      let bestMove = null, moveValue = -Infinity, moveWeight = 0;

      // (a) add or remove one item
      for (let i = 0; i < n; i++) {
        const it = current.items[i];
        const trialWeight = inBag[i] ? weight - it.weight : weight + it.weight;
        if (trialWeight > current.capacity) continue;          // doesn't fit
        const trialValue = inBag[i] ? value - it.value : value + it.value;
        // aspiration: a tabu move that beats the incumbent is taken anyway
        if (tabuUntil[i] > iter && trialValue <= bestValue) continue;
        if (trialValue > moveValue) { bestMove = [i]; moveValue = trialValue; moveWeight = trialWeight; }
      }

      // (b) swap one packed item for one left behind
      for (let i = 0; i < n; i++) {
        if (!inBag[i]) continue;
        for (let j = 0; j < n; j++) {
          if (inBag[j]) continue;
          const trialWeight = weight - current.items[i].weight + current.items[j].weight;
          if (trialWeight > current.capacity) continue;
          const trialValue = value - current.items[i].value + current.items[j].value;
          const isTabu = tabuUntil[i] > iter || tabuUntil[j] > iter;
          if (isTabu && trialValue <= bestValue) continue;
          if (trialValue > moveValue) { bestMove = [i, j]; moveValue = trialValue; moveWeight = trialWeight; }
        }
      }

      const tabuCount = tabuUntil.reduce((s, u) => s + (u > iter ? 1 : 0), 0);

      if (!bestMove) { // every move is either infeasible or tabu: wait it out
        return { done: false, inBag: bestInBag, currentInBag: inBag, value: bestValue, iter, tabu: tabuCount, progress: iter / maxIter };
      }

      bestMove.forEach(i => { inBag[i] = !inBag[i]; tabuUntil[i] = iter + tenure; });
      weight = moveWeight;
      value = moveValue;
      if (value > bestValue) { bestValue = value; bestInBag = [...inBag]; }

      return { done: false, inBag: bestInBag, currentInBag: inBag, value: bestValue, iter, tabu: tabuCount, progress: iter / maxIter };
    }
  };
}

/* ===========================
 * 14) ANIMATED BRANCH & BOUND (exact — searches for the true optimum,
 *     pruning any branch that can no longer beat the best found so far)
 * =========================== */
async function runBranchBoundAnimated() {
  resetBag();
  const n = current.items.length;
  // sort by value/weight ratio descending: both a good branching order
  // (best candidates tried first) and what the bound below relies on
  const order = current.items
    .map((it, i) => ({ weight: it.weight, value: it.value, id: it.id, i }))
    .sort((a, b) => (b.value / b.weight) - (a.value / a.weight));

  let bestValue = 0;
  let bestInBag = new Array(n).fill(false);

  let steps = 0;
  const maxSteps = 140; // keeps the live animation bounded even when a full proof of optimality would take much longer

  function bound(pos, remainingCap, valueSoFar) {
    let b = valueSoFar;
    let cap = remainingCap;
    for (let k = pos; k < n; k++) {
      const it = order[k];
      if (it.weight <= cap) { cap -= it.weight; b += it.value; }
      else { b += it.value * (cap / it.weight); break; } // fractional relaxation bound
    }
    return b;
  }

  async function bt(pos, weightSoFar, valueSoFar, chosen) {
    if (steps >= maxSteps) return;
    if (valueSoFar > bestValue) {
      bestValue = valueSoFar;
      bestInBag = [...chosen];
    }
    if (pos === n) return;
    if (bound(pos, current.capacity - weightSoFar, valueSoFar) <= bestValue) return; // prune: this branch can't beat the best found so far

    const it = order[pos];

    // branch 1: include it (if it fits)
    if (weightSoFar + it.weight <= current.capacity) {
      steps++;
      chosen[it.i] = true;
      current.items[it.i].inBag = true;
      hintNode = it.id;
      renderBoard();
      await delay(260);
      await bt(pos + 1, weightSoFar + it.weight, valueSoFar + it.value, chosen);
      chosen[it.i] = false;
      current.items[it.i].inBag = false;
      renderBoard();
      await delay(140);
    }

    // branch 2: exclude it
    if (steps >= maxSteps) return;
    steps++;
    hintNode = it.id;
    renderBoard();
    await delay(160);
    await bt(pos + 1, weightSoFar, valueSoFar, chosen);
  }
  await bt(0, 0, 0, new Array(n).fill(false));

  current.items.forEach((v, i) => v.inBag = bestInBag[i]);
  hintNode = -1;
  renderBoard();
}

/* ===========================
 * 14b) ANIMATION ENGINE (Local Search / Tabu Search stepper loop)
 * =========================== */
function stopAnimation() {
  if (_anim.handle) clearTimeout(_anim.handle);
  _anim = { handle: null, running: false };
  hideProgress();
}

function animateLoop({ stepFn, onFrame, onEnd, delayMs = 60 }) {
  stopAnimation();
  _anim.running = true;
  showProgress(0);
  function tick() {
    if (!_anim.running) return;
    const s = stepFn();
    if (!s) { stopAnimation(); onEnd?.(); return; }
    onFrame?.(s);
    if (s.progress !== undefined) showProgress(s.progress);
    if (s.done) { stopAnimation(); onEnd?.(s); }
    else { _anim.handle = setTimeout(tick, delayMs); }
  }
  tick();
}

/* ===========================
 * 15) RUN ALGORITHM (dispatch)
 * =========================== */
function runAlgo(key) {
  if (!current) return;
  if (animRunning) return;

  if (key === 'bnb' && current.items.length > 15) {
    showAlgoInfo(key, `<div style="color:var(--coral);margin-top:6px;">${tr('disabled_backtrack')}</div>`);
    return;
  }

  // Every click replays the animation from scratch (Local Search is
  // stochastic, so a fresh run can even land on a different result).
  // The result it finds stays pinned in the bag — Reset if you want your
  // own attempt back.
  showAlgoInfo(key);
  animRunning = true;
  setAlgoRunningUI(key, true);

  function finish() {
    animRunning = false;
    setAlgoRunningUI(key, false);
  }

  switch (key) {
    case 'bnb': {
      runBranchBoundAnimated().then(() => {
        algoResults[key] = { inBag: current.items.map(v => v.inBag), value: bagValue() };
        visibility[key] = true;
        refreshButtonStates();
        renderBoard();
        announceAlgoResult(key, algoResults[key].value);
        finish();
      });
      break;
    }
    case 'ls': {
      const stepper = algoLocalSearch_stepper();
      visibility[key] = true;
      refreshButtonStates();
      animateLoop({
        stepFn: stepper.step,
        delayMs: 30,
        onFrame: (s) => {
          const displayInBag = s.currentInBag || s.inBag;
          displayInBag.forEach((b, i) => { current.items[i].inBag = b; });
          renderBoard();
          showAlgoInfo(key, `<small>Iter: <b>${s.iter}</b> · Bloccata da: <b>${s.stuck}</b> · Best: <b>${s.value}</b> ${tr('unit_value')}</small>`);
        },
        onEnd: (s) => {
          if (s) {
            algoResults[key] = { inBag: [...s.inBag], value: s.value };
            current.items.forEach((v, i) => v.inBag = s.inBag[i]);
            renderBoard();
            announceAlgoResult(key, s.value);
          } else {
            renderBoard();
          }
          finish();
        }
      });
      break;
    }
    case 'ts': {
      const stepper = algoTabu_stepper();
      visibility[key] = true;
      refreshButtonStates();
      animateLoop({
        stepFn: stepper.step,
        delayMs: 55,
        onFrame: (s) => {
          const displayInBag = s.currentInBag || s.inBag;
          displayInBag.forEach((b, i) => { current.items[i].inBag = b; });
          renderBoard();
          showAlgoInfo(key, `<small>Iter: <b>${s.iter}</b> · Tabu: <b>${s.tabu}</b> · Best: <b>${s.value}</b> ${tr('unit_value')}</small>`);
        },
        onEnd: (s) => {
          if (s) {
            algoResults[key] = { inBag: [...s.inBag], value: s.value };
            current.items.forEach((v, i) => v.inBag = s.inBag[i]);
            renderBoard();
            announceAlgoResult(key, s.value);
          } else {
            renderBoard();
          }
          finish();
        }
      });
      break;
    }
  }
}

function announceAlgoResult(key, value) {
  const optimal = value >= current.goal;
  const exact = key === 'bnb';   // only Branch & Bound comes with a guarantee
  let badge;
  if (optimal) {
    const txt = exact ? tr('algo_optimal_guaranteed') : tr('algo_optimal_lucky');
    badge = `<div class="optimal-badge optimal-yes">🏆 ${txt}</div>`;
  } else {
    // a heuristic falling short is the expected outcome, not a failure: say so
    badge = `<div class="optimal-badge optimal-no">${tr('algo_below').replace('{goal}', current.goal)}</div>`;
  }
  showAlgoInfo(key, `<div class="detail">${tr('feedback_value_tpl').replace('{N}', value)}</div>${badge}`);
}

function setAlgoRunningUI(key, running) {
  const btn = document.querySelector(`[data-algo="${key}"]`);
  if (btn) btn.classList.toggle('running', running);
}

/* ===========================
 * 16) UI: Algo info, buttons, progress
 * =========================== */
function showAlgoInfo(key, extra = '') {
  currentAlgoInfoKey = key;
  const box = document.getElementById('algoInfo');
  if (!box) return;
  const info = trInfo(key);
  if (!info && !extra) { box.classList.remove('show'); return; }
  const style = ALGO_STYLES[key] || {};
  box.innerHTML = `
    <h4>${style.label || key}</h4>
    <div>${info}</div>
    ${extra}
  `;
  box.classList.add('show');
}
function hideAlgoInfo() {
  const box = document.getElementById('algoInfo');
  if (box) box.classList.remove('show');
}
function refreshAlgoInfo() {
  if (currentAlgoInfoKey) showAlgoInfo(currentAlgoInfoKey);
}

function refreshButtonStates() {
  ALGO_KEYS.forEach(k => {
    const btn = document.querySelector(`[data-algo="${k}"]`);
    if (btn) btn.classList.toggle('active', !!visibility[k]);
  });
}

function updateExactButtons() {
  if (!current) return;
  const N = current.items.length;
  const btn = document.querySelector('[data-algo="bnb"]');
  if (btn) {
    btn.classList.toggle('disabled', N > 15);
    btn.title = N > 15 ? tr('disabled_backtrack') : '';
  }
}

function showProgress(pct) {
  const bar = document.getElementById('progressBar');
  const fill = document.getElementById('progressFill');
  if (bar && fill) {
    bar.style.display = 'block';
    fill.style.width = `${Math.min(100, pct * 100)}%`;
  }
}
function hideProgress() {
  const bar = document.getElementById('progressBar');
  if (bar) bar.style.display = 'none';
}

/* ===========================
 * 17) FEEDBACK TOAST + CONFETTI
 * =========================== */
function checkWin() {
  if (!current) return;
  if (bagValue() >= current.goal) showFeedbackToast();
}

function showFeedbackToast() {
  if (!elFeedback || !current) return;
  stopTimer();
  const v = bagValue();
  const goalMet = v >= current.goal;

  let html = `<div class="score">${tr('feedback_win')}</div>`;
  html += `<div class="detail">${tr('feedback_value_tpl').replace('{N}', v)}</div>`;

  // current.goal is the verified true optimum for this level (not just a
  // target), so we can always say whether it was actually reached.
  if (goalMet) {
    html += `<div class="optimal-badge optimal-yes">🏆 ${tr('feedback_optimal')}</div>`;
  } else {
    html += `<div class="optimal-badge optimal-no">${tr('feedback_not_optimal').replace('{goal}', current.goal)}</div>`;
  }

  const computed = ALGO_KEYS.filter(k => algoResults[k]);
  if (computed.length) {
    html += '<div class="comparisons">';
    computed.forEach(k => {
      const algoV = algoResults[k].value;
      const label = ALGO_STYLES[k].label;
      if (v > algoV) {
        html += `<div style="color:var(--teal);">✓ ${tr('feedback_beat').replace('{algo}', label)}</div>`;
      } else if (v === algoV) {
        html += `<div style="color:var(--yellow);">≈ ${tr('feedback_tie').replace('{algo}', label)}</div>`;
      } else {
        html += `<div style="color:var(--coral);">✗ ${tr('feedback_lost').replace('{algo}', label).replace('{n}', algoV)}</div>`;
      }
    });
    html += '</div>';
  } else {
    html += `<div class="detail" style="margin-top:6px;">${tr('feedback_challenge')}</div>`;
  }

  html += `<button onclick="resetAndRestart()">${tr('feedback_retry')}</button>`;
  elFeedback.innerHTML = html;
  elFeedback.classList.add('show');

  if (goalMet) launchConfetti();
}

function hideFeedback() {
  if (elFeedback) elFeedback.classList.remove('show');
}

function resetAndRestart() {
  hideFeedback();
  resetBag();
  startTimer(current.timeLimitSec);
}

/* ===========================
 * 18) CONFETTI
 * =========================== */
function launchConfetti() {
  const wrap = document.querySelector('.board-wrap');
  if (!wrap) return;
  wrap.querySelectorAll('.confetti-canvas').forEach(c => c.remove());

  const cc = document.createElement('canvas');
  cc.className = 'confetti-canvas';
  cc.width = wrap.offsetWidth * (window.devicePixelRatio || 1);
  cc.height = wrap.offsetHeight * (window.devicePixelRatio || 1);
  cc.style.width = '100%';
  cc.style.height = '100%';
  wrap.appendChild(cc);
  const cctx = cc.getContext('2d');

  const pieces = [];
  const confettiColors = ['#FF6B6B','#4ECDC4','#FFE66D','#FF4081','#A78BFA','#F97316'];
  for (let i = 0; i < 80; i++) {
    pieces.push({
      x: Math.random() * cc.width,
      y: -20 - Math.random() * 200,
      w: 6 + Math.random() * 6,
      h: 4 + Math.random() * 4,
      vx: (Math.random() - 0.5) * 4,
      vy: 2 + Math.random() * 4,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.2,
      color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
      life: 1
    });
  }

  let frame = 0;
  function animConfetti() {
    frame++;
    cctx.clearRect(0, 0, cc.width, cc.height);
    let alive = false;
    pieces.forEach(p => {
      if (p.life <= 0) return;
      alive = true;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08;
      p.rot += p.vr;
      if (frame > 40) p.life -= 0.015;
      cctx.save();
      cctx.translate(p.x, p.y);
      cctx.rotate(p.rot);
      cctx.globalAlpha = Math.max(0, p.life);
      cctx.fillStyle = p.color;
      cctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      cctx.restore();
    });
    if (alive) requestAnimationFrame(animConfetti);
    else cc.remove();
  }
  requestAnimationFrame(animConfetti);
}

/* ===========================
 * 19) HINT
 * =========================== */
function hintGreedyNode() {
  if (!current) return;
  const remaining = current.capacity - bagWeight();
  let pick = -1, bestRatio = -1;
  current.items.forEach(v => {
    if (v.inBag || v.weight > remaining) return;
    const ratio = v.value / v.weight;
    if (ratio > bestRatio) { bestRatio = ratio; pick = v.id; }
  });
  hintNode = pick;
  renderBoard();
}

/* ===========================
 * 20) EVENTS
 * =========================== */
function wireEvents() {
  elLevel.addEventListener('change', () => loadLevel(elLevel.value));

  document.getElementById('btnReset').addEventListener('click', () => {
    resetBag();
    resetAlgoState();
    startTimer(current.timeLimitSec);
  });

  document.getElementById('btnUndo').addEventListener('click', undoLast);

  document.getElementById('btnFinish').addEventListener('click', () => {
    if (current) showFeedbackToast();
  });

  ALGO_KEYS.forEach(key => {
    const btn = document.querySelector(`[data-algo="${key}"]`);
    if (!btn) return;
    btn.addEventListener('click', () => {
      runAlgo(key);
      if (window.innerWidth <= 900) {
        document.querySelector('.board-wrap')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  });

  document.getElementById('btnHint')?.addEventListener('click', hintGreedyNode);
}

/* ===========================
 * 21) UTILITY
 * =========================== */
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
