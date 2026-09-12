// ---------- Date ----------
const DAY_MS = 86400000;
function parseISO(s) { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
function toISO(dt) { return dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0"); }
function mondayOf(dt) { const x = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()); const wd = (x.getDay() + 6) % 7; x.setDate(x.getDate() - wd); return x; }
function addDays(dt, n) { const x = new Date(dt); x.setDate(x.getDate() + n); return x; }
function weekIndex(ws) { return Math.round((parseISO(ws) - parseISO(PLAN_START)) / (7 * DAY_MS)); }
function phaseFor(wi) { return wi < 3 ? 1 : 2; }
function fase3Possible(wi) { return wi >= 6; }

// ---------- Orari ----------
function toMin(s) { const [h, m] = String(s || "0:0").split(":").map(Number); return (h || 0) * 60 + (m || 0); }
function fmtMin(n) { n = ((Math.round(n / 5) * 5) % 1440 + 1440) % 1440; return Math.floor(n / 60) + ":" + String(n % 60).padStart(2, "0"); }
// Regola di Gabriele: mai mangiare mentre ti alleni, e ogni pasto (colazione e spuntini compresi)
// almeno 1 ora e mezza prima dell'inizio; dopo l'allenamento si mangia anche subito.
// Un pasto che cade in mezzo va prima o dopo, dove si sposta di meno.
const GAP = 90, GAP_MAIN = GAP, GAP_LIGHT = GAP, COL = 570, COL_END = 660;
function fitAround(pref, gap, s, e, lo) {
  if (pref <= s - gap || pref >= e) return pref;
  const before = s - gap;
  if (before >= lo && pref - before <= e - pref) return before;
  return e;
}
function planDay(tr, times) {
  const L = toMin(times.pranzo), C = toMin(times.cena);
  const mid = (a, b) => Math.round((a + b) / 2 / 30) * 30;
  const p = { kind: "no", col: COL, pranzo: L, cena: C, snack: mid(L, C), pre: null, post: null, moved: {} };
  if (!tr || !tr.on) return p;
  const s = toMin(tr.time), e = s + (+tr.dur || 60);
  p.s = s; p.e = e;
  // colazione: se si sovrappone, meglio subito dopo (se resta entro le 11), altrimenti 1 ora prima
  if (!(COL <= s - GAP_LIGHT || COL >= e)) p.col = e <= COL_END ? e : (s - GAP_LIGHT >= 360 ? s - GAP_LIGHT : e);
  p.pranzo = fitAround(L, GAP_MAIN, s, e, Math.max(L - 120, p.col + 120));
  p.cena = fitAround(C, GAP_MAIN, s, e, Math.max(C - 150, p.pranzo + 240));
  if (p.col !== COL) p.moved.col = COL;
  if (p.pranzo !== L) p.moved.pranzo = L;
  if (p.cena !== C) p.moved.cena = C;
  const next = [p.col, p.pranzo, p.cena].filter((t) => t >= e).sort((a, b) => a - b)[0];
  const mealRightAfter = next != null && next - e <= 60;
  p.snack = mid(p.pranzo, p.cena);
  if (e <= p.pranzo) { p.kind = "am"; p.post = mealRightAfter ? null : e; }
  else if (s >= p.cena) p.kind = "eve";
  else if (s - p.pranzo < 180) { p.kind = "early"; p.snack = null; p.post = mealRightAfter ? null : e; }
  else { p.kind = "late"; p.snack = null; p.pre = s - GAP; }
  return p;
}
function movedNote(which, p) {
  const from = p.moved[which];
  if (from == null) return "";
  const name = { col: "Colazione", pranzo: "Pranzo", cena: "Cena" }[which];
  const o = which === "pranzo" ? "o" : "a";
  if (p[which] < from) return name + " anticipat" + o + " (di solito alle " + fmtMin(from) + "): così hai 1 ora e mezza per digerire prima dell'allenamento.";
  return name + " spostat" + o + " a dopo l'allenamento (di solito alle " + fmtMin(from) + ").";
}

// ---------- Casualità ripetibile ----------
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffle(arr, r) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const r5 = (n) => Math.round(n / 5) * 5;
const r10 = (n) => Math.round(n / 10) * 10;
const find = (arr, id) => arr.find((o) => o.id === id);
const secById = (id) => find(CAT.sec, id);

// ---------- Pasta, pane & co. ----------
function carbLines(type, q, legumi) {
  const red = legumi ? 20 : 0;
  const pa = q[0] - red, pn = q[1] - red, mix = q[2];
  switch (type) {
    case "riso": return [[pa + " g", "riso"]];
    case "pane": return [[pn + " g", "pane"]];
    case "mix": return [[(mix[0] - red) + " g", "pasta"], [mix[1] + " g", "pane"]];
    case "trofie": return [[r5(pa * 1.25) + " g", "trofie o orecchiette"]];
    case "gnocchi": return [[r5(pa * 2.5) + " g", "gnocchi"]];
    case "patate": return [[r10(pa * 3.75) + " g", "patate (al vapore o bollite)"]];
    default: return [[pa + " g", "pasta"]];
  }
}

// ---------- La settimana ----------
function buildWeek(S) {
  const wi = weekIndex(S.weekStart);
  const phase = phaseFor(wi);
  const r = rng((S.seed * 7919 + wi * 104729 + 17) >>> 0);
  const L = S.likes;
  const ov = (key, field, fallback) => { const v = S.ov[wi + "|" + key + "|" + field]; return v != null ? v : fallback; };
  const pool = (list, ids) => { const p = list.filter((o) => ids.includes(o.id)); return p.length ? p : list.slice(0, 1); };

  const prots = shuffle(pool(CAT.colProt, L.colProt), r);
  const ccarbs = shuffle(pool(CAT.colCarb, L.colCarb), r);
  const carbs = shuffle(pool(CAT.carb, L.carb), r);
  const conds = shuffle(pool(CAT.cond, L.cond), r);
  const vegs = shuffle(L.veg.length ? L.veg : CAT.veg.slice(0, 3), r);
  const fruits = shuffle(pool(CAT.fruit, L.fruit), r);
  const snacks = shuffle(pool(CAT.snack, L.snack), r);
  const pres = shuffle(pool(CAT.pre, L.pre), r);
  const posts = shuffle(pool(CAT.post, L.post), r);
  const during = find(CAT.during, L.during) || CAT.during[0];

  // --- secondi: quote settimanali ---
  const slots = [];
  for (let d = 0; d < 7; d++) for (const m of ["pranzo", "cena"]) if (!(S.free && S.free.d === d && S.free.m === m)) slots.push({ d, m });
  const liked = CAT.sec.filter((s) => L.sec.includes(s.id));
  const avail = CAT.groups.filter((g) => liked.some((s) => s.g === g.id));
  const target = {};
  avail.forEach((g) => (target[g.id] = g.min));
  let sum = Object.values(target).reduce((a, b) => a + b, 0);
  const order = shuffle(avail, r);
  let guard = 0;
  while (sum < slots.length && avail.length && guard++ < 50) {
    const under = order.filter((g) => target[g.id] < g.max);
    const pick = (under.length ? under : order)[guard % (under.length || order.length)];
    target[pick.id]++; sum++;
  }
  const remaining = { ...target };
  let prev = null;
  const seq = slots.map(() => {
    const cands = Object.keys(remaining).filter((g) => remaining[g] > 0 && g !== prev);
    const list = cands.length ? cands : Object.keys(remaining).filter((g) => remaining[g] > 0);
    if (!list.length) return avail.length ? avail[0].id : null;
    const top = Math.max(...list.map((g) => remaining[g]));
    const best = list.filter((g) => remaining[g] === top);
    const g = best[Math.floor(r() * best.length)];
    remaining[g]--; prev = g; return g;
  });
  // opzioni dentro ogni gruppo, al massimo 1 formaggio stagionato
  const perGroup = {};
  avail.forEach((g) => {
    const opts = liked.filter((s) => s.g === g.id);
    const light = shuffle(opts.filter((s) => !s.stag), r);
    const stag = shuffle(opts.filter((s) => s.stag), r);
    perGroup[g.id] = { light: light.length ? light : stag, stag: stag[0] || null, i: 0 };
  });
  const formIdx = seq.map((g, i) => (g === "formaggio" ? i : -1)).filter((i) => i >= 0);
  const stagAt = perGroup.formaggio && perGroup.formaggio.stag && formIdx.length ? formIdx[Math.floor(r() * formIdx.length)] : -1;
  const secSeq = seq.map((g, i) => {
    if (!g) return null;
    const pg = perGroup[g];
    if (i === stagAt) return pg.stag.id;
    const o = pg.light[pg.i % pg.light.length]; pg.i++; return o.id;
  });
  const secFor = {};
  slots.forEach((s, i) => (secFor[s.d + s.m] = { id: secSeq[i], idx: i }));

  // --- colazione tipo B: 2 giorni a settimana se piace ---
  const bDays = L.colB ? shuffle([0, 1, 2, 3, 4, 5, 6], r).slice(0, 2) : [];
  // --- cioccolatino dopo cena: 3 sere ---
  const chocDays = r() < 0.5 ? [1, 3, 5] : [0, 2, 4];
  let dessertUsed = false;
  let aCount = 0;

  const days = [];
  for (let d = 0; d < 7; d++) {
    const date = addDays(parseISO(S.weekStart), d);
    const tr = S.training[d] || { on: false };
    const P = planDay(tr, S.times);
    const train = P.kind;
    const isTrain = train !== "no";
    const trainSub = isTrain ? fmtMin(P.s) + " – " + fmtMin(P.e) : "";
    const colNote = movedNote("col", P);
    const fr = [fruits[(2 * d) % fruits.length], fruits[(2 * d + 1) % fruits.length]];
    let fruitUsed = 0;
    const takeFruit = () => fr[fruitUsed++ % 2];
    const items = [];

    items.push({ slot: "ginseng", t: -1, when: "Appena sveglio", small: true, title: "Ginseng, se vuoi", lines: [] });

    // Colazione
    const defType = bDays.includes(d) ? "B" : "A";
    const type = ov(d + "|col", "type", defType);
    let oat = false;
    if (type === "B") {
      const f = takeFruit();
      items.push({ slot: "col", t: P.col, when: "Colazione", sub: fmtMin(P.col), title: "Pane, Biraghini e frutta", short: "pane e Biraghini",
        lines: [...CAT.colB.lines, [f.g + " g", f.name + " (o 200 ml di succo)"]], note: colNote,
        edit: { key: d + "|col", fields: [{ f: "type", label: "Tipo", val: "B", opts: [["A", "Proteina + carboidrato"], ["B", "Pane, Biraghini e frutta"]] }] } });
    } else {
      const p = find(CAT.colProt, ov(d + "|col", "prot", prots[aCount % prots.length].id));
      const c = find(CAT.colCarb, ov(d + "|col", "carb", ccarbs[(aCount + Math.floor(aCount / prots.length)) % ccarbs.length].id));
      aCount++;
      oat = !!p.oat;
      items.push({ slot: "col", t: P.col, when: "Colazione", sub: fmtMin(P.col), title: cap(p.short) + " + " + c.short, short: p.short + " + " + c.short,
        lines: [...p.lines, ...c.lines],
        note: [colNote, oat ? "Latte d'avena: al pomeriggio aggiungi uno yogurt greco (è già nello spuntino)." : ""].filter(Boolean).join(" "),
        edit: { key: d + "|col", fields: [
          { f: "type", label: "Tipo", val: "A", opts: [["A", "Proteina + carboidrato"], ["B", "Pane, Biraghini e frutta"]] },
          { f: "prot", label: "Proteina", val: p.id, opts: CAT.colProt.map((o) => [o.id, o.name]) },
          { f: "carb", label: "Carboidrato", val: c.id, opts: CAT.colCarb.map((o) => [o.id, o.name]) }] } });
    }

    // Allenamento
    if (isTrain) {
      items.push({ slot: "dur", t: P.s, when: "Allenamento", sub: trainSub, train: true, title: "Durante l'allenamento", lines: during.lines,
        note: train === "eve" ? "Il piano non dice cosa mangiare se ti alleni dopo cena: chiedilo al nutrizionista." : "" });
    }
    if (train === "am" && P.post != null) {
      const po = find(CAT.post, ov(d + "|postam", "opt", posts[d % posts.length].id));
      const it = snackItem(po, "postam", "Subito dopo", "verso " + fmtMin(P.post) + " · se vuoi", "Dopo l'allenamento · se vuoi", CAT.post, false, null, true);
      it.t = P.post + 1; items.push(it);
    }

    // Pranzo e cena
    const meal = (m) => {
      if (S.free && S.free.d === d && S.free.m === m) {
        return { slot: m, t: P[m], when: cap(m), sub: fmtMin(P[m]), title: "Pasto libero", short: "pasto libero", group: "libero", tag: "Libero",
          lines: [["", "es. 1 pizza o sushi, senza esagerare"], ["max 1", "alcolico a settimana: 1 bicchiere di vino o 1 birra piccola"]], note: movedNote(m, P) };
      }
      const info = secFor[d + m];
      const key = d + "|" + m;
      const s = secById(ov(key, "sec", info.id)) || CAT.sec[0];
      const slotI = d * 2 + (m === "cena" ? 1 : 0);
      const carb = find(CAT.carb, ov(key, "carb", carbs[slotI % carbs.length].id));
      const cond = find(CAT.cond, ov(key, "cond", conds[(slotI + d) % conds.length].id));
      const veg = ov(key, "veg", vegs[slotI % vegs.length]);
      const f3 = S.stalled && fase3Possible(wi) && isTrain && m === "pranzo";
      const q = isTrain ? CARB_Q.train[f3 ? 3 : phase] : CARB_Q.rest[phase];
      const isLeg = s.g === "legumi";
      const lines = carbLines(carb.id, q, isLeg);
      let title;
      const pastaLike = !!carb.dish;
      const usesPesto = pastaLike && !isLeg && cond.id === "pesto";
      if (pastaLike && isLeg) title = carb.dish + " e " + s.leg;
      else if (pastaLike) title = carb.dish + " " + (cond.id === "verdure" ? "con " + veg : cond.dish) + " + " + s.short;
      else title = cap(s.short) + " con " + (carb.id === "patate" ? "patate" : "pane");
      if (pastaLike && !isLeg && cond.id === "pomodoro") lines.push(["", "sugo di pomodoro"]);
      if (usesPesto) lines.push(["20 g", "pesto (1 cucchiaio: vale come l'olio)"]);
      if (isLeg) lines.push(["150–200 g", s.leg + " freschi (o 60 g secchi)"]);
      else lines.push(...s.lines);
      lines.push(["a piacere", veg + " (la verdura non si pesa)"]);
      if (!usesPesto) lines.push(["1 cucchiaio", "olio extravergine (10 g) per tutto il pasto"]);
      const notes = [];
      if (P.moved[m] != null) notes.push(movedNote(m, P));
      if (isLeg) notes.push("Coi legumi la pasta o il pane scendono di 20 g: il numero qui sopra è già giusto.");
      if (s.noMeat) notes.push(NO_MEAT_NOTE);
      if (f3) notes.push("Fase 3: pranzo aumentato perché il peso si è bloccato.");
      return { slot: m, t: P[m], when: cap(m), sub: fmtMin(P[m]), title, short: isLeg && pastaLike ? title.toLowerCase() : s.short, group: s.g, tag: find(CAT.groups, s.g).name.split(",")[0],
        stag: !!s.stag, lines, note: notes.join(" "), secId: s.id,
        edit: { key, fields: [
          { f: "sec", label: "Secondo", val: s.id, groups: true },
          { f: "carb", label: "Pasta, riso o pane", val: carb.id, opts: CAT.carb.map((o) => [o.id, o.name]) },
          { f: "cond", label: "Condimento (pasta e riso)", val: cond.id, opts: CAT.cond.map((o) => [o.id, o.name]) },
          { f: "veg", label: "Verdura", val: veg, opts: CAT.veg.map((v) => [v, cap(v)]) }] } };
    };

    items.push(meal("pranzo"));

    // Pomeriggio
    function snackItem(opt, key, when, sub, title, list, counts, extraGreek, optional) {
      const lines = opt.lines.slice();
      if (opt.fruit) { const f = counts ? takeFruit() : fr[1]; lines.unshift([f.g + " g", f.name + (f.g === 150 ? " (1 frutto)" : "")]); }
      if (opt.fruitIn && counts) fruitUsed++;
      if (extraGreek && !opt.greek) lines.push(["1 vasetto", "yogurt greco ai gusti (per le proteine che il latte d'avena non ha)"]);
      return { slot: key, when, sub, title, train: list !== CAT.snack, short: opt.short, optional, lines,
        edit: { key: d + "|" + key, fields: [{ f: "opt", label: "Scegli", val: opt.id, opts: list.map((o) => [o.id, o.name]) }] }, optId: opt.id };
    }
    if (train === "early" && P.post != null) {
      const po = find(CAT.post, ov(d + "|post", "opt", posts[(d + 1) % posts.length].id));
      const it = snackItem(po, "post", "Subito dopo", "verso " + fmtMin(P.post), "Dopo l'allenamento: " + po.name.toLowerCase(), CAT.post, true, oat);
      it.t = P.post + 1; items.push(it);
    } else if (train === "late") {
      const pr = find(CAT.pre, ov(d + "|pre", "opt", pres[d % pres.length].id));
      const it = snackItem(pr, "pre", "Prima", "verso " + fmtMin(P.pre), "Prima dell'allenamento: " + pr.name.toLowerCase(), CAT.pre, true, oat);
      it.t = P.pre; items.push(it);
    } else if (P.snack != null) {
      let def = snacks[d % snacks.length];
      if (def.max1) { if (dessertUsed) def = snacks.find((o) => !o.max1) || def; else dessertUsed = true; }
      const sn = find(CAT.snack, ov(d + "|snack", "opt", def.id));
      const it = snackItem(sn, "snack", "Pomeriggio", "verso " + fmtMin(P.snack), sn.name, CAT.snack, true, oat);
      it.t = P.snack; items.push(it);
    }

    items.push(meal("cena"));

    // Frutta mancante: 2 porzioni al giorno
    const lunch = items.find((i) => i.slot === "pranzo");
    const dinner = items.find((i) => i.slot === "cena");
    while (fruitUsed < 2) {
      const f = fr[fruitUsed % 2];
      const target = fruitUsed === 0 ? lunch : dinner;
      const tgt = target.group === "libero" ? (target === lunch ? dinner : lunch) : target;
      tgt.lines = tgt.lines.concat([[f.g + " g", f.name + ", dopo il pasto", "extra"]]);
      fruitUsed++;
    }

    if (chocDays.includes(d)) items.push({ slot: "choc", t: P.cena + 2, when: "Dopo cena", small: true, title: "1 cioccolatino", lines: [] });

    items.sort((a, b) => a.t - b.t);
    days.push({ d, date, train, isTrain, items, time: isTrain ? fmtMin(P.s) : null, trainSub });
  }

  // --- conteggi finali (dopo le modifiche a mano) ---
  const count = { uova: 0, formaggio: 0, legumi: 0, vegetale: 0, stag: 0, dessert: 0, choc: chocDays.length };
  days.forEach((day) => day.items.forEach((it) => {
    if (it.group && it.group !== "libero") { count[it.group]++; if (it.stag) count.stag++; }
    if (it.optId === "dessert") count.dessert++;
  }));
  return { wi, phase, days, count, stalledOk: fase3Possible(wi) };
}
