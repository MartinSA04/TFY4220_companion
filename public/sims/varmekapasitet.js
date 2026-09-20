/**
 * Varmekapasiteten til gitteret for TFY4220, modul 07.
 *
 * Øverst tegnes tilstandstettheten D(ω) i den valgte modellen: Debyes
 * parabel opp til ω_D, eller Einsteins ene frekvens som en stolpe ved
 * ω_E = ω_D. Fyllet under kurven er vektet med hvor mye av den klassiske
 * energien k_BT hver svingning faktisk bærer ved temperaturen T,
 * ⟨E⟩/k_BT = x/(eˣ − 1) med x = ħω/k_BT, så svingningene med ħω ≫ k_BT
 * står tomme. Linjen ħω = k_BT flytter seg med glidebryteren.
 *
 * Nederst tegnes C_V/3Nk_B mot T for begge modellene med samme θ, og et
 * merke på den valgte modellen ved den valgte temperaturen. Stoffet velger
 * θ_D (Kittel tabell 5.1).
 *
 * Kontrakt: default-eksporter init(api), api = { stage, controls, getSize, onResize, signal }.
 */
import { choiceRow } from "./_controls.js";

const MATERIALS = [
  { value: "pb", label: "bly", theta: 105 },
  { value: "cu", label: "kobber", theta: 343 },
  { value: "si", label: "silisium", theta: 645 },
  { value: "c", label: "diamant", theta: 2230 },
];
const T_MAX = 1000;
const T_MIN = 10;
const MONO = "font-family:var(--font-mono);font-size:var(--text-xs)";

/** C_V/3Nk_B i Einstein-modellen, y = θ_E/T. */
function einstein(y) {
  if (y > 60) return 0;
  const e = Math.exp(y);
  return (y * y * e) / ((e - 1) * (e - 1));
}

/** C_V/3Nk_B i Debye-modellen, y = θ_D/T: 3/y³ ∫₀^y x⁴eˣ/(eˣ−1)² dx (Simpson). */
function debye(y) {
  if (y < 1e-3) return 1;
  const n = 200;
  const h = y / n;
  const f = (x) => {
    if (x < 1e-6) return x * x;
    if (x > 60) return 0;
    const e = Math.exp(x);
    return (x ** 4 * e) / ((e - 1) * (e - 1));
  };
  let s = f(0) + f(y);
  for (let i = 1; i < n; i++) s += (i % 2 ? 4 : 2) * f(i * h);
  return (3 / (y * y * y)) * (h / 3) * s;
}

/** ⟨E⟩/k_BT for en svingning med x = ħω/k_BT. */
const classicalShare = (x) => (x < 1e-6 ? 1 : x > 60 ? 0 : x / (Math.exp(x) - 1));

const fmtT = (T) => `${Math.round(T)} K`;

export default function init({ stage, controls, getSize, onResize, signal }) {
  const state = { model: "debye", mat: "cu", T: 300 };
  const theta = () => MATERIALS.find((m) => m.value === state.mat).theta;

  // Kurvene C_V(T) regnes én gang per stoff.
  const cache = new Map();
  function curves() {
    if (cache.has(state.mat)) return cache.get(state.mat);
    const th = theta();
    const pts = [];
    for (let i = 0; i <= 160; i++) {
      const T = T_MIN + ((T_MAX - T_MIN) * i) / 160;
      pts.push({ T, e: einstein(th / T), d: debye(th / T) });
    }
    cache.set(state.mat, pts);
    return pts;
  }

  // ── kontroller ──────────────────────────────────────────────────────────
  const model = choiceRow({
    ariaLabel: "Modell for gittersvingningene",
    label: "modell",
    items: [
      { value: "debye", label: "Debye" },
      { value: "einstein", label: "Einstein" },
    ],
    onPick: (v) => {
      state.model = v;
      model.sync(v);
      render();
    },
    signal,
  });
  controls.append(model.el);

  const mat = choiceRow({
    ariaLabel: "Stoff, som velger Debye-temperaturen",
    label: "stoff",
    items: MATERIALS.map((m) => ({ value: m.value, label: m.label })),
    onPick: (v) => {
      state.mat = v;
      mat.sync(v);
      render();
    },
    signal,
  });
  controls.append(mat.el);

  const label = document.createElement("label");
  label.append("T ");
  const out = document.createElement("output");
  const input = document.createElement("input");
  input.type = "range";
  input.min = String(T_MIN);
  input.max = String(T_MAX);
  input.step = "5";
  input.value = String(state.T);
  input.setAttribute("aria-label", "Temperaturen i kelvin");
  label.append(out, input);
  const syncSlider = () => {
    out.textContent = fmtT(state.T);
  };
  input.addEventListener(
    "input",
    () => {
      state.T = Number(input.value);
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
    const pad = 12;
    const th = theta();
    const T = state.T;
    const debyeMode = state.model === "debye";
    let s = "";
    let defs = "";

    // ── D(ω) øverst. ω i enheter av ω_D; aksen går til 1,25 ω_D.
    const top = { x: pad + 30, y: pad + 14, w: w - 2 * pad - 30 - 8, h: Math.round(h * 0.36) };
    const W_MAX = 1.25;
    const tx = (wr) => top.x + (wr / W_MAX) * top.w;
    const tBottom = top.y + top.h;
    const ty = (frac) => tBottom - frac * top.h;
    const xT = th / T; // ħω_D/k_BT: x for ω = ω_D
    const kT = 1 / xT; // ω der ħω = k_BT, i enheter av ω_D

    // Fyllet vektet med ⟨E⟩/k_BT langs ω.
    let stops = "";
    for (let i = 0; i <= 24; i++) {
      const wr = (i / 24) * W_MAX;
      stops += `<stop offset="${((i / 24) * 100).toFixed(1)}%" stop-color="var(--accent)" stop-opacity="${(0.55 * classicalShare(wr * xT)).toFixed(3)}"/>`;
    }
    defs += `<linearGradient id="vk-grad" x1="0" x2="1" y1="0" y2="0">${stops}</linearGradient>`;

    if (debyeMode) {
      let d = `M${P(tx(0))} ${P(tBottom)} `;
      for (let wr = 0; wr <= 1.0001; wr += 0.02) d += `L${P(tx(wr))} ${P(ty(0.86 * wr * wr))} `;
      d += `L${P(tx(1))} ${P(tBottom)} Z`;
      s += `<path d="${d}" fill="url(#vk-grad)"/>`;
      let c = "";
      for (let wr = 0; wr <= 1.0001; wr += 0.02) c += `${c ? "L" : "M"}${P(tx(wr))} ${P(ty(0.86 * wr * wr))} `;
      s += `<path d="${c}" fill="none" stroke="var(--fg)" stroke-width="2"/>`;
      s += `<line x1="${P(tx(1))}" y1="${P(ty(0.86))}" x2="${P(tx(1))}" y2="${P(tBottom)}" stroke="var(--fg)" stroke-width="2"/>`;
      s += `<text x="${P(tx(0.55))}" y="${P(ty(0.86 * 0.55 * 0.55) - 8)}" text-anchor="middle" style="fill:var(--fg);${MONO}">D ∝ ω²</text>`;
    } else {
      const bw = Math.max(6, top.w * 0.02);
      s += `<rect x="${P(tx(1) - bw / 2)}" y="${P(ty(0.86))}" width="${P(bw)}" height="${P(0.86 * top.h)}" fill="url(#vk-grad)"/>`;
      s += `<rect x="${P(tx(1) - bw / 2)}" y="${P(ty(0.86))}" width="${P(bw)}" height="${P(0.86 * top.h)}" fill="none" stroke="var(--fg)" stroke-width="2"/>`;
      s += `<text x="${P(tx(1) - bw / 2 - 6)}" y="${P(ty(0.75))}" text-anchor="end" style="fill:var(--fg);${MONO}">alle 3N ved ω_E</text>`;
    }

    // Aksene og merkene for D(ω).
    s += `<line x1="${P(top.x)}" y1="${P(top.y)}" x2="${P(top.x)}" y2="${P(tBottom)}" stroke="var(--border-strong)" stroke-width="1"/>`;
    s += `<line x1="${P(top.x)}" y1="${P(tBottom)}" x2="${P(top.x + top.w)}" y2="${P(tBottom)}" stroke="var(--border-strong)" stroke-width="1"/>`;
    s += `<text x="${P(top.x - 6)}" y="${P(top.y + 4)}" text-anchor="end" style="fill:var(--muted);${MONO}">D(ω)</text>`;
    s += `<line x1="${P(tx(1))}" y1="${P(tBottom)}" x2="${P(tx(1))}" y2="${P(tBottom + 4)}" stroke="var(--border-strong)" stroke-width="1"/>`;
    s += `<text x="${P(tx(1))}" y="${P(tBottom + 15)}" text-anchor="middle" style="fill:var(--muted);${MONO}">${debyeMode ? "ω_D" : "ω_E"}</text>`;
    s += `<text x="${P(top.x + top.w)}" y="${P(tBottom + 15)}" text-anchor="end" style="fill:var(--muted);${MONO}">ω</text>`;
    // Linjen ħω = k_BT.
    if (kT <= W_MAX) {
      const x = tx(kT);
      s += `<line x1="${P(x)}" y1="${P(top.y)}" x2="${P(x)}" y2="${P(tBottom)}" stroke="var(--orange)" stroke-width="1.5" stroke-dasharray="4 3"/>`;
      const left = kT > 0.7;
      s += `<text x="${P(left ? x - 5 : x + 5)}" y="${P(top.y + 11)}" text-anchor="${left ? "end" : "start"}" style="fill:var(--orange);font-weight:700;${MONO}">ħω = k<tspan baseline-shift="sub" font-size="80%">B</tspan>T</text>`;
    } else {
      s += `<text x="${P(top.x + top.w)}" y="${P(top.y + 11)}" text-anchor="end" style="fill:var(--orange);font-weight:700;${MONO}">k<tspan baseline-shift="sub" font-size="80%">B</tspan>T › ħω<tspan baseline-shift="sub" font-size="80%">D</tspan></text>`;
    }

    // ── C_V(T) nederst.
    const bot = { x: pad + 30, y: tBottom + 40, w: w - 2 * pad - 30 - 8, h: h - tBottom - 40 - pad - 18 };
    const bx = (TT) => bot.x + ((TT - 0) / T_MAX) * bot.w;
    const bBottom = bot.y + bot.h;
    const by = (c) => bBottom - c * bot.h * 0.9;
    const pts = curves();

    // Dulong-Petit-linjen.
    s += `<line x1="${P(bot.x)}" y1="${P(by(1))}" x2="${P(bot.x + bot.w)}" y2="${P(by(1))}" stroke="var(--border-strong)" stroke-width="1" stroke-dasharray="5 4"/>`;
    s += `<text x="${P(bot.x - 6)}" y="${P(by(1) + 4)}" text-anchor="end" style="fill:var(--muted);${MONO}">3R</text>`;
    s += `<text x="${P(bot.x + 6)}" y="${P(by(1) - 5)}" text-anchor="start" style="fill:var(--muted);${MONO}">Dulong-Petit</text>`;

    const line = (key, stroke, width, dash) => {
      let d = "";
      for (const p of pts) d += `${d ? "L" : "M"}${P(bx(p.T))} ${P(by(p[key]))} `;
      return `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${width}"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`;
    };
    if (debyeMode) {
      s += line("e", "var(--muted)", 1.2, "3 3");
      s += line("d", "var(--fg)", 2);
    } else {
      s += line("d", "var(--muted)", 1.2, "3 3");
      s += line("e", "var(--fg)", 2);
    }
    s += `<text x="${P(bot.x + bot.w)}" y="${P(bot.y + 2)}" text-anchor="end" style="fill:var(--muted);${MONO}">── ${debyeMode ? "Debye" : "Einstein"}   ┄┄ ${debyeMode ? "Einstein" : "Debye"}</text>`;

    // Aksene.
    s += `<line x1="${P(bot.x)}" y1="${P(bot.y)}" x2="${P(bot.x)}" y2="${P(bBottom)}" stroke="var(--border-strong)" stroke-width="1"/>`;
    s += `<line x1="${P(bot.x)}" y1="${P(bBottom)}" x2="${P(bot.x + bot.w)}" y2="${P(bBottom)}" stroke="var(--border-strong)" stroke-width="1"/>`;
    s += `<text x="${P(bot.x - 6)}" y="${P(bot.y + 4)}" text-anchor="end" style="fill:var(--muted);${MONO}">C<tspan baseline-shift="sub" font-size="80%">V</tspan></text>`;
    for (const TT of [0, 250, 500, 750, 1000]) {
      const x = bx(TT);
      s += `<line x1="${P(x)}" y1="${P(bBottom)}" x2="${P(x)}" y2="${P(bBottom + 4)}" stroke="var(--border-strong)" stroke-width="1"/>`;
      s += `<text x="${P(x)}" y="${P(bBottom + 15)}" text-anchor="${TT === 1000 ? "end" : TT === 0 ? "start" : "middle"}" style="fill:var(--muted);${MONO}">${TT === 1000 ? "1000 K" : TT}</text>`;
    }
    // Debye-temperaturen på T-aksen.
    if (th <= T_MAX) {
      const x = bx(th);
      s += `<line x1="${P(x)}" y1="${P(bot.y)}" x2="${P(x)}" y2="${P(bBottom)}" stroke="var(--border)" stroke-width="1" stroke-dasharray="2 3"/>`;
      s += `<text x="${P(x + 4)}" y="${P(bBottom - 4)}" text-anchor="start" style="fill:var(--muted);${MONO}">θ = ${th} K</text>`;
    } else {
      s += `<text x="${P(bot.x + bot.w)}" y="${P(bBottom - 4)}" text-anchor="end" style="fill:var(--muted);${MONO}">θ = ${th} K</text>`;
    }

    // Merket ved den valgte temperaturen.
    const c = debyeMode ? debye(th / T) : einstein(th / T);
    s += `<line x1="${P(bx(T))}" y1="${P(bBottom)}" x2="${P(bx(T))}" y2="${P(by(c))}" stroke="var(--orange)" stroke-width="1" stroke-dasharray="2 3"/>`;
    s += `<circle cx="${P(bx(T))}" cy="${P(by(c))}" r="5.5" fill="var(--orange)" stroke="var(--canvas-bg)" stroke-width="2"/>`;
    const pct = Math.round(c * 100);
    const lx = bx(T);
    const leftSide = T > T_MAX * 0.6;
    s += `<text x="${P(leftSide ? lx - 9 : lx + 9)}" y="${P(by(c) + (c > 0.85 ? 16 : -8))}" text-anchor="${leftSide ? "end" : "start"}" style="fill:var(--fg);font-weight:700;${MONO}">${pct} % av 3R</text>`;

    stage.innerHTML =
      `<svg width="100%" height="100%" viewBox="0 0 ${w.toFixed(0)} ${h.toFixed(0)}" ` +
      `preserveAspectRatio="none" role="img" aria-hidden="true" style="display:block"><defs>${defs}</defs>${s}</svg>`;
  }

  model.sync(state.model);
  mat.sync(state.mat);
  syncSlider();
  onResize(render);
  render();
}
