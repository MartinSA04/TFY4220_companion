/**
 * Sjekk av en indeksering for TEM-laben i TFY4220 (kubisk krystall).
 *
 * Du foreslår indeksene til to reflekser, g₁ = (h₁k₁l₁) og g₂ = (h₂k₂l₂), og
 * skriver inn det du målte på diffraksjonsbildet: avstandene R₁ og R₂ fra
 * sentrum og vinkelen φ mellom dem. Verktøyet regner ut hva forslaget gir,
 *
 *   R₁/R₂ = d₂/d₁ = √N₁/√N₂ med N = h² + k² + l²,
 *   cos φ = (h₁h₂ + k₁k₂ + l₁l₂)/(√N₁ √N₂),
 *   soneaksen [UVW] ∥ g₁ × g₂,
 *
 * og tegner punktgitteret m g₁ + n g₂ som forslaget gir, med det målte andre
 * punktet som en ring oppå. Stemmer forslaget, ligger ringen på punktet.
 * Med kamerakonstanten λL gir det også d = λL/R, og med gitterkonstanten a
 * forventet d = a/√N. Verktøyet sjekker ikke om en refleks er tillatt.
 *
 * Kontrakt: default-eksporter init(api), api = { stage, controls, getSize, onResize, signal }.
 */
import { textField, parseNum, parseHkl, fmt, hklSvg } from "./_controls.js";

const MONO = "font-family:var(--font-mono);font-size:var(--text-xs)";
const DEG = Math.PI / 180;

const gcd = (a, b) => (b === 0 ? Math.abs(a) : gcd(b, a % b));
const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
const cross = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];

export default function init({ stage, controls, getSize, onResize, signal }) {
  const state = { hkl1: "", R1: "", hkl2: "", R2: "", phi: "", lL: "", a: "" };

  const row = (fields) => {
    const el = document.createElement("div");
    el.style.cssText = "flex-basis:100%;display:flex;flex-wrap:wrap;gap:6px 12px;align-items:flex-end";
    el.append(...fields.map((f) => f.el));
    return el;
  };
  const field = (key, label, ariaLabel, width, mode = "decimal", placeholder = "") =>
    textField({
      label,
      ariaLabel,
      width,
      mode,
      placeholder,
      onInput: (v) => {
        state[key] = v;
        update();
      },
      signal,
    });

  controls.append(
    row([
      field("hkl1", "hkl₁", "Indeksene du foreslår for første refleks", "4.2em", "text"),
      field("R1", "R₁", "Målt avstand fra sentrum til første refleks", "4.5em"),
      field("hkl2", "hkl₂", "Indeksene du foreslår for andre refleks", "4.2em", "text"),
      field("R2", "R₂", "Målt avstand fra sentrum til andre refleks", "4.5em"),
      field("phi", "φ (°)", "Målt vinkel mellom de to refleksene i grader", "4.5em"),
    ]),
    row([
      field("lL", "λL (valgfri)", "Kamerakonstanten λL, i ångström ganger enheten du måler R i", "6.5em", "decimal", "fra Si"),
      field("a", "a (Å, valgfri)", "Gitterkonstanten i ångström, for forventet planavstand", "6em"),
    ]),
  );
  const readout = document.createElement("p");
  readout.className = "sim-readout";
  readout.setAttribute("aria-live", "polite");
  controls.append(readout);

  function compute() {
    const g1 = parseHkl(state.hkl1);
    const g2 = parseHkl(state.hkl2);
    const R1 = parseNum(state.R1);
    const R2 = parseNum(state.R2);
    const phi = parseNum(state.phi);
    const lL = parseNum(state.lL);
    const a = parseNum(state.a);
    const r = { g1, g2, R1, R2, phi, lL, a, ok: false };
    if (!g1 || !g2) return r;
    const N1 = dot(g1, g1);
    const N2 = dot(g2, g2);
    if (N1 === 0 || N2 === 0) return r;
    r.N1 = N1;
    r.N2 = N2;
    r.ratio = Math.sqrt(N1 / N2);
    r.phiPred = Math.acos(Math.max(-1, Math.min(1, dot(g1, g2) / Math.sqrt(N1 * N2)))) / DEG;
    const z = cross(g1, g2);
    const k = z.reduce((p, q) => gcd(p, q), 0);
    r.zone = k ? z.map((c) => c / k) : null;
    r.ok = true;
    return r;
  }

  function update() {
    const r = compute();
    const bits = [];
    if (!r.ok) {
      bits.push("Skriv inn to reflekser med tre indekser hver, for eksempel 200 og 020.");
    } else {
      let t = `R₁/R₂: forventet <b>${fmt(r.ratio, 3)}</b>`;
      if (r.R1 > 0 && r.R2 > 0) t += `, målt <b>${fmt(r.R1 / r.R2, 3)}</b>`;
      t += `. φ: forventet <b>${fmt(r.phiPred, 1)}°</b>`;
      if (Number.isFinite(r.phi)) t += `, målt <b>${fmt(r.phi, 1)}°</b>`;
      t += ".";
      bits.push(t);
      bits.push(r.zone ? `Soneaksen er [${r.zone.map((c) => fmt(c, 0)).join(" ")}].` : "De to refleksene er parallelle og gir ingen soneakse.");
      if (r.lL > 0 && (r.R1 > 0 || r.R2 > 0)) {
        const ds = [r.R1, r.R2].map((R) => (R > 0 ? `${fmt(r.lL / R, 3)} Å` : "–"));
        bits.push(`Fra λL: d₁ = ${ds[0]}, d₂ = ${ds[1]}.`);
      }
      if (r.a > 0) {
        bits.push(`Fra a: d₁ = ${fmt(r.a / Math.sqrt(r.N1), 3)} Å, d₂ = ${fmt(r.a / Math.sqrt(r.N2), 3)} Å.`);
      }
    }
    readout.innerHTML = bits.join("<br>");
    render(r);
  }

  let last = null;
  function render(r = last) {
    last = r;
    const { w, h } = getSize();
    if (w < 60 || h < 60 || !r) return;
    const P = (x) => x.toFixed(1);
    const cx = w / 2;
    const cy = h / 2;
    let s = "";

    if (!r.ok) {
      s += `<circle cx="${P(cx)}" cy="${P(cy)}" r="7" fill="var(--fg)"/>`;
      s += `<text x="${P(cx)}" y="${P(cy + 24)}" text-anchor="middle" style="fill:var(--muted);${MONO}">000</text>`;
    } else {
      // Gitteret i planet: g₁ langs x, g₂ i vinkelen φ, lengder √N.
      const L1 = Math.sqrt(r.N1);
      const L2 = Math.sqrt(r.N2);
      const ph = r.phiPred * DEG;
      const e1 = [L1, 0];
      const e2 = [L2 * Math.cos(ph), L2 * Math.sin(ph)];
      const scale = (0.3 * Math.min(w, h)) / Math.max(L1, L2);
      const toX = (v) => cx + v[0] * scale;
      const toY = (v) => cy - v[1] * scale;
      const inside = (x, y) => x > 8 && x < w - 8 && y > 8 && y < h - 8;

      for (let m = -8; m <= 8; m++) {
        for (let n = -8; n <= 8; n++) {
          const v = [m * e1[0] + n * e2[0], m * e1[1] + n * e2[1]];
          const x = toX(v);
          const y = toY(v);
          if (!inside(x, y)) continue;
          const origin = m === 0 && n === 0;
          s += `<circle cx="${P(x)}" cy="${P(y)}" r="${origin ? 7 : 4.5}" fill="var(--fg)"/>`;
        }
      }
      const arrow = (v, color) => {
        const x = toX(v);
        const y = toY(v);
        return `<line x1="${P(cx)}" y1="${P(cy)}" x2="${P(x)}" y2="${P(y)}" stroke="${color}" stroke-width="2"/>`;
      };
      s += arrow(e1, "var(--accent)") + arrow(e2, "var(--accent)");

      // Målt andre refleks: lengde R₂/R₁ ganger |g₁|, vinkel φ.
      if (r.R1 > 0 && r.R2 > 0 && Number.isFinite(r.phi)) {
        const len = (r.R2 / r.R1) * L1;
        const mv = [len * Math.cos(r.phi * DEG), len * Math.sin(r.phi * DEG)];
        const x = toX(mv);
        const y = toY(mv);
        s += `<line x1="${P(cx)}" y1="${P(cy)}" x2="${P(x)}" y2="${P(y)}" stroke="var(--orange)" stroke-width="1.5" stroke-dasharray="4 3"/>`;
        s += `<circle cx="${P(x)}" cy="${P(y)}" r="9" fill="none" stroke="var(--orange)" stroke-width="2"/>`;
        s += `<text x="${P(x + 12)}" y="${P(y + 16)}" text-anchor="start" style="fill:var(--orange);font-weight:700;${MONO}">målt</text>`;
      }

      // Etiketter på g₁, g₂ og g₁ + g₂.
      const lab = (v, hkl) => {
        const x = toX(v);
        const y = toY(v);
        if (!inside(x, y)) return "";
        return `<text x="${P(x)}" y="${P(y - 11)}" text-anchor="middle" style="fill:var(--accent-ink);font-weight:700;${MONO}">${hklSvg(hkl)}</text>`;
      };
      s += lab(e1, r.g1) + lab(e2, r.g2);
      s += lab([e1[0] + e2[0], e1[1] + e2[1]], r.g1.map((c, i) => c + r.g2[i]));
      s += `<text x="${P(cx)}" y="${P(cy + 22)}" text-anchor="middle" style="fill:var(--muted);${MONO}">000</text>`;
      if (r.zone) {
        s += `<text x="12" y="20" text-anchor="start" style="fill:var(--fg);font-weight:700;${MONO}">soneakse [${hklSvg(r.zone)}]</text>`;
      }
    }

    stage.innerHTML =
      `<svg width="100%" height="100%" viewBox="0 0 ${w.toFixed(0)} ${h.toFixed(0)}" ` +
      `preserveAspectRatio="none" role="img" aria-hidden="true" style="display:block">${s}</svg>`;
  }

  onResize(() => render());
  update();
}
