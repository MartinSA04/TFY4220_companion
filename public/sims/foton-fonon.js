/**
 * Lys og fononer i samme diagram, for FTIR-laben i TFY4220.
 *
 * Tegner de to grenene for kjeden med to atomtyper (M1 = 2M2, samme
 * kraftkonstant C) og lysets dispersjonsrelasjon ω = ck i samme akser. Et
 * foton kan bare eksitere et fonon med samme ω og samme k, altså der linjene
 * krysser. Glidebryteren forstørrer k-aksen mot k = 0 i tierpotenser: i hele
 * sonen er lyslinjen umulig å skille fra ω-aksen, og først når vinduet er noen
 * titusendeler av sonen, ser du den krysse den optiske grenen.
 *
 * Tallene er typiske for en ionisk krystall: a = 3 Å og optisk frekvens
 * ω₀ = 10¹⁴ rad/s ved k = 0 (omtrent 530 cm⁻¹).
 *
 * Kontrakt: default-eksporter init(api), api = { stage, controls, getSize, onResize, signal }.
 */

const A = 3e-10; // m
const W0 = 1e14; // rad/s, optisk gren ved k = 0
const C_LIGHT = 2.998e8; // m/s
const M1 = 2; // relative masser
const M2 = 1;
const K_ZONE = Math.PI / A;
const ZOOM_MAX = 5;
const MONO = "font-family:var(--font-mono);font-size:var(--text-xs)";

// ω² = C(1/M1 + 1/M2)[1 ± √(1 − 4M1M2 sin²(ka/2)/(M1+M2)²)], med C valgt så ω_op(0) = W0.
const INV = 1 / M1 + 1 / M2;
const CK = (W0 * W0) / (2 * INV); // C i enheter der massene er M1 og M2
function branch(k, sign) {
  const s = Math.sin((k * A) / 2);
  const root = Math.sqrt(Math.max(0, 1 - ((4 * M1 * M2) / (M1 + M2) ** 2) * s * s));
  return Math.sqrt(Math.max(0, CK * INV * (1 + sign * root)));
}

const SUP = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵" };
const pow10 = (n) => `10${String(n).replace(/./g, (c) => SUP[c] ?? c)}`;

export default function init({ stage, controls, getSize, onResize, signal }) {
  const state = { zoom: 0 };

  const label = document.createElement("label");
  label.append("k-aksen ");
  const out = document.createElement("output");
  const input = document.createElement("input");
  input.type = "range";
  input.min = "0";
  input.max = String(ZOOM_MAX);
  input.step = "0.05";
  input.value = "0";
  input.setAttribute("aria-label", "Hvor stor del av Brillouin-sonen k-aksen viser, i tierpotenser");
  label.append(out, input);
  input.addEventListener(
    "input",
    () => {
      state.zoom = Number(input.value);
      update();
    },
    { signal },
  );
  controls.append(label);

  function update() {
    const z = state.zoom;
    const frac = 10 ** -z;
    if (z < 0.02) out.textContent = "hele sonen, 0 til π/a";
    else if (Math.abs(z - Math.round(z)) < 0.03) out.textContent = `0 til π/a · ${pow10(-Math.round(z))}`;
    else out.textContent = `0 til π/a · ${frac.toPrecision(2).replace(".", ",")}`;
    render();
  }

  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return;
    const P = (x) => x.toFixed(1);
    const kMax = K_ZONE * 10 ** -state.zoom;
    const plot = { x: 30, y: 18, w: w - 30 - 16, h: h - 18 - 38 };
    const bottom = plot.y + plot.h;
    const wTop = 1.25 * W0;
    const X = (k) => plot.x + (k / kMax) * plot.w;
    const Y = (om) => bottom - (om / wTop) * plot.h;

    let s = "";
    // Grenene.
    for (const sign of [1, -1]) {
      let d = "";
      for (let i = 0; i <= 240; i++) {
        const k = (kMax * i) / 240;
        d += `${i ? "L" : "M"}${P(X(k))} ${P(Y(branch(k, sign)))} `;
      }
      s += `<path d="${d}" fill="none" stroke="var(--fg)" stroke-width="2"/>`;
    }
    const opY = Y(branch(kMax * 0.5, 1));
    s += `<text x="${P(plot.x + plot.w - 4)}" y="${P(opY - 7)}" text-anchor="end" style="fill:var(--fg);${MONO}">optisk gren</text>`;
    const akEnd = branch(kMax, -1);
    const akY = Y(akEnd);
    s += `<text x="${P(plot.x + plot.w - 4)}" y="${P(Math.min(bottom - 6, akY - 7))}" text-anchor="end" style="fill:var(--fg);${MONO}">akustisk gren</text>`;

    // Lyset: ω = ck, klippet i toppen av aksen.
    const kLightTop = wTop / C_LIGHT;
    const kEnd = Math.min(kMax, kLightTop);
    s += `<line x1="${P(X(0))}" y1="${P(Y(0))}" x2="${P(X(kEnd))}" y2="${P(Y(C_LIGHT * kEnd))}" stroke="var(--orange)" stroke-width="2.2"/>`;
    const lx = X(kEnd);
    const ly = Math.max(plot.y + 10, Y(C_LIGHT * kEnd) - 8);
    const nearAxis = lx - plot.x < 60;
    s += `<text x="${P(nearAxis ? plot.x + 8 : lx - 6)}" y="${P(ly)}" text-anchor="${nearAxis ? "start" : "end"}" style="fill:var(--orange);font-weight:700;${MONO}">${nearAxis ? "← lys, ω = ck" : "lys, ω = ck"}</text>`;

    // Krysningen mellom lys og optisk gren.
    const kx = W0 / C_LIGHT;
    if (X(kx) - plot.x > 6) {
      s += `<circle cx="${P(X(kx))}" cy="${P(Y(W0))}" r="5.5" fill="var(--accent)" stroke="var(--canvas-bg)" stroke-width="2"/>`;
      s += `<text x="${P(X(kx) + 9)}" y="${P(Y(W0) + 16)}" text-anchor="start" style="fill:var(--accent-ink);font-weight:700;${MONO}">samme ω og k</text>`;
    }

    // Aksene.
    s += `<line x1="${P(plot.x)}" y1="${P(plot.y)}" x2="${P(plot.x)}" y2="${P(bottom)}" stroke="var(--border-strong)" stroke-width="1"/>`;
    s += `<line x1="${P(plot.x)}" y1="${P(bottom)}" x2="${P(plot.x + plot.w)}" y2="${P(bottom)}" stroke="var(--border-strong)" stroke-width="1"/>`;
    s += `<text x="${P(plot.x - 6)}" y="${P(plot.y + 4)}" text-anchor="end" style="fill:var(--muted);${MONO}">ω</text>`;
    s += `<line x1="${P(plot.x - 4)}" y1="${P(Y(W0))}" x2="${P(plot.x)}" y2="${P(Y(W0))}" stroke="var(--border-strong)" stroke-width="1"/>`;
    s += `<text x="${P(plot.x - 6)}" y="${P(Y(W0) + 4)}" text-anchor="end" style="fill:var(--muted);${MONO}">ω₀</text>`;
    s += `<text x="${P(plot.x)}" y="${P(bottom + 16)}" text-anchor="start" style="fill:var(--muted);${MONO}">0</text>`;
    const z = state.zoom;
    const edge = z < 0.02 ? "π/a" : Math.abs(z - Math.round(z)) < 0.03 ? `π/a · ${pow10(-Math.round(z))}` : `π/a · ${(10 ** -z).toPrecision(2).replace(".", ",")}`;
    s += `<text x="${P(plot.x + plot.w)}" y="${P(bottom + 16)}" text-anchor="end" style="fill:var(--muted);${MONO}">${edge}</text>`;
    s += `<text x="${P(plot.x + plot.w / 2)}" y="${P(bottom + 32)}" text-anchor="middle" style="fill:var(--muted);${MONO}">bølgevektor k</text>`;

    stage.innerHTML =
      `<svg width="100%" height="100%" viewBox="0 0 ${w.toFixed(0)} ${h.toFixed(0)}" ` +
      `preserveAspectRatio="none" role="img" aria-hidden="true" style="display:block">${s}</svg>`;
  }

  onResize(render);
  update();
}
