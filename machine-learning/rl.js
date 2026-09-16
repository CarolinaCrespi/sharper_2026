/* =========================================================
   Reinforcement mode — Q-Learning robot on a grid

   The mission: train the robot until it reaches the treasure on its
   own. Every run costs one attempt out of a budget; the exam is a run
   with no curiosity and no learning. Pass it → you win, with stars
   for how few attempts you used.
========================================================= */
(function () {
  const COLS = 8, ROWS = 5;
  const START = [0, 2], GOAL = [7, 0];
  const DEFAULT_HOLES = [[3, 1], [3, 2], [3, 3], [5, 3], [5, 4], [6, 1]];
  const MOVES = [[0, -1], [1, 0], [0, 1], [-1, 0]];   // up, right, down, left
  const ALPHA = 0.5, GAMMA = 0.9, MAX_STEPS = 50;
  const R_STEP = -1, R_GOAL = 10, R_HOLE = -10;

  // tuned by simulating the default map: a first exam pass takes
  // ~30 attempts on a good day, ~45 on an average one
  const BASE_DIST = 9, BASE_BUDGET = 80, BASE_STAR3 = 30, BASE_STAR2 = 45;
  const TRAIN_BLOCK = 10;

  const R = {
    Q: new Float32Array(COLS * ROWS * 4),
    holes: new Set(DEFAULT_HOLES.map(([x, y]) => y * COLS + x)),
    eps: 0.2,
    arrows: true,
    used: 0,              // attempts spent (training + exams)
    exams: 0,
    lastExam: '–',
    state: 'ready',       // ready → playing → won | lost
    result: null,         // { used, steps, stars } when won
    history: [],          // total reward per training attempt
    robot: { x: START[0], y: START[1] },
    trail: [],
    examRun: false,       // the animation on screen is an exam
    animating: false
  };

  const idx = (x, y) => y * COLS + x;
  const isGoal = (x, y) => x === GOAL[0] && y === GOAL[1];
  const isStart = (x, y) => x === START[0] && y === START[1];
  const qAt = (x, y, a) => R.Q[idx(x, y) * 4 + a];

  /* ---------- map: shortest route, and the limits it implies ---------- */
  function shortest(holes = R.holes) {
    const dist = new Int16Array(COLS * ROWS).fill(-1);
    const queue = [START];
    dist[idx(...START)] = 0;
    while (queue.length) {
      const [x, y] = queue.shift();
      if (isGoal(x, y)) return dist[idx(x, y)];
      for (const [dx, dy] of MOVES) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
        const k = idx(nx, ny);
        if (dist[k] >= 0 || holes.has(k)) continue;
        dist[k] = dist[idx(x, y)] + 1;
        queue.push([nx, ny]);
      }
    }
    return -1;
  }
  // a longer route needs more training: scale budget and stars with it
  function limits() {
    const s = Math.max(1, shortest() / BASE_DIST);
    return {
      budget: Math.round(BASE_BUDGET * s / 5) * 5,
      s3: Math.round(BASE_STAR3 * s),
      s2: Math.round(BASE_STAR2 * s)
    };
  }
  const left = () => limits().budget - R.used;

  /* ---------- Q-learning ---------- */
  function bestAction(x, y) {
    let best = [], bv = -Infinity;
    for (let a = 0; a < 4; a++) {
      const v = qAt(x, y, a);
      if (v > bv + 1e-6) { bv = v; best = [a]; } else if (Math.abs(v - bv) <= 1e-6) best.push(a);
    }
    return best[Math.floor(Math.random() * best.length)];
  }
  const visited = (x, y) => { for (let a = 0; a < 4; a++) if (qAt(x, y, a) !== 0) return true; return false; };
  const maxQ = (x, y) => Math.max(qAt(x, y, 0), qAt(x, y, 1), qAt(x, y, 2), qAt(x, y, 3));

  /* one full run. Training: explore + learn. Exam: best moves only, no learning */
  function runEpisode(exam = false) {
    let x = START[0], y = START[1], total = 0, steps = 0, result = 'timeout';
    const path = [[x, y]];
    while (steps < MAX_STEPS) {
      const a = !exam && Math.random() < R.eps ? Math.floor(Math.random() * 4) : bestAction(x, y);
      let nx = x + MOVES[a][0], ny = y + MOVES[a][1];
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) { nx = x; ny = y; }   // bumped the wall
      let r = R_STEP, done = false;
      if (isGoal(nx, ny)) { r = R_GOAL; done = true; result = 'goal'; }
      else if (R.holes.has(idx(nx, ny))) { r = R_HOLE; done = true; result = 'hole'; }
      if (!exam) {
        const target = done ? r : r + GAMMA * maxQ(nx, ny);
        const k = idx(x, y) * 4 + a;
        R.Q[k] += ALPHA * (target - R.Q[k]);
      }
      total += r; steps++;
      x = nx; y = ny;
      path.push([x, y]);
      if (done) break;
    }
    R.used++;
    if (R.state === 'ready') R.state = 'playing';
    if (!exam) {
      R.history.push(total);
      if (R.history.length > 120) R.history.shift();
    }
    return { path, total, steps, result };
  }

  /* ---------- mission flow ---------- */
  const starsFor = used => { const L = limits(); return used <= L.s3 ? 3 : used <= L.s2 ? 2 : 1; };
  const starsHtml = n => [1, 2, 3].map(i => i <= n ? '⭐' : '<span class="off">⭐</span>').join('');

  function afterTraining(ep) {
    if (left() <= 0) { lose(); return; }
    const key = ep.result === 'goal' ? 'cap_rl_goal' : ep.result === 'hole' ? 'cap_rl_hole' : 'cap_rl_timeout';
    caption(key, { steps: ep.steps, r: ep.total, left: left });
  }

  function afterExam(ep) {
    R.exams++;
    if (ep.result === 'goal') { win(ep); return; }
    R.lastExam = '✗';
    if (left() <= 0) { lose(); return; }
    caption('cap_rl_exam_fail', {
      why: () => t(ep.result === 'hole' ? 'exam_why_hole' : 'exam_why_timeout'),
      left: left
    });
    toast(`<div class="score">🎓 ✗</div><div class="challenge">${t('toast_rl_fail')}</div>`, 2400);
  }

  function win(ep) {
    R.state = 'won';
    R.lastExam = '✓';
    R.result = { used: R.used, steps: ep.steps, stars: starsFor(R.used) };
    showEnd();
  }
  function lose() {
    R.state = 'lost';
    showEnd();
  }
  // caption + card for a finished mission (also when coming back to the mode)
  function showEnd() {
    const L = limits();
    updateButtons();
    if (R.state === 'won') {
      const res = R.result;
      caption('cap_rl_won', { steps: res.steps, used: res.used, budget: L.budget, stars: starsHtml(res.stars) });
      toast(`<button class="close-toast" type="button" data-act="close" aria-label="×">✕</button>
        <div class="score">🏆 ${t('toast_rl_won')}</div>
        <div class="stars">${starsHtml(res.stars)}</div>
        <div class="challenge">${t('toast_rl_used', { used: res.used, budget: L.budget })}</div>
        <div class="rules">⭐⭐⭐ ≤ ${L.s3} · ⭐⭐ ≤ ${L.s2}</div>
        <button type="button" data-act="rl-new">${t('btn_reset_brain')}</button>`, 0);
    } else {
      caption('cap_rl_lost');
      toast(`<button class="close-toast" type="button" data-act="close" aria-label="×">✕</button>
        <div class="score">⌛ ${t('toast_rl_lost')}</div>
        <div class="challenge">${t('toast_rl_lost_sub')}</div>
        <button type="button" data-act="rl-new">${t('btn_reset_brain')}</button>`, 0);
    }
    renderHUD();
  }

  function newGame() {
    R.Q.fill(0);
    R.used = 0; R.exams = 0; R.lastExam = '–';
    R.state = 'ready'; R.result = null; R.history = [];
    R.robot = { x: START[0], y: START[1] }; R.trail = []; R.examRun = false;
    hideToast();
    caption('cap_rl_start', { budget: () => limits().budget });
    updateButtons(); renderHUD(); requestDraw();
  }

  /* ---------- controls ---------- */
  function updateButtons() {
    const over = R.state === 'won' || R.state === 'lost';
    ['#rlOne', '#rlMany', '#rlExam'].forEach(s => { $(s).disabled = R.animating || over; });
    $('#rlReset').disabled = R.animating;
  }
  function setBusy(b) { R.animating = b; updateButtons(); }

  // replay a run on the board, then call done()
  function animate(ep, exam, done) {
    setBusy(true);
    R.examRun = exam;
    R.trail = [];
    // long wandering runs play faster: at most ~5 s on screen
    const t0 = performance.now(), perStep = Math.min(exam ? 170 : 140, 5000 / ep.path.length);
    (function play(now) {
      // a frame timestamp can be slightly older than t0
      const f = Math.max(0, (now - t0) / perStep);
      const i = Math.min(ep.path.length - 1, Math.floor(f));
      const a = ep.path[i], b = ep.path[Math.min(ep.path.length - 1, i + 1)];
      const u = Math.min(1, f - i);
      R.robot = { x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u };
      R.trail = ep.path.slice(0, i + 1);
      requestDraw();
      if (i < ep.path.length - 1) { requestAnimationFrame(play); return; }
      setBusy(false);
      done();
      renderHUD(); requestDraw();
    })(t0);
  }

  $('#rlOne').addEventListener('click', () => {
    if (R.animating || left() <= 0) return;
    const ep = runEpisode(false);
    renderHUD();
    animate(ep, false, () => afterTraining(ep));
  });

  $('#rlMany').addEventListener('click', () => {
    if (R.animating || left() <= 0) return;
    const n = Math.min(TRAIN_BLOCK, left());
    for (let i = 0; i < n; i++) runEpisode(false);
    R.robot = { x: START[0], y: START[1] };
    R.trail = []; R.examRun = false;
    if (left() <= 0) lose();
    else caption('cap_rl_trained', { n, left: left });
    renderHUD(); requestDraw();
  });

  $('#rlExam').addEventListener('click', () => {
    if (R.animating || left() <= 0) return;
    hideToast();
    const ep = runEpisode(true);
    caption('cap_rl_exam_run');
    renderHUD();
    animate(ep, true, () => afterExam(ep));
  });

  $('#rlEps').addEventListener('input', e => {
    R.eps = Number(e.target.value);
    $('#rlEpsVal').textContent = R.eps.toFixed(2);
  });
  $('#rlArrows').addEventListener('change', e => { R.arrows = e.target.checked; requestDraw(); });
  $('#rlReset').addEventListener('click', newGame);

  /* ---------- geometry ---------- */
  const CHART_H = 70;
  function layout() {
    const cell = Math.floor(Math.min((W - 32) / COLS, (H - CHART_H - 40) / ROWS));
    const gw = cell * COLS, gh = cell * ROWS;
    return { cell, x0: Math.floor((W - gw) / 2), y0: 14, gw, gh };
  }

  /* ---------- the mode object ---------- */
  registerMode({
    id: 'rl',
    enter() {
      updateButtons();
      if (R.state === 'won' || R.state === 'lost') showEnd();
      else if (R.state === 'ready') caption('cap_rl_start', { budget: () => limits().budget });
      else caption('cap_rl_resume', { left: left });
    },
    act(action) { if (action === 'rl-new') newGame(); },
    helpVars() { const L = limits(); return { budget: L.budget, s3: L.s3, s2: L.s2 }; },

    // holes can be moved before the first attempt, or to set up a new game
    click(px, py) {
      if (R.animating) return;
      const L = layout();
      const x = Math.floor((px - L.x0) / L.cell), y = Math.floor((py - L.y0) / L.cell);
      if (x < 0 || y < 0 || x >= COLS || y >= ROWS || isGoal(x, y) || isStart(x, y)) return;
      if (R.state === 'playing') { caption('cap_rl_locked'); return; }
      const k = idx(x, y);
      const next = new Set(R.holes);
      if (next.has(k)) next.delete(k); else next.add(k);
      if (shortest(next) < 0) { caption('cap_rl_blocked'); return; }
      R.holes = next;
      if (R.state !== 'ready') newGame();
      renderPanels();
      caption('cap_rl_edit', { d: shortest(), budget: limits().budget });
      renderHUD(); requestDraw();
    },

    hud() {
      const L = limits();
      const l = L.budget - R.used;
      return [
        [t('hud_left'), `${l}/${L.budget}`, R.state === 'playing' && l <= 10 ? 'warn' : ''],
        [t('hud_exams'), R.exams ? `${R.exams} · ${R.lastExam}` : '–', R.state === 'won' ? 'success' : ''],
        [t('hud_last'), R.history.length ? R.history[R.history.length - 1] : '–']
      ];
    },

    draw(P) {
      const L = layout();
      const { cell, x0, y0 } = L;

      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        const cx = x0 + x * cell, cy = y0 + y * cell;
        // base tile
        ctx.fillStyle = (x + y) % 2 ? P.panel2 : P.panel;
        ctx.fillRect(cx, cy, cell, cell);
        // what the robot believes about this cell
        if (visited(x, y) && !R.holes.has(idx(x, y)) && !isGoal(x, y)) {
          const v = Math.max(-1, Math.min(1, maxQ(x, y) / 10));
          ctx.save();
          ctx.globalAlpha = Math.abs(v) * (isLight() ? 0.45 : 0.4);
          ctx.fillStyle = v >= 0 ? P.teal : P.coral;
          ctx.fillRect(cx, cy, cell, cell);
          ctx.restore();
        }
        ctx.strokeStyle = P.border; ctx.lineWidth = 1;
        ctx.strokeRect(cx + 0.5, cy + 0.5, cell - 1, cell - 1);

        const mx = cx + cell / 2, my = cy + cell / 2;
        if (R.holes.has(idx(x, y))) drawEmoji('🕳️', mx, my, cell * 0.55);
        else if (isGoal(x, y)) drawEmoji('💎', mx, my, cell * 0.55);
        else if (R.arrows && visited(x, y)) drawArrow(mx, my, bestActionStable(x, y), cell * 0.28, P);
        if (isStart(x, y)) drawEmoji('🏁', cx + cell * 0.2, cy + cell * 0.2, cell * 0.22);
      }

      // trail of the current run: dashed yellow in training, solid teal at the exam
      if (R.trail.length > 1) {
        ctx.save();
        ctx.strokeStyle = R.examRun ? P.teal : P.yellow;
        ctx.lineWidth = R.examRun ? 4 : 3; ctx.globalAlpha = 0.75;
        if (!R.examRun) ctx.setLineDash([6, 5]);
        ctx.beginPath();
        R.trail.forEach(([x, y], i) => {
          const px = x0 + (x + 0.5) * cell, py = y0 + (y + 0.5) * cell;
          if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
        });
        ctx.stroke();
        ctx.restore();
      }

      // robot
      const rx = x0 + (R.robot.x + 0.5) * cell, ry = y0 + (R.robot.y + 0.5) * cell;
      ctx.save();
      ctx.shadowColor = R.examRun ? P.teal : P.yellow; ctx.shadowBlur = 14;
      drawEmoji('🤖', rx, ry, cell * 0.6);
      ctx.restore();
      if (R.examRun && R.animating) drawEmoji('🎓', rx + cell * 0.28, ry - cell * 0.3, cell * 0.3);

      drawChart(P, L);
    }
  });

  // arrows must not flicker between tied actions on every frame
  function bestActionStable(x, y) {
    let best = 0;
    for (let a = 1; a < 4; a++) if (qAt(x, y, a) > qAt(x, y, best)) best = a;
    return best;
  }

  function drawArrow(x, y, a, len, P) {
    const [dx, dy] = MOVES[a];
    ctx.save();
    ctx.strokeStyle = P.ink; ctx.fillStyle = P.ink;
    ctx.globalAlpha = 0.8; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - dx * len, y - dy * len);
    ctx.lineTo(x + dx * len, y + dy * len);
    ctx.stroke();
    const hx = x + dx * len, hy = y + dy * len, s = len * 0.55;
    ctx.beginPath();
    ctx.moveTo(hx + dx * 2, hy + dy * 2);
    ctx.lineTo(hx - dx * s - dy * s, hy - dy * s + dx * s);
    ctx.lineTo(hx - dx * s + dy * s, hy - dy * s - dx * s);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // reward per attempt: rises as the robot learns
  function drawChart(P, L) {
    const x0 = L.x0, x1 = L.x0 + L.gw, top = L.y0 + L.gh + 22, bot = top + CHART_H - 18;
    ctx.save();
    ctx.fillStyle = P.muted; ctx.font = "600 11px 'DM Sans', system-ui";
    ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    ctx.fillText(t('chart_title'), x0, top - 4);
    ctx.strokeStyle = P.border; ctx.lineWidth = 1;
    ctx.strokeRect(x0 + 0.5, top + 0.5, x1 - x0 - 1, bot - top);
    const h = R.history;
    if (h.length > 1) {
      const lo = Math.min(-20, ...h), hi = Math.max(10, ...h);
      const yOf = v => bot - (v - lo) / (hi - lo) * (bot - top);
      // zero line
      ctx.setLineDash([3, 4]); ctx.strokeStyle = P.muted;
      ctx.beginPath(); ctx.moveTo(x0, yOf(0)); ctx.lineTo(x1, yOf(0)); ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = P.teal; ctx.lineWidth = 2;
      ctx.beginPath();
      h.forEach((v, i) => {
        const px = x0 + (i / (h.length - 1)) * (x1 - x0);
        if (i) ctx.lineTo(px, yOf(v)); else ctx.moveTo(px, yOf(v));
      });
      ctx.stroke();
    }
    ctx.restore();
  }
})();
