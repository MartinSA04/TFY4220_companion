/**
 * Alle 14 Bravais-gitre i 3D for TFY4220, modul 01.
 *
 * Sju krystallsystemer med hver sine sentreringer. Vinkel- og lengdesliderne
 * er låst der systemet krever det, så betingelsene i tabellen blir noe man
 * kjenner på sliderne i stedet for å lese: i kubisk lar ingenting seg endre,
 * i triklin alt.
 *
 * Cellevektorene bygges med den vanlige krystallografiske konstruksjonen fra
 * (a, b, c, α, β, γ). Skalaen settes av den omsluttende kulen, som er
 * uavhengig av synsvinkelen, slik at cellen ikke endrer størrelse mens man
 * drar i den.
 *
 * «Hele gitteret» gjentar cellen i en 3×3×3-blokk, slår sammen hjørner og
 * kanter nabocellene deler, og tegner referansecellen kraftigere enn resten.
 * Aksene a, b, c og vinklene α, β, γ er merket i begge utsnittene.
 *
 * Kontrakt: default-eksporter init(api), api = { stage, controls, getSize, onResize, signal }.
 */

import { choiceRow } from "./_controls.js";

const D2R = Math.PI / 180;

/** Utgangsstilling for kameraet, og det «Tilbakestill visning» går tilbake til. */
const AZ0 = 32;
const EL0 = 26;
// Elevasjonen holdes unna 0° og 90°: der kollapser projeksjonen til henholdsvis
// en ren sidevisning og en ren oversikt, og cellen blir uleselig.
const EL_MIN = 4;
const EL_MAX = 86;

/**
 * Sentreringene. `pts` er sentreringspunktene som er SYNLIGE på én tegnet
 * celle (begge basisflater, alle seks sideflater); `basis` er de
 * UAVHENGIGE punktene per celle, som er det gitteret faktisk genereres av.
 * De to er ikke like: [.5,.5,0] og [.5,.5,1] er samme gitterpunkt forskjøvet
 * med c, så gittermodus ville tegnet doble punkter om den brukte `pts`.
 */
const CENTERINGS = {
  P: { label: "P", name: "primitiv", pts: [], basis: [[0, 0, 0]], perCell: 1 },
  C: {
    label: "C",
    name: "basesentrert",
    pts: [
      [0.5, 0.5, 0],
      [0.5, 0.5, 1],
    ],
    basis: [
      [0, 0, 0],
      [0.5, 0.5, 0],
    ],
    perCell: 2,
  },
  I: {
    label: "I",
    name: "romsentrert",
    pts: [[0.5, 0.5, 0.5]],
    basis: [
      [0, 0, 0],
      [0.5, 0.5, 0.5],
    ],
    perCell: 2,
  },
  F: {
    label: "F",
    name: "flatesentrert",
    pts: [
      [0.5, 0.5, 0],
      [0.5, 0.5, 1],
      [0.5, 0, 0.5],
      [0.5, 1, 0.5],
      [0, 0.5, 0.5],
      [1, 0.5, 0.5],
    ],
    basis: [
      [0, 0, 0],
      [0.5, 0.5, 0],
      [0.5, 0, 0.5],
      [0, 0.5, 0.5],
    ],
    perCell: 4,
  },
  R: {
    label: "R",
    name: "romboedrisk",
    pts: [],
    basis: [[0, 0, 0]],
    perCell: 1,
  },
};

/**
 * De sju systemene. `free` sier hvilke sliders systemet lar stå åpne; alt
 * annet låses til `fixed`. Rekkefølgen er den samme som i tabellen i modulen,
 * så nummereringen 1–14 stemmer.
 */
const SYSTEMS = [
  {
    key: "triklin",
    label: "Triklin",
    cent: ["P"],
    free: ["ba", "ca", "al", "be", "ga"],
    init: { ba: 0.78, ca: 1.22, al: 76, be: 96, ga: 70 },
    cond: "a ≠ b ≠ c, α ≠ β ≠ γ ≠ 90°",
  },
  {
    key: "monoklin",
    label: "Monoklin",
    cent: ["P", "C"],
    free: ["ba", "ca", "be"],
    fixed: { al: 90, ga: 90 },
    init: { ba: 0.72, ca: 1.25, be: 108 },
    cond: "a ≠ b ≠ c, α = γ = 90° ≠ β",
  },
  {
    key: "ortorombisk",
    label: "Ortorombisk",
    cent: ["P", "C", "I", "F"],
    free: ["ba", "ca"],
    fixed: { al: 90, be: 90, ga: 90 },
    init: { ba: 0.74, ca: 1.3 },
    cond: "a ≠ b ≠ c, α = β = γ = 90°",
  },
  {
    key: "tetragonal",
    label: "Tetragonal",
    cent: ["P", "I"],
    free: ["ca"],
    fixed: { ba: 1, al: 90, be: 90, ga: 90 },
    init: { ca: 1.45 },
    cond: "a = b ≠ c, α = β = γ = 90°",
  },
  {
    key: "trigonal",
    label: "Trigonal",
    cent: ["R"],
    free: ["rho"], // α = β = γ, én slider
    fixed: { ba: 1, ca: 1 },
    init: { al: 74 },
    cond: "a = b = c, α = β = γ < 120°, ≠ 90°",
  },
  {
    key: "heksagonal",
    label: "Heksagonal",
    cent: ["P"],
    free: ["ca"],
    fixed: { ba: 1, al: 90, be: 90, ga: 120 },
    init: { ca: 1.6 },
    cond: "a = b ≠ c, α = β = 90°, γ = 120°",
  },
  {
    key: "kubisk",
    label: "Kubisk",
    cent: ["P", "I", "F"],
    free: [],
    fixed: { ba: 1, ca: 1, al: 90, be: 90, ga: 90 },
    init: {},
    cond: "a = b = c, α = β = γ = 90°",
  },
];

/** Aksepilene. Fargene skiller a, b og c, og går igjen i vinkelbuene. */
const AXES = [
  { id: "a", vec: (A) => A, label: "a", color: "var(--accent)" },
  { id: "b", vec: (A, B) => B, label: "b", color: "var(--green)" },
  { id: "c", vec: (A, B, C) => C, label: "c", color: "var(--violet)" },
];

/** α = ∠(b, c), β = ∠(a, c), γ = ∠(a, b). Ulik radius, ellers overlapper buene. */
const ANGLES = [
  { from: (A, B) => B, to: (A, B, C) => C, label: "α", r: 0.34 },
  { from: (A) => A, to: (A, B, C) => C, label: "β", r: 0.26 },
  { from: (A) => A, to: (A, B) => B, label: "γ", r: 0.18 },
];

/** Løpenummer 1–14 i tabellrekkefølge, så utlesningen kan si «nr. N av 14». */
const NUMBERS = {};
let n = 0;
for (const s of SYSTEMS) for (const c of s.cent) NUMBERS[`${s.key}-${c}`] = ++n;

export default function init({ stage, controls, getSize, onResize, signal }) {
  let sysKey = "kubisk";
  let cent = "F";
  let az = AZ0;
  let elev = EL0;
  let grid = false;
  const v = { ba: 1, ca: 1, al: 90, be: 90, ga: 90 };

  const sys = () => SYSTEMS.find((s) => s.key === sysKey);

  /** Sett slider-verdiene til det systemet krever, og til sine egne default. */
  function adoptSystem() {
    const s = sys();
    Object.assign(v, { ba: 1, ca: 1, al: 90, be: 90, ga: 90 });
    Object.assign(v, s.fixed ?? {});
    Object.assign(v, s.init ?? {});
    if (s.free.includes("rho")) v.be = v.ga = v.al;
    if (!s.cent.includes(cent)) cent = s.cent[0];
  }

  // Kontroller
  const sysPick = choiceRow({
    ariaLabel: "Velg krystallsystem",
    items: SYSTEMS.map((s) => ({ value: s.key, label: s.label })),
    onPick: (k) => {
      sysKey = k;
      adoptSystem();
      sync();
      render();
    },
    signal,
  });

  const centPick = choiceRow({
    ariaLabel: "Velg sentrering",
    items: Object.keys(CENTERINGS).map((k) => ({
      value: k,
      label: `${CENTERINGS[k].label} · ${CENTERINGS[k].name}`,
    })),
    onPick: (k) => {
      if (!sys().cent.includes(k)) return;
      cent = k;
      sync();
      render();
    },
    signal,
  });

  const sliders = {};
  const mkSlider = (key, text, min, max, step, aria) => {
    const label = document.createElement("label");
    label.append(text);
    const out = document.createElement("output");
    const input = document.createElement("input");
    input.type = "range";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.setAttribute("aria-label", aria);
    label.append(out, input);
    input.addEventListener(
      "input",
      () => {
        const val = Number(input.value);
        if (key === "rho") v.al = v.be = v.ga = val;
        else if (key === "az") az = val;
        else v[key] = val;
        sync();
        render();
      },
      { signal },
    );
    sliders[key] = { label, out, input };
    return label;
  };

  const sliderEls = [
    mkSlider("ba", "b/a ", 0.5, 1.6, 0.01, "Forholdet b delt på a"),
    mkSlider("ca", "c/a ", 0.5, 2, 0.01, "Forholdet c delt på a"),
    mkSlider("al", "α ", 55, 125, 1, "Vinkelen alfa i grader"),
    mkSlider("be", "β ", 55, 125, 1, "Vinkelen beta i grader"),
    mkSlider("ga", "γ ", 55, 125, 1, "Vinkelen gamma i grader"),
    mkSlider("az", "Rotasjon ", 0, 360, 1, "Rotasjon av cellen i grader"),
  ];

  const viewRow = document.createElement("div");
  viewRow.style.cssText = "flex-basis:100%;display:flex;flex-wrap:wrap;gap:6px";
  viewRow.setAttribute("role", "group");
  viewRow.setAttribute("aria-label", "Velg utsnitt");

  const viewBtns = [
    { on: false, label: "Bare cellen" },
    { on: true, label: "Hele gitteret" },
  ].map((o) => {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "sim-btn";
    el.textContent = o.label;
    el.addEventListener(
      "click",
      () => {
        grid = o.on;
        sync();
        render();
      },
      { signal },
    );
    viewRow.append(el);
    return { on: o.on, el };
  });

  const resetBtn = document.createElement("button");
  resetBtn.type = "button";
  resetBtn.className = "sim-btn";
  resetBtn.textContent = "Tilbakestill visning";
  resetBtn.addEventListener(
    "click",
    () => {
      az = AZ0;
      elev = EL0;
      sync();
      render();
    },
    { signal },
  );

  const readout = document.createElement("div");
  readout.className = "sim-readout";

  controls.append(
    sysPick.el,
    centPick.el,
    viewRow,
    ...sliderEls,
    resetBtn,
    readout,
  );

  // Dra for å bane kameraet rundt cellen.
  //
  // Rotasjonsslideren blir stående ved siden av: den er den eneste veien til
  // azimut for en som bruker tastatur, og drag-en holder den i takt i stedet
  // for å erstatte den. Elevasjonen har ingen slider, men «Tilbakestill
  // visning» gir alltid en vei tilbake til en lesbar stilling.
  //
  // touch-action: pan-y, ikke none — loddrett sveip må fortsatt rulle siden,
  // ellers fanger widgeten scrollingen på mobil. Prisen er at elevasjon bare
  // lar seg dra med mus; vannrett drag (azimut) kommer fram begge veier.
  stage.style.cursor = "grab";
  stage.style.touchAction = "pan-y";

  let drag = null;
  stage.addEventListener(
    "pointerdown",
    (e) => {
      drag = { x: e.clientX, y: e.clientY, az, elev };
      stage.setPointerCapture?.(e.pointerId);
      stage.style.cursor = "grabbing";
    },
    { signal },
  );
  stage.addEventListener(
    "pointermove",
    (e) => {
      if (!drag) return;
      // Minus på azimut: skjerm-x for et punkt er cos(φ + az), så en ØKENDE az
      // trekker forsiden mot venstre. Uten fortegnet ville cellen dratt motsatt
      // vei av fingeren.
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      az = (((drag.az - dx * 0.5) % 360) + 360) % 360;
      elev = Math.max(EL_MIN, Math.min(EL_MAX, drag.elev + dy * 0.4));
      sync();
      render();
    },
    { signal },
  );
  const endDrag = (e) => {
    if (!drag) return;
    drag = null;
    stage.style.cursor = "grab";
    stage.releasePointerCapture?.(e.pointerId);
  };
  stage.addEventListener("pointerup", endDrag, { signal });
  stage.addEventListener("pointercancel", endDrag, { signal });

  function sync() {
    const s = sys();
    const rho = s.free.includes("rho");
    sysPick.sync(sysKey);
    centPick.sync(cent, (k) => !s.cent.includes(k));
    for (const b of viewBtns)
      b.el.setAttribute("aria-pressed", String(b.on === grid));
    const enabled = (key) =>
      key === "az" ||
      s.free.includes(key) ||
      (rho && (key === "al" || key === "be" || key === "ga"));
    for (const [key, c] of Object.entries(sliders)) {
      const on = enabled(key);
      c.input.disabled = !on;
      c.label.style.opacity = on ? "1" : "0.4";
      const val = key === "az" ? az : v[key];
      c.input.value = String(val);
      c.out.textContent =
        key === "ba" || key === "ca" ? val.toFixed(2) : `${Math.round(val)}°`;
    }
  }

  // Geometri
  /** Cellevektorene fra (a=1, b, c, α, β, γ) — standard krystallografisk form. */
  function cellVectors() {
    const b = v.ba;
    const c = v.ca;
    const ca = Math.cos(v.al * D2R);
    const cb = Math.cos(v.be * D2R);
    const cg = Math.cos(v.ga * D2R);
    const sg = Math.sin(v.ga * D2R) || 1e-6;
    const cx = cb;
    const cy = (ca - cb * cg) / sg;
    // Negativ radikand ville betydd en umulig celle; klemmes så tegningen
    // degenererer til et plan i stedet for å gi NaN.
    const cz = Math.sqrt(Math.max(1e-4, 1 - cx * cx - cy * cy));
    return [
      { x: 1, y: 0, z: 0 },
      { x: b * cg, y: b * sg, z: 0 },
      { x: c * cx, y: c * cy, z: c * cz },
    ];
  }

  const CORNERS = [];
  for (const u of [0, 1])
    for (const w of [0, 1]) for (const t of [0, 1]) CORNERS.push([u, w, t]);

  const EDGES = [];
  for (let i = 0; i < 8; i++)
    for (let j = i + 1; j < 8; j++) {
      const d =
        Math.abs(CORNERS[i][0] - CORNERS[j][0]) +
        Math.abs(CORNERS[i][1] - CORNERS[j][1]) +
        Math.abs(CORNERS[i][2] - CORNERS[j][2]);
      if (d === 1) EDGES.push([i, j]);
    }

  // Tegning
  const P = (x) => x.toFixed(1);

  const marker = (id, color) =>
    `<marker id="b3-${id}" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="9" markerHeight="9" orient="auto-start-reverse">` +
    `<path d="M 0 0 L 10 5 L 0 10 z" style="fill:${color}"/></marker>`;

  // En hel strek kan ikke sorteres mot en kule: streken strekker seg over et
  // helt dybdeintervall, og ett tall for hele streken er feil i den ene enden.
  // Derfor deles hver strek i biter som er korte nok til at hver bit ligger på
  // én side av en kule, og bitene sorteres hver for seg.
  //
  // Projeksjonen er affin, så x, y og dybde interpoleres lineært langs streken
  // og bitene trenger ingen ny projisering. Bitlengden setter nøyaktigheten:
  // dybden til en bit er snittet over den, så feilen er på sin høyeste halve
  // bitlengden. Den må ligge godt under kuleradien, ellers avgjøres et kryss av
  // avrundingen. 8 px mot R = 9 px gir ~4 px slingringsmonn. Runde endelokk
  // hindrer hårfine skjøter mellom bitene.
  const SEG_PX = 8;
  const lerp = (a, b, t) => a + (b - a) * t;

  /** Strek fra p til q som dybdesorterbare biter. `svg(a, b, sisteBit)`. */
  function segments(p, q, svg) {
    const out = [];
    const N = Math.max(
      1,
      Math.min(28, Math.round(Math.hypot(q.x - p.x, q.y - p.y) / SEG_PX)),
    );
    for (let i = 0; i < N; i++) {
      const t0 = i / N;
      const t1 = (i + 1) / N;
      out.push({
        depth: lerp(p.depth, q.depth, (t0 + t1) / 2),
        svg: svg(
          { x: lerp(p.x, q.x, t0), y: lerp(p.y, q.y, t0) },
          { x: lerp(p.x, q.x, t1), y: lerp(p.y, q.y, t1) },
          i === N - 1,
        ),
      });
    }
    return out;
  }

  /**
   * Aksepilene a, b, c ut fra origohjørnet, og buene for vinklene mellom dem.
   * α ligger mellom b og c, β mellom a og c, γ mellom a og b — samme
   * konvensjon som tabellen i modulen.
   *
   * Buene tegnes i 3D og projiseres punkt for punkt (slerp mellom de to
   * enhetsvektorene), ikke som en flat SVG-bue. En flat bue ville løyet om
   * vinkelen så snart cellen ble dreid.
   *
   * Piler og buer er geometri i scenen, ikke påskrift oppå den, så de leveres
   * som dybdesorterbare biter og males sammen med kanter og kuler. Bare
   * bokstavene (a, b, c, α, β, γ) legges øverst — de skal alltid være lesbare.
   */
  function drawAxes(A, B, C, proj, fit, s) {
    const len = (v) => Math.hypot(v.x, v.y, v.z) || 1e-6;
    const unit = (v) => {
      const L = len(v);
      return { x: v.x / L, y: v.y / L, z: v.z / L };
    };
    const O = fit(proj(0, 0, 0));
    const rBase = Math.min(len(A), len(B), len(C));

    const items = [];
    let labels = "";

    for (const { id, vec, label, color } of AXES) {
      const v = vec(A, B, C);
      const tip = fit(proj(v.x, v.y, v.z));
      items.push(
        ...segments(
          O,
          tip,
          (a, b, last) =>
            `<line x1="${P(a.x)}" y1="${P(a.y)}" x2="${P(b.x)}" y2="${P(b.y)}" stroke="${color}" stroke-width="2.5" stroke-linecap="round"` +
            (last ? ` marker-end="url(#b3-${id})"` : "") +
            `/>`,
        ),
      );
      // Etiketten skyves litt forbi spissen, langs pilens egen retning.
      const dx = tip.x - O.x;
      const dy = tip.y - O.y;
      const L = Math.hypot(dx, dy) || 1;
      labels += `<text x="${P(tip.x + (dx / L) * 14)}" y="${P(tip.y + (dy / L) * 14)}" text-anchor="middle" dominant-baseline="middle" style="fill:${color};font-family:var(--font-mono);font-size:12px;font-weight:600">${label}</text>`;
    }

    for (const { from, to, label, r } of ANGLES) {
      const u = unit(from(A, B, C));
      const v = unit(to(A, B, C));
      const dot = Math.max(-1, Math.min(1, u.x * v.x + u.y * v.y + u.z * v.z));
      const ang = Math.acos(dot);
      if (!isFinite(ang) || ang < 0.02) continue;
      // Buene måles i celleenheter, men trenger en minste STØRRELSE på skjermen:
      // i gittermodus er cellen en tredjedel så stor, og buene ville krympet til
      // en uleselig klase greske bokstaver rundt origo. Radien er fortsatt
      // vilkårlig — vinkelen buen viser er den samme uansett hvor stor den er.
      const rr = Math.max(rBase * r, (r * 110) / s);
      const pts = [];
      const N = 18;
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        // Slerp holder punktene på kula, så buen blir den faktiske vinkelen.
        const k1 = Math.sin((1 - t) * ang) / Math.sin(ang);
        const k2 = Math.sin(t * ang) / Math.sin(ang);
        const p = fit(
          proj(
            (u.x * k1 + v.x * k2) * rr,
            (u.y * k1 + v.y * k2) * rr,
            (u.z * k1 + v.z * k2) * rr,
          ),
        );
        pts.push(p);
      }
      for (let i = 0; i < pts.length - 1; i++)
        items.push(
          ...segments(
            pts[i],
            pts[i + 1],
            (a, b) =>
              `<line x1="${P(a.x)}" y1="${P(a.y)}" x2="${P(b.x)}" y2="${P(b.y)}" stroke="var(--muted)" stroke-width="1.5" stroke-linecap="round"/>`,
          ),
        );
      const k1 = Math.sin(0.5 * ang) / Math.sin(ang);
      const midP = fit(
        proj(
          (u.x + v.x) * k1 * rr * 1.34,
          (u.y + v.y) * k1 * rr * 1.34,
          (u.z + v.z) * k1 * rr * 1.34,
        ),
      );
      labels += `<text x="${P(midP.x)}" y="${P(midP.y)}" text-anchor="middle" dominant-baseline="middle" style="fill:var(--muted);font-family:var(--font-mono);font-size:12px">${label}</text>`;
    }

    return { items, labels };
  }

  function render() {
    const { w, h } = getSize();
    const [A, B, C] = cellVectors();
    const mid = {
      x: (A.x + B.x + C.x) / 2,
      y: (A.y + B.y + C.y) / 2,
      z: (A.z + B.z + C.z) / 2,
    };
    const rad = az * D2R;
    const cs = Math.cos(rad);
    const sn = Math.sin(rad);
    const sinEl = Math.sin(elev * D2R);
    const cosEl = Math.cos(elev * D2R);

    /** Kartesisk punkt (før sentrering) → uskalert skjermkoordinat + dybde. */
    const proj = (X0, Y0, Z0) => {
      const X = X0 - mid.x;
      const Y = Y0 - mid.y;
      const Z = Z0 - mid.z;
      const x1 = X * cs - Y * sn;
      const y1 = X * sn + Y * cs;
      return { x: x1, y: y1 * sinEl - Z * cosEl, depth: y1 };
    };
    /** Brøkkoordinat i celleenheter → uskalert skjermkoordinat. */
    const raw = ([u, t, k]) =>
      proj(
        A.x * u + B.x * t + C.x * k,
        A.y * u + B.y * t + C.y * k,
        A.z * u + B.z * t + C.z * k,
      );
    const radius3d = ([u, t, k]) => {
      const X = A.x * u + B.x * t + C.x * k - mid.x;
      const Y = A.y * u + B.y * t + C.y * k - mid.y;
      const Z = A.z * u + B.z * t + C.z * k - mid.z;
      return Math.sqrt(X * X + Y * Y + Z * Z);
    };

    // Gittermodus tegner en AVGRENSET blokk på 3×3×3 celler, ikke et uendelig
    // gitter klippet mot flaten slik 2D-widgeten gjør. Et ubegrenset 3D-gitter
    // i ortografisk projeksjon er ugjennomsiktig: dybden stabler så mange
    // punkter oppå hverandre at flaten blir en tett flekk. En blokk viser
    // gjentakelsen og lar seg fortsatt lese.
    const span = grid ? 3 : 1;
    const conf = CENTERINGS[cent];
    const key = (f) => f.map((n) => n.toFixed(3)).join(",");

    const seen = new Map();
    for (let i = 0; i < span; i++)
      for (let j = 0; j < span; j++)
        for (let k = 0; k < span; k++) {
          for (const c of CORNERS) {
            const f = [c[0] + i, c[1] + j, c[2] + k];
            seen.set(key(f), { f, mid: false });
          }
          for (const c of conf.pts) {
            const f = [c[0] + i, c[1] + j, c[2] + k];
            seen.set(key(f), { f, mid: true });
          }
        }
    const raws = [...seen.values()];

    // Skalaen settes av den omsluttende KULEN, ikke av omrisset på skjermen.
    // Den projiserte boksen endrer form når man drar, så en boks-tilpasning
    // fikk cellen til å pumpe seg større og mindre under rotasjonen. Kuleradien
    // er rotasjonsuavhengig, så størrelsen ligger stille.
    const R = grid ? 4.5 : 9; // kuleradius i px
    const m = R + 6;
    const rMax = Math.max(...raws.map((p) => radius3d(p.f)), 1e-6);
    const s = (Math.min(w, h) / 2 - m) / rMax;
    const fit = (p) => ({ ...p, x: p.x * s + w / 2, y: p.y * s + h / 2 });
    const pts = raws.map((p) => ({ ...fit(raw(p.f)), mid: p.mid }));

    // Kantene til hver celle i blokka, med sammenfallende kanter slått sammen.
    // Referansecellen tegnes kraftigere, så «denne cellen, gjentatt» leses av
    // bildet i stedet for å måtte stå i teksten.
    const lines = new Map();
    for (let i = 0; i < span; i++)
      for (let j = 0; j < span; j++)
        for (let k = 0; k < span; k++)
          for (const [a, b] of EDGES) {
            const fa = [
              CORNERS[a][0] + i,
              CORNERS[a][1] + j,
              CORNERS[a][2] + k,
            ];
            const fb = [
              CORNERS[b][0] + i,
              CORNERS[b][1] + j,
              CORNERS[b][2] + k,
            ];
            const id = [key(fa), key(fb)].sort().join("|");
            const ref = i === 0 && j === 0 && k === 0;
            const prev = lines.get(id);
            if (!prev) lines.set(id, { fa, fb, ref });
            else if (ref) prev.ref = true;
          }
    // Kanter, kuler, aksepiler og vinkelbuer males i ÉN dybdesortert
    // rekkefølge. Alt sammen er geometri i den samme scenen: en pil som peker
    // bakover skal ligge bak kulene den passerer, ellers får man samme optiske
    // illusjon som med kanter malt oppå kuler.
    const drawables = [];
    for (const { fa, fb, ref } of lines.values()) {
      const stroke = ref ? "var(--fg)" : "var(--border-strong)";
      const width = ref ? 2 : 1.25;
      const op = ref || !grid ? 1 : 0.45;
      drawables.push(
        ...segments(
          fit(raw(fa)),
          fit(raw(fb)),
          (a, b) =>
            `<line x1="${P(a.x)}" y1="${P(a.y)}" x2="${P(b.x)}" y2="${P(b.y)}" ` +
            `stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" opacity="${op}"/>`,
        ),
      );
    }
    for (const p of pts)
      drawables.push({
        depth: p.depth,
        svg:
          `<circle cx="${P(p.x)}" cy="${P(p.y)}" r="${R}" ` +
          `style="fill:${p.mid ? "var(--green)" : "var(--accent)"}" ` +
          `stroke="var(--canvas-bg)" stroke-width="1.5"/>`,
      });

    // Aksene a, b, c ut fra origohjørnet, og vinklene mellom dem. Pilene legges
    // sist, så de vinner ved lik dybde: pila langs en cellekant skal males oppå
    // kanten, ikke under den. Sorteringen i JS er stabil, så det holder.
    const axes = drawAxes(A, B, C, proj, fit, s);
    drawables.push(...axes.items);

    const scene = drawables
      .sort((p, q) => p.depth - q.depth)
      .map((d) => d.svg)
      .join("");

    stage.innerHTML =
      `<svg width="100%" height="100%" viewBox="0 0 ${w.toFixed(0)} ${h.toFixed(0)}" preserveAspectRatio="none" role="img" aria-hidden="true" style="display:block">` +
      `<defs>${AXES.map((a) => marker(a.id, a.color)).join("")}</defs>` +
      scene +
      axes.labels +
      `</svg>`;

    const s0 = sys();
    const ct = CENTERINGS[cent];
    readout.innerHTML =
      `<b>Nr. ${NUMBERS[`${sysKey}-${cent}`]} av 14: ${s0.label} ${ct.label}</b> (${ct.name}) · ` +
      `${s0.cond} · gitterpunkter per celle: <b>${ct.perCell}</b>`;
  }

  adoptSystem();
  sync();
  onResize(render);
  render();
}
