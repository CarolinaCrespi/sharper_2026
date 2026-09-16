/* =========================================================
   Come Impara una Macchina — dictionary, language + theme
========================================================= */
const ML_I18N = {
  it: {
    page_title: "Come Impara una Macchina — supervisionato, non supervisionato, rinforzo",
    title: "Come Impara una Macchina",
    tagline: "Tre modi di imparare: con un maestro, da sola, a suon di premi.",
    howto_sup: "<b>Supervisionato</b>: impara da esempi con la risposta giusta",
    howto_unsup: "<b>Non supervisionato</b>: nessuna risposta, trova da sola i gruppi",
    howto_rl: "<b>Rinforzo</b>: prova, sbaglia, riceve premi e punizioni",
    theory_summary: "ℹ️ Qual è la differenza, in pratica?",
    intro_p1: "Nel <b>supervisionato</b> diamo alla macchina tanti esempi <em>già etichettati</em> (\"questa è una mela\", \"questo è un limone\"): impara la regola e poi la usa su casi nuovi. Così funzionano i filtri anti-spam o il riconoscimento delle foto.",
    intro_p2: "Nel <b>non supervisionato</b> le etichette non ci sono: la macchina cerca da sola <em>somiglianze</em> e raggruppa i dati. Scopre i gruppi, ma non sa come si chiamano. Così si trovano i profili dei clienti di un negozio.",
    intro_p3: "Nel <b>rinforzo</b> non ci sono dati da cui partire: un agente <em>agisce</em> in un ambiente e riceve premi o punizioni. Provando e riprovando impara la strategia migliore. Così i robot imparano a camminare e i computer a giocare a scacchi.",

    c0: "Mela", c1: "Limone", c2: "Anguria", c3: "Fragola", c4: "Banana", c5: "Ananas",
    tool_test: "Prova",
    btn_quiz: "🎲 Frutto misterioso",
    chk_zones: "Zone",
    btn_reset: "Reset",
    btn_step: "Passo",
    btn_run: "▶ Avvia",
    btn_pause: "⏸ Pausa",
    chk_truth: "Mostra etichette vere",
    btn_episode: "▶ 1 tentativo",
    btn_train: "⏩ Allena ×10",
    btn_exam: "🎓 Esame",
    lbl_eps: "Curiosità",
    chk_arrows: "Frecce",
    btn_reset_brain: "🔄 Nuova partita",

    side_title: "Modalità",
    m_sup: "Supervisionato", m_sup_sub: "k-Nearest Neighbors",
    m_unsup: "Non supervisionato", m_unsup_sub: "K-Means",
    m_rl: "Con rinforzo", m_rl_sub: "Q-Learning",
    cmp_title: "Tre modi a confronto",
    cmp_h_in: "Cosa riceve", cmp_h_out: "Cosa impara",
    cmp_sup_in: "Dati + risposte giuste", cmp_sup_out: "Una regola per etichettare casi nuovi",
    cmp_unsup_in: "Solo dati", cmp_unsup_out: "Gruppi di dati simili",
    cmp_rl_in: "Premi e punizioni", cmp_rl_out: "Quale azione fare in ogni situazione",

    axis_x: "Grandezza →", axis_y: "Dolcezza ↑",

    help: {
      sup: "<h4>🧑‍🏫 Come si gioca</h4><ol><li>All'inizio la macchina conosce solo 🍎 🍋 🍉. Scegli un frutto in alto e <b>clicca</b> sulla mappa per insegnarle un esempio: anche 🍓 🍌 🍍, che non ha mai visto (hanno il bordo tratteggiato)</li><li>Scegli <b>❓ Prova</b> e clicca: la macchina indovina guardando i <b>k</b> esempi più vicini</li><li><b>🎲 Frutto misterioso</b>: indovina tu prima della macchina! Può uscire uno qualsiasi dei 6 frutti, e quello svelato diventa un nuovo esempio</li></ol>",
      unsup: "<h4>🔍 Come si gioca</h4><ol><li>Sono gli <b>stessi frutti</b>, ma senza etichette: la macchina non sa cosa sono</li><li><b>Clicca</b> sulla mappa per piazzare tu i centri dei gruppi (oppure premi Passo)</li><li><b>Passo</b> / <b>Avvia</b>: i centri si spostano finché i gruppi non cambiano più</li></ol>",
      rl: "<h4>🏆 Come si gioca</h4><ol><li><b>Missione</b>: insegna al robot 🤖 ad arrivare <b>da solo</b> al tesoro 💎 senza cadere nelle buche 🕳️</li><li><b>Allenalo</b> con ▶ 1 tentativo o ⏩ ×10: prova, sbaglia e impara dai premi (💎 <b>+10</b>) e dalle punizioni (🕳️ <b>−10</b>, ogni passo <b>−1</b>)</li><li>Quando pensi che sia pronto premi <b>🎓 Esame</b>: il robot fa un giro senza curiosità, usando solo quello che ha imparato. Se arriva al 💎 <b>hai vinto!</b></li><li>Hai <b>{budget} tentativi</b> in tutto, e anche ogni esame ne usa uno. Meno ne usi, più stelle: ⭐⭐⭐ entro {s3}, ⭐⭐ entro {s2}</li><li>Prima di iniziare puoi <b>cliccare</b> sulle caselle per spostare le buche</li></ol>"
    },
    info: {
      sup: "<h4>Supervisionato · k-NN</h4><div class=\"meta\">Riceve: dati + risposte giuste</div>Per etichettare un frutto nuovo, la macchina guarda i <b>k</b> esempi più vicini e fa votare le loro etichette: vince la maggioranza. Più esempi buoni le dai, meglio indovina. Con <b>k</b> piccolo segue ogni singolo esempio, con <b>k</b> grande è più prudente.",
      unsup: "<h4>Non supervisionato · K-Means</h4><div class=\"meta\">Riceve: solo dati</div>Sceglie <b>K</b> centri, assegna ogni punto al centro più vicino, sposta ogni centro nel punto medio del suo gruppo e ripete finché nulla cambia. Trova i gruppi, ma <b>non sa i loro nomi</b>: siamo noi a dire \"questo gruppo sono le mele\".",
      rl: "<h4>Con rinforzo · Q-Learning</h4><div class=\"meta\">Riceve: premi e punizioni</div>Per ogni casella e ogni direzione il robot tiene un punteggio <b>Q</b>: quanto conviene fare quella mossa. Dopo ogni mossa lo aggiorna con il premio ricevuto. La <b>curiosità</b> è la probabilità di provare una mossa a caso invece della migliore: senza curiosità rischia di non scoprire mai la strada buona. All'<b>esame</b> la curiosità è spenta: si vede solo quello che ha imparato."
    },

    hud_examples: "Esempi", hud_known: "Frutti noti", hud_you: "Tu", hud_machine: "Macchina",
    hud_iter: "Giri", hud_moved: "Spostamenti",
    hud_left: "Tentativi rimasti", hud_exams: "Esami", hud_last: "Ultimo premio",

    cap_sup_start: "La macchina conosce solo 🍎 🍋 🍉. Scegli un frutto in alto e clicca sulla mappa per insegnarle altri esempi, oppure scegli <b>❓ Prova</b> per farla indovinare.",
    cap_sup_added: "Aggiunto un esempio: <b>{fruit}</b>. Ora la macchina ne conosce {n}.",
    cap_sup_new_class: "🆕 Nuovo frutto insegnato: <b>{fruit}</b>! Ora la macchina conosce {known} frutti su {total}. Aggiungine qualche altro esempio, uno solo non basta.",
    cap_sup_pred: "La macchina guarda i {k} esempi più vicini e dice: <b>{emoji} {fruit}</b> ({votes} voti su {k}).",
    cap_sup_empty: "La macchina non ha ancora esempi: senza maestro non sa rispondere!",
    cap_quiz_ask: "Che frutto è il ❓? <b>Scegli tu</b> con i pulsanti in alto, poi vediamo cosa dice la macchina.",
    cap_quiz_res: "Era <b>{truth}</b>. Tu: {you} {youOk} · Macchina: {machine} {machineOk}. {extra}",
    quiz_added: "Il frutto svelato ora è un esempio in più.",
    quiz_unknown: "La macchina non aveva <b>mai visto</b> un {emoji}: non poteva indovinarlo! Ora è il suo primo esempio.",

    cap_un_start: "Stessi frutti, <b>nessuna etichetta</b>. Clicca per piazzare fino a {k} centri, oppure premi <b>Passo</b>.",
    cap_un_placed: "Centro {i} piazzato. {left}",
    cap_un_left: "Puoi piazzarne ancora {n}, oppure premi Passo.",
    cap_un_ready: "Tutti i centri sono pronti: premi <b>Passo</b>.",
    cap_un_assign: "<b>1. Assegnazione</b>: ogni frutto va al centro più vicino.",
    cap_un_update: "<b>2. Aggiornamento</b>: ogni centro si sposta nel punto medio del suo gruppo.",
    cap_un_done: "<b>Convergenza!</b> I gruppi non cambiano più. La macchina ha trovato {k} gruppi… ma non sa che si chiamano mele, limoni e angurie. Attiva <b>Mostra etichette vere</b> per confrontare.",

    cap_rl_start: "🎯 <b>Missione</b>: il robot non sa nulla, insegnagli ad arrivare al 💎 da solo. Allenalo con <b>▶ 1 tentativo</b> o <b>⏩ ×10</b>, poi mettilo alla prova con <b>🎓 Esame</b>. Hai <b>{budget} tentativi</b>.",
    cap_rl_resume: "Missione in corso: allenalo ancora o prova l'<b>🎓 Esame</b>. Tentativi rimasti: <b>{left}</b>.",
    cap_rl_goal: "💎 In allenamento ha trovato il tesoro in {steps} passi (premio <b>{r}</b>). Pronto per l'<b>🎓 Esame</b>? Tentativi rimasti: <b>{left}</b>.",
    cap_rl_hole: "🕳️ Caduto in una buca dopo {steps} passi (premio <b>{r}</b>): imparerà a evitarla. Tentativi rimasti: <b>{left}</b>.",
    cap_rl_timeout: "⌛ Si è perso: {steps} passi senza trovare il tesoro (premio <b>{r}</b>). Tentativi rimasti: <b>{left}</b>.",
    cap_rl_trained: "Fatti {n} tentativi di allenamento. Le <b>frecce</b> mostrano la mossa migliore imparata in ogni casella. Tentativi rimasti: <b>{left}</b>.",
    cap_rl_exam_run: "🎓 <b>Esame</b>: niente curiosità, il robot usa solo quello che ha imparato…",
    cap_rl_exam_fail: "🎓 Esame <b>non superato</b>: {why}. Allenalo ancora un po' e riprova! Tentativi rimasti: <b>{left}</b>.",
    exam_why_hole: "è caduto in una buca",
    exam_why_timeout: "ha girato a vuoto senza trovare il tesoro",
    cap_rl_won: "🏆 <b>Esame superato, hai vinto!</b> Il robot arriva al 💎 da solo in {steps} passi. Hai usato {used} tentativi su {budget}: {stars}",
    cap_rl_lost: "⌛ <b>Tentativi finiti</b>: il robot non ha superato l'esame. Premi <b>🔄 Nuova partita</b> e riprova (allenalo di più prima dell'esame, o cambia la curiosità).",
    cap_rl_edit: "Mappa cambiata: il percorso più breve ora è di {d} passi. Hai <b>{budget} tentativi</b>.",
    cap_rl_locked: "Le buche si spostano solo prima di iniziare o a partita finita: premi <b>🔄 Nuova partita</b>.",
    cap_rl_blocked: "Con quella buca il tesoro diventerebbe irraggiungibile: non si può mettere!",
    toast_rl_won: "Hai vinto!",
    toast_rl_used: "Esame superato usando <b>{used}</b> tentativi su {budget}",
    toast_rl_fail: "Esame non superato: allenalo ancora!",
    toast_rl_lost: "Tentativi finiti",
    toast_rl_lost_sub: "Il robot non ha superato l'esame. Riprova!",
    chart_title: "Premio totale per tentativo di allenamento (sale mentre il robot impara)",

    fb_right: "✓", fb_wrong: "✗"
  },

  en: {
    page_title: "How a Machine Learns — supervised, unsupervised, reinforcement",
    title: "How a Machine Learns",
    tagline: "Three ways to learn: with a teacher, on its own, through rewards.",
    howto_sup: "<b>Supervised</b>: learns from examples with the right answer",
    howto_unsup: "<b>Unsupervised</b>: no answers, finds the groups on its own",
    howto_rl: "<b>Reinforcement</b>: tries, fails, gets rewards and penalties",
    theory_summary: "ℹ️ What's the difference, in practice?",
    intro_p1: "In <b>supervised</b> learning we give the machine many <em>labelled</em> examples (\"this is an apple\", \"this is a lemon\"): it learns the rule and applies it to new cases. That's how spam filters and photo recognition work.",
    intro_p2: "In <b>unsupervised</b> learning there are no labels: the machine looks for <em>similarities</em> on its own and groups the data. It discovers the groups, but doesn't know their names. That's how shops find customer profiles.",
    intro_p3: "In <b>reinforcement</b> learning there is no data to start from: an agent <em>acts</em> in an environment and gets rewards or penalties. By trial and error it learns the best strategy. That's how robots learn to walk and computers learn to play chess.",

    c0: "Apple", c1: "Lemon", c2: "Watermelon", c3: "Strawberry", c4: "Banana", c5: "Pineapple",
    tool_test: "Test",
    btn_quiz: "🎲 Mystery fruit",
    chk_zones: "Zones",
    btn_reset: "Reset",
    btn_step: "Step",
    btn_run: "▶ Run",
    btn_pause: "⏸ Pause",
    chk_truth: "Show true labels",
    btn_episode: "▶ 1 attempt",
    btn_train: "⏩ Train ×10",
    btn_exam: "🎓 Exam",
    lbl_eps: "Curiosity",
    chk_arrows: "Arrows",
    btn_reset_brain: "🔄 New game",

    side_title: "Modes",
    m_sup: "Supervised", m_sup_sub: "k-Nearest Neighbors",
    m_unsup: "Unsupervised", m_unsup_sub: "K-Means",
    m_rl: "Reinforcement", m_rl_sub: "Q-Learning",
    cmp_title: "Three ways compared",
    cmp_h_in: "What it gets", cmp_h_out: "What it learns",
    cmp_sup_in: "Data + right answers", cmp_sup_out: "A rule to label new cases",
    cmp_unsup_in: "Data only", cmp_unsup_out: "Groups of similar data",
    cmp_rl_in: "Rewards and penalties", cmp_rl_out: "Which action to take in each situation",

    axis_x: "Size →", axis_y: "Sweetness ↑",

    help: {
      sup: "<h4>🧑‍🏫 How to play</h4><ol><li>At first the machine only knows 🍎 🍋 🍉. Pick a fruit at the top and <b>click</b> the map to teach it an example: 🍓 🍌 🍍 too, which it has never seen (they have a dashed border)</li><li>Pick <b>❓ Test</b> and click: the machine guesses by looking at the <b>k</b> nearest examples</li><li><b>🎲 Mystery fruit</b>: guess before the machine does! It can be any of the 6 fruits, and the revealed one becomes a new example</li></ol>",
      unsup: "<h4>🔍 How to play</h4><ol><li>These are the <b>same fruits</b>, without labels: the machine doesn't know what they are</li><li><b>Click</b> the map to place the group centres yourself (or press Step)</li><li><b>Step</b> / <b>Run</b>: the centres move until the groups stop changing</li></ol>",
      rl: "<h4>🏆 How to play</h4><ol><li><b>Mission</b>: teach the robot 🤖 to reach the treasure 💎 <b>on its own</b> without falling into holes 🕳️</li><li><b>Train it</b> with ▶ 1 attempt or ⏩ ×10: it tries, fails and learns from rewards (💎 <b>+10</b>) and penalties (🕳️ <b>−10</b>, each step <b>−1</b>)</li><li>When you think it's ready press <b>🎓 Exam</b>: the robot runs with no curiosity, using only what it learned. If it reaches the 💎 <b>you win!</b></li><li>You have <b>{budget} attempts</b> in total, and each exam uses one too. The fewer you use, the more stars: ⭐⭐⭐ within {s3}, ⭐⭐ within {s2}</li><li>Before you start you can <b>click</b> the cells to move the holes</li></ol>"
    },
    info: {
      sup: "<h4>Supervised · k-NN</h4><div class=\"meta\">Gets: data + right answers</div>To label a new fruit, the machine looks at the <b>k</b> nearest examples and lets their labels vote: the majority wins. The more good examples you give it, the better it guesses. With a small <b>k</b> it follows every single example, with a large <b>k</b> it's more cautious.",
      unsup: "<h4>Unsupervised · K-Means</h4><div class=\"meta\">Gets: data only</div>It picks <b>K</b> centres, assigns each point to the nearest centre, moves each centre to the middle of its group and repeats until nothing changes. It finds the groups, but <b>doesn't know their names</b>: we are the ones who say \"this group is the apples\".",
      rl: "<h4>Reinforcement · Q-Learning</h4><div class=\"meta\">Gets: rewards and penalties</div>For every cell and every direction the robot keeps a score <b>Q</b>: how good that move is. After each move it updates it with the reward it got. <b>Curiosity</b> is the chance of trying a random move instead of the best one: without curiosity it may never discover the good path. At the <b>exam</b> curiosity is off: you only see what it learned."
    },

    hud_examples: "Examples", hud_known: "Known fruits", hud_you: "You", hud_machine: "Machine",
    hud_iter: "Rounds", hud_moved: "Changes",
    hud_left: "Attempts left", hud_exams: "Exams", hud_last: "Last reward",

    cap_sup_start: "The machine only knows 🍎 🍋 🍉. Pick a fruit at the top and click the map to teach it more examples, or pick <b>❓ Test</b> to let it guess.",
    cap_sup_added: "Added an example: <b>{fruit}</b>. The machine now knows {n}.",
    cap_sup_new_class: "🆕 New fruit taught: <b>{fruit}</b>! The machine now knows {known} fruits out of {total}. Add a few more examples, one isn't enough.",
    cap_sup_pred: "The machine looks at the {k} nearest examples and says: <b>{emoji} {fruit}</b> ({votes} votes out of {k}).",
    cap_sup_empty: "The machine has no examples yet: without a teacher it can't answer!",
    cap_quiz_ask: "What fruit is the ❓? <b>Choose</b> with the buttons at the top, then let's see what the machine says.",
    cap_quiz_res: "It was <b>{truth}</b>. You: {you} {youOk} · Machine: {machine} {machineOk}. {extra}",
    quiz_added: "The revealed fruit is now one more example.",
    quiz_unknown: "The machine had <b>never seen</b> a {emoji}: it couldn't guess it! Now it's its first example.",

    cap_un_start: "Same fruits, <b>no labels</b>. Click to place up to {k} centres, or press <b>Step</b>.",
    cap_un_placed: "Centre {i} placed. {left}",
    cap_un_left: "You can place {n} more, or press Step.",
    cap_un_ready: "All centres are ready: press <b>Step</b>.",
    cap_un_assign: "<b>1. Assignment</b>: each fruit goes to the nearest centre.",
    cap_un_update: "<b>2. Update</b>: each centre moves to the middle of its group.",
    cap_un_done: "<b>Converged!</b> The groups don't change anymore. The machine found {k} groups… but doesn't know they're called apples, lemons and watermelons. Turn on <b>Show true labels</b> to compare.",

    cap_rl_start: "🎯 <b>Mission</b>: the robot knows nothing, teach it to reach the 💎 on its own. Train it with <b>▶ 1 attempt</b> or <b>⏩ ×10</b>, then put it to the test with <b>🎓 Exam</b>. You have <b>{budget} attempts</b>.",
    cap_rl_resume: "Mission in progress: keep training or try the <b>🎓 Exam</b>. Attempts left: <b>{left}</b>.",
    cap_rl_goal: "💎 In training it found the treasure in {steps} steps (reward <b>{r}</b>). Ready for the <b>🎓 Exam</b>? Attempts left: <b>{left}</b>.",
    cap_rl_hole: "🕳️ Fell into a hole after {steps} steps (reward <b>{r}</b>): it will learn to avoid it. Attempts left: <b>{left}</b>.",
    cap_rl_timeout: "⌛ Got lost: {steps} steps without finding the treasure (reward <b>{r}</b>). Attempts left: <b>{left}</b>.",
    cap_rl_trained: "{n} training attempts done. The <b>arrows</b> show the best move it learned in each cell. Attempts left: <b>{left}</b>.",
    cap_rl_exam_run: "🎓 <b>Exam</b>: no curiosity, the robot only uses what it learned…",
    cap_rl_exam_fail: "🎓 Exam <b>failed</b>: {why}. Train it a bit more and try again! Attempts left: <b>{left}</b>.",
    exam_why_hole: "it fell into a hole",
    exam_why_timeout: "it wandered around without finding the treasure",
    cap_rl_won: "🏆 <b>Exam passed, you win!</b> The robot reaches the 💎 on its own in {steps} steps. You used {used} attempts out of {budget}: {stars}",
    cap_rl_lost: "⌛ <b>Out of attempts</b>: the robot didn't pass the exam. Press <b>🔄 New game</b> and try again (train more before the exam, or change the curiosity).",
    cap_rl_edit: "Map changed: the shortest route is now {d} steps. You have <b>{budget} attempts</b>.",
    cap_rl_locked: "Holes can only be moved before starting or once the game is over: press <b>🔄 New game</b>.",
    cap_rl_blocked: "With that hole the treasure would be unreachable: it can't go there!",
    toast_rl_won: "You win!",
    toast_rl_used: "Exam passed using <b>{used}</b> attempts out of {budget}",
    toast_rl_fail: "Exam failed: keep training!",
    toast_rl_lost: "Out of attempts",
    toast_rl_lost_sub: "The robot didn't pass the exam. Try again!",
    chart_title: "Total reward per training attempt (goes up as the robot learns)",

    fb_right: "✓", fb_wrong: "✗"
  }
};

/* ======= helpers ======= */
const $ = (s,r=document) => r.querySelector(s);
const $$ = (s,r=document) => [...r.querySelectorAll(s)];

let mlLang = localStorage.getItem('ml_lang') ||
  ((navigator.language||'it').toLowerCase().startsWith('en') ? 'en' : 'it');

/* t('key', {var: value}) → translated string with {var} filled in */
function t(key, vars) {
  let s = key.split('.').reduce((o,k) => (o ? o[k] : undefined), ML_I18N[mlLang]);
  if (s === undefined) return key;
  if (vars) for (const k in vars) s = s.split('{'+k+'}').join(vars[k]);
  return s;
}

function setLang(lang) {
  mlLang = lang;
  const d = ML_I18N[lang];
  $$('[data-i18n]').forEach(el => {
    const k = el.getAttribute('data-i18n');
    if (typeof d[k] === 'string') el.innerHTML = d[k];
  });
  document.title = d.page_title || document.title;
  document.documentElement.lang = lang;
  $('#btn-it')?.setAttribute('aria-pressed', lang === 'it');
  $('#btn-en')?.setAttribute('aria-pressed', lang === 'en');
  localStorage.setItem('ml_lang', lang);
  if (typeof onLangChange === 'function') onLangChange();
}
$('#btn-it')?.addEventListener('click', () => setLang('it'));
$('#btn-en')?.addEventListener('click', () => setLang('en'));

/* ======= theme toggle ======= */
const themeBtn = $('#btn-theme');
let currentTheme = localStorage.getItem('ml_theme') || 'dark';
function applyTheme(th) {
  currentTheme = th;
  if (th === 'light') document.documentElement.setAttribute('data-theme', 'light');
  else document.documentElement.removeAttribute('data-theme');
  if (themeBtn) themeBtn.textContent = th === 'light' ? '☀' : '☾';
  localStorage.setItem('ml_theme', th);
  if (typeof requestDraw === 'function') requestDraw();
}
themeBtn?.addEventListener('click', () => applyTheme(currentTheme === 'light' ? 'dark' : 'light'));
applyTheme(currentTheme);
setLang(mlLang);
