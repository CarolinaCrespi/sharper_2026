/* =========================================================
   Unsupervised mode — K-Means on the same fruits, no labels
========================================================= */
(function () {
  const CLUSTER_COLORS = ['#A78BFA', '#F97316', '#60A5FA', '#FF4081', '#34D399'];
  const U = {
    points: makeFruits(20, 11),   // each keeps its true class c, hidden by default
    K: 3,
    cents: [],                    // { x, y, fx, fy, tx, ty } (from/to for the glide)
    assign: null,                 // Int8Array, -1 = not assigned yet
    phase: 'place',               // place → assign ⇄ update → done
    iter: 0,
    changes: '–',
    truth: false,
    timer: null,
    anim: 0,                      // glide progress 0..1
    glideId: 0
  };

  function reset() {
    stopRun();
    U.cents = [];
    U.assign = new Int8Array(U.points.length).fill(-1);
    U.phase = 'place';
    U.iter = 0;
    U.changes = '–';
    U.anim = 1;
    U.glideId++;
  }
  reset();

  function addCentroid(x, y) { U.cents.push({ x, y, fx: x, fy: y, tx: x, ty: y }); }

  // missing centres: random distinct fruits (the machine has no better idea)
  function fillCentroids() {
    const used = new Set();
    while (U.cents.length < U.K) {
      const i = Math.floor(Math.random() * U.points.length);
      if (used.has(i)) continue;
      used.add(i);
      addCentroid(U.points[i].x, U.points[i].y);
    }
  }

  function doAssign() {
    let changes = 0;
    U.points.forEach((p, i) => {
      let best = 0, bd = Infinity;
      U.cents.forEach((c, j) => { const d = Math.hypot(p.x - c.x, p.y - c.y); if (d < bd) { bd = d; best = j; } });
      if (U.assign[i] !== best) { changes++; U.assign[i] = best; }
    });
    U.changes = changes;
    return changes;
  }

  function doUpdate() {
    U.cents.forEach((c, j) => {
      let sx = 0, sy = 0, n = 0;
      U.points.forEach((p, i) => { if (U.assign[i] === j) { sx += p.x; sy += p.y; n++; } });
      c.fx = c.x; c.fy = c.y;
      if (n) { c.tx = sx / n; c.ty = sy / n; } else { c.tx = c.x; c.ty = c.y; }
    });
    U.anim = 0;
    const t0 = performance.now(), token = ++U.glideId;
    (function glide(now) {
      if (token !== U.glideId) return;       // snapped by the next step
      U.anim = Math.min(1, (now - t0) / 450);
      const e = 1 - Math.pow(1 - U.anim, 3);
      U.cents.forEach(c => { c.x = c.fx + (c.tx - c.fx) * e; c.y = c.fy + (c.ty - c.fy) * e; });
      requestDraw();
      if (U.anim < 1) requestAnimationFrame(glide);
    })(t0);
  }

  function step() {
    if (U.phase === 'done') return;
    if (U.anim < 1) {                       // glide still running: jump to the end
      U.glideId++;
      U.cents.forEach(c => { c.x = c.tx; c.y = c.ty; });
      U.anim = 1;
    }
    if (U.cents.length < U.K) fillCentroids();

    if (U.phase === 'place' || U.phase === 'update') {
      const changes = doAssign();
      U.iter++;
      if (changes === 0 && U.iter > 1) {
        U.phase = 'done';
        stopRun();
        caption('cap_un_done', { k: U.K });
        toast(`<div class="score">✓ K = ${U.K}</div><div class="challenge">${t('hud_iter')}: ${U.iter}</div>`);
      } else {
        U.phase = 'assign';
        caption('cap_un_assign');
      }
    } else {
      doUpdate();
      U.phase = 'update';
      caption('cap_un_update');
    }
    renderHUD(); requestDraw();
  }

  /* ---------- run / pause ---------- */
  function runLabel() { $('#unRun').textContent = U.timer ? t('btn_pause') : t('btn_run'); }
  function stopRun() { if (U.timer) clearInterval(U.timer); U.timer = null; if ($('#unRun')) runLabel(); }
  function toggleRun() {
    if (U.timer) { stopRun(); return; }
    if (U.phase === 'done') reset();
    U.timer = setInterval(step, 750);
    step();
    runLabel();
  }

  /* ---------- controls ---------- */
  $('#unK').addEventListener('input', e => {
    U.K = Number(e.target.value);
    $('#unKVal').textContent = U.K;
    reset();
    caption('cap_un_start', { k: U.K });
    renderHUD(); requestDraw();
  });
  $('#unStep').addEventListener('click', () => { stopRun(); step(); });
  $('#unRun').addEventListener('click', toggleRun);
  $('#unTruth').addEventListener('change', e => { U.truth = e.target.checked; requestDraw(); });
  $('#unReset').addEventListener('click', () => {
    reset();
    caption('cap_un_start', { k: U.K });
    renderHUD(); requestDraw();
  });

  /* ---------- the mode object ---------- */
  registerMode({
    id: 'unsup',
    enter() {
      runLabel();
      if (U.phase === 'place') caption('cap_un_start', { k: U.K });
    },
    leave() { stopRun(); },
    onLang() { runLabel(); },

    click(px, py) {
      const p = fromPx(px, py);
      if (!insidePlot(p)) return;
      if (U.phase === 'done') reset();
      if (U.phase !== 'place' || U.cents.length >= U.K) return;
      addCentroid(p.x, p.y);
      const left = U.K - U.cents.length;
      caption('cap_un_placed', {
        i: U.cents.length,
        left: () => left ? t('cap_un_left', { n: left }) : t('cap_un_ready')
      });
      renderHUD(); requestDraw();
    },

    hud() {
      return [
        ['K', U.K],
        [t('hud_iter'), U.iter],
        [t('hud_moved'), U.changes, U.phase === 'done' ? 'success' : '']
      ];
    },

    draw(P) {
      drawPlotFrame(P);
      const col = j => CLUSTER_COLORS[j % CLUSTER_COLORS.length];

      // link each fruit to its centre
      if (U.cents.length) {
        ctx.save();
        ctx.lineWidth = 1; ctx.globalAlpha = 0.35;
        U.points.forEach((p, i) => {
          const j = U.assign[i];
          if (j < 0 || !U.cents[j]) return;
          const a = toPx(p), b = toPx(U.cents[j]);
          ctx.strokeStyle = col(j);
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        });
        ctx.restore();
      }

      // fruits: grey dots until assigned (true emoji only on request)
      U.points.forEach((p, i) => {
        const q = toPx(p);
        const j = U.assign[i];
        ctx.beginPath(); ctx.arc(q.x, q.y, U.truth ? 11 : 6.5, 0, Math.PI * 2);
        if (U.truth) {
          ctx.fillStyle = P.bg; ctx.fill();
          ctx.lineWidth = 2.5; ctx.strokeStyle = j < 0 ? P.muted : col(j); ctx.stroke();
          drawEmoji(FRUIT_EMOJI[p.c], q.x, q.y, 13);
        } else {
          ctx.fillStyle = j < 0 ? P.muted : col(j); ctx.fill();
        }
      });

      // centres
      U.cents.forEach((c, j) => {
        const q = toPx(c);
        ctx.save();
        ctx.translate(q.x, q.y); ctx.rotate(Math.PI / 4);
        ctx.shadowColor = col(j); ctx.shadowBlur = 18;
        ctx.fillStyle = col(j);
        ctx.fillRect(-9, -9, 18, 18);
        ctx.shadowBlur = 0;
        ctx.lineWidth = 2.5; ctx.strokeStyle = P.bg; ctx.strokeRect(-9, -9, 18, 18);
        ctx.restore();
        ctx.fillStyle = P.ink; ctx.font = "800 11px 'Orbitron', system-ui";
        ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
        ctx.fillText('C' + (j + 1), q.x + 13, q.y - 8);
      });
    }
  });
})();
