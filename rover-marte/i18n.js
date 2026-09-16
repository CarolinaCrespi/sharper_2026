/* =========================================================
   Rover su Marte — dictionary, language + theme
========================================================= */
const RV_I18N = {
  it: {
    page_title: "Rover su Marte — navigazione autonoma in ambienti sconosciuti",
    title: "Rover su Marte",
    tagline: "Porta il rover alla base. Vedi solo ciò che è vicino. Consuma meno energia possibile.",
    howto_1: "Frecce / WASD, oppure clicca vicino al rover → si muove di una casella",
    howto_2: "Raggiungi la base 🚀 consumando meno energia possibile",
    howto_3: "La sabbia costa <b>3 ⚡</b>, il terreno <b>1 ⚡</b>, le rocce non si attraversano",
    howto_4: "Vedi solo entro il raggio dei <b>sensori</b>: il resto è da scoprire",
    howto_5: "Poi guarda come se la cavano gli algoritmi, sulla stessa mappa!",
    theory_summary: "ℹ️ Perché un rover deve guidarsi da solo?",
    intro_p1: "Un comando radio impiega <b>tra 4 e 24 minuti</b> per arrivare dalla Terra a Marte: guidare un rover con il joystick è impossibile. Per questo i rover hanno una <b>navigazione autonoma</b>: osservano il terreno con le telecamere e decidono da soli dove andare.",
    intro_p2: "La mappa però è <b>sconosciuta</b>: il rover vede solo ciò che ha vicino. Deve fare un piano con informazioni incomplete e <b>ripianificare</b> ogni volta che scopre un ostacolo. Gli algoritmi della famiglia <b>D*</b> sono nati proprio per questo: una loro variante, Field D*, è stata usata sui rover Spirit e Opportunity.",
    intro_p3: "Chi punta sempre dritto alla meta (<b>greedy</b>) è velocissimo ma può finire in un vicolo cieco: è lo stesso <em>ottimo locale</em> della Local Search. Chi ha la mappa completa (<b>A*</b>) trova il percorso migliore, ma in un ambiente sconosciuto quella mappa non esiste.",
    intro_p4: "Navigare in ambienti sconosciuti serve anche ai robot di soccorso, ai droni e alle auto a guida autonoma, ed è uno dei temi di ricerca del nostro gruppo.",

    level_label: "Mappa:",
    lvl_plain: "La pianura (facile)",
    lvl_crater: "Il cratere (medio)",
    lvl_canyon: "I canyon (difficile)",
    lvl_random: "Mappa casuale",
    btn_new_map: "🎲 Nuova",
    lbl_sensor: "Sensori",
    lbl_speed: "Velocità",
    chk_fog: "Mostra tutta la mappa",
    btn_you: "🕹️ Ricomincia",

    legend_flat: "Terreno · 1 ⚡",
    legend_sand: "Sabbia · 3 ⚡",
    legend_rock: "Roccia",
    legend_fog: "Non ancora visto",
    dpad_label: "Comandi del rover",

    cat_greedy: "Senza mappa · punta dritto",
    cat_replan: "Senza mappa · ripianifica",
    cat_astar: "Con la mappa completa",
    n_greedy: "Il Testardo", s_greedy: "Greedy: sempre verso la base",
    n_replan: "Il Ripianificatore", s_replan: "D* Lite: rifà il piano se scopre ostacoli",
    n_astar: "Il Satellite", s_astar: "A*: conosce già tutta la mappa",
    n_you: "Tu",
    board_title: "Classifica",
    board_empty: "Guida il rover e prova gli algoritmi: i risultati compaiono qui.",
    board_steps: "passi",
    board_best: "percorso migliore",
    st_stuck: "bloccato",
    st_battery: "batteria scarica",

    hud_energy: "Energia usata",
    hud_battery: "Batteria",
    hud_steps: "Passi",
    hud_replans: "Ripianificazioni",

    info: {
      greedy: "<h4>Il Testardo · Greedy</h4><div class=\"meta\">Senza mappa · nessuna memoria</div>A ogni passo guarda le caselle accanto e va in quella <b>più vicina alla base</b> in linea d'aria. Non fa piani e non torna mai indietro. In pianura è perfetto, ma se si infila in una sacca chiusa (un cratere a forma di U) tutte le caselle vicine lo allontanano dalla base e <b>si blocca</b>: è un <b>ottimo locale</b>, lo stesso problema della Local Search.",
      replan: "<h4>Il Ripianificatore · D* Lite</h4><div class=\"meta\">Senza mappa · ripianifica</div>Fa un piano <b>ottimista</b>: calcola il percorso più corto supponendo che tutto ciò che non ha ancora visto sia terreno libero. Segue il piano e, quando i sensori scoprono una roccia o della sabbia sul percorso, <b>ricalcola</b> il piano da dove si trova (la linea tratteggiata). D* Lite fa questo ricalcolo in modo furbo, riusando i conti già fatti. Arriva sempre, se la base è raggiungibile, ma a volte paga qualche deviazione.",
      astar: "<h4>Il Satellite · A*</h4><div class=\"meta\">Con la mappa completa · ottimo garantito</div>Conosce già <b>ogni roccia e ogni duna</b>, come se avesse una foto dal satellite perfetta. A* esplora i percorsi partendo da quelli più promettenti e trova quello che consuma <b>meno energia in assoluto</b>. È il riferimento con cui confrontarsi, ma su Marte una mappa così dettagliata non ce l'hai: le immagini dall'orbita non vedono ogni sasso."
    },

    cap_you_start: "Guida il rover 🚙 fino alla base 🚀 con le <b>frecce</b> (o WASD), oppure cliccando vicino al rover. Vedi solo entro i sensori. Batteria: <b>{bat} ⚡</b>.",
    cap_you_move: "Energia usata: <b>{e} ⚡</b> · batteria rimasta {left} ⚡.",
    cap_you_sand: "🏜️ Sabbia! Questa casella è costata <b>3 ⚡</b>. Batteria rimasta {left} ⚡.",
    cap_you_rock: "🪨 Roccia: il rover non può passare di lì.",
    cap_you_won: "🚀 Base raggiunta con <b>{e} ⚡</b>! Il percorso migliore possibile ne usa {opt}. Ora guarda come se la cavano gli algoritmi.",
    cap_you_battery: "🪫 Batteria scarica prima di arrivare alla base! Premi <b>🕹️ Ricomincia</b> e cerca un percorso più corto.",
    cap_you_over: "La tua corsa è finita: premi <b>🕹️ Ricomincia</b> per riprovare, o prova gli algoritmi.",
    cap_running: "<b>{name}</b> è in viaggio…",
    cap_greedy_stuck: "<b>Il Testardo è bloccato</b> dopo {steps} passi: ogni casella libera accanto lo allontana dalla base. È un <b>ottimo locale</b>, come nella Local Search!",
    cap_replan_done: "<b>Il Ripianificatore</b> è arrivato con <b>{e} ⚡</b> ({pct}), ricalcolando il piano {n} volte mentre scopriva la mappa.",
    cap_astar_done: "<b>Il Satellite</b> conosceva già tutta la mappa: <b>{e} ⚡</b> è il minimo possibile. Chi non ha la mappa non può garantirlo.",
    cap_algo_done: "<b>{name}</b> è arrivato alla base con <b>{e} ⚡</b> ({pct}).",
    cap_algo_battery: "<b>{name}</b> ha finito la batteria prima di arrivare alla base.",
    cap_algo_noroute: "<b>{name}</b> non trova più nessun percorso verso la base.",
    pct_best: "il percorso migliore",
    pct_more: "+{p}% rispetto al percorso migliore",

    toast_won: "Base raggiunta!",
    toast_used: "<b>{e} ⚡</b> usati · il minimo possibile è {opt} ⚡",
    toast_stars: "⭐⭐⭐ ≤ {s3} ⚡ (come il Ripianificatore, che non ha la mappa) · ⭐⭐ ≤ {s2} ⚡",
    toast_battery: "Batteria scarica",
    toast_battery_sub: "Il rover si è fermato prima della base. Riprova!",
    btn_retry: "🕹️ Ricomincia"
  },

  en: {
    page_title: "Mars Rover — autonomous navigation in unknown environments",
    title: "Mars Rover",
    tagline: "Drive the rover to the base. You only see what's nearby. Use as little energy as possible.",
    howto_1: "Arrow keys / WASD, or click next to the rover → it moves one cell",
    howto_2: "Reach the base 🚀 using as little energy as possible",
    howto_3: "Sand costs <b>3 ⚡</b>, ground <b>1 ⚡</b>, rocks can't be crossed",
    howto_4: "You only see within <b>sensor</b> range: the rest is yet to be discovered",
    howto_5: "Then watch how the algorithms do on the same map!",
    theory_summary: "ℹ️ Why must a rover drive itself?",
    intro_p1: "A radio command takes <b>between 4 and 24 minutes</b> to travel from Earth to Mars: driving a rover with a joystick is impossible. That's why rovers have <b>autonomous navigation</b>: they look at the terrain with their cameras and decide on their own where to go.",
    intro_p2: "But the map is <b>unknown</b>: the rover only sees what's close. It has to plan with incomplete information and <b>replan</b> every time it discovers an obstacle. The <b>D*</b> family of algorithms was born exactly for this: one of its variants, Field D*, was used on the Spirit and Opportunity rovers.",
    intro_p3: "Whoever always heads straight for the goal (<b>greedy</b>) is very fast but can end up in a dead end: it's the same <em>local optimum</em> as Local Search. Whoever has the complete map (<b>A*</b>) finds the best route, but in an unknown environment that map doesn't exist.",
    intro_p4: "Navigating unknown environments also matters for rescue robots, drones and self-driving cars, and it's one of our group's research topics.",

    level_label: "Map:",
    lvl_plain: "The plain (easy)",
    lvl_crater: "The crater (medium)",
    lvl_canyon: "The canyons (hard)",
    lvl_random: "Random map",
    btn_new_map: "🎲 New",
    lbl_sensor: "Sensors",
    lbl_speed: "Speed",
    chk_fog: "Show the whole map",
    btn_you: "🕹️ Restart",

    legend_flat: "Ground · 1 ⚡",
    legend_sand: "Sand · 3 ⚡",
    legend_rock: "Rock",
    legend_fog: "Not seen yet",
    dpad_label: "Rover controls",

    cat_greedy: "No map · heads straight",
    cat_replan: "No map · replans",
    cat_astar: "With the complete map",
    n_greedy: "The Stubborn One", s_greedy: "Greedy: always towards the base",
    n_replan: "The Replanner", s_replan: "D* Lite: replans when it finds obstacles",
    n_astar: "The Satellite", s_astar: "A*: already knows the whole map",
    n_you: "You",
    board_title: "Leaderboard",
    board_empty: "Drive the rover and try the algorithms: results show up here.",
    board_steps: "steps",
    board_best: "best route",
    st_stuck: "stuck",
    st_battery: "battery dead",

    hud_energy: "Energy used",
    hud_battery: "Battery",
    hud_steps: "Steps",
    hud_replans: "Replans",

    info: {
      greedy: "<h4>The Stubborn One · Greedy</h4><div class=\"meta\">No map · no memory</div>At each step it looks at the neighbouring cells and moves to the one <b>closest to the base</b> as the crow flies. It makes no plans and never goes back. On a plain it's perfect, but if it gets into a closed pocket (a U-shaped crater) every nearby cell takes it further from the base and <b>it gets stuck</b>: it's a <b>local optimum</b>, the same problem as Local Search.",
      replan: "<h4>The Replanner · D* Lite</h4><div class=\"meta\">No map · replans</div>It makes an <b>optimistic</b> plan: it computes the shortest route assuming everything it hasn't seen yet is free ground. It follows the plan and, when the sensors discover a rock or sand on the route, it <b>recomputes</b> the plan from where it is (the dashed line). D* Lite does this recomputation cleverly, reusing the work already done. It always arrives, if the base is reachable, but sometimes pays for a few detours.",
      astar: "<h4>The Satellite · A*</h4><div class=\"meta\">With the complete map · guaranteed optimum</div>It already knows <b>every rock and every dune</b>, as if it had a perfect satellite photo. A* explores routes starting from the most promising ones and finds the one that uses <b>the least energy of all</b>. It's the benchmark to compare with, but on Mars you don't have such a detailed map: images from orbit can't see every stone."
    },

    cap_you_start: "Drive the rover 🚙 to the base 🚀 with the <b>arrow keys</b> (or WASD), or by clicking next to the rover. You only see within sensor range. Battery: <b>{bat} ⚡</b>.",
    cap_you_move: "Energy used: <b>{e} ⚡</b> · battery left {left} ⚡.",
    cap_you_sand: "🏜️ Sand! This cell cost <b>3 ⚡</b>. Battery left {left} ⚡.",
    cap_you_rock: "🪨 Rock: the rover can't go that way.",
    cap_you_won: "🚀 Base reached with <b>{e} ⚡</b>! The best possible route uses {opt}. Now watch how the algorithms do.",
    cap_you_battery: "🪫 Battery dead before reaching the base! Press <b>🕹️ Restart</b> and look for a shorter route.",
    cap_you_over: "Your run is over: press <b>🕹️ Restart</b> to try again, or try the algorithms.",
    cap_running: "<b>{name}</b> is on its way…",
    cap_greedy_stuck: "<b>The Stubborn One is stuck</b> after {steps} steps: every free cell nearby takes it further from the base. It's a <b>local optimum</b>, just like in Local Search!",
    cap_replan_done: "<b>The Replanner</b> arrived with <b>{e} ⚡</b> ({pct}), recomputing its plan {n} times while discovering the map.",
    cap_astar_done: "<b>The Satellite</b> already knew the whole map: <b>{e} ⚡</b> is the minimum possible. Without the map nobody can guarantee that.",
    cap_algo_done: "<b>{name}</b> reached the base with <b>{e} ⚡</b> ({pct}).",
    cap_algo_battery: "<b>{name}</b> ran out of battery before reaching the base.",
    cap_algo_noroute: "<b>{name}</b> can't find any route to the base anymore.",
    pct_best: "the best route",
    pct_more: "+{p}% compared to the best route",

    toast_won: "Base reached!",
    toast_used: "<b>{e} ⚡</b> used · the minimum possible is {opt} ⚡",
    toast_stars: "⭐⭐⭐ ≤ {s3} ⚡ (like the Replanner, which has no map either) · ⭐⭐ ≤ {s2} ⚡",
    toast_battery: "Battery dead",
    toast_battery_sub: "The rover stopped before the base. Try again!",
    btn_retry: "🕹️ Restart"
  }
};

/* ======= helpers ======= */
const $ = (s,r=document) => r.querySelector(s);
const $$ = (s,r=document) => [...r.querySelectorAll(s)];

let rvLang = 'it';
try {
  rvLang = localStorage.getItem('rv_lang') ||
    ((navigator.language||'it').toLowerCase().startsWith('en') ? 'en' : 'it');
} catch (e) {}

/* t('key', {var: value}) → translated string with {var} filled in */
function t(key, vars) {
  let s = key.split('.').reduce((o,k) => (o ? o[k] : undefined), RV_I18N[rvLang]);
  if (s === undefined) return key;
  if (vars) for (const k in vars) s = s.split('{'+k+'}').join(vars[k]);
  return s;
}

function setLang(lang) {
  rvLang = lang;
  const d = RV_I18N[lang];
  $$('[data-i18n]').forEach(el => {
    const k = el.getAttribute('data-i18n');
    if (typeof d[k] === 'string') el.innerHTML = d[k];
  });
  $$('[data-i18n-aria]').forEach(el => {
    const k = el.getAttribute('data-i18n-aria');
    if (typeof d[k] === 'string') el.setAttribute('aria-label', d[k]);
  });
  document.title = d.page_title || document.title;
  document.documentElement.lang = lang;
  $('#btn-it')?.setAttribute('aria-pressed', lang === 'it');
  $('#btn-en')?.setAttribute('aria-pressed', lang === 'en');
  try { localStorage.setItem('rv_lang', lang); } catch (e) {}
  if (typeof onLangChange === 'function') onLangChange();
}
$('#btn-it')?.addEventListener('click', () => setLang('it'));
$('#btn-en')?.addEventListener('click', () => setLang('en'));

/* ======= theme toggle ======= */
const themeBtn = $('#btn-theme');
let currentTheme = 'dark';
try { currentTheme = localStorage.getItem('rv_theme') || 'dark'; } catch (e) {}
function applyTheme(th) {
  currentTheme = th;
  if (th === 'light') document.documentElement.setAttribute('data-theme', 'light');
  else document.documentElement.removeAttribute('data-theme');
  if (themeBtn) themeBtn.textContent = th === 'light' ? '☀' : '☾';
  try { localStorage.setItem('rv_theme', th); } catch (e) {}
  if (typeof requestDraw === 'function') requestDraw();
}
themeBtn?.addEventListener('click', () => applyTheme(currentTheme === 'light' ? 'dark' : 'light'));
applyTheme(currentTheme);
setLang(rvLang);
