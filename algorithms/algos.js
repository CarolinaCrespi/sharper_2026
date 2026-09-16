/* =========================================================
   The six searchers. Each create() returns an object with
   step() → true when finished, draw(P, G), optional hud(),
   finalCaption() and slow (animation pace multiplier).
========================================================= */
const randCell = () => Math.floor(Math.random() * N);

function drawPath(path, color, G, alpha) {
  if (path.length < 2) return;
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.globalAlpha = alpha || 0.9; ctx.lineJoin = 'round';
  ctx.beginPath();
  path.forEach((i, k) => { const c = cellCenter(i, G); if (k) ctx.lineTo(c.x, c.y); else ctx.moveTo(c.x, c.y); });
  ctx.stroke();
  ctx.restore();
}

/* ---------- 1) EXACT: check every cell, row by row ---------- */
registerAlgo('exact', {
  create() {
    let i = 0;
    return {
      slow: 1,
      step() {
        for (let k = 0; k < COLS && i < N; k++) probe(i++);
        return i >= N;
      },
      draw(P, G) {
        if (i >= N) return;
        const y = yOf(i);
        ctx.save();
        ctx.fillStyle = ALGO_COLOR.exact; ctx.globalAlpha = 0.35;
        ctx.fillRect(G.x0, G.y0 + y * G.cell, G.cell * COLS, G.cell);
        ctx.restore();
      },
      finalCaption() { caption('cap_exact_done', { cells: N, best: depthM(Env.bestV) }); }
    };
  }
});

/* ---------- 2) LOCAL SEARCH: look at the whole neighbourhood, move to the deepest ---------- */
registerAlgo('ls', {
  create() {
    let cur = randCell();
    probe(cur);
    const path = [cur];
    let looking = true, lastR = radius(), steps = 0;
    return {
      slow: 4,
      step() {
        if (looking) {                         // phase 1: explore the square
          lastR = radius();
          neighbours(cur, lastR).forEach(probe);
          looking = false;
          return false;
        }
        let best = cur;                        // phase 2: move to the deepest neighbour
        neighbours(cur, lastR).forEach(j => { if (Env.f[j] > Env.f[best]) best = j; });
        if (best === cur || ++steps > 300) return true;   // no neighbour is deeper: stop
        cur = best; path.push(cur); looking = true;
        return false;
      },
      draw(P, G) {
        drawPath(path, ALGO_COLOR.ls, G);
        drawSquare(cur, lastR, ALGO_COLOR.ls, G, !looking);
        drawDot(cellCenter(cur, G), G.cell * 0.42, ALGO_COLOR.ls, P, true);
      },
      finalCaption() {
        caption('cap_ls_stuck', {
          best: depthM(Env.bestV), pct: pctOf(Env.bestV), cells: Env.cells,
          verdict: () => Env.best === Env.maxIdx ? t('cap_ls_global') : t('cap_ls_local')
        });
      }
    };
  }
});

/* ---------- 3) SIMULATED ANNEALING: random neighbour, sometimes accept going up ---------- */
registerAlgo('sa', {
  create() {
    const ITERS = 330, PER_TICK = 3, T0 = 0.3, T_END = 0.002;
    let cur = randCell(), curV = probe(cur), k = 0, T = T0;
    let cand = -1, candOk = true, candWorse = false;
    const trail = [cur];
    return {
      slow: 1,
      step() {
        for (let n = 0; n < PER_TICK; n++) {
          if (k >= ITERS) return true;
          T = T0 * Math.pow(T_END / T0, k / ITERS);
          const j = randomNeighbour(cur, radius());
          const v = probe(j), d = v - curV;         // d < 0 → shallower (worse)
          cand = j; candWorse = d < 0;
          candOk = d >= 0 || Math.random() < Math.exp(d / T);
          if (candOk) { cur = j; curV = v; trail.push(cur); if (trail.length > 80) trail.shift(); }
          k++;
        }
        return false;
      },
      hud() { return [[t('hud_temp'), Math.round(100 * T / T0) + '%']]; },
      draw(P, G) {
        drawPath(trail, ALGO_COLOR.sa, G, 0.6);
        drawSquare(cur, radius(), ALGO_COLOR.sa, G, true);
        if (cand >= 0) {
          // accepted even though worse = orange, rejected = grey
          const color = !candOk ? P.muted : candWorse ? '#F97316' : P.teal;
          drawDot(cellCenter(cand, G), G.cell * 0.28, color, P, false);
        }
        drawDot(cellCenter(cur, G), G.cell * 0.42, ALGO_COLOR.sa, P, true);
      }
    };
  }
});

/* ---------- 4) GENETIC: parents → child halfway, small mutation in the neighbourhood ---------- */
registerAlgo('ga', {
  create() {
    const POP = 14, GENS = 16, P_MUT = 0.35;
    let pop = Array.from({ length: POP }, randCell);
    pop.forEach(probe);
    let prev = [], links = [], gen = 0;
    const pick = () => {                          // tournament of 3
      let b = pop[Math.floor(Math.random() * POP)];
      for (let n = 0; n < 2; n++) { const c = pop[Math.floor(Math.random() * POP)]; if (Env.f[c] > Env.f[b]) b = c; }
      return b;
    };
    return {
      slow: 6,
      step() {
        if (gen >= GENS) return true;
        const sorted = [...pop].sort((a, b) => Env.f[b] - Env.f[a]);
        const next = sorted.slice(0, 2);          // elitism: the two deepest survive
        links = [];
        while (next.length < POP - 1) {
          const a = pick(), b = pick();
          let child = ix(clampX((xOf(a) + xOf(b)) / 2 + (Math.random() - 0.5) * 2),
                         clampY((yOf(a) + yOf(b)) / 2 + (Math.random() - 0.5) * 2));
          if (Math.random() < P_MUT) child = randomNeighbour(child, radius());
          next.push(child);
          links.push([a, b, child]);
        }
        next.push(randCell());                    // one newcomer keeps some variety
        next.forEach(probe);
        prev = pop; pop = next; gen++;
        return false;
      },
      hud() { return [[t('hud_gen'), `${gen}/${GENS}`]]; },
      draw(P, G) {
        ctx.save();
        ctx.strokeStyle = ALGO_COLOR.ga; ctx.globalAlpha = 0.35; ctx.lineWidth = 1.2;
        links.forEach(([a, b, c]) => {
          const pc = cellCenter(c, G);
          [a, b].forEach(p => { const pp = cellCenter(p, G); ctx.beginPath(); ctx.moveTo(pp.x, pp.y); ctx.lineTo(pc.x, pc.y); ctx.stroke(); });
        });
        ctx.restore();
        prev.forEach(i => drawDot(cellCenter(i, G), G.cell * 0.2, P.muted, P, false));
        pop.forEach(i => drawDot(cellCenter(i, G), G.cell * 0.36, ALGO_COLOR.ga, P, true));
      }
    };
  }
});

/* ---------- 5) ANT COLONY: pheromone on deep cells, ants explore around it ---------- */
registerAlgo('aco', {
  create() {
    const ANTS = 10, ITERS = 18, RHO = 0.15, EXPLORE = 0.2;
    const tau = new Float32Array(N);
    let it = 0, ants = [];
    function origin() {
      let total = 0;
      for (let i = 0; i < N; i++) total += tau[i];
      if (total <= 0 || Math.random() < EXPLORE) return randCell();
      let r = Math.random() * total;
      for (let i = 0; i < N; i++) { r -= tau[i]; if (r <= 0) return i; }
      return Env.best;
    }
    return {
      slow: 5,
      step() {
        if (it >= ITERS) return true;
        ants = [];
        for (let a = 0; a < ANTS; a++) {
          const o = origin();
          const j = Env.revealed[o] ? randomNeighbour(o, radius()) : o;
          probe(j);
          ants.push([o, j]);
        }
        for (let i = 0; i < N; i++) tau[i] *= 1 - RHO;          // evaporation
        ants.forEach(([, j]) => { tau[j] += Math.pow(Env.f[j], 4); });   // deeper → much more pheromone
        tau[Env.best] += 0.5;
        it++;
        return false;
      },
      hud() { return [[t('hud_gen'), `${it}/${ITERS}`]]; },
      draw(P, G) {
        let max = 0;
        for (let i = 0; i < N; i++) if (tau[i] > max) max = tau[i];
        if (max > 0) {
          ctx.save();
          ctx.fillStyle = ALGO_COLOR.aco;
          for (let i = 0; i < N; i++) {
            const a = tau[i] / max;
            if (a < 0.04) continue;
            ctx.globalAlpha = 0.15 + a * 0.55;
            const c = cellCenter(i, G);
            ctx.beginPath(); ctx.arc(c.x, c.y, G.cell * (0.3 + a * 0.5), 0, Math.PI * 2); ctx.fill();
          }
          ctx.restore();
        }
        ctx.save();
        ctx.strokeStyle = P.ink; ctx.globalAlpha = 0.5; ctx.lineWidth = 1;
        ants.forEach(([o, j]) => {
          if (o === j) return;
          const a = cellCenter(o, G), b = cellCenter(j, G);
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        });
        ctx.restore();
        ants.forEach(([, j]) => drawDot(cellCenter(j, G), G.cell * 0.3, P.ink, P, false));
      }
    };
  }
});

/* ---------- 6) PARTICLE SWARM: velocity pulled to own best and swarm best ---------- */
registerAlgo('pso', {
  create() {
    const NP = 12, ITERS = 30, Wt = 0.62, C1 = 1.3, C2 = 1.5, VMAX = 5;
    const ps = Array.from({ length: NP }, () => {
      const x = Math.random() * (COLS - 1), y = Math.random() * (ROWS - 1);
      const i = ix(clampX(x), clampY(y));
      const v = probe(i);
      return { x, y, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, pb: i, pv: v, trail: [[x, y]] };
    });
    let it = 0;
    return {
      slow: 3,
      step() {
        if (it >= ITERS) return true;
        const gx = xOf(Env.best), gy = yOf(Env.best);
        ps.forEach(p => {
          p.vx = Wt * p.vx + C1 * Math.random() * (xOf(p.pb) - p.x) + C2 * Math.random() * (gx - p.x);
          p.vy = Wt * p.vy + C1 * Math.random() * (yOf(p.pb) - p.y) + C2 * Math.random() * (gy - p.y);
          p.vx = Math.max(-VMAX, Math.min(VMAX, p.vx));
          p.vy = Math.max(-VMAX, Math.min(VMAX, p.vy));
          p.x = Math.max(0, Math.min(COLS - 1, p.x + p.vx));
          p.y = Math.max(0, Math.min(ROWS - 1, p.y + p.vy));
          const i = ix(clampX(p.x), clampY(p.y));
          const v = probe(i);
          if (v > p.pv) { p.pv = v; p.pb = i; }
          p.trail.push([p.x, p.y]);
          if (p.trail.length > 7) p.trail.shift();
        });
        it++;
        return false;
      },
      hud() { return [[t('hud_gen'), `${it}/${ITERS}`]]; },
      draw(P, G) {
        ps.forEach(p => {
          ctx.save();
          ctx.strokeStyle = ALGO_COLOR.pso; ctx.globalAlpha = 0.55; ctx.lineWidth = 2;
          ctx.beginPath();
          p.trail.forEach(([x, y], k) => { const c = pointCenter(x, y, G); if (k) ctx.lineTo(c.x, c.y); else ctx.moveTo(c.x, c.y); });
          ctx.stroke();
          ctx.restore();
          drawDot(pointCenter(p.x, p.y, G), G.cell * 0.36, ALGO_COLOR.pso, P, true);
        });
      }
    };
  }
});
