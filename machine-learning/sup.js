/* =========================================================
   Supervised mode — k-Nearest Neighbors on labelled fruits
========================================================= */
(function () {
  const S = {
    examples: [],
    tool: 0,           // 0/1/2 = add that fruit, 'test' = ask the machine
    k: 3,
    zones: false,
    zoneCache: null,   // { key, cells: Int8Array, cols, rows }
    test: null,        // { x, y, pred, votes, nbrs }
    quiz: null,        // { x, y, truth, awaiting, you, machine }
    score: { rounds: 0, you: 0, machine: 0 }
  };

  // the machine starts knowing only apples, lemons and watermelons
  function resetData() {
    S.examples = makeFruits(5, 7, 3);
    S.test = null; S.quiz = null; S.zoneCache = null;
    S.score = { rounds: 0, you: 0, machine: 0 };
    markKnown();
  }

  const knows = c => S.examples.some(e => e.c === c);
  const knownCount = () => FRUIT_EMOJI.filter((_, c) => knows(c)).length;
  // dashed border on the fruits the machine has never seen
  function markKnown() {
    $$('.tool-btn.fruit').forEach(b => b.classList.toggle('unknown', !knows(Number(b.dataset.tool))));
  }
  resetData();

  /* ---------- k-NN ---------- */
  function knn(p) {
    if (!S.examples.length) return null;
    const sorted = S.examples
      .map(e => ({ e, d: Math.hypot(e.x - p.x, e.y - p.y) }))
      .sort((a, b) => a.d - b.d);
    const k = Math.min(S.k, sorted.length);
    const nbrs = sorted.slice(0, k);
    const votes = new Array(N_FRUITS).fill(0);
    nbrs.forEach(n => votes[n.e.c]++);
    const best = Math.max(...votes);
    // tie → the class of the nearest neighbour among the tied ones
    const pred = nbrs.find(n => votes[n.e.c] === best).e.c;
    return { pred, votes: best, k, nbrs: nbrs.map(n => n.e) };
  }

  function zones() {
    const cols = 64, rows = 40;
    const key = `${S.examples.length}|${S.k}|${S.examples.map(e => e.x.toFixed(3)).join(',').length}`;
    if (S.zoneCache && S.zoneCache.key === key) return S.zoneCache;
    const cells = new Int8Array(cols * rows);
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const r = knn({ x: (i + 0.5) / cols, y: 1 - (j + 0.5) / rows });
      cells[j * cols + i] = r ? r.pred : -1;
    }
    S.zoneCache = { key, cells, cols, rows };
    return S.zoneCache;
  }
  const invalidate = () => { S.zoneCache = null; };

  /* ---------- controls ---------- */
  function setTool(tool) {
    // during a quiz the fruit buttons are the player's guess
    if (S.quiz && S.quiz.awaiting && tool !== 'test') { answerQuiz(Number(tool)); return; }
    S.tool = tool === 'test' ? 'test' : Number(tool);
    $$('.tool-btn').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tool) === String(S.tool)));
  }
  $$('.tool-btn').forEach(b => b.addEventListener('click', () => setTool(b.dataset.tool)));

  $('#supK').addEventListener('input', e => {
    S.k = Number(e.target.value);
    $('#supKVal').textContent = S.k;
    invalidate();
    if (S.test) Object.assign(S.test, knn(S.test));
    requestDraw();
  });
  $('#supZones').addEventListener('change', e => { S.zones = e.target.checked; requestDraw(); });
  $('#supReset').addEventListener('click', () => {
    resetData();
    caption('cap_sup_start');
    renderHUD(); requestDraw();
  });
  $('#supQuiz').addEventListener('click', startQuiz);

  /* ---------- quiz: guess before the machine ---------- */
  function startQuiz() {
    // any of the six fruits: also the ones the machine was never taught
    const truth = Math.floor(Math.random() * N_FRUITS);
    const p = sampleFruit(truth);
    S.test = null;
    S.quiz = { x: p.x, y: p.y, truth, awaiting: true };
    caption('cap_quiz_ask');
    hideToast();
    requestDraw();
  }
  function answerQuiz(guess) {
    const q = S.quiz;
    const wasKnown = knows(q.truth);
    const r = knn(q);
    q.awaiting = false;
    q.you = guess;
    q.machine = r ? r.pred : -1;
    q.nbrs = r ? r.nbrs : [];
    S.score.rounds++;
    if (guess === q.truth) S.score.you++;
    if (q.machine === q.truth) S.score.machine++;
    // the revealed fruit becomes one more labelled example
    S.examples.push({ x: q.x, y: q.y, c: q.truth });
    invalidate(); markKnown();
    const ok = v => v === q.truth ? '✓' : '✗';
    const label = c => c < 0 ? '—' : FRUIT_EMOJI[c];
    caption('cap_quiz_res', {
      truth: () => `${FRUIT_EMOJI[q.truth]} ${fruitName(q.truth)}`,
      you: label(guess), youOk: ok(guess),
      machine: label(q.machine), machineOk: ok(q.machine),
      extra: () => wasKnown ? t('quiz_added') : t('quiz_unknown', { emoji: FRUIT_EMOJI[q.truth] })
    });
    toast(`<div class="score">${FRUIT_EMOJI[q.truth]}</div>
      <div class="challenge">${t('hud_you')}: ${label(guess)} ${ok(guess)} &nbsp; · &nbsp; ${t('hud_machine')}: ${label(q.machine)} ${ok(q.machine)}</div>`);
    renderHUD(); requestDraw();
  }

  /* ---------- the mode object ---------- */
  registerMode({
    id: 'sup',
    enter() {
      setTool(S.tool);
      caption(S.examples.length ? 'cap_sup_start' : 'cap_sup_empty');
    },
    leave() { if (S.quiz && S.quiz.awaiting) S.quiz = null; },

    click(px, py) {
      const p = fromPx(px, py);
      if (!insidePlot(p)) return;
      if (S.quiz && S.quiz.awaiting) return;   // answer with the buttons
      S.quiz = null;
      if (S.tool === 'test') {
        const r = knn(p);
        if (!r) { S.test = null; caption('cap_sup_empty'); requestDraw(); return; }
        S.test = { x: p.x, y: p.y, ...r };
        caption('cap_sup_pred', {
          k: r.k, votes: r.votes, emoji: FRUIT_EMOJI[r.pred], fruit: () => fruitName(r.pred)
        });
      } else {
        const c = S.tool;
        const isNew = !knows(c);
        S.examples.push({ x: p.x, y: p.y, c });
        invalidate(); markKnown();
        if (S.test) Object.assign(S.test, knn(S.test));
        const fruit = () => `${FRUIT_EMOJI[c]} ${fruitName(c)}`;
        if (isNew) caption('cap_sup_new_class', { fruit, known: knownCount(), total: N_FRUITS });
        else caption('cap_sup_added', { fruit, n: S.examples.length });
      }
      renderHUD(); requestDraw();
    },

    hud() {
      const chips = [[t('hud_examples'), S.examples.length], [t('hud_known'), `${knownCount()}/${N_FRUITS}`, knownCount() === N_FRUITS ? 'success' : '']];
      if (S.score.rounds) {
        chips.push([t('hud_you'), `${S.score.you}/${S.score.rounds}`, S.score.you >= S.score.machine ? 'success' : '']);
        chips.push([t('hud_machine'), `${S.score.machine}/${S.score.rounds}`]);
      }
      return chips;
    },

    draw(P) {
      const r = plotRect();
      drawPlotFrame(P);

      // decision zones
      if (S.zones && S.examples.length) {
        const z = zones();
        const cw = (r.x1 - r.x0) / z.cols, ch = (r.y1 - r.y0) / z.rows;
        ctx.save();
        ctx.globalAlpha = isLight() ? 0.22 : 0.18;
        for (let j = 0; j < z.rows; j++) for (let i = 0; i < z.cols; i++) {
          const c = z.cells[j * z.cols + i];
          if (c < 0) continue;
          ctx.fillStyle = fruitColor(c, P);
          ctx.fillRect(r.x0 + i * cw, r.y0 + j * ch, cw + 0.6, ch + 0.6);
        }
        ctx.restore();
      }

      // neighbour lines (test point or answered quiz)
      const probe = S.test || (S.quiz && !S.quiz.awaiting ? S.quiz : null);
      if (probe && probe.nbrs) {
        const a = toPx(probe);
        ctx.save();
        ctx.setLineDash([5, 4]); ctx.lineWidth = 2;
        probe.nbrs.forEach(n => {
          const b = toPx(n);
          ctx.strokeStyle = fruitColor(n.c, P);
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        });
        ctx.restore();
      }

      // examples
      S.examples.forEach(e => { const q = toPx(e); drawEmoji(FRUIT_EMOJI[e.c], q.x, q.y, 18); });

      // test point
      if (S.test) {
        const q = toPx(S.test);
        ringAt(q, fruitColor(S.test.pred, P), P);
        drawEmoji(FRUIT_EMOJI[S.test.pred], q.x, q.y, 20);
      }

      // quiz point
      if (S.quiz) {
        const q = toPx(S.quiz);
        const col = S.quiz.awaiting ? P.yellow : fruitColor(S.quiz.truth, P);
        ringAt(q, col, P, S.quiz.awaiting);
        drawEmoji(S.quiz.awaiting ? '❓' : FRUIT_EMOJI[S.quiz.truth], q.x, q.y, 20);
        if (S.quiz.awaiting) requestDraw();   // keep the pulse going
      }
    }
  });

  function ringAt(q, color, P, pulse) {
    const rad = 17 + (pulse ? Math.sin(performance.now() / 180) * 3 : 0);
    ctx.save();
    ctx.shadowColor = color; ctx.shadowBlur = 16;
    ctx.fillStyle = P.bg;
    ctx.beginPath(); ctx.arc(q.x, q.y, rad, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 3; ctx.strokeStyle = color; ctx.stroke();
    ctx.restore();
  }
})();
