// Algoritmi di colorazione — funzioni pure che modificano G in-place.
// G: { nodes:[{id,x,y,color}], edges:[[i,j],...] }

export function neighbors(G, i){
  const nb=[]; G.edges.forEach(([a,b])=>{ if(a===i) nb.push(b); else if(b===i) nb.push(a); });
  return nb;
}
export function degree(G, i){
  let d=0; G.edges.forEach(([a,b])=>{ if(a===i||b===i) d++; }); return d;
}
export function colorable(G, i, c){
  return neighbors(G,i).every(j => G.nodes[j].color !== c);
}
export function resetColors(G){
  G.nodes.forEach(v=>v.color=-1);
}
export function orderByDegreeDesc(G){
  return [...G.nodes].sort((a,b)=>degree(G,b.id)-degree(G,a.id)).map(v=>v.id);
}

// Greedy Welsh–Powell
export function greedyWelshPowell(G){
  resetColors(G);
  const order = orderByDegreeDesc(G);
  let col=0;
  for(const i of order){
    if(G.nodes[i].color!==-1) continue;
    G.nodes[i].color = col;
    for(const k of order){
      if(G.nodes[k].color===-1 && colorable(G,k,col)) G.nodes[k].color=col;
    }
    col++;
  }
}

// DSATUR
export function dsatur(G){
  resetColors(G);
  const n=G.nodes.length;
  const usedNbs = Array.from({length:n},()=>new Set());
  for(let step=0; step<n; step++){
    let pick=-1, bestSat=-1, bestDeg=-1;
    for(let i=0;i<n;i++){
      if(G.nodes[i].color!==-1) continue;
      const s=usedNbs[i].size, d=degree(G,i);
      if(s>bestSat || (s===bestSat && d>bestDeg)){ bestSat=s; bestDeg=d; pick=i; }
    }
    if(pick===-1) break;
    let c=0; while(usedNbs[pick].has(c)) c++;
    G.nodes[pick].color=c;
    neighbors(G,pick).forEach(j=>{ if(G.nodes[j].color===-1) usedNbs[j].add(c); });
  }
}

// Backtracking esatto (min K) — limitato per grafi piccoli
export function backtrackingMinColors(G, limitK=6, timeMs=300){
  if(G.nodes.length>20) return false; // troppo grande per demo
  const start=performance.now();
  const order = orderByDegreeDesc(G);
  for(let K=1; K<=limitK; K++){
    resetColors(G);
    if(bt(0,K)) return true;
    if(performance.now()-start>timeMs) break;
  }
  return false;

  function bt(idx,K){
    if(idx===order.length) return true;
    const i = order[idx];
    for(let c=0;c<K;c++){
      if(colorable(G,i,c)){
        G.nodes[i].color=c;
        if(bt(idx+1,K)) return true;
        G.nodes[i].color=-1;
      }
    }
    return false;
  }
}
