/* =========================================================
   Caccia al Punto più Profondo — dictionary, language + theme
========================================================= */
const AL_I18N = {
  it: {
    page_title: "Caccia al Punto più Profondo — esatti, local search, metaeuristiche",
    title: "Caccia al Punto più Profondo",
    tagline: "Il fondale è nella nebbia. Trova il punto più profondo esplorando meno celle possibile.",
    howto_1: "Click su una cella → la esplori e scopri quanto è profonda",
    howto_2: "Hai 30 tentativi per trovare il punto più profondo",
    howto_3: "Il riquadro è il <b>vicinato</b>: le celle \"accanto\" a quella in cui sei",
    howto_4: "Poi guarda come cercano gli algoritmi, sulla stessa mappa!",
    theory_summary: "ℹ️ Esatti, approssimati, metaeuristiche",
    intro_p1: "Un algoritmo <b>esatto</b> garantisce la soluzione migliore, ma per esserne sicuro deve controllare (quasi) tutto: su problemi grandi è troppo lento.",
    intro_p2: "Una <b>ricerca locale</b> parte da una soluzione e guarda solo il suo <b>vicinato</b>: le soluzioni che si ottengono con una piccola modifica. Si sposta sulla migliore finché nessun vicino è meglio. Veloce, ma si ferma nel primo \"buco\" che trova: un <em>ottimo locale</em>.",
    intro_p3: "Le <b>metaeuristiche</b> sono strategie per non restare intrappolati. Quelle a <b>soluzione singola</b> (come il Simulated Annealing) muovono una sola soluzione ma a volte accettano mosse peggiori. Quelle a <b>popolazione</b> (Genetico, Formiche, Sciame di particelle) muovono tante soluzioni che si scambiano informazioni.",
    intro_p4: "Nessuna metaeuristica garantisce l'ottimo, ma di solito trova soluzioni molto buone esplorando una piccola parte della mappa.",

    level_label: "Mappa:",
    lvl_valley: "Una valle (facile)",
    lvl_holes: "Tante buche (medio)",
    lvl_trap: "La trappola (difficile)",
    lbl_radius: "Vicinato",
    lbl_speed: "Velocità",
    chk_fog: "Togli nebbia",
    btn_you: "🔦 Tocca a te",

    cat_exact: "Esatto",
    cat_local: "Approssimato",
    cat_single: "Metaeuristica · singola",
    cat_pop: "Metaeuristica · popolazione",
    n_exact: "Ricerca esaustiva", s_exact: "controlla tutte le celle",
    n_ls: "Local Search", s_ls: "scende nel vicinato",
    n_sa: "Simulated Annealing", s_sa: "a volte accetta di risalire",
    n_ga: "Algoritmo Genetico", s_ga: "incrocia e muta le soluzioni",
    n_aco: "Colonia di Formiche", s_aco: "feromone sulle zone buone",
    n_pso: "Sciame di Particelle", s_pso: "volano verso il migliore",
    n_you: "Tu",
    board_title: "Classifica",
    board_empty: "Gioca tu e prova gli algoritmi: i risultati compaiono qui.",
    board_cells: "celle",

    hud_cells: "Celle esplorate",
    hud_depth: "Più profondo",
    hud_left: "Tentativi",
    hud_temp: "Temperatura",
    hud_gen: "Generazione",
    unit_m: "m",
    legend_shallow: "poco profondo",
    legend_deep: "profondo",
    legend_fog: "nebbia (non esplorato)",

    info: {
      exact: "<h4>Ricerca esaustiva</h4><div class=\"meta\">Esatto · garantisce l'ottimo</div>Controlla <b>ogni cella</b>, una dopo l'altra. Alla fine è sicura di aver trovato il punto più profondo, ma ha dovuto esplorare tutta la mappa. Su problemi veri le \"celle\" sono miliardi di miliardi: servirebbero secoli.",
      ls: "<h4>Local Search</h4><div class=\"meta\">Approssimato · usa il vicinato</div>Parte da una cella a caso, esplora tutto il suo <b>vicinato</b> (il riquadro) e si sposta nella cella vicina più profonda. Ripete finché nessun vicino è più profondo: lì si ferma. Se la buca in cui è finita non è la più profonda, resta bloccata in un <b>ottimo locale</b>. Con un vicinato più grande vede più lontano, ma esplora più celle a ogni passo.",
      sa: "<h4>Simulated Annealing</h4><div class=\"meta\">Metaeuristica a soluzione singola</div>Come la Local Search si muove nel <b>vicinato</b>, ma sceglie un vicino a caso e, se è peggiore, a volte <b>lo accetta lo stesso</b>. All'inizio la \"temperatura\" è alta e accetta spesso di risalire (così scavalca le colline), poi si raffredda e diventa sempre più esigente. Il nome viene dal raffreddamento lento dei metalli.",
      ga: "<h4>Algoritmo Genetico</h4><div class=\"meta\">Metaeuristica a popolazione</div>Una <b>popolazione</b> di esploratori sparsi sulla mappa. A ogni generazione i più profondi vengono scelti come genitori: i figli nascono <b>a metà strada</b> tra due genitori (incrocio) e ogni tanto fanno un saltino nel <b>vicinato</b> (mutazione). Generazione dopo generazione la popolazione si concentra nelle zone migliori.",
      aco: "<h4>Colonia di Formiche</h4><div class=\"meta\">Metaeuristica a popolazione</div>Le formiche lasciano <b>feromone</b> sulle celle profonde che trovano; il feromone evapora piano piano. Le formiche successive esplorano soprattutto il <b>vicinato</b> delle zone con più feromone. Così la colonia, senza un capo, converge sulle zone migliori. Nata per i percorsi (come in Consegna Express), qui è adattata a una mappa.",
      pso: "<h4>Sciame di Particelle</h4><div class=\"meta\">Metaeuristica a popolazione</div>Ogni particella \"vola\" sulla mappa con una sua velocità, attratta da due punti: il <b>posto migliore che ha visto lei</b> e il <b>posto migliore visto da tutto lo sciame</b>. Come uno stormo di uccelli che cerca cibo: ognuno si fida un po' di sé e un po' del gruppo."
    },

    cap_you_start: "La mappa è coperta dalla nebbia. <b>Clicca</b> sulle celle per esplorarle: hai {n} tentativi.",
    cap_you_probe: "Profondità {d} m. {hint}",
    cap_you_deeper: "È il punto più profondo che hai trovato finora!",
    cap_you_notdeeper: "Il tuo record resta {best} m.",
    cap_you_done: "Tentativi finiti! Il tuo punto più profondo: <b>{best} m</b> ({pct} del massimo). Ora prova gli algoritmi a destra.",
    cap_running: "<b>{name}</b> sta cercando…",
    cap_exact_done: "La ricerca esaustiva ha controllato <b>tutte le {cells} celle</b>: il punto più profondo è {best} m. Garantito, ma quanto lavoro!",
    cap_ls_stuck: "La Local Search si è fermata: nessuna cella del vicinato è più profonda. Ha trovato {best} m ({pct} del massimo) esplorando {cells} celle. {verdict}",
    cap_ls_global: "Questa volta la buca era quella giusta!",
    cap_ls_local: "È bloccata in un <b>ottimo locale</b>: riprova, parte da un punto diverso.",
    cap_algo_done: "<b>{name}</b> ha trovato {best} m ({pct} del massimo) esplorando {cells} celle su {total}.",
    fb_found: "💎 Trovato il punto più profondo!",
    fb_close: "Vicino, ma non il più profondo"
  },

  en: {
    page_title: "Deepest Point Hunt — exact, local search, metaheuristics",
    title: "Deepest Point Hunt",
    tagline: "The sea floor is covered in fog. Find the deepest point while exploring as few cells as possible.",
    howto_1: "Click a cell → explore it and find out how deep it is",
    howto_2: "You have 30 tries to find the deepest point",
    howto_3: "The square is the <b>neighbourhood</b>: the cells \"next to\" the one you're on",
    howto_4: "Then watch how the algorithms search the same map!",
    theory_summary: "ℹ️ Exact, approximate, metaheuristics",
    intro_p1: "An <b>exact</b> algorithm guarantees the best solution, but to be sure it has to check (almost) everything: on large problems it's too slow.",
    intro_p2: "A <b>local search</b> starts from one solution and only looks at its <b>neighbourhood</b>: the solutions you get with a small change. It moves to the best one until no neighbour is better. Fast, but it stops in the first \"hole\" it finds: a <em>local optimum</em>.",
    intro_p3: "<b>Metaheuristics</b> are strategies to avoid getting trapped. <b>Single-solution</b> ones (like Simulated Annealing) move one solution but sometimes accept worse moves. <b>Population-based</b> ones (Genetic, Ants, Particle Swarm) move many solutions that share information.",
    intro_p4: "No metaheuristic guarantees the optimum, but they usually find very good solutions while exploring a small part of the map.",

    level_label: "Map:",
    lvl_valley: "One valley (easy)",
    lvl_holes: "Many holes (medium)",
    lvl_trap: "The trap (hard)",
    lbl_radius: "Neighbourhood",
    lbl_speed: "Speed",
    chk_fog: "Remove fog",
    btn_you: "🔦 Your turn",

    cat_exact: "Exact",
    cat_local: "Approximate",
    cat_single: "Metaheuristic · single",
    cat_pop: "Metaheuristic · population",
    n_exact: "Exhaustive search", s_exact: "checks every cell",
    n_ls: "Local Search", s_ls: "goes down the neighbourhood",
    n_sa: "Simulated Annealing", s_sa: "sometimes accepts climbing up",
    n_ga: "Genetic Algorithm", s_ga: "crosses and mutates solutions",
    n_aco: "Ant Colony", s_aco: "pheromone on good areas",
    n_pso: "Particle Swarm", s_pso: "fly towards the best",
    n_you: "You",
    board_title: "Leaderboard",
    board_empty: "Play yourself and try the algorithms: results show up here.",
    board_cells: "cells",

    hud_cells: "Cells explored",
    hud_depth: "Deepest",
    hud_left: "Tries",
    hud_temp: "Temperature",
    hud_gen: "Generation",
    unit_m: "m",
    legend_shallow: "shallow",
    legend_deep: "deep",
    legend_fog: "fog (not explored)",

    info: {
      exact: "<h4>Exhaustive search</h4><div class=\"meta\">Exact · guarantees the optimum</div>It checks <b>every cell</b>, one after another. At the end it's sure it found the deepest point, but it had to explore the whole map. In real problems the \"cells\" number in the billions of billions: it would take centuries.",
      ls: "<h4>Local Search</h4><div class=\"meta\">Approximate · uses the neighbourhood</div>It starts from a random cell, explores its whole <b>neighbourhood</b> (the square) and moves to the deepest neighbouring cell. It repeats until no neighbour is deeper: there it stops. If that hole isn't the deepest one, it's stuck in a <b>local optimum</b>. A bigger neighbourhood sees further, but explores more cells at each step.",
      sa: "<h4>Simulated Annealing</h4><div class=\"meta\">Single-solution metaheuristic</div>Like Local Search it moves in the <b>neighbourhood</b>, but it picks a random neighbour and, if it's worse, sometimes <b>accepts it anyway</b>. At first the \"temperature\" is high and it often accepts climbing up (so it gets over the hills), then it cools down and becomes more and more demanding. The name comes from the slow cooling of metals.",
      ga: "<h4>Genetic Algorithm</h4><div class=\"meta\">Population-based metaheuristic</div>A <b>population</b> of explorers spread over the map. At each generation the deepest ones are chosen as parents: children are born <b>halfway</b> between two parents (crossover) and now and then take a small jump in the <b>neighbourhood</b> (mutation). Generation after generation the population gathers in the best areas.",
      aco: "<h4>Ant Colony</h4><div class=\"meta\">Population-based metaheuristic</div>Ants leave <b>pheromone</b> on the deep cells they find; pheromone slowly evaporates. The next ants mostly explore the <b>neighbourhood</b> of the areas with more pheromone. So the colony, with no leader, converges on the best areas. Born for routes (as in Express Delivery), here it's adapted to a map.",
      pso: "<h4>Particle Swarm</h4><div class=\"meta\">Population-based metaheuristic</div>Each particle \"flies\" over the map with its own velocity, pulled towards two points: <b>the best place it has seen</b> and <b>the best place seen by the whole swarm</b>. Like a flock of birds looking for food: each one trusts itself a bit and the group a bit."
    },

    cap_you_start: "The map is covered in fog. <b>Click</b> cells to explore them: you have {n} tries.",
    cap_you_probe: "Depth {d} m. {hint}",
    cap_you_deeper: "It's the deepest point you've found so far!",
    cap_you_notdeeper: "Your record is still {best} m.",
    cap_you_done: "Out of tries! Your deepest point: <b>{best} m</b> ({pct} of the maximum). Now try the algorithms on the right.",
    cap_running: "<b>{name}</b> is searching…",
    cap_exact_done: "Exhaustive search checked <b>all {cells} cells</b>: the deepest point is {best} m. Guaranteed, but what a lot of work!",
    cap_ls_stuck: "Local Search stopped: no cell in the neighbourhood is deeper. It found {best} m ({pct} of the maximum) exploring {cells} cells. {verdict}",
    cap_ls_global: "This time it was the right hole!",
    cap_ls_local: "It's stuck in a <b>local optimum</b>: try again, it starts from a different point.",
    cap_algo_done: "<b>{name}</b> found {best} m ({pct} of the maximum) exploring {cells} cells out of {total}.",
    fb_found: "💎 Found the deepest point!",
    fb_close: "Close, but not the deepest"
  }
};

/* ======= helpers ======= */
const $ = (s,r=document) => r.querySelector(s);
const $$ = (s,r=document) => [...r.querySelectorAll(s)];

let alLang = localStorage.getItem('al_lang') ||
  ((navigator.language||'it').toLowerCase().startsWith('en') ? 'en' : 'it');

function t(key, vars) {
  let s = key.split('.').reduce((o,k) => (o ? o[k] : undefined), AL_I18N[alLang]);
  if (s === undefined) return key;
  if (vars) for (const k in vars) s = s.split('{'+k+'}').join(vars[k]);
  return s;
}

function setLang(lang) {
  alLang = lang;
  const d = AL_I18N[lang];
  $$('[data-i18n]').forEach(el => {
    const k = el.getAttribute('data-i18n');
    if (typeof d[k] === 'string') el.innerHTML = d[k];
  });
  document.title = d.page_title || document.title;
  document.documentElement.lang = lang;
  $('#btn-it')?.setAttribute('aria-pressed', lang === 'it');
  $('#btn-en')?.setAttribute('aria-pressed', lang === 'en');
  localStorage.setItem('al_lang', lang);
  if (typeof onLangChange === 'function') onLangChange();
}
$('#btn-it')?.addEventListener('click', () => setLang('it'));
$('#btn-en')?.addEventListener('click', () => setLang('en'));

const themeBtn = $('#btn-theme');
let currentTheme = localStorage.getItem('al_theme') || 'dark';
function applyTheme(th) {
  currentTheme = th;
  if (th === 'light') document.documentElement.setAttribute('data-theme', 'light');
  else document.documentElement.removeAttribute('data-theme');
  if (themeBtn) themeBtn.textContent = th === 'light' ? '☀' : '☾';
  localStorage.setItem('al_theme', th);
  if (typeof requestDraw === 'function') requestDraw();
}
themeBtn?.addEventListener('click', () => applyTheme(currentTheme === 'light' ? 'dark' : 'light'));
applyTheme(currentTheme);
setLang(alLang);
