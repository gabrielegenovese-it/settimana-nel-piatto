// ---------- Catalogo: tutto quello che il piano permette ----------
// lines = righe della card [quantità, cosa]. fruit:true = aggiunge un frutto dalla rotazione.
const PLAN_START = "2026-09-07"; // lunedì della visita

const CAT = {
  colProt: [
    { id: "yog", name: "Yogurt greco ai gusti", short: "yogurt greco", lines: [["1 vasetto", "yogurt greco ai gusti"]] },
    { id: "pveg", name: "Proteine vegetali al cioccolato", sub: "shake con latte vegetale o acqua", short: "shake proteico", lines: [["25 g", "proteine vegetali al cioccolato"], ["250 ml", "latte vegetale (avena, soia, mandorla) o acqua"]] },
    { id: "whey", name: "Whey al cioccolato", sub: "solo se le tolleri", short: "shake whey", lines: [["25 g", "whey al cioccolato"], ["250 ml", "latte vegetale o acqua"]] },
    { id: "avena", name: "Latte d'avena", sub: "poi yogurt greco al pomeriggio", short: "latte d'avena", oat: true, lines: [["250 ml", "latte d'avena"]] }
  ],
  colCarb: [
    { id: "morato", name: "Pane Morato e marmellata", short: "pane e marmellata", lines: [["2 fette", "pane Morato con marmellata"]] },
    { id: "fette", name: "Fette biscottate e marmellata", short: "fette biscottate", lines: [["5", "fette biscottate con marmellata"]] },
    { id: "cereali", name: "Cereali Kellogg's", sub: "grassi sotto 10 g su 100 g", short: "cereali", lines: [["50 g", "cereali Kellogg's classici o al cioccolato"]] },
    { id: "biscotti", name: "Biscotti secchi", sub: "Oro Saiwa, Oswego", short: "biscotti", lines: [["10", "biscotti secchi (Oro Saiwa, Oswego)"]] }
  ],
  colB: { id: "B", name: "Pane, Biraghini e frutta", sub: "colazione salata, tutta insieme", short: "pane e Biraghini", fruit: true, lines: [["2 fette", "pane Morato"], ["2", "Biraghini (40 g)"]] },

  carb: [
    { id: "pasta", name: "Pasta", dish: "Pasta" },
    { id: "riso", name: "Riso", dish: "Riso" },
    { id: "pane", name: "Pane" },
    { id: "mix", name: "Pasta + un po' di pane", dish: "Pasta" },
    { id: "trofie", name: "Trofie o orecchiette", dish: "Trofie" },
    { id: "gnocchi", name: "Gnocchi", dish: "Gnocchi" },
    { id: "patate", name: "Patate", sub: "al vapore o bollite" }
  ],
  cond: [
    { id: "pomodoro", name: "Sugo di pomodoro", dish: "al pomodoro" },
    { id: "pesto", name: "Pesto", sub: "vale come l'olio", dish: "al pesto" },
    { id: "verdure", name: "Con la verdura del pasto", dish: "con" }
  ],

  groups: [
    { id: "uova", name: "Uova", min: 3, max: 4 },
    { id: "formaggio", name: "Formaggio", min: 3, max: 4 },
    { id: "legumi", name: "Legumi", min: 3, max: 4 },
    { id: "vegetale", name: "Tofu, seitan, burger", min: 4, max: 4 }
  ],
  sec: [
    { id: "u21", g: "uova", name: "2 uova + 1 albume", short: "uova", lines: [["2 + 1", "uova + albume"]] },
    { id: "u3", g: "uova", name: "3 uova", short: "uova", lines: [["3", "uova"]] },
    { id: "frit", g: "uova", name: "Frittata con verdure", short: "frittata", lines: [["2 + 1", "uova + albume, in frittata con verdure"], ["15 g", "parmigiano"]] },
    { id: "fiocchi", g: "formaggio", name: "Fiocchi di latte", sub: "es. Jocca", short: "fiocchi di latte", lines: [["150–200 g", "fiocchi di latte"]] },
    { id: "mozl", g: "formaggio", name: "Mozzarella light", short: "mozzarella light", lines: [["1", "mozzarella light (100–125 g), da sola"]] },
    { id: "skyr", g: "formaggio", name: "Skyrella", short: "Skyrella", lines: [["80–120 g", "Skyrella"]] },
    { id: "phact", g: "formaggio", name: "Philadelphia Active", short: "Philadelphia Active", lines: [["80–120 g", "Philadelphia Active"]] },
    { id: "ricotta", g: "formaggio", name: "Ricotta", sub: "nel piano va con un affettato", short: "ricotta", noMeat: true, lines: [["80–100 g", "ricotta"]] },
    { id: "phpro", g: "formaggio", name: "Philadelphia Protein", sub: "nel piano va con un affettato", short: "Philadelphia Protein", noMeat: true, lines: [["80–100 g", "Philadelphia Protein"]] },
    { id: "s_parm", g: "formaggio", stag: true, name: "Parmigiano", short: "parmigiano", lines: [["80 g", "parmigiano"]] },
    { id: "s_mozz", g: "formaggio", stag: true, name: "Mozzarella normale", short: "mozzarella", lines: [["125 g", "mozzarella"]] },
    { id: "s_scam", g: "formaggio", stag: true, name: "Scamorza", short: "scamorza", lines: [["80–120 g", "scamorza"]] },
    { id: "s_feta", g: "formaggio", stag: true, name: "Feta", short: "feta", lines: [["80–120 g", "feta"]] },
    { id: "s_prim", g: "formaggio", stag: true, name: "Primo sale", short: "primo sale", lines: [["80–120 g", "primo sale"]] },
    { id: "s_prov", g: "formaggio", stag: true, name: "Provolone", short: "provolone", lines: [["80–120 g", "provolone"]] },
    { id: "s_asia", g: "formaggio", stag: true, name: "Asiago o fontina", short: "asiago", lines: [["80–120 g", "asiago o fontina"]] },
    { id: "ceci", g: "legumi", name: "Ceci", short: "ceci", leg: "ceci" },
    { id: "lent", g: "legumi", name: "Lenticchie", short: "lenticchie", leg: "lenticchie" },
    { id: "fag", g: "legumi", name: "Fagioli", short: "fagioli", leg: "fagioli" },
    { id: "pis", g: "legumi", name: "Piselli", short: "piselli", leg: "piselli" },
    { id: "fave", g: "legumi", name: "Fave", short: "fave", leg: "fave" },
    { id: "tofu", g: "vegetale", name: "Tofu", short: "tofu", lines: [["100–120 g", "tofu"]] },
    { id: "seitan", g: "vegetale", name: "Seitan", short: "seitan", lines: [["100–120 g", "seitan"]] },
    { id: "burger", g: "vegetale", name: "Burger vegetale", sub: "proteine ≥13 g, grassi <10 g su 100 g", short: "burger vegetale", lines: [["1", "burger vegetale (etichetta: proteine ≥13 g, grassi <10 g su 100 g)"]] }
  ],

  veg: ["zucchine", "broccoli", "spinaci", "insalata", "finocchi", "carote", "cavolfiore", "bietole", "radicchio", "fagiolini", "peperoni", "melanzane", "pomodori", "zucca", "cavolo nero"],
  fruit: [
    { id: "mela", name: "mela", g: 150 }, { id: "pera", name: "pera", g: 150 }, { id: "pesca", name: "pesca", g: 150 },
    { id: "arancia", name: "arancia", g: 150 }, { id: "kiwi", name: "kiwi", g: 150 }, { id: "prugne", name: "prugne", g: 150 },
    { id: "fichi", name: "fichi", g: 150 }, { id: "banana", name: "banana", g: 100 }, { id: "uva", name: "uva", g: 100 },
    { id: "mandarini", name: "mandarini", g: 100 }, { id: "cachi", name: "cachi", g: 100 }, { id: "fragole", name: "fragole", g: 200 },
    { id: "melone", name: "melone", g: 200 }, { id: "anguria", name: "anguria", g: 300 }
  ],

  snack: [
    { id: "fnoci", name: "Frutto + 5 noci", short: "frutto e noci", fruit: true, lines: [["5", "noci sgusciate"]] },
    { id: "fmand", name: "Frutto + 8 mandorle", short: "frutto e mandorle", fruit: true, lines: [["8", "mandorle"]] },
    { id: "ffond", name: "Frutto + cioccolato fondente", short: "frutto e fondente", fruit: true, lines: [["10 g", "cioccolato fondente (1 cubetto)"]] },
    { id: "fruyo", name: "Yogurt greco Fage Fruyo o Hypro", short: "yogurt greco", greek: true, lines: [["1 vasetto", "yogurt greco Fage Fruyo o Hypro (zuccheri sotto 10 g su 100 g)"]] },
    { id: "ybianco", name: "Yogurt bianco + frutta", short: "yogurt e frutta", fruitIn: true, lines: [["125 g", "yogurt bianco intero"], ["150 g", "frutta tagliata dentro lo yogurt"]] },
    { id: "triang", name: "Triangolini di legumi Sì&No", short: "triangolini", lines: [["20 g", "triangolini di legumi (12 se il pacco è grande)"]] },
    { id: "magretti", name: "Cracker Magretti + parmigiano", short: "cracker e parmigiano", lines: [["1 pacchetto", "cracker Magretti Galbusera"], ["20 g", "parmigiano (1 Biraghino)"]] },
    { id: "taralli", name: "Taralli Gran Pavesi", short: "taralli", lines: [["30 g", "taralli Gran Pavesi (1 pacchetto)"]] },
    { id: "dessert", name: "Dessert proteico", sub: "max 1 volta a settimana", short: "dessert proteico", max1: true, lines: [["200 g", "dessert proteico (Milbona, Milk Pro o Lindahls)"]] }
  ],
  pre: [
    { id: "pcr", name: "Cracker + frutto", short: "cracker e frutto", fruit: true, lines: [["1 pacchetto", "cracker"]] },
    { id: "ppane", name: "Pane e marmellata + frutto", short: "pane, marmellata, frutto", fruit: true, lines: [["2 fette", "pane con marmellata"]] },
    { id: "pbisc", name: "Biscotti + frutto", short: "biscotti e frutto", fruit: true, lines: [["6", "biscotti secchi"]] }
  ],
  post: [
    { id: "pofr", name: "Frutto + cracker + parmigiano", short: "cracker e parmigiano", fruit: true, lines: [["1 pacchetto", "cracker"], ["40 g", "parmigiano"]] },
    { id: "pocy", name: "Cracker + yogurt greco", short: "cracker e yogurt", greek: true, lines: [["1 pacchetto", "cracker"], ["1 vasetto", "yogurt greco ai gusti"]] },
    { id: "popy", name: "Pane e marmellata + yogurt greco", short: "pane e yogurt", greek: true, lines: [["2 fette", "pane con marmellata"], ["1 vasetto", "yogurt greco ai gusti"]] },
    { id: "poby", name: "Biscotti + yogurt greco", short: "biscotti e yogurt", greek: true, lines: [["6", "biscotti secchi"], ["1 vasetto", "yogurt greco ai gusti"]] },
    { id: "popr", name: "Proteine in polvere + cracker + frutto", short: "shake, cracker, frutto", greek: true, fruit: true, lines: [["25 g", "proteine in polvere"], ["250 ml", "acqua o latte"], ["1 pacchetto", "cracker"]] }
  ],
  during: [
    { id: "malto", name: "Maltodestrine", lines: [["20 g", "maltodestrine nell'acqua che bevi"]] },
    { id: "menta", name: "Sciroppo di menta", lines: [["", "sciroppo di menta nell'acqua che bevi"]] }
  ]
};

// Pasta/riso/pane per fase: [pasta, pane, [pasta, pane]]
const CARB_Q = {
  train: { 1: [150, 180, [100, 60]], 2: [180, 210, [130, 60]], 3: [200, 240, [150, 60]] },
  rest:  { 1: [130, 150, [100, 40]], 2: [150, 180, [100, 60]] }
};

// Il tipo di allenamento si ricava dall'orario, rispetto a pranzo e cena
const KIND_LABEL = { am: "prima di pranzo", early: "dopo pranzo", late: "prima di cena", eve: "dopo cena" };
const TIMES_DEFAULT = { colazione: "09:30", pranzo: "13:00", spuntino: "16:30", cena: "20:00" };
const MEALS = [["colazione", "Colazione"], ["pranzo", "Pranzo"], ["spuntino", "Spuntino"], ["cena", "Cena"]];
const DURATIONS = [45, 60, 75, 90, 120];
const DUR_LABEL = { 45: "45 min", 60: "1 ora", 75: "1 ora e 15", 90: "1 ora e mezza", 120: "2 ore" };
const NO_MEAT_NOTE = "Nel piano questo formaggio va con 30 g di bresaola o crudo. Da vegetariano non c'è un sostituto scritto: chiedi al nutrizionista.";
const DAY_NAMES = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];
const DAY_SHORT = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const MONTHS = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

function defaultState() {
  const all = (arr) => arr.map((o) => o.id);
  return {
    v: 1,
    example: true,
    tab: "week",
    view: "day",
    weekStart: null,
    day: null,
    seed: 1,
    stalled: false,
    training: [
      { on: true, time: "14:30", dur: 60 }, { on: false, time: "18:00", dur: 60 }, { on: true, time: "14:30", dur: 60 },
      { on: false, time: "18:00", dur: 60 }, { on: true, time: "18:00", dur: 75 }, { on: true, time: "10:00", dur: 60 },
      { on: false, time: "18:00", dur: 60 }
    ],
    times: Object.assign({}, TIMES_DEFAULT),
    free: { d: 5, m: "cena" },
    likes: {
      colProt: ["yog", "pveg", "avena"],
      colCarb: all(CAT.colCarb),
      colB: true,
      carb: ["pasta", "riso", "pane", "mix"],
      cond: all(CAT.cond),
      sec: CAT.sec.filter((s) => !s.stag || s.id === "s_parm" || s.id === "s_mozz").map((s) => s.id),
      veg: ["zucchine", "broccoli", "spinaci", "insalata", "finocchi", "carote", "fagiolini", "peperoni"],
      fruit: ["mela", "pera", "banana", "uva", "kiwi", "fichi"],
      snack: all(CAT.snack),
      pre: all(CAT.pre),
      post: all(CAT.post),
      during: "malto"
    },
    ov: {}
  };
}
