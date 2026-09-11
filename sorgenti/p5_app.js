// ---------- Stato ----------
const LS_KEY = "settimana-nel-piatto-v1";
const LS_UI = "settimana-nel-piatto-ui";
const GROUP_TAG = { uova: "Uova", formaggio: "Formaggio", legumi: "Legumi", vegetale: "Tofu & co.", libero: "Libero" };
const PERSIST = ["v", "example", "seed", "stalled", "training", "times", "free", "likes", "ov", "savedAt"];

function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* niente */ } }

const S = defaultState();
function adopt(saved) {
  if (!saved || saved.v !== 1) return;
  PERSIST.forEach((k) => { if (saved[k] !== undefined) S[k] = saved[k]; });
  S.likes = Object.assign(defaultState().likes, saved.likes || {});
  // vecchia versione: allenamento salvato come "am/early/late/no", senza orario
  if (Array.isArray(S.training) && typeof S.training[0] === "string") {
    const map = { am: "09:00", early: "14:30", late: "18:00" };
    S.training = S.training.map((k) => ({ on: k !== "no", time: map[k] || "18:00", dur: 60 }));
  }
  if (!S.times) S.times = { pranzo: "13:00", cena: "20:00" };
}
adopt(lsGet(LS_KEY));
const ui = lsGet(LS_UI) || {};
const today = new Date();
const thisMonday = toISO(mondayOf(today));
S.tab = ui.tab || "week";
S.view = ui.view || "day";
S.weekStart = ui.weekStart || thisMonday;
S.day = ui.weekStart === thisMonday || !ui.weekStart ? (today.getDay() + 6) % 7 : (ui.day || 0);
let openEditor = null;

function persistable() { const o = {}; PERSIST.forEach((k) => (o[k] = S[k])); return o; }
let dbRef = null, dbTimer = null;
function save(markEdited) {
  if (markEdited) S.example = false;
  S.savedAt = Date.now();
  lsSet(LS_KEY, persistable());
  if (dbRef) { clearTimeout(dbTimer); dbTimer = setTimeout(() => dbRef.set(persistable()).catch(() => {}), 700); }
}
function saveUI() { lsSet(LS_UI, { tab: S.tab, view: S.view, weekStart: S.weekStart, day: S.day }); }

// ---------- Utilità ----------
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const safeId = (s) => String(s).replace(/[^a-zA-Z0-9_-]/g, "-");
let toastT = null;
function toast(msg) { const t = $("toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 2200); }
function fmtRange(ws) {
  const a = parseISO(ws), b = addDays(a, 6);
  return a.getMonth() === b.getMonth() ? a.getDate() + " – " + b.getDate() + " " + MONTHS[b.getMonth()] : a.getDate() + " " + MONTHS[a.getMonth()].slice(0, 3) + " – " + b.getDate() + " " + MONTHS[b.getMonth()].slice(0, 3);
}

// ---------- Render generale ----------
function render() {
  const W = buildWeek(S);
  document.querySelectorAll(".steps button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === S.tab)));
  ["week", "train", "likes"].forEach((t) => ($("pane-" + t).hidden = S.tab !== t));
  const wlabel = W.wi < 0 ? "prima dell'inizio" : "Settimana " + (W.wi + 1);
  $("wk-label").innerHTML = "<b>" + fmtRange(S.weekStart) + "</b><span>" + wlabel + '</span><span class="phase">Fase ' + (S.stalled && W.stalledOk ? "3" : W.phase) + "</span>";
  $("banner").innerHTML = S.example
    ? '<div class="banner"><span><b>Questa settimana è un esempio.</b> I giorni di allenamento e i cibi li ho messi io. Cambiali e il calendario si rifà da solo.</span><button type="button" data-action="tab" data-tab="train">Parti dal passo 1</button></div>'
    : "";
  if (S.tab === "week") renderWeek(W);
  if (S.tab === "train") renderTrain(W);
  if (S.tab === "likes") renderLikes();
}

// ---------- Passo 3: la settimana ----------
function renderWeek(W) {
  const top = window.top === window.self;
  let h = '<div class="toolbar"><div class="view-toggle" role="group" aria-label="Vista">' +
    '<button type="button" class="chipbtn" data-action="view" data-view="day" aria-pressed="' + (S.view === "day") + '">Un giorno</button>' +
    '<button type="button" class="chipbtn" data-action="view" data-view="week" aria-pressed="' + (S.view === "week") + '">Tutta la settimana</button></div>' +
    '<div class="btns"><button type="button" class="btn ghost" data-action="shuffle">Rimescola la settimana</button>' +
    (top ? '<button type="button" class="btn ghost" data-action="print">Stampa</button>' : "") + "</div></div>";

  if (S.view === "day") {
    h += '<div class="days" role="group" aria-label="Giorni">';
    W.days.forEach((day) => {
      const isToday = toISO(day.date) === toISO(today);
      h += '<button type="button" class="day-btn' + (day.isTrain ? " is-train" : "") + '" data-action="day" data-day="' + day.d + '" aria-pressed="' + (S.day === day.d) + '">' +
        (isToday ? '<span class="today">oggi</span>' : "") +
        '<span class="dn">' + DAY_SHORT[day.d] + '</span><span class="dd"> ' + day.date.getDate() + '</span><span class="tr">' + (day.isTrain ? day.time : "riposo") + "</span></button>";
    });
    h += "</div>";
  }

  h += '<div class="main"><div>';
  h += S.view === "day" ? renderDay(W.days[S.day]) : renderGrid(W);
  h += "</div>" + renderSide(W) + "</div>";
  $("pane-week").innerHTML = h;
}

function renderDay(day) {
  let h = '<div class="dayhead"><h2>' + DAY_NAMES[day.d] + " " + day.date.getDate() + " " + MONTHS[day.date.getMonth()] + "</h2>" +
    '<span class="kind' + (day.isTrain ? " train" : "") + '">' + (day.isTrain ? "Allenamento " + day.trainSub + " · " + KIND_LABEL[day.train] : "Riposo") + "</span></div>";
  h += '<div class="timeline">';
  day.items.forEach((it) => {
    h += '<div class="slot"><div class="when"><b>' + esc(it.when) + "</b>" + (it.sub ? "<span>" + esc(it.sub) + "</span>" : "") + "</div>" + card(it, day.d) + "</div>";
  });
  return h + "</div>";
}

function card(it, d) {
  const cls = ["meal"];
  if (it.group) cls.push("g-" + it.group);
  if (it.train) cls.push("train");
  if (it.small) cls.push("small");
  const edKey = it.edit ? it.edit.key : null;
  const isOpen = edKey && openEditor === edKey;
  let h = '<article class="' + cls.join(" ") + '"><div class="meal-h"><h3>' + esc(it.title) + "</h3>";
  if (it.group) h += '<span class="tag ' + it.group + '">' + GROUP_TAG[it.group] + (it.stag ? " stagionato" : "") + "</span>";
  if (it.edit) h += '<button type="button" class="edit-btn" data-action="edit" data-key="' + esc(edKey) + '" aria-expanded="' + !!isOpen + '">' + (isOpen ? "Chiudi" : "Cambia") + "</button>";
  h += "</div>";
  if (it.lines.length) {
    h += '<ul class="items">';
    it.lines.forEach((l) => { h += "<li" + (l[2] === "extra" ? ' class="extra"' : "") + '><span class="q">' + esc(l[0]) + '</span><span class="w">' + esc(l[1]) + "</span></li>"; });
    h += "</ul>";
  }
  if (it.note) h += '<p class="note">' + esc(it.note) + "</p>";
  if (isOpen) h += editor(it.edit);
  return h + "</article>";
}

function editor(ed) {
  let h = '<div class="editor">';
  ed.fields.forEach((f) => {
    const id = "ed-" + safeId(ed.key + "-" + f.f);
    h += '<label for="' + id + '">' + esc(f.label) + '<select id="' + id + '" data-action="set" data-key="' + esc(ed.key) + '" data-field="' + f.f + '">';
    if (f.groups) {
      CAT.groups.forEach((g) => {
        h += '<optgroup label="' + esc(g.name) + '">';
        CAT.sec.filter((s) => s.g === g.id).forEach((s) => { h += '<option value="' + s.id + '"' + (s.id === f.val ? " selected" : "") + ">" + esc(s.name + (s.stag ? " (stagionato)" : "")) + "</option>"; });
        h += "</optgroup>";
      });
    } else {
      f.opts.forEach((o) => { h += '<option value="' + esc(o[0]) + '"' + (o[0] === f.val ? " selected" : "") + ">" + esc(o[1]) + "</option>"; });
    }
    h += "</select></label>";
  });
  h += '<div style="align-self:end"><button type="button" class="btn ghost" data-action="reset" data-key="' + esc(ed.key) + '">Torna alla proposta</button></div>';
  return h + "</div>";
}

function renderGrid(W) {
  let h = '<div class="weekgrid-wrap"><div class="weekgrid">';
  W.days.forEach((day) => {
    h += '<div class="wcol"><button type="button" class="wcol-h' + (day.isTrain ? " train" : "") + '" data-action="openday" data-day="' + day.d + '"><b>' + DAY_SHORT[day.d] + " " + day.date.getDate() + "</b><span>" + (day.isTrain ? "allenamento " + day.time : "riposo") + "</span></button>";
    day.items.forEach((it) => {
      if (it.slot === "ginseng" || it.slot === "dur") return;
      const label = { col: "Colazione", pranzo: "Pranzo", cena: "Cena", snack: "Spuntino", pre: "Prima allen.", post: "Dopo allen.", postam: "Dopo allen. (se vuoi)", choc: "Dopo cena" }[it.slot] || it.when;
      const text = it.slot === "pranzo" || it.slot === "cena" || it.slot === "choc" ? it.title : (it.short || it.title);
      const cls = ["wcell"];
      if (it.group) cls.push("g-" + it.group);
      if (it.train) cls.push("train");
      h += '<div class="' + cls.join(" ") + '"><i>' + label + "</i>" + esc(cap(text)) + "</div>";
    });
    h += "</div>";
  });
  return h + "</div></div>";
}

function renderSide(W) {
  const c = W.count;
  const row = (color, name, val, min, max) => {
    const ok = val >= min && val <= max;
    const rng = min === max ? String(min) : min === 0 ? "max " + max : min + "–" + max;
    return '<li><span class="dot" style="background:' + color + '"></span><span>' + name + '</span><span class="val ' + (ok ? "ok" : "bad") + '">' + val + ' <span class="rng">/ ' + rng + "</span></span></li>";
  };
  let h = '<aside class="side"><div class="panel"><h3>Quote della settimana</h3><ul class="quota">' +
    row("var(--uova)", "Uova", c.uova, 3, 4) + row("var(--formaggio)", "Formaggio", c.formaggio, 3, 4) +
    row("var(--legumi)", "Legumi", c.legumi, 3, 4) + row("var(--vegetale)", "Tofu, seitan, burger", c.vegetale, 4, 4) +
    row("var(--muted)", "Formaggio stagionato", c.stag, 0, 1) + row("var(--muted)", "Dessert proteico", c.dessert, 0, 1) +
    row("var(--muted)", "Cioccolatini", c.choc, 2, 3) + "</ul>";
  const bad = c.uova < 3 || c.uova > 4 || c.formaggio < 3 || c.formaggio > 4 || c.legumi < 3 || c.legumi > 4 || c.vegetale !== 4 || c.stag > 1 || c.dessert > 1;
  h += '<p class="hint">' + (bad ? "Un numero è fuori quota: cambia il secondo di un pranzo o di una cena finché torna verde." : "Tutto in quota. Il pasto libero è " + DAY_NAMES[S.free.d].toLowerCase() + " a " + S.free.m + ".") + "</p></div>";
  if (S.view === "day") {
    h += '<div class="panel"><h3>Ogni giorno</h3><ul class="daily">' +
      "<li>Acqua <b>1,5–2 L</b> · 9–10 bicchieri</li><li>Frutta <b>2</b> · già nel calendario</li><li>Verdura <b>2–3</b> · a pranzo e a cena</li><li>Caffè <b>max 3–4</b>, senza zucchero</li></ul></div>";
  }
  return h + "</aside>";
}

// ---------- Passo 1: allenamenti ----------
function renderTrain(W) {
  let h = '<div class="section"><h2>Quando mi alleno</h2><p>Per ogni giorno scegli se ti alleni, a che ora inizi e quanto dura. Da qui la pagina capisce dove mettere gli spuntini. Vale uguale per tutte le settimane.</p>';
  for (let d = 0; d < 7; d++) {
    const tr = S.training[d];
    const kind = trainKind(tr, S.times);
    h += '<div class="trow"><div class="lbl">' + DAY_NAMES[d] + '</div><div class="trctl">' +
      '<div class="seg seg2" role="group" aria-label="' + DAY_NAMES[d] + '">' +
      '<button type="button" id="ton-' + d + '-0" data-action="ton" data-day="' + d + '" data-val="0" aria-pressed="' + !tr.on + '">Riposo</button>' +
      '<button type="button" id="ton-' + d + '-1" class="t" data-action="ton" data-day="' + d + '" data-val="1" aria-pressed="' + !!tr.on + '">Mi alleno</button></div>';
    if (tr.on) {
      h += '<label class="tfield" for="tt-' + d + '">alle <input type="time" id="tt-' + d + '" step="900" value="' + esc(String(tr.time).padStart(5, "0")) + '" data-action="ttime" data-day="' + d + '"></label>' +
        '<label class="tfield" for="td-' + d + '">per <select id="td-' + d + '" data-action="tdur" data-day="' + d + '">' +
        DURATIONS.map((m) => '<option value="' + m + '"' + (+tr.dur === m ? " selected" : "") + ">" + DUR_LABEL[m] + "</option>").join("") + "</select></label>";
      const tl = { am: "Prima di pranzo: dopo puoi fare uno spuntino in più.", early: "Dopo pranzo: lo spuntino lo fai subito dopo, verso " + fmtMin(toMin(tr.time) + (+tr.dur || 60)) + ".",
        late: "Prima di cena: spuntino «prima» verso " + fmtMin(preTime(tr, S.times)) + ".", eve: "Dopo cena: il piano non lo prevede, chiedi al nutrizionista." }[kind];
      h += '<span class="kindtxt">' + tl + "</span>";
    }
    h += "</div></div>";
  }
  h += "</div>";

  h += '<div class="section"><h2>I miei orari dei pasti</h2><p>La colazione è sempre tra le 9:30 e le 11:00, come dice il piano. Pranzo e cena mettili tu.</p><div class="fieldrow">' +
    '<label class="tfield" for="mt-pranzo">Pranzo alle <input type="time" id="mt-pranzo" step="900" value="' + esc(S.times.pranzo.padStart(5, "0")) + '" data-action="mtime" data-meal="pranzo"></label>' +
    '<label class="tfield" for="mt-cena">Cena alle <input type="time" id="mt-cena" step="900" value="' + esc(S.times.cena.padStart(5, "0")) + '" data-action="mtime" data-meal="cena"></label></div></div>';

  h += '<div class="section"><h2>Durante l\'allenamento</h2><p>Cosa metti nell\'acqua che bevi mentre ti alleni.</p><div class="chips">';
  CAT.during.forEach((o) => { h += '<button type="button" class="chip" id="du-' + o.id + '" data-action="during" data-val="' + o.id + '" aria-pressed="' + (S.likes.during === o.id) + '">' + esc(o.name) + "<small>" + esc(o.lines[0][0] ? o.lines[0][0] + " nell'acqua" : "nell'acqua") + "</small></button>"; });
  h += "</div></div>";

  h += '<div class="section"><h2>Pasto libero</h2><p>Uno a settimana, senza esagerare (es. una pizza o un sushi).</p><div class="fieldrow"><select id="free-d" data-action="free-d" aria-label="Giorno del pasto libero">';
  DAY_NAMES.forEach((n, i) => { h += '<option value="' + i + '"' + (S.free.d === i ? " selected" : "") + ">" + n + "</option>"; });
  h += '</select><select id="free-m" data-action="free-m" aria-label="Pasto">' +
    '<option value="pranzo"' + (S.free.m === "pranzo" ? " selected" : "") + ">a pranzo</option>" +
    '<option value="cena"' + (S.free.m === "cena" ? " selected" : "") + ">a cena</option></select></div></div>";

  h += '<div class="section"><h2>Il peso si è bloccato?</h2><p>Dal 19 ottobre (dopo 6 settimane), se il peso non sale più, il pranzo dei giorni di allenamento aumenta: 200 g di pasta invece di 180 g.</p>' +
    '<label class="switch" for="stalled"><input type="checkbox" id="stalled" data-action="stalled"' + (S.stalled ? " checked" : "") + "><span>Sì, il peso si è bloccato" + (W.stalledOk ? "" : " <small style=\"color:var(--muted)\">(si applica dal 19 ottobre, non a questa settimana)</small>") + "</span></label></div>";
  h += '<div class="btns"><button type="button" class="btn" data-action="tab" data-tab="likes">Avanti: cosa mi piace</button></div>';
  $("pane-train").innerHTML = h;
}

// ---------- Passo 2: cosa mi piace ----------
function chipList(listKey, items) {
  return '<div class="chips">' + items.map((o) => {
    const id = typeof o === "string" ? o : o.id;
    const name = typeof o === "string" ? cap(o) : o.name;
    const sub = typeof o === "string" ? "" : (o.sub || (o.g && typeof o.g === "number" ? o.g + " g a porzione" : ""));
    return '<button type="button" class="chip" id="lk-' + listKey + "-" + safeId(id) + '" data-action="like" data-list="' + listKey + '" data-val="' + esc(id) + '" aria-pressed="' + S.likes[listKey].includes(id) + '">' + esc(name) + (sub ? "<small>" + esc(sub) + "</small>" : "") + "</button>";
  }).join("") + "</div>";
}
function renderLikes() {
  const secs = (g, stag) => CAT.sec.filter((s) => s.g === g && !!s.stag === !!stag);
  const dot = (v) => '<span class="sect-dot" style="background:var(--' + v + ')"></span>';
  let h = '<p style="margin:0 0 14px;color:var(--muted);max-width:62ch">Tocca un cibo per accenderlo o spegnerlo. Il calendario usa solo quelli accesi e li fa girare durante la settimana.</p><div class="likes-grid">';
  h += '<div class="section"><h2>Colazione</h2><div class="sub-h">Proteina</div>' + chipList("colProt", CAT.colProt) + '<div class="sub-h">Carboidrato</div>' + chipList("colCarb", CAT.colCarb) +
    '<div class="sub-h">Colazione salata</div><div class="chips"><button type="button" class="chip" id="lk-colB" data-action="colB" aria-pressed="' + S.likes.colB + '">Pane, Biraghini e frutta<small>2 giorni a settimana</small></button></div></div>';
  h += '<div class="section"><h2>Pranzo e cena</h2><div class="sub-h">Pasta, riso o pane</div>' + chipList("carb", CAT.carb) + '<div class="sub-h">Condimenti per la pasta</div>' + chipList("cond", CAT.cond) + "</div>";
  h += '<div class="section"><h2>Secondi</h2><div class="sub-h">' + dot("uova") + "Uova</div>" + chipList("sec", secs("uova")) +
    '<div class="sub-h">' + dot("formaggio") + "Formaggi</div>" + chipList("sec", secs("formaggio")) +
    '<div class="sub-h">' + dot("formaggio") + "Stagionati · max 1 a settimana</div>" + chipList("sec", secs("formaggio", true)) +
    '<div class="sub-h">' + dot("legumi") + "Legumi</div>" + chipList("sec", secs("legumi")) +
    '<div class="sub-h">' + dot("vegetale") + "Tofu, seitan, burger</div>" + chipList("sec", secs("vegetale")) + "</div>";
  h += '<div class="section"><h2>Verdure</h2><p>Non si pesano.</p>' + chipList("veg", CAT.veg) + "</div>";
  h += '<div class="section"><h2>Frutta</h2><p>2 porzioni al giorno. Il peso di una porzione è sotto il nome.</p>' + chipList("fruit", CAT.fruit) + "</div>";
  h += '<div class="section"><h2>Spuntini</h2><div class="sub-h">Pomeriggio, giorni normali</div>' + chipList("snack", CAT.snack) +
    '<div class="sub-h">Prima dell\'allenamento</div>' + chipList("pre", CAT.pre) + '<div class="sub-h">Dopo l\'allenamento</div>' + chipList("post", CAT.post) + "</div>";
  h += '</div><div class="btns" style="margin-top:14px"><button type="button" class="btn" data-action="tab" data-tab="week">Fatto: vedi la settimana</button></div>';
  $("pane-likes").innerHTML = h;
}

// ---------- Eventi ----------
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-action]");
  if (!b || b.tagName === "SELECT" || b.tagName === "INPUT") return;
  const a = b.dataset.action;
  if (b.dataset.tab && (a === "tab" || b.closest(".steps"))) { S.tab = b.dataset.tab; openEditor = null; saveUI(); render(); window.scrollTo({ top: 0 }); return; }
  if (a === "view") { S.view = b.dataset.view; openEditor = null; saveUI(); render(); }
  else if (a === "day") { S.day = +b.dataset.day; openEditor = null; saveUI(); render(); }
  else if (a === "openday") { S.day = +b.dataset.day; S.view = "day"; saveUI(); render(); }
  else if (a === "edit") { openEditor = openEditor === b.dataset.key ? null : b.dataset.key; render(); }
  else if (a === "reset") {
    const wi = weekIndex(S.weekStart);
    Object.keys(S.ov).forEach((k) => { if (k.startsWith(wi + "|" + b.dataset.key + "|")) delete S.ov[k]; });
    save(); render(); toast("Tornato alla proposta");
  }
  else if (a === "shuffle") {
    const wi = weekIndex(S.weekStart);
    Object.keys(S.ov).forEach((k) => { if (k.startsWith(wi + "|")) delete S.ov[k]; });
    S.seed = (S.seed % 9973) + 1; openEditor = null; save(); render(); toast("Settimana rimescolata");
  }
  else if (a === "print") { S.view = "week"; render(); setTimeout(() => window.print(), 50); }
  else if (a === "ton") { S.training[+b.dataset.day].on = b.dataset.val === "1"; save(true); render(); }
  else if (a === "during") { S.likes.during = b.dataset.val; save(true); render(); }
  else if (a === "colB") { S.likes.colB = !S.likes.colB; save(true); render(); }
  else if (a === "like") {
    const list = S.likes[b.dataset.list], v = b.dataset.val, i = list.indexOf(v);
    if (i >= 0) {
      if (list.length === 1) { toast("Tienine acceso almeno uno"); return; }
      list.splice(i, 1);
    } else list.push(v);
    save(true); render();
  }
});
document.addEventListener("change", (e) => {
  const t = e.target, a = t.dataset.action;
  if (a === "set") {
    const wi = weekIndex(S.weekStart);
    S.ov[wi + "|" + t.dataset.key + "|" + t.dataset.field] = t.value;
    save(); render();
    const again = document.getElementById(t.id); if (again) again.focus();
  } else if (a === "ttime" || a === "tdur" || a === "mtime") {
    if (a === "ttime") { if (!t.value) return; S.training[+t.dataset.day].time = t.value; }
    if (a === "tdur") S.training[+t.dataset.day].dur = +t.value;
    if (a === "mtime") { if (!t.value) return; S.times[t.dataset.meal] = t.value; }
    save(true); render();
    const again = document.getElementById(t.id); if (again) again.focus();
  } else if (a === "free-d") { S.free.d = +t.value; save(true); render(); }
  else if (a === "free-m") { S.free.m = t.value; save(true); render(); }
  else if (a === "stalled") { S.stalled = t.checked; save(true); render(); }
});
$("wk-prev").addEventListener("click", () => { S.weekStart = toISO(addDays(parseISO(S.weekStart), -7)); openEditor = null; saveUI(); render(); });
$("wk-next").addEventListener("click", () => { S.weekStart = toISO(addDays(parseISO(S.weekStart), 7)); openEditor = null; saveUI(); render(); });

render();

// ---------- Salvataggio condiviso fra PC e telefono (se disponibile) ----------
(async () => {
  const use = window.claude && window.claude.use;
  if (!use) return;
  let db = null;
  try { db = await window.claude.use("db"); } catch (e) { db = null; }
  if (!db) return;
  const ref = db.doc("planner/state");
  ref.onSnapshot((snap) => {
    if (!snap.exists || snap.metadata.hasPendingWrites) return;
    const data = snap.data();
    if (data && (data.savedAt || 0) > (S.savedAt || 0)) { adopt(data); lsSet(LS_KEY, persistable()); render(); }
  }, () => {});
  dbRef = ref;
  try {
    const snap = await ref.get();
    if (!snap.exists && S.savedAt) ref.set(persistable()).catch(() => {});
  } catch (e) { /* resta in locale */ }
})();
