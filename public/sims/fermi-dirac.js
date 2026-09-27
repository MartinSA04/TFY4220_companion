/**
 * Fermi-Dirac-fordelingen for ledningselektronene i kobber, TFY4220 modul 08.
 *
 * Øverst tegnes de besatte tilstandene D(ε)f(ε) for hele elektrongassen, fra
 * ε = 0 til 12 eV, med D(ε) ∝ √ε og ε_F = 7,04 eV (n = 8,47·10²⁸ m⁻³).
 * Nederst tegnes det samme utsnittet ε_F ± 0,4 eV forstørret. Ved T > 0 er
 * elektronene som er løftet over ε_F, fylt oransje, og tilstandene de har
 * forlatt under ε_F, skravert. De to arealene er like store.
 *
 * Det kjemiske potensialet μ(T) finnes ved å kreve at antallet elektroner er
 * fast: ∫ √x f(x) dx = 2/3 med x = ε/ε_F. Glidebryteren er logaritmisk fra
 * 10 K til 100 000 K, så både romtemperatur og T ~ T_F kan nås.
 *
 * Kontrakt: default-eksporter init(api), api = { stage, controls, getSize, onResize, signal }.
 */

const EF = 7.04; // eV, fra n = 8,47·10²⁸ m⁻³
const KB = 8.617e-5; // eV/K
const TF = EF / KB; // ≈ 81 700 K
const E_MAX = 12; // eV, øvre grense for den fulle aksen
const ZOOM = 0.4; // eV, halvbredden på forstørrelsen
const T_MELT = 1358; // K, smeltepunktet til kobber
const MONO = "font-family:var(--font-mono);font-size:var(--text-xs)";

/** Besetningen f(x) med x = ε/ε_F, m = μ/ε_F og t = T/T_F. */
function fermi(x, m, t) {
  if (t <= 0) return x < m ? 1 : x > m ? 0 : 0.5;
  const z = (x - m) / t;
  if (z > 60) return 0;
  if (z < -60) return 1;
  return 1 / (Math.exp(z) + 1);
}

/** ∫ √x f(x) dx fra x = a til b, med x = u² så integranden 2u² f(u²) er glatt. */
function occupied(a, b, m, t) {
  const ua = Math.sqrt(a);
  const ub = Math.sqrt(b);
  const n = 600;
  const h = (ub - ua) / n;
  const g = (u) => 2 * u * u * fermi(u * u, m, t);
  let s = g(ua) + g(ub);
  for (let i = 1; i < n; i++) s += (i % 2 ? 4 : 2) * g(ua + i * h);
  return (h / 3) * s;
}

const upper = (m, t) => Math.max(m, 0) + 45 * t + 0.1;

/** μ/ε_F ved t = T/T_F, fra kravet om fast elektrontall. */
function chemicalPotential(t) {
  if (t < 0.02) return 1 - ((Math.PI * Math.PI) / 12) * t * t;
  let lo = -40 * t - 2;
  let hi = 1.01;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (occupied(0, upper(mid, t), mid, t) > 2 / 3) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

/** T med to gjeldende siffer, fra glidebryterens logaritmiske posisjon. */
function niceT(v) {
  const T = 10 * 10 ** (v / 100);
  const p = 10 ** (Math.floor(Math.log10(T)) - 1);
  return Math.round(T / p) * p;
}

const fmtNum = (x) => x.toLocaleString("nb-NO").replace(/ /g, " ");

function fmtPct(p) {
  const v = p * 100;
  const digits = v < 0.1 ? 2 : v < 10 ? 1 : 0;
  return v.toFixed(digits).replace(".", ",");
}

export default function init({ stage, controls, getSize, onResize, signal }) {
  const state = { v: 148 };

  // ── kontroller ──────────────────────────────────────────────────────────
  const label = document.createElement("label");
  label.append("T ");
  const out = document.createElement("output");
  const input = document.createElement("input");
  input.type = "range";
  input.min = "0";
  input.max = "400";
  input.step = "1";
  input.value = String(state.v);
  input.setAttribute("aria-label", "Temperaturen, på logaritmisk skala fra 10 til 100 000 kelvin");
  label.append(out, input);
  const syncSlider = () => {
    out.textContent = `${fmtNum(niceT(state.v))} K`;
  };
  input.addEventListener(
    "input",
    () => {
      state.v = Number(input.value);
      syncSlider();
      render();
    },
    { signal },
  );
  controls.append(label);

  // ── tegning ─────────────────────────────────────────────────────────────
  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return;
    const P = (x) => x.toFixed(1);
    const T = niceT(state.v);
    const t = T / TF;
    const m = chemicalPotential(t);
    const lifted = occupied(1, upper(m, t), m, t) / (2 / 3);
    const pad = 12;
    let s = "";

    // Skraveringen for tomme tilstander.
    const defs =
      `<pattern id="fd-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">` +
      `<line x1="0" y1="0" x2="0" y2="6" stroke="var(--orange)" stroke-width="1.6"/></pattern>`;

    /**
     * Tegner ett panel: D(ε) som linje, de besatte tilstandene under ε_F i
     * aksentfargen, de løftede over ε_F oransje og de tomme under ε_F skravert.
     * `e0`/`e1` er energiområdet i eV, `box` er pikselrammen.
     */
    function panel(box, e0, e1, yMax) {
      const px = (e) => box.x + ((e - e0) / (e1 - e0)) * box.w;
      const base = box.y + box.h;
      const py = (y) => base - (y / yMax) * box.h;
      const n = 240;
      const es = [];
      for (let i = 0; i <= n; i++) es.push(e0 + ((e1 - e0) * i) / n);
      if (e0 < EF && EF < e1) {
        es.push(EF);
        es.sort((a, b) => a - b);
      }
      const D = (e) => Math.sqrt(Math.max(e, 0) / EF);
      const occ = (e) => D(e) * fermi(e / EF, m, t);
      const below = es.filter((e) => e <= EF);
      const above = es.filter((e) => e >= EF);
      let out = "";

      // Besatt under ε_F.
      if (below.length > 1) {
        let d = `M${P(px(below[0]))} ${P(base)} `;
        for (const e of below) d += `L${P(px(e))} ${P(py(occ(e)))} `;
        d += `L${P(px(below[below.length - 1]))} ${P(base)} Z`;
        out += `<path d="${d}" fill="var(--accent)" fill-opacity="0.3"/>`;
        // Tomme tilstander: mellom D(ε) og D(ε)f(ε).
        let hole = "";
        for (const e of below) hole += `${hole ? "L" : "M"}${P(px(e))} ${P(py(D(e)))} `;
        for (let i = below.length - 1; i >= 0; i--) hole += `L${P(px(below[i]))} ${P(py(occ(below[i])))} `;
        out += `<path d="${hole} Z" fill="url(#fd-hatch)"/>`;
      }
      // Løftet over ε_F.
      if (above.length > 1) {
        let d = `M${P(px(above[0]))} ${P(base)} `;
        for (const e of above) d += `L${P(px(e))} ${P(py(occ(e)))} `;
        d += `L${P(px(above[above.length - 1]))} ${P(base)} Z`;
        out += `<path d="${d}" fill="var(--orange)" fill-opacity="0.75"/>`;
      }
      // Kanten av de besatte tilstandene, og D(ε).
      let edge = "";
      for (const e of es) edge += `${edge ? "L" : "M"}${P(px(e))} ${P(py(occ(e)))} `;
      out += `<path d="${edge}" fill="none" stroke="var(--accent)" stroke-width="1.5"/>`;
      let dl = "";
      for (const e of es) dl += `${dl ? "L" : "M"}${P(px(e))} ${P(py(D(e)))} `;
      out += `<path d="${dl}" fill="none" stroke="var(--fg)" stroke-width="1.5"/>`;
      // Aksen.
      out += `<line x1="${P(box.x)}" y1="${P(base)}" x2="${P(box.x + box.w)}" y2="${P(base)}" stroke="var(--border-strong)" stroke-width="1"/>`;
      s += out;
      return { px, py, base, D };
    }

    // ── hele elektrongassen øverst ──
    const top = { x: pad + 4, y: pad + 16, w: w - 2 * pad - 8, h: Math.round(h * 0.34) };
    const Y_TOP = 1.45;
    const A = panel(top, 0, E_MAX, Y_TOP);
    for (let e = 0; e <= E_MAX; e += 3) {
      const x = A.px(e);
      s += `<line x1="${P(x)}" y1="${P(A.base)}" x2="${P(x)}" y2="${P(A.base + 4)}" stroke="var(--border-strong)" stroke-width="1"/>`;
      if (Math.abs(e - EF) > 1.2) {
        s += `<text x="${P(x)}" y="${P(A.base + 15)}" text-anchor="${e === 0 ? "start" : e === E_MAX ? "end" : "middle"}" style="fill:var(--muted);${MONO}">${e === E_MAX ? "12 eV" : e}</text>`;
      }
    }
    s += `<text x="${P(A.px(EF))}" y="${P(A.base + 15)}" text-anchor="middle" style="fill:var(--fg);font-weight:700;${MONO}">ε<tspan baseline-shift="sub" font-size="80%">F</tspan></text>`;
    const dLabelE = 10.2;
    s += `<text x="${P(A.px(dLabelE))}" y="${P(A.py(A.D(dLabelE)) - 8)}" text-anchor="middle" style="fill:var(--fg);${MONO}">D(ε)</text>`;

    // μ når det har flyttet seg synlig fra ε_F.
    const muE = m * EF;
    if (Math.abs(A.px(muE) - A.px(EF)) > 6 && muE > 0) {
      const x = A.px(muE);
      s += `<line x1="${P(x)}" y1="${P(top.y)}" x2="${P(x)}" y2="${P(A.base)}" stroke="var(--muted)" stroke-width="1" stroke-dasharray="3 3"/>`;
      s += `<text x="${P(x)}" y="${P(top.y - 3)}" text-anchor="middle" style="fill:var(--muted);${MONO}">μ</text>`;
    } else if (muE <= 0) {
      s += `<text x="${P(top.x)}" y="${P(top.y - 3)}" text-anchor="start" style="fill:var(--muted);${MONO}">μ &lt; 0</text>`;
    }
    if (T > T_MELT) {
      s += `<text x="${P(top.x + top.w)}" y="${P(top.y - 3)}" text-anchor="end" style="fill:var(--muted);${MONO}">kobber smelter ved 1358 K</text>`;
    }

    // Vinduet som forstørres, ført ned under tallene på aksen.
    const zx0 = A.px(EF - ZOOM);
    const zx1 = A.px(EF + ZOOM);
    const zy = A.py(1.18);
    const zb = A.base + 21;
    s += `<rect x="${P(zx0)}" y="${P(zy)}" width="${P(zx1 - zx0)}" height="${P(zb - zy)}" fill="none" stroke="var(--border-strong)" stroke-width="1" stroke-dasharray="3 2"/>`;

    // ── forstørrelsen, under den fulle aksen ──
    const LEGEND = 44;
    const bot = { x: pad + 4, y: A.base + 58, w: w - 2 * pad - 8, h: 0 };
    bot.h = h - bot.y - 20 - LEGEND - pad;
    const Y_BOT = 1.32;
    s += `<line x1="${P(zx0)}" y1="${P(zb)}" x2="${P(bot.x)}" y2="${P(bot.y - 4)}" stroke="var(--border)" stroke-width="1" stroke-dasharray="3 2"/>`;
    s += `<line x1="${P(zx1)}" y1="${P(zb)}" x2="${P(bot.x + bot.w)}" y2="${P(bot.y - 4)}" stroke="var(--border)" stroke-width="1" stroke-dasharray="3 2"/>`;

    const B = panel(bot, EF - ZOOM, EF + ZOOM, Y_BOT);
    const roomy = bot.w > 420;
    for (const d of [-0.4, -0.2, 0, 0.2, 0.4]) {
      const x = B.px(EF + d);
      s += `<line x1="${P(x)}" y1="${P(B.base)}" x2="${P(x)}" y2="${P(B.base + 4)}" stroke="var(--border-strong)" stroke-width="1"/>`;
      if (Math.abs(d) === 0.2 && !roomy) continue;
      const txt =
        d === 0
          ? `ε<tspan baseline-shift="sub" font-size="80%">F</tspan>`
          : `${d > 0 ? "+" : "−"}${Math.abs(d).toFixed(1).replace(".", ",")}${d === 0.4 ? " eV" : ""}`;
      s += `<text x="${P(x)}" y="${P(B.base + 15)}" text-anchor="${d === -0.4 ? "start" : d === 0.4 ? "end" : "middle"}" style="fill:${d === 0 ? "var(--fg)" : "var(--muted)"};${d === 0 ? "font-weight:700;" : ""}${MONO}">${txt}</text>`;
    }

    // Forklaringen under forstørrelsen.
    const ly = B.base + 38;
    s += `<rect x="${P(bot.x)}" y="${P(ly - 9)}" width="12" height="10" fill="url(#fd-hatch)" stroke="var(--orange)" stroke-width="1"/>`;
    s += `<text x="${P(bot.x + 18)}" y="${P(ly)}" style="fill:var(--fg);${MONO}">tomme tilstander under ε<tspan baseline-shift="sub" font-size="80%">F</tspan></text>`;
    s += `<rect x="${P(bot.x)}" y="${P(ly + 9)}" width="12" height="10" fill="var(--orange)" fill-opacity="0.75"/>`;
    s += `<text x="${P(bot.x + 18)}" y="${P(ly + 18)}" style="fill:var(--fg);${MONO}"><tspan style="font-weight:700">${fmtPct(lifted)} %</tspan> av elektronene løftet over ε<tspan baseline-shift="sub" font-size="80%">F</tspan></text>`;

    // k_BT som en klamme over kanten, så lenge den får plass i utsnittet.
    const kT = KB * T;
    if (kT < ZOOM) {
      const x0 = B.px(EF);
      const x1 = B.px(EF + kT);
      const y = B.py(1.17);
      s += `<line x1="${P(x0)}" y1="${P(y)}" x2="${P(x1)}" y2="${P(y)}" stroke="var(--fg)" stroke-width="1.2"/>`;
      s += `<line x1="${P(x0)}" y1="${P(y - 4)}" x2="${P(x0)}" y2="${P(y + 4)}" stroke="var(--fg)" stroke-width="1.2"/>`;
      s += `<line x1="${P(x1)}" y1="${P(y - 4)}" x2="${P(x1)}" y2="${P(y + 4)}" stroke="var(--fg)" stroke-width="1.2"/>`;
      const wide = x1 - x0 > 44;
      s += `<text x="${P(wide ? (x0 + x1) / 2 : x1 + 5)}" y="${P(wide ? y - 6 : y + 4)}" text-anchor="${wide ? "middle" : "start"}" style="fill:var(--fg);${MONO}">k<tspan baseline-shift="sub" font-size="80%">B</tspan>T</text>`;
    }

    stage.innerHTML =
      `<svg width="100%" height="100%" viewBox="0 0 ${w.toFixed(0)} ${h.toFixed(0)}" ` +
      `preserveAspectRatio="none" role="img" aria-hidden="true" style="display:block"><defs>${defs}</defs>${s}</svg>`;
  }

  syncSlider();
  onResize(render);
  render();
}
