// =========================================================
// SOS Orario Scuola — app.js (diario di classe: lezioni su bacheca)
// =========================================================

/* ===========================
 * 0) CONSTANTS & DATA
 * =========================== */
const COLORS = [
  '#FF1744','#FF9100','#FFC400','#00E676','#00B0FF',
  '#651FFF','#D500F9'
];

// "Ora" zone names on the corkboard (one per COLORS entry)
const ZONES = {
  it: ['1ª ORA','2ª ORA','3ª ORA','4ª ORA','5ª ORA','6ª ORA','7ª ORA'],
  en: ['1st HOUR','2nd HOUR','3rd HOUR','4th HOUR','5th HOUR','6th HOUR','7th HOUR']
};
function zoneLabel(i) { return (ZONES[lang()] || ZONES.it)[i] || `#${i + 1}`; }

// Subject names shown on each lesson note (full name), indexed by each
// level's own node.subjectIdx (set in levels.json)
const SUBJECTS = {
  it: ['Matematica','Italiano','Storia','Inglese','Scienze','Arte','Musica','Ed. Fisica','Geografia','Chimica',
       'Fisica','Filosofia','Latino','Informatica','Religione','Diritto','Economia','Biologia','Tecnologia','Spagnolo',
       'Francese','Tedesco','Disegno','Statistica','Astronomia'],
  en: ['Mathematics','Literature','History','Foreign Language','Science','Art','Music','Physical Ed.','Geography','Chemistry',
       'Physics','Philosophy','Latin','Computer Science','Religion','Law','Economics','Biology','Technology','Spanish',
       'French','German','Drawing','Statistics','Astronomy']
};
// One emoji per subject, same index order as SUBJECTS — purely decorative.
const SUBJECT_EMOJI = ['📐','📖','🏛️','🗣️','🔬','🎨','🎵','⚽','🌍','🧪',
  '⚛️','🦉','🏺','💻','🕊️','⚖️','💶','🧬','⚙️','🇪🇸',
  '🇫🇷','🇩🇪','✏️','📊','🔭'];
function subjectEmoji(subjectIdx) { return SUBJECT_EMOJI[subjectIdx % SUBJECT_EMOJI.length]; }

function subjectLabel(subjectIdx) {
  const arr = SUBJECTS[lang()] || SUBJECTS.it;
  return arr[subjectIdx % arr.length];
}

// Teacher and class come straight from levels.json (node.teacher / node.class):
// every edge in a level is explained by one of the two matching — so a
// flagged conflict always shows *why* right there on the two cards.

const ALGO_KEYS = ['bnb','ls','sa'];
const ALGO_STYLES = {
  bnb: { color:'#FF4081', label:'Branch & Bound' },
  ls:  { color:'#4ECDC4', label:'Local Search' },
  sa:  { color:'#F97316', label:'Sim. Annealing' }
};

/* ===========================
 * 1) STATE
 * =========================== */
let LEVELS = [];
let current = null;       // {goal, nodes, edges, timeLimitSec}
let selectedIdx = null;   // index of the lesson note currently picked up
let hintNode = -1;
let idToIndex = new Map();
let undoStack = [];
let lastRenderColors = []; // previous render's colors, to detect what just moved (pop-in)

// Algo state
let algoResults = {};     // key → { colors: [...], numColors: N }
let visibility = {};      // key → bool
let currentAlgoInfoKey = null;
let animRunning = false;  // true while an algorithm animation is playing

// Timer
let timerInterval = null;
let timerRemaining = 0;

// Animation (used by the Simulated Annealing stepper loop)
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
const elBoard   = document.getElementById('board');
const elPool    = document.getElementById('pool');
const elUsed    = document.getElementById('usedCount');
const elConf    = document.getElementById('confCount');
const elGoal    = document.getElementById('goalCount');
const elLevel   = document.getElementById('levelSel');
const elFeedback= document.getElementById('feedback');

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
  LEVELS.forEach(l => {
    const opt = document.createElement('option');
    opt.value = l.id;
    opt.textContent = tr('level_opt_tpl')
      .replace('{n}', l.nodes.length)
      .replace('{goal}', l.goal);
    elLevel.appendChild(opt);
  });
  if (prev) elLevel.value = prev;
}

function levelById(id) { return LEVELS.find(l => l.id === id); }

function loadLevel(id) {
  stopAnimation();
  stopTimer();
  const L = levelById(id);
  if (!L) return;

  current = {
    goal: L.goal,
    timeLimitSec: L.timeLimitSec || 120,
    nodes: L.nodes.map(v => ({ ...v, color: -1 })),
    edges: L.edges.map(e => [...e])
  };

  idToIndex = new Map();
  current.nodes.forEach((v, idx) => idToIndex.set(v.id, idx));

  elGoal.textContent = current.goal;
  hintNode = -1;
  selectedIdx = null;
  undoStack = [];
  lastRenderColors = [];
  resetAlgoState();
  hideFeedback();
  startTimer(current.timeLimitSec);
  updateExactButtons();
  renderBoard();
}

/* ===========================
 * 6) GRAPH HELPERS
 * =========================== */
function neighbors(id) {
  const nb = [];
  current.edges.forEach(([a, b]) => {
    if (a === id) nb.push(b);
    else if (b === id) nb.push(a);
  });
  return nb;
}
function degree(id) {
  let d = 0;
  current.edges.forEach(([a, b]) => { if (a === id || b === id) d++; });
  return d;
}
function colorable(id, c) {
  return neighbors(id).every(j => {
    const idx = idToIndex.get(j);
    return idx !== undefined && current.nodes[idx].color !== c;
  });
}
function resetColors() {
  if (!current) return;
  current.nodes.forEach(v => v.color = -1);
  hintNode = -1;
  selectedIdx = null;
  undoStack = [];
  hideFeedback();
  renderBoard();
}

/* ===========================
 * 7) BOARD RENDERING (DOM corkboard, replaces the old canvas)
 * =========================== */
function totalConflicts() {
  if (!current) return 0;
  let c = 0;
  current.edges.forEach(([a, b]) => {
    const ia = idToIndex.get(a), ib = idToIndex.get(b);
    if (ia === undefined || ib === undefined) return;
    if (current.nodes[ia].color >= 0 && current.nodes[ia].color === current.nodes[ib].color) c++;
  });
  return c;
}
function usedColors() {
  if (!current) return 0;
  return new Set(current.nodes.filter(v => v.color >= 0).map(v => v.color)).size;
}
function computeConflictSet() {
  const set = new Set();
  if (!current) return set;
  current.edges.forEach(([a, b]) => {
    const ia = idToIndex.get(a), ib = idToIndex.get(b);
    if (ia === undefined || ib === undefined) return;
    if (current.nodes[ia].color >= 0 && current.nodes[ia].color === current.nodes[ib].color) {
      set.add(ia); set.add(ib);
    }
  });
  return set;
}
function computeAlgoSuggestion() {
  const sugg = new Array(current.nodes.length).fill(-1);
  ALGO_KEYS.forEach(k => {
    if (!visibility[k] || !algoResults[k]) return;
    algoResults[k].colors.forEach((c, idx) => { if (c >= 0) sugg[idx] = c; });
  });
  return sugg;
}

function buildNoteEl(v, conflictSet, suggestion) {
  const idx = idToIndex.get(v.id);
  const el = document.createElement('div');
  el.className = 'lesson-note';
  const tilt = ((v.id * 37) % 11) - 5; // deterministic -5..5deg, keeps a handmade feel stable across renders
  el.style.setProperty('--tilt', tilt + 'deg');
  el.style.transform = `rotate(${tilt}deg)`;
  if (idx === selectedIdx) el.classList.add('selected');
  if (v.id === hintNode) el.classList.add('hint');
  if (conflictSet.has(idx)) el.classList.add('conflict');
  if (lastRenderColors[idx] !== v.color) el.classList.add('pop-in');
  if (v.color === -1 && suggestion[idx] >= 0) {
    el.style.borderLeft = `4px solid ${COLORS[suggestion[idx] % COLORS.length]}`;
  }

  const pin = document.createElement('div');
  pin.className = 'pin';
  el.appendChild(pin);

  const tag = document.createElement('div');
  tag.className = 'classtag';
  tag.textContent = v.class;
  el.appendChild(tag);

  const subj = document.createElement('div');
  subj.className = 'subject';
  const emoji = document.createElement('span');
  emoji.className = 'subject-emoji';
  emoji.textContent = subjectEmoji(v.subjectIdx);
  emoji.style.animationDelay = ((v.id % 5) * 0.15) + 's';
  subj.appendChild(emoji);
  subj.appendChild(document.createTextNode(subjectLabel(v.subjectIdx)));
  el.appendChild(subj);

  const teach = document.createElement('div');
  teach.className = 'teacher';
  teach.textContent = v.teacher;
  el.appendChild(teach);

  if (conflictSet.has(idx)) {
    const warn = document.createElement('div');
    warn.className = 'warnbadge';
    warn.textContent = '⚠';
    el.appendChild(warn);
  }

  el.addEventListener('click', (e) => {
    e.stopPropagation();
    onNoteClick(idx);
  });
  return el;
}

function renderBoard() {
  if (!current) return;
  const conflictSet = computeConflictSet();
  const suggestion = computeAlgoSuggestion();

  // pool: unpinned lessons
  elPool.innerHTML = '';
  current.nodes.filter(v => v.color === -1).forEach(v => {
    elPool.appendChild(buildNoteEl(v, conflictSet, suggestion));
  });

  // board: one zone per available hour
  elBoard.innerHTML = '';
  for (let z = 0; z < COLORS.length; z++) {
    const zoneEl = document.createElement('div');
    zoneEl.className = 'ora-zone';
    zoneEl.classList.toggle('drop-target', selectedIdx !== null);

    const tape = document.createElement('div');
    tape.className = 'ora-tape';
    tape.textContent = zoneLabel(z);
    zoneEl.appendChild(tape);

    current.nodes.filter(v => v.color === z).forEach(v => {
      zoneEl.appendChild(buildNoteEl(v, conflictSet, suggestion));
    });

    zoneEl.addEventListener('click', () => onZoneClick(z));
    elBoard.appendChild(zoneEl);
  }

  updateHUD();
  lastRenderColors = current.nodes.map(v => v.color);
}

/* ===========================
 * 8) INTERACTION (click a note, then click an hour)
 * =========================== */
function onNoteClick(idx) {
  if (!current) return;
  const v = current.nodes[idx];
  if (v.color === -1) {
    selectedIdx = (selectedIdx === idx) ? null : idx;
  } else {
    pushUndo(idx, v.color);
    v.color = -1;
    selectedIdx = null;
  }
  hintNode = -1;
  hideFeedback();
  renderBoard();
}

function onZoneClick(zoneIdx) {
  if (!current || selectedIdx === null) return;
  const v = current.nodes[selectedIdx];
  pushUndo(selectedIdx, v.color);
  v.color = zoneIdx;
  selectedIdx = null;
  hintNode = -1;
  hideFeedback();
  renderBoard();
  checkWin(); // only a real pin by the player can complete the puzzle
}

/* ===========================
 * 9) HUD
 * =========================== */
function updateHUD() {
  const u = usedColors();
  const c = totalConflicts();
  elUsed.textContent = u || '–';
  elConf.textContent = c;
  const confChip = elConf.closest('.hud-chip');
  const usedChip = elUsed.closest('.hud-chip');
  if (confChip) {
    confChip.classList.toggle('warn', c > 0);
    confChip.classList.toggle('success', c === 0 && u > 0);
  }
  if (usedChip && current) {
    usedChip.classList.toggle('warn', u > current.goal);
    usedChip.classList.toggle('success', u > 0 && u <= current.goal);
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
function pushUndo(nodeIdx, prevColor) {
  undoStack.push({ idx: nodeIdx, color: prevColor });
}
function undoLast() {
  if (!undoStack.length || !current) return;
  const { idx, color } = undoStack.pop();
  current.nodes[idx].color = color;
  hintNode = -1;
  selectedIdx = null;
  hideFeedback();
  renderBoard();
  checkWin();
}

/* ===========================
 * 12) ALGORITHMS
 * =========================== */

// --- DSATUR (used internally as the seed for Simulated Annealing) ---
function algoDsatur() {
  const n = current.nodes.length;
  const colors = new Array(n).fill(-1);
  const usedNbs = Array.from({ length: n }, () => new Set());

  for (let step = 0; step < n; step++) {
    let pick = -1, bestSat = -1, bestDeg = -1;
    for (let i = 0; i < n; i++) {
      if (colors[i] !== -1) continue;
      const s = usedNbs[i].size;
      const d = degree(current.nodes[i].id);
      if (s > bestSat || (s === bestSat && d > bestDeg)) {
        bestSat = s; bestDeg = d; pick = i;
      }
    }
    if (pick === -1) break;
    let c = 0;
    while (usedNbs[pick].has(c)) c++;
    colors[pick] = c;
    neighbors(current.nodes[pick].id).forEach(nid => {
      const nIdx = idToIndex.get(nid);
      if (nIdx !== undefined && colors[nIdx] === -1) usedNbs[nIdx].add(c);
    });
  }
  return { colors, numColors: new Set(colors.filter(c => c >= 0)).size };
}

// --- Simulated Annealing ---
function algoSA_stepper() {
  // Start from DSATUR as seed
  const seed = algoDsatur();
  const n = current.nodes.length;
  let colors = [...seed.colors];
  let bestColors = [...colors];
  let bestNum = seed.numColors;
  let bestConflicts = 0;

  // Try to reduce colors: remap highest color to lower ones
  function remapColors(cols) {
    const mapped = [...cols];
    const numC = new Set(mapped).size;
    for (let target = numC - 1; target >= 1; target--) {
      const indices = [];
      for (let i = 0; i < n; i++) if (mapped[i] === target) indices.push(i);
      if (indices.length === 0) continue;
      for (const idx of indices) {
        const id = current.nodes[idx].id;
        let assigned = false;
        for (let c = 0; c < target; c++) {
          const canUse = neighbors(id).every(nid => {
            const nIdx = idToIndex.get(nid);
            return nIdx === undefined || mapped[nIdx] !== c;
          });
          if (canUse) { mapped[idx] = c; assigned = true; break; }
        }
        if (!assigned) break;
      }
    }
    return mapped;
  }

  function normalize(cols) {
    const map = new Map();
    let next = 0;
    return cols.map(c => {
      if (!map.has(c)) map.set(c, next++);
      return map.get(c);
    });
  }

  function countConflicts(cols) {
    let c = 0;
    current.edges.forEach(([a, b]) => {
      const ia = idToIndex.get(a), ib = idToIndex.get(b);
      if (ia !== undefined && ib !== undefined && cols[ia] === cols[ib]) c++;
    });
    return c;
  }

  function fitness(cols) {
    return countConflicts(cols) * 100 + new Set(cols).size;
  }

  colors = normalize(remapColors(colors));
  let currentFit = fitness(colors);
  bestColors = [...colors];
  bestNum = new Set(colors).size;
  bestConflicts = countConflicts(colors);

  let temp = 3.0;
  const cooling = 0.993;
  const minTemp = 0.005;
  let iter = 0;
  const maxIter = 800;

  return {
    step() {
      if (iter >= maxIter || temp < minTemp) return { done: true, colors: bestColors, numColors: bestNum, iter, temp };
      iter++;

      const trial = [...colors];
      const nodeIdx = Math.floor(Math.random() * n);

      if (Math.random() < 0.3) {
        const maxC = Math.max(2, bestNum - 1);
        trial[nodeIdx] = Math.floor(Math.random() * maxC);
      } else {
        const maxC = Math.max(2, bestNum);
        const newC = Math.floor(Math.random() * maxC);
        trial[nodeIdx] = newC;
      }

      const trialFit = fitness(trial);
      const delta = trialFit - currentFit;

      if (delta < 0 || Math.random() < Math.exp(-delta / temp)) {
        colors = trial;
        currentFit = trialFit;

        const c = countConflicts(colors);
        const numC = new Set(colors).size;
        if (c === 0 && numC < bestNum) {
          bestColors = normalize([...colors]);
          bestNum = numC;
          bestConflicts = 0;
        } else if (c < bestConflicts || (c === bestConflicts && numC < bestNum)) {
          bestColors = normalize([...colors]);
          bestNum = numC;
          bestConflicts = c;
        }
      }

      temp *= cooling;
      return { done: false, colors: bestColors, currentColors: [...colors], numColors: bestNum, iter, temp, progress: iter / maxIter };
    }
  };
}

/* ===========================
 * 13) LOCAL SEARCH (greedy — only ever accepts improving moves,
 *     so unlike Simulated Annealing it can get stuck and stop early)
 * =========================== */
function algoLocalSearch_stepper() {
  const seed = algoDsatur();
  const n = current.nodes.length;

  function countConflicts(cols) {
    let c = 0;
    current.edges.forEach(([a, b]) => {
      const ia = idToIndex.get(a), ib = idToIndex.get(b);
      if (ia !== undefined && ib !== undefined && cols[ia] === cols[ib]) c++;
    });
    return c;
  }
  function normalize(cols) {
    const map = new Map();
    let next = 0;
    return cols.map(c => { if (!map.has(c)) map.set(c, next++); return map.get(c); });
  }
  function fitness(cols) { return countConflicts(cols) * 100 + new Set(cols).size; }

  let colors = normalize([...seed.colors]);
  let currentFit = fitness(colors);
  let bestColors = [...colors];
  let bestNum = new Set(colors).size;

  let iter = 0;
  const maxIter = 400;
  let stuck = 0;
  const maxStuck = 60; // stop once it can't find any further improving move for a while

  return {
    step() {
      if (iter >= maxIter || stuck >= maxStuck) {
        return { done: true, colors: bestColors, numColors: bestNum, iter, stuck: stuck >= maxStuck };
      }
      iter++;

      const trial = [...colors];
      const nodeIdx = Math.floor(Math.random() * n);
      const maxC = Math.max(2, bestNum - (Math.random() < 0.3 ? 1 : 0));
      trial[nodeIdx] = Math.floor(Math.random() * maxC);

      const trialFit = fitness(trial);
      if (trialFit <= currentFit) { // greedy: never accepts a worse move (that's the whole difference vs SA)
        colors = trial;
        currentFit = trialFit;
        const c = countConflicts(colors);
        const numC = new Set(colors).size;
        if (c === 0 && numC < bestNum) {
          bestColors = normalize([...colors]);
          bestNum = numC;
          stuck = 0;
        } else {
          stuck++;
        }
      } else {
        stuck++;
      }

      return { done: false, colors: bestColors, currentColors: [...colors], numColors: bestNum, iter, stuck, progress: iter / maxIter };
    }
  };
}

/* ===========================
 * 14) ANIMATED BRANCH & BOUND (exact — searches for the true optimum,
 *     pruning any branch that can no longer beat the best found so far)
 * =========================== */
async function runBranchBoundAnimated() {
  resetColors();
  const n = current.nodes.length;
  const orderIds = [...current.nodes]
    .sort((a, b) => degree(b.id) - degree(a.id))
    .map(v => v.id);

  // Upper bound from a quick heuristic — always a safe fallback if the
  // exhaustive search below has to stop early on a harder level.
  const dsaturResult = algoDsatur();
  let bestK = dsaturResult.numColors;
  let bestColoring = [...dsaturResult.colors];

  let steps = 0;
  const maxSteps = 140; // keeps the live animation bounded even when a full proof of optimality would take much longer

  async function bt(idx, usedCount) {
    if (steps >= maxSteps) return;
    if (idx === n) {
      bestK = usedCount;
      bestColoring = current.nodes.map(v => v.color);
      renderBoard();
      await delay(300);
      return;
    }
    const id = orderIds[idx];
    const i = idToIndex.get(id);
    for (let c = 0; c < bestK - 1; c++) {
      if (steps >= maxSteps) return;
      if (!colorable(id, c)) continue;
      const newUsed = Math.max(usedCount, c + 1);
      if (newUsed >= bestK) continue; // bound: this branch can't beat the best found so far — skip without animating it

      steps++;
      current.nodes[i].color = c;
      hintNode = id;
      renderBoard();
      await delay(300);
      await bt(idx + 1, newUsed);
      current.nodes[i].color = -1;
      hintNode = id;
      renderBoard();
      await delay(180);
    }
  }
  await bt(0, 0);

  current.nodes.forEach((v, i) => v.color = bestColoring[i]);
  hintNode = -1;
  renderBoard();
}

/* ===========================
 * 14) ANIMATION ENGINE (Simulated Annealing stepper loop)
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

  if (key === 'bnb' && current.nodes.length > 15) {
    showAlgoInfo(key, `<div style="color:var(--coral);margin-top:6px;">${tr('disabled_backtrack')}</div>`);
    return;
  }

  // Every click replays the animation from scratch (SA/Local Search are
  // stochastic, so a fresh run can even land on a different result).
  // The result it finds stays pinned on the board — Reset if you want
  // your own attempt back.
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
        algoResults[key] = { colors: current.nodes.map(v => v.color), numColors: usedColors() };
        visibility[key] = true;
        refreshButtonStates();
        renderBoard();
        announceAlgoResult(key, algoResults[key].numColors);
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
          const displayColors = s.currentColors || s.colors;
          displayColors.forEach((c, i) => { current.nodes[i].color = c; });
          renderBoard();
          showAlgoInfo(key, `<small>Iter: <b>${s.iter}</b> · Bloccata da: <b>${s.stuck}</b> · Best: <b>${s.numColors}</b> ${tr('unit_slots')}</small>`);
        },
        onEnd: (s) => {
          if (s) {
            algoResults[key] = { colors: [...s.colors], numColors: s.numColors };
            current.nodes.forEach((v, i) => v.color = s.colors[i]);
            renderBoard();
            announceAlgoResult(key, s.numColors);
          } else {
            renderBoard();
          }
          finish();
        }
      });
      break;
    }
    case 'sa': {
      const stepper = algoSA_stepper();
      visibility[key] = true;
      refreshButtonStates();
      animateLoop({
        stepFn: stepper.step,
        delayMs: 25,
        onFrame: (s) => {
          const displayColors = s.currentColors || s.colors;
          displayColors.forEach((c, i) => { current.nodes[i].color = c; });
          renderBoard();
          const tempStr = s.temp !== undefined ? s.temp.toFixed(3) : '';
          showAlgoInfo(key, `<small>Iter: <b>${s.iter}</b> · T: <b>${tempStr}</b> · Best: <b>${s.numColors}</b> ${tr('unit_slots')}</small>`);
        },
        onEnd: (s) => {
          if (s) {
            algoResults[key] = { colors: [...s.colors], numColors: s.numColors };
            current.nodes.forEach((v, i) => v.color = s.colors[i]);
            renderBoard();
            announceAlgoResult(key, s.numColors);
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

function announceAlgoResult(key, numColors) {
  const optimal = numColors <= current.goal;
  const badge = optimal
    ? `<div class="optimal-badge optimal-yes">🏆 ${tr('feedback_optimal')}</div>`
    : `<div class="optimal-badge optimal-no">${tr('feedback_not_optimal').replace('{goal}', current.goal)}</div>`;
  showAlgoInfo(key, `<div class="detail">${tr('feedback_colors_tpl').replace('{N}', numColors)}</div>${badge}`);
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
  const N = current.nodes.length;
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
  const allColored = current.nodes.every(v => v.color >= 0);
  const conflicts = totalConflicts();
  if (allColored && conflicts === 0) {
    showFeedbackToast();
  }
}

function showFeedbackToast() {
  if (!elFeedback || !current) return;
  stopTimer();
  const u = usedColors();
  const goalMet = u <= current.goal;

  let html = `<div class="score">${tr('feedback_win')}</div>`;
  html += `<div class="detail">${tr('feedback_colors_tpl').replace('{N}', u)}</div>`;

  // current.goal is the verified true optimum for this level (not just a
  // target), so we can always say whether it was actually reached.
  if (u <= current.goal) {
    html += `<div class="optimal-badge optimal-yes">🏆 ${tr('feedback_optimal')}</div>`;
  } else {
    html += `<div class="optimal-badge optimal-no">${tr('feedback_not_optimal').replace('{goal}', current.goal)}</div>`;
  }

  const computed = ALGO_KEYS.filter(k => algoResults[k]);
  if (computed.length) {
    html += '<div class="comparisons">';
    computed.forEach(k => {
      const algoN = algoResults[k].numColors;
      const label = ALGO_STYLES[k].label;
      if (u < algoN) {
        html += `<div style="color:var(--teal);">✓ ${tr('feedback_beat').replace('{algo}', label)}</div>`;
      } else if (u === algoN) {
        html += `<div style="color:var(--yellow);">≈ ${tr('feedback_tie').replace('{algo}', label)}</div>`;
      } else {
        html += `<div style="color:var(--coral);">✗ ${tr('feedback_lost').replace('{algo}', label).replace('{n}', algoN)}</div>`;
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
  resetColors();
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
function hintDsaturNode() {
  if (!current) return;
  let pick = -1, best = -1, bestDeg = -1;
  for (const v of current.nodes) {
    if (v.color !== -1) continue;
    const s = new Set(
      neighbors(v.id).map(j => {
        const idx = idToIndex.get(j);
        return idx !== undefined ? current.nodes[idx].color : -1;
      }).filter(c => c >= 0)
    ).size;
    const d = degree(v.id);
    if (s > best || (s === best && d > bestDeg)) { best = s; bestDeg = d; pick = v.id; }
  }
  hintNode = pick;
  renderBoard();
}

/* ===========================
 * 20) EVENTS
 * =========================== */
function wireEvents() {
  elLevel.addEventListener('change', () => loadLevel(elLevel.value));

  document.getElementById('btnReset').addEventListener('click', () => {
    resetColors();
    resetAlgoState();
    startTimer(current.timeLimitSec);
  });

  document.getElementById('btnUndo').addEventListener('click', undoLast);

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

  document.getElementById('btnHint')?.addEventListener('click', hintDsaturNode);
}

/* ===========================
 * 21) UTILITY
 * =========================== */
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
