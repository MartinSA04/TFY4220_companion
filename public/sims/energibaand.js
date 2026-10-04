/**
 * Energibånd i en endimensjonal krystall, TFY4220 modul 09.
 *
 * Elektroner i potensialet U(x) = 2U₁ cos(2πx/a) + 2U₂ cos(4πx/a), med
 * U₁, U₂ ≤ 0 så brønnene ligger ved ionene i x = na. Båndene finnes ved å løse
 * sentralligningen eksakt i en basis av ni planbølger e^{i(k − mg)x},
 * m = −4 … 4 og g = 2π/a:
 *
 *   ε C_m = λ_{k−mg} C_m + U₁ (C_{m−1} + C_{m+1}) + U₂ (C_{m−2} + C_{m+2})
 *
 * Nederst tegnes ε_n(k) periodisk fra −2π/a til 2π/a med første
 * Brillouin-sone skravert, de frie parablene ħ²(k − G)²/2m stiplet, og de
 * forbudte energiene som oransje bånd merket med båndgapet. Den valgte
 * tilstanden merkes med en fylt prikk og de ekvivalente k + G med åpne.
 *
 * Øverst tegnes kjeden: ionene på aksen, U(x) hengende under aksen og
 * sannsynlighetstettheten |ψ|² for den valgte tilstanden over. Tettheten er
 * normert så middelet er 1, så en planbølge er en flat linje og en ren
 * stående bølge går mellom 0 og 2.
 *
 * Gitterkonstanten er a = 3 Å, så en fri elektron på sonegrensen har
 * ħ²(π/a)²/2m = 4,18 eV. Kontrakt: default-eksporter init(api),
 * api = { stage, controls, getSize, onResize, signal }.
 */
import { choiceRow, fmt } from "./_controls.js";

const HB2M = 3.81; // ħ²/2m i eV Å²
const A = 3; // Å
const E1 = (HB2M * Math.PI * Math.PI) / (A * A); // ≈ 4,18 eV ved k = π/a
const M = 4; // planbølger m = −M … M
const NB = 2 * M + 1;
const E_MIN = -0.6;
const E_MAX = 21;
const U_MAX = 1.2; // eV, øvre grense på glidebryterne
const U_SPAN = 8; // eV, største høyde på U(x) når begge glidebryterne står på maks
const MONO = "font-family:var(--font-mono);font-size:var(--text-xs)";

/** Egenverdier og -vektorer til en symmetrisk matrise, syklisk Jacobi. */
function eigen(H) {
  const n = H.length;
  const a = H.map((r) => r.slice());
  const v = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  for (let sweep = 0; sweep < 50; sweep++) {
    let off = 0;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += a[p][q] * a[p][q];
    if (off < 1e-22) break;
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        if (Math.abs(a[p][q]) < 1e-14) continue;
        const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < n; k++) {
          const akp = a[k][p];
          const akq = a[k][q];
          a[k][p] = c * akp - s * akq;
          a[k][q] = s * akp + c * akq;
        }
        for (let k = 0; k < n; k++) {
          const apk = a[p][k];
          const aqk = a[q][k];
          a[p][k] = c * apk - s * aqk;
          a[q][k] = s * apk + c * aqk;
        }
        for (let k = 0; k < n; k++) {
          const vkp = v[k][p];
          const vkq = v[k][q];
          v[k][p] = c * vkp - s * vkq;
          v[k][q] = s * vkp + c * vkq;
        }
      }
    }
  }
  const order = Array.from({ length: n }, (_, i) => i).sort((i, j) => a[i][i] - a[j][j]);
  return {
    vals: order.map((i) => a[i][i]),
    vecs: order.map((i) => v.map((row) => row[i])),
  };
}

/** Løsningen av sentralligningen ved k = q·π/a, med q i første sone. */
function solve(q, u1, u2) {
  const H = Array.from({ length: NB }, () => new Array(NB).fill(0));
  for (let i = 0; i < NB; i++) {
    const m = i - M;
    H[i][i] = E1 * (q - 2 * m) ** 2;
    if (i + 1 < NB) H[i][i + 1] = H[i + 1][i] = u1;
    if (i + 2 < NB) H[i][i + 2] = H[i + 2][i] = u2;
  }
  return eigen(H);
}

/** |ψ|² i x (enheter av a) for koeffisientene C_m; middelet er 1. */
function density(C, x) {
  let re = 0;
  let im = 0;
  for (let i = 0; i < NB; i++) {
    const ph = 2 * Math.PI * (i - M) * x;
    re += C[i] * Math.cos(ph);
    im -= C[i] * Math.sin(ph);
  }
  return re * re + im * im;
}

export default function init({ stage, controls, getSize, onResize, signal }) {
  const state = { band: "1", q: 1, u1: 0.8, u2: 0.3 };

  // ── kontroller ──────────────────────────────────────────────────────────
  const band = choiceRow({
    ariaLabel: "Hvilket bånd den merkede tilstanden ligger i",
    label: "bånd",
    items: [
      { value: "1", label: "1" },
      { value: "2", label: "2" },
    ],
    onPick: (v) => {
      state.band = v;
      band.sync(v);
      render();
    },
    signal,
  });
  controls.append(band.el);

  function slider({ name, aria, min, max, step, key, show }) {
    const label = document.createElement("label");
    label.append(`${name} `);
    const out = document.createElement("output");
    const input = document.createElement("input");
    input.type = "range";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(state[key]);
    input.setAttribute("aria-label", aria);
    label.append(out, input);
    const sync = () => {
      out.textContent = show(state[key]);
    };
    input.addEventListener(
      "input",
      () => {
        state[key] = Number(input.value);
        sync();
        render();
      },
      { signal },
    );
    sync();
    controls.append(label);
  }
  slider({ name: "k", aria: "Bølgevektoren k i enheter av π/a", min: 0, max: 1, step: 0.02, key: "q", show: (v) => `${fmt(v, 2)} π/a` });
  slider({ name: "|U₁|", aria: "Fourier-komponenten U₁ av potensialet, i elektronvolt", min: 0, max: U_MAX, step: 0.05, key: "u1", show: (v) => `${fmt(v, 2)} eV` });
  slider({ name: "|U₂|", aria: "Fourier-komponenten U₂ av potensialet, i elektronvolt", min: 0, max: U_MAX, step: 0.05, key: "u2", show: (v) => `${fmt(v, 2)} eV` });

  // ── tegning ─────────────────────────────────────────────────────────────
  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return;
    const P = (x) => x.toFixed(1);
    const pad = 12;
    const u1 = -state.u1;
    const u2 = -state.u2;
    const nb = Number(state.band) - 1;
    let s = "";

    // Båndene i første sone, tre laveste.
    const NS = 121;
    const qs = [];
    const bands = [[], [], []];
    for (let i = 0; i < NS; i++) {
      const q = -1 + (2 * i) / (NS - 1);
      const { vals } = solve(q, u1, u2);
      qs.push(q);
      for (let b = 0; b < 3; b++) bands[b].push(vals[b]);
    }
    const sel = solve(state.q, u1, u2);
    const eSel = sel.vals[nb];
    const cSel = sel.vecs[nb];

    // ── kjeden ──
    const stripH = Math.round(h * 0.34);
    const cells = Math.max(5, Math.min(8, Math.round((w - 2 * pad) / 90)));
    const sx0 = pad + 4;
    const sx1 = w - pad - 4;
    const xOf = (x) => sx0 + ((x + 0.5) / cells) * (sx1 - sx0);
    // Fra toppen: plass til |ψ|²-merket, tettheten, aksen, U(x) og nederst
    // klammen for a, som ikke skal krysses av kurvene.
    const avail = stripH - 14 - 3 - 18;
    const rhoH = avail * 0.55; // høyden for |ψ|² = 2,2
    const uH = avail * 0.45; // høyden for U_SPAN
    const yAxis = pad + 14 + rhoH;
    const yRho = (r) => yAxis - (r / 2.2) * rhoH;

    // U(x) − maks U, så kurven henger under aksen.
    const Ux = (x) => 2 * u1 * Math.cos(2 * Math.PI * x) + 2 * u2 * Math.cos(4 * Math.PI * x);
    let uTop = -Infinity;
    for (let i = 0; i <= 200; i++) uTop = Math.max(uTop, Ux(i / 200));
    const yU = (x) => yAxis + 3 + ((uTop - Ux(x)) / U_SPAN) * uH;

    let dU = "";
    let dR = "";
    const steps = Math.round((sx1 - sx0) / 2);
    for (let i = 0; i <= steps; i++) {
      const x = -0.5 + (i / steps) * cells;
      const px = xOf(x);
      dU += `${dU ? "L" : "M"}${P(px)} ${P(yU(x))} `;
      dR += `${dR ? "L" : "M"}${P(px)} ${P(yRho(density(cSel, x)))} `;
    }
    s += `<path d="${dR}L${P(xOf(cells - 0.5))} ${P(yAxis)}L${P(xOf(-0.5))} ${P(yAxis)}Z" fill="var(--accent)" fill-opacity="0.18"/>`;
    s += `<path d="${dR}" fill="none" stroke="var(--accent)" stroke-width="2"/>`;
    // Middelet: en planbølge ville vært denne linja.
    s += `<line x1="${P(sx0)}" y1="${P(yRho(1))}" x2="${P(sx1)}" y2="${P(yRho(1))}" stroke="var(--border)" stroke-width="1" stroke-dasharray="3 4"/>`;
    s += `<line x1="${P(sx0)}" y1="${P(yAxis)}" x2="${P(sx1)}" y2="${P(yAxis)}" stroke="var(--border-strong)" stroke-width="1"/>`;
    s += `<path d="${dU}" fill="none" stroke="var(--muted)" stroke-width="1.5"/>`;
    for (let n = 0; n < cells; n++) {
      s += `<circle cx="${P(xOf(n))}" cy="${P(yAxis)}" r="4.5" fill="var(--border-strong)"/>`;
    }
    s += `<text x="${P(sx1)}" y="${P(pad + 9)}" text-anchor="end" style="fill:var(--accent);${MONO}">|ψ|²</text>`;
    s += `<text x="${P(sx1)}" y="${P(pad + stripH - 7)}" text-anchor="end" style="fill:var(--muted);${MONO}">U(x)</text>`;
    // Gitterkonstanten a mellom de to første ionene, nederst i stripen.
    const yb = pad + stripH - 4;
    const xa0 = xOf(0);
    const xa1 = xOf(1);
    s += `<line x1="${P(xa0)}" y1="${P(yb)}" x2="${P(xa1)}" y2="${P(yb)}" stroke="var(--muted)" stroke-width="1"/>`;
    s += `<line x1="${P(xa0)}" y1="${P(yb - 4)}" x2="${P(xa0)}" y2="${P(yb + 4)}" stroke="var(--muted)" stroke-width="1"/>`;
    s += `<line x1="${P(xa1)}" y1="${P(yb - 4)}" x2="${P(xa1)}" y2="${P(yb + 4)}" stroke="var(--muted)" stroke-width="1"/>`;
    s += `<text x="${P((xa0 + xa1) / 2)}" y="${P(yb - 5)}" text-anchor="middle" style="fill:var(--muted);${MONO}">a</text>`;

    // ── båndene ──
    const g = {
      x: pad + 24,
      y: pad + stripH + 20,
      w: w - 2 * pad - 24 - 4,
      h: h - pad - stripH - 20 - 22,
    };
    const gx = (q) => g.x + ((q + 2) / 4) * g.w;
    const gy = (e) => g.y + g.h - ((e - E_MIN) / (E_MAX - E_MIN)) * g.h;
    const bottom = g.y + g.h;
    s += `<clipPath id="eb-clip"><rect x="${P(g.x)}" y="${P(g.y)}" width="${P(g.w)}" height="${P(g.h)}"/></clipPath>`;

    // Første Brillouin-sone.
    s += `<rect x="${P(gx(-1))}" y="${P(g.y)}" width="${P(gx(1) - gx(-1))}" height="${P(g.h)}" fill="var(--accent)" fill-opacity="0.08"/>`;

    // De forbudte energiene.
    // Merket står der ingen kurve går gjennom gapet: midt i sonen for gapet
    // mellom bånd 1 og 2, og ved 0,62π/a for gapet mellom bånd 2 og 3,
    // fri for bånd 3, som stiger bratt fra k = 0.
    const gaps = [
      [Math.max(...bands[0]), Math.min(...bands[1]), 0],
      [Math.max(...bands[1]), Math.min(...bands[2]), 0.62],
    ];
    for (const [lo, hi, qLabel] of gaps) {
      if (hi <= lo || lo > E_MAX) continue;
      const yTop = gy(Math.min(hi, E_MAX));
      const yBot = gy(lo);
      s += `<rect x="${P(g.x)}" y="${P(yTop)}" width="${P(g.w)}" height="${P(yBot - yTop)}" fill="var(--orange)" fill-opacity="0.16"/>`;
      // Gapet i eV ved høyre kant, midt i båndet når det er plass, ellers over.
      const txt = `${fmt(hi - lo, 2)} eV`;
      const yt = yBot - yTop >= 13 ? (yTop + yBot) / 2 + 4 : yTop - 3;
      if (hi - lo >= 0.005) {
        s += `<text x="${P(gx(qLabel))}" y="${P(yt)}" text-anchor="middle" style="fill:var(--muted);${MONO}">${txt}</text>`;
      }
    }

    // Akser.
    s += `<line x1="${P(g.x)}" y1="${P(g.y)}" x2="${P(g.x)}" y2="${P(bottom)}" stroke="var(--border-strong)" stroke-width="1"/>`;
    s += `<line x1="${P(g.x)}" y1="${P(bottom)}" x2="${P(g.x + g.w)}" y2="${P(bottom)}" stroke="var(--border-strong)" stroke-width="1"/>`;
    s += `<text x="${P(g.x - 4)}" y="${P(g.y - 7)}" text-anchor="start" style="fill:var(--muted);${MONO}">ε (eV)</text>`;
    for (const e of [0, 5, 10, 15, 20]) {
      const y = gy(e);
      s += `<line x1="${P(g.x - 4)}" y1="${P(y)}" x2="${P(g.x)}" y2="${P(y)}" stroke="var(--border-strong)" stroke-width="1"/>`;
      s += `<text x="${P(g.x - 6)}" y="${P(y + 4)}" text-anchor="end" style="fill:var(--muted);${MONO}">${e}</text>`;
    }
    const ticks = [
      [-2, "−2π/a"],
      [-1, "−π/a"],
      [0, "0"],
      [1, "π/a"],
      [2, "2π/a"],
    ];
    for (const [q, txt] of ticks) {
      const x = gx(q);
      s += `<line x1="${P(x)}" y1="${P(bottom)}" x2="${P(x)}" y2="${P(bottom + 4)}" stroke="var(--border-strong)" stroke-width="1"/>`;
      const anchor = q === -2 ? "start" : q === 2 ? "end" : "middle";
      s += `<text x="${P(x)}" y="${P(bottom + 15)}" text-anchor="${anchor}" style="fill:var(--muted);${MONO}">${txt}</text>`;
    }

    // Det tomme gitteret: frie parabler sentrert i hver G.
    let free = "";
    for (let j = -3; j <= 3; j++) {
      let d = "";
      for (let q = -2; q <= 2.0001; q += 0.02) {
        d += `${d ? "L" : "M"}${P(gx(q))} ${P(gy(E1 * (q - 2 * j) ** 2))} `;
      }
      free += `<path d="${d}" fill="none" stroke="var(--muted)" stroke-width="1" stroke-dasharray="3 4"/>`;
    }
    s += `<g clip-path="url(#eb-clip)">${free}`;

    // Båndene, gjentatt med perioden 2π/a.
    for (let b = 0; b < 3; b++) {
      for (const shift of [-2, 0, 2]) {
        let d = "";
        for (let i = 0; i < NS; i++) {
          const q = qs[i] + shift;
          if (q < -2.0001 || q > 2.0001) continue;
          d += `${d ? "L" : "M"}${P(gx(q))} ${P(gy(bands[b][i]))} `;
        }
        if (d) s += `<path d="${d}" fill="none" stroke="var(--fg)" stroke-width="2"/>`;
      }
    }
    s += `</g>`;

    // Båndnumrene inne i første sone.
    const at = (b, q) => bands[b][Math.round(((q + 1) / 2) * (NS - 1))];
    s += `<text x="${P(gx(-0.5))}" y="${P(gy(at(0, -0.5)) - 7)}" text-anchor="middle" style="fill:var(--fg);${MONO}">1</text>`;
    s += `<text x="${P(gx(-0.5) - 8)}" y="${P(gy(at(1, -0.5)))}" text-anchor="end" style="fill:var(--fg);${MONO}">2</text>`;

    // Den valgte tilstanden og de ekvivalente bølgevektorene.
    for (const shift of [-2, 2]) {
      const q = state.q + shift;
      if (q < -2.0001 || q > 2.0001) continue;
      s += `<circle cx="${P(gx(q))}" cy="${P(gy(eSel))}" r="5" fill="var(--canvas-bg)" stroke="var(--accent)" stroke-width="2"/>`;
    }
    s += `<circle cx="${P(gx(state.q))}" cy="${P(gy(eSel))}" r="5.5" fill="var(--accent)" stroke="var(--canvas-bg)" stroke-width="2"/>`;

    stage.innerHTML =
      `<svg width="100%" height="100%" viewBox="0 0 ${w.toFixed(0)} ${h.toFixed(0)}" ` +
      `preserveAspectRatio="none" role="img" aria-hidden="true" style="display:block">${s}</svg>`;
  }

  band.sync(state.band);
  onResize(render);
  render();
}
