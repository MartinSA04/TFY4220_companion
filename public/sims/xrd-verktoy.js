/**
 * Regneverktøy for røntgenlaben i TFY4220: fra 2θ til d, Q og a, eller fra
 * hkl til forventet 2θ.
 *
 * Hver rad er én topp. Med målt 2θ regnes d = λ/(2 sin θ) og Q = 4π sin θ/λ,
 * og med hkl i tillegg gitterkonstanten a = d√(h² + k² + l²) (kubisk gitter).
 * Med bare hkl regnes forventet d = a/√(h² + k² + l²) og 2θ fra Braggs lov med
 * den oppgitte a. Verktøyet sier ingenting om hvilke hkl som gir en refleks:
 * utslukkingsreglene er ditt arbeid.
 *
 * Tegningen er et strekdiagram langs 2θ: målte topper som hele streker (høyde
 * etter I når den er oppgitt), forventede posisjoner som stiplede.
 *
 * Kontrakt: default-eksporter init(api), api = { stage, controls, getSize, onResize, signal }.
 */
import { textField, parseNum, parseHkl, fmt, hklSvg } from "./_controls.js";

const MONO = "font-family:var(--font-mono);font-size:var(--text-xs)";
const MAX_ROWS = 20;
const DEG = Math.PI / 180;

export default function init({ stage, controls, getSize, onResize, signal }) {
  const state = { lambda: 0.7093, a: 5.4309, rows: [] };

  // ── λ og a ──────────────────────────────────────────────────────────────
  const top = document.createElement("div");
  top.style.cssText = "flex-basis:100%;display:flex;flex-wrap:wrap;gap:6px 14px;align-items:flex-end";
  const lam = textField({
    label: "λ (Å)",
    ariaLabel: "Bølgelengden i ångström",
    value: "0,7093",
    width: "6em",
    onInput: (v) => {
      state.lambda = parseNum(v);
      update();
    },
    signal,
  });
  const aField = textField({
    label: "a (Å), for forventet 2θ",
    ariaLabel: "Gitterkonstanten i ångström, brukt til forventet 2θ fra hkl",
    value: "5,4309",
    width: "6em",
    onInput: (v) => {
      state.a = parseNum(v);
      update();
    },
    signal,
  });
  top.append(lam.el, aField.el);

  // ── radene ──────────────────────────────────────────────────────────────
  const list = document.createElement("div");
  list.style.cssText = "flex-basis:100%;display:flex;flex-direction:column;gap:8px";

  function addRow() {
    if (state.rows.length >= MAX_ROWS) return;
    const row = { tt: "", I: "", hkl: "" };
    const el = document.createElement("div");
    el.style.cssText = "display:flex;flex-wrap:wrap;gap:4px 8px;align-items:flex-end";
    const f1 = textField({
      label: "2θ (°)",
      ariaLabel: "Målt spredningsvinkel 2θ i grader",
      placeholder: "målt",
      width: "5em",
      onInput: (v) => {
        row.tt = v;
        update();
      },
      signal,
    });
    const f2 = textField({
      label: "I",
      ariaLabel: "Intensiteten til toppen, i vilkårlige enheter",
      width: "4em",
      onInput: (v) => {
        row.I = v;
        update();
      },
      signal,
    });
    const f3 = textField({
      label: "hkl",
      ariaLabel: "Miller-indeksene du foreslår, for eksempel 111",
      width: "4.2em",
      mode: "text",
      onInput: (v) => {
        row.hkl = v;
        update();
      },
      signal,
    });
    const out = document.createElement("output");
    out.style.cssText = `flex:1 1 13em;min-width:0;padding-bottom:0.35em;${MONO}`;
    const del = document.createElement("button");
    del.type = "button";
    del.className = "sim-btn";
    del.textContent = "×";
    del.setAttribute("aria-label", "Fjern raden");
    del.addEventListener(
      "click",
      () => {
        state.rows = state.rows.filter((r) => r !== row);
        el.remove();
        if (state.rows.length === 0) addRow();
        relabel();
        update();
      },
      { signal },
    );
    el.append(f1.el, f2.el, f3.el, out, del);
    row.el = el;
    row.out = out;
    row.labels = [f1.el, f2.el, f3.el];
    state.rows.push(row);
    list.append(el);
    relabel();
  }

  // Ledetekstene står bare over første rad.
  function relabel() {
    state.rows.forEach((r, i) => {
      const names = ["2θ (°)", "I", "hkl"];
      r.labels.forEach((lab, j) => {
        lab.firstChild.textContent = i === 0 ? names[j] : "";
      });
    });
    addBtn.disabled = state.rows.length >= MAX_ROWS;
  }

  const btnRow = document.createElement("div");
  btnRow.style.cssText = "flex-basis:100%;display:flex;flex-wrap:wrap;gap:6px";
  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "sim-btn";
  addBtn.textContent = "+ topp";
  addBtn.addEventListener(
    "click",
    () => {
      addRow();
      update();
    },
    { signal },
  );
  const copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.className = "sim-btn";
  copyBtn.textContent = "Kopier tabellen";
  copyBtn.addEventListener("click", copy, { signal });
  btnRow.append(addBtn, copyBtn);

  const readout = document.createElement("p");
  readout.className = "sim-readout";
  readout.setAttribute("aria-live", "polite");

  controls.append(top, list, btnRow, readout);

  // ── regning ─────────────────────────────────────────────────────────────
  function compute(row) {
    const lambda = state.lambda;
    const tt = parseNum(row.tt);
    const I = parseNum(row.I);
    const hkl = parseHkl(row.hkl);
    const N = hkl ? hkl[0] ** 2 + hkl[1] ** 2 + hkl[2] ** 2 : 0;
    const r = { tt: NaN, I, hkl, N, d: NaN, Q: NaN, aEst: NaN, ttPred: NaN, dPred: NaN, QPred: NaN };
    if (!(lambda > 0)) return r;
    if (tt > 0 && tt < 180) {
      r.tt = tt;
      const s = Math.sin((tt / 2) * DEG);
      r.d = lambda / (2 * s);
      r.Q = (4 * Math.PI * s) / lambda;
      if (N > 0) r.aEst = r.d * Math.sqrt(N);
    }
    if (N > 0 && state.a > 0) {
      r.dPred = state.a / Math.sqrt(N);
      r.QPred = (2 * Math.PI) / r.dPred;
      const s = lambda / (2 * r.dPred);
      if (s <= 1) r.ttPred = (2 * Math.asin(s)) / DEG;
    }
    return r;
  }

  function copy() {
    const lines = ["2θ (°)\tI\thkl\td (Å)\tQ (1/Å)\ta (Å)\tforventet 2θ (°)"];
    for (const row of state.rows) {
      const r = compute(row);
      if (!(r.tt > 0) && !r.hkl) continue;
      const c = (x, n) => (Number.isFinite(x) ? fmt(x, n).replace("−", "-") : "");
      lines.push([c(r.tt, 3), c(r.I, 1), r.hkl ? r.hkl.join(" ") : "", c(r.d, 4), c(r.Q, 4), c(r.aEst, 4), c(r.ttPred, 3)].join("\t"));
    }
    navigator.clipboard?.writeText(lines.join("\n")).then(
      () => {
        copyBtn.textContent = "Kopiert";
        setTimeout(() => (copyBtn.textContent = "Kopier tabellen"), 1500);
      },
      () => {},
    );
  }

  function update() {
    const results = state.rows.map((row) => {
      const r = compute(row);
      const parts = [];
      if (Number.isFinite(r.d)) {
        parts.push(`d = ${fmt(r.d, 4)} Å`, `Q = ${fmt(r.Q, 4)} Å⁻¹`);
        if (Number.isFinite(r.aEst)) parts.push(`a = ${fmt(r.aEst, 4)} Å`);
      } else if (r.hkl && Number.isFinite(r.ttPred)) {
        parts.push(`forventet 2θ = ${fmt(r.ttPred, 3)}°`, `d = ${fmt(r.dPred, 4)} Å`, `Q = ${fmt(r.QPred, 4)} Å⁻¹`);
      } else if (r.hkl && Number.isFinite(r.dPred)) {
        parts.push(`d = ${fmt(r.dPred, 4)} Å er mindre enn λ/2, ingen refleks`);
      } else if (row.hkl.trim() && !r.hkl) {
        parts.push("skriv tre indekser, f.eks. 111 eller 2-20");
      }
      // Hver verdi holdes samlet på én linje; bare skillet « · » kan brytes.
      row.out.textContent = parts.map((p) => p.replace(/ /g, "\u00a0")).join(" · ");
      return r;
    });

    // Sammendraget: snittet av a, og de tre sterkeste toppene.
    const aVals = results.filter((r) => Number.isFinite(r.aEst)).map((r) => r.aEst);
    const withI = results.filter((r) => Number.isFinite(r.d) && Number.isFinite(r.I)).sort((p, q) => q.I - p.I);
    const bits = [];
    if (aVals.length) {
      const mean = aVals.reduce((s, x) => s + x, 0) / aVals.length;
      let txt = `Gitterkonstanten fra ${aVals.length} ${aVals.length === 1 ? "topp" : "topper"}: <b>${fmt(mean, 4)} Å</b>`;
      if (aVals.length > 1) {
        const sd = Math.sqrt(aVals.reduce((s, x) => s + (x - mean) ** 2, 0) / (aVals.length - 1));
        txt += `, standardavvik ${fmt(sd, 4)} Å`;
      }
      bits.push(txt + ".");
    }
    if (withI.length) {
      bits.push(`Sterkest: d = ${withI.slice(0, 3).map((r) => `<b>${fmt(r.d, 3)}</b>`).join(", ")} Å.`);
    }
    readout.innerHTML = bits.join(" ");
    readout.style.display = bits.length ? "" : "none";

    render(results);
  }

  // ── tegning ─────────────────────────────────────────────────────────────
  let last = [];
  function render(results = last) {
    last = results;
    const { w, h } = getSize();
    if (w < 60 || h < 60) return;
    const P = (x) => x.toFixed(1);
    const plot = { x: 16, y: 16, w: w - 32, h: h - 16 - 36 };
    const bottom = plot.y + plot.h;
    const angles = results.flatMap((r) => [r.tt, r.ttPred]).filter(Number.isFinite);
    const xMax = Math.min(180, Math.max(20, Math.ceil((Math.max(0, ...angles) + 3) / 5) * 5));
    const X = (tt) => plot.x + (tt / xMax) * plot.w;
    const iMax = Math.max(0, ...results.map((r) => (Number.isFinite(r.I) && Number.isFinite(r.tt) ? r.I : 0)));
    const height = (r) => (iMax > 0 && Number.isFinite(r.I) ? Math.max(0.04, r.I / iMax) : 0.75) * (plot.h - 22);

    let s = "";
    const labels = [];
    for (const r of results) {
      if (Number.isFinite(r.ttPred)) {
        const x = X(r.ttPred);
        s += `<line x1="${P(x)}" y1="${P(bottom)}" x2="${P(x)}" y2="${P(plot.y + 22)}" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="4 3"/>`;
        if (!Number.isFinite(r.tt)) labels.push({ x, y: plot.y + 18, hkl: r.hkl, color: "var(--accent-ink)" });
      }
      if (Number.isFinite(r.tt)) {
        const x = X(r.tt);
        const top = bottom - height(r);
        s += `<line x1="${P(x)}" y1="${P(bottom)}" x2="${P(x)}" y2="${P(top)}" stroke="var(--fg)" stroke-width="2.5"/>`;
        if (r.hkl) labels.push({ x, y: top - 4, hkl: r.hkl, color: "var(--fg)" });
      }
    }
    // Etiketter som ville kollidert, løftes en linje.
    labels.sort((p, q) => p.x - q.x);
    const placed = [];
    for (const l of labels) {
      let y = l.y;
      for (let tries = 0; tries < 4; tries++) {
        if (placed.some((q) => Math.abs(q.x - l.x) < 26 && Math.abs(q.y - y) < 11)) y -= 12;
        else break;
      }
      y = Math.max(10, y);
      placed.push({ x: l.x, y });
      s += `<text x="${P(l.x)}" y="${P(y)}" text-anchor="middle" style="fill:${l.color};${MONO}">${hklSvg(l.hkl)}</text>`;
    }
    if (!angles.length) {
      s += `<text x="${P(plot.x + plot.w / 2)}" y="${P(plot.y + plot.h / 2)}" text-anchor="middle" style="fill:var(--muted);${MONO}">Skriv inn en målt 2θ eller en hkl under</text>`;
    }

    // Aksen.
    s += `<line x1="${P(plot.x)}" y1="${P(bottom)}" x2="${P(plot.x + plot.w)}" y2="${P(bottom)}" stroke="var(--border-strong)" stroke-width="1"/>`;
    const step = xMax <= 30 ? 5 : xMax <= 60 ? 10 : xMax <= 120 ? 20 : 30;
    const minGap = w < 480 ? 34 : 24;
    let lastX = -1e9;
    for (let t = 0; t <= xMax + 1e-9; t += step) {
      const x = X(t);
      s += `<line x1="${P(x)}" y1="${P(bottom)}" x2="${P(x)}" y2="${P(bottom + 4)}" stroke="var(--border-strong)" stroke-width="1"/>`;
      if (x - lastX >= minGap) {
        s += `<text x="${P(x)}" y="${P(bottom + 16)}" text-anchor="${t === 0 ? "start" : t >= xMax ? "end" : "middle"}" style="fill:var(--muted);${MONO}">${t}°</text>`;
        lastX = x;
      }
    }
    s += `<text x="${P(plot.x + plot.w)}" y="${P(bottom + 31)}" text-anchor="end" style="fill:var(--muted);${MONO}">2θ</text>`;
    s += `<text x="${P(plot.x)}" y="${P(bottom + 31)}" text-anchor="start" style="fill:var(--muted);${MONO}">── målt   ┄┄ forventet fra a</text>`;

    stage.innerHTML =
      `<svg width="100%" height="100%" viewBox="0 0 ${w.toFixed(0)} ${h.toFixed(0)}" ` +
      `preserveAspectRatio="none" role="img" aria-hidden="true" style="display:block">${s}</svg>`;
  }

  for (let i = 0; i < 3; i++) addRow();
  onResize(() => render());
  update();
}
