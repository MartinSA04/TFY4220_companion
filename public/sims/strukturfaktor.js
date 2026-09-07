/**
 * Pulverbildet og basisen for TFY4220, modul 04.
 *
 * Søylediagram over 2θ for et kubisk gitter med to atomer i basisen, A og B.
 * Tre strukturtyper: CsCl (sc + B i ½½½), NaCl (fcc + B i ½½½) og ZnS
 * (fcc + B i ¼¼¼). Slideren f_B/f_A går fra «bare A» (0) til «like atomer»
 * (1); søylehøyden er |S_hkl|² alene, uten formfaktorens fall og uten
 * multiplisitet, så utvalgsreglene leses rett av. Reflekser som er borte
 * beholder navnet sitt nederst i dempet farge, så det er synlig hvor de
 * mangler. Ved slider-endene navngis strukturen som oppstår.
 *
 * λ/a = 0,47 er valgt så (222) havner ved 2θ ≈ 109° og de elleve første
 * ringene får plass på aksen.
 *
 * Kontrakt: default-eksporter init(api), api = { stage, controls, getSize, onResize, signal }.
 */
import { choiceRow } from "./_controls.js";

const LAM = 0.47; // λ/a
const X0 = 20; // 2θ ved venstre aksekant
const X1 = 120; // 2θ ved høyre
const PEAKS = [
  [1, 0, 0],
  [1, 1, 0],
  [1, 1, 1],
  [2, 0, 0],
  [2, 1, 0],
  [2, 1, 1],
  [2, 2, 0],
  [3, 0, 0],
  [3, 1, 0],
  [3, 1, 1],
  [2, 2, 2],
];
const TYPES = {
  cscl: { label: "CsCl-type", A: "Cs⁺", B: "Cl⁻", ratio: 18 / 54, fcc: false, shift: 2, alike: "bcc", only: "sc" },
  nacl: { label: "NaCl-type", A: "Cl⁻", B: "Na⁺", ratio: 10 / 18, fcc: true, shift: 2, alike: "sc med kant a/2", only: "fcc" },
  zns: { label: "ZnS-type", A: "Zn²⁺", B: "S²⁻", ratio: 18 / 28, fcc: true, shift: 4, alike: "diamant", only: "fcc" },
};
const MONO = "font-family:var(--font-mono);font-size:var(--text-xs)";

/** |S_hkl|² for gitteret pluss basisen {A i origo, B forskjøvet}, med f_A = 1. */
function intensity(type, [h, k, l], r) {
  let lat = 1;
  if (type.fcc) {
    const even = (n) => n % 2 === 0;
    const allEven = even(h) && even(k) && even(l);
    const allOdd = !even(h) && !even(k) && !even(l);
    lat = allEven || allOdd ? 4 : 0;
  }
  const ph = (2 * Math.PI * (h + k + l)) / type.shift;
  const re = 1 + r * Math.cos(ph);
  const im = r * Math.sin(ph);
  return lat * lat * (re * re + im * im);
}

export default function init({ stage, controls, getSize, onResize, signal }) {
  const state = { type: "cscl", r: TYPES.cscl.ratio };

  const picker = choiceRow({
    ariaLabel: "Strukturtype",
    label: "struktur",
    items: Object.entries(TYPES).map(([value, t]) => ({ value, label: t.label })),
    onPick: (v) => {
      state.type = v;
      state.r = TYPES[v].ratio;
      picker.sync(v);
      syncSlider();
      render();
    },
    signal,
  });
  controls.append(picker.el);

  const label = document.createElement("label");
  const name = document.createElement("span");
  name.innerHTML = "f<sub>B</sub>/f<sub>A</sub>";
  label.append(name, " ");
  const out = document.createElement("output");
  const input = document.createElement("input");
  input.type = "range";
  input.min = "0";
  input.max = "1";
  input.step = "0.01";
  input.setAttribute("aria-label", "Forholdet mellom formfaktorene til atom B og atom A");
  label.append(out, input);
  const syncSlider = () => {
    input.value = String(state.r);
    out.textContent = state.r.toFixed(2);
  };
  input.addEventListener(
    "input",
    () => {
      state.r = Number(input.value);
      syncSlider();
      render();
    },
    { signal },
  );
  controls.append(label);

  function render() {
    const { w, h } = getSize();
    const P = (x) => x.toFixed(1);
    const type = TYPES[state.type];
    const r = state.r;
    const left = 30;
    const right = w - 14;
    const base = h - 30;
    const top = 92;
    const xOf = (deg) => left + ((deg - X0) / (X1 - X0)) * (right - left);
    const norm = (type.fcc ? 16 : 1) * (1 + r) * (1 + r);
    let s = "";

    // Aksene.
    s += `<line x1="${P(left)}" y1="${P(base)}" x2="${P(right)}" y2="${P(base)}" stroke="var(--border-strong)" stroke-width="1"/>`;
    s += `<line x1="${P(left)}" y1="${P(top - 10)}" x2="${P(left)}" y2="${P(base)}" stroke="var(--border-strong)" stroke-width="1"/>`;
    for (const deg of [30, 60, 90]) {
      const x = xOf(deg);
      s += `<line x1="${P(x)}" y1="${P(base)}" x2="${P(x)}" y2="${P(base + 5)}" stroke="var(--border-strong)" stroke-width="1"/>`;
      s += `<text x="${P(x)}" y="${P(base + 17)}" text-anchor="middle" style="fill:var(--muted);${MONO}">${deg}°</text>`;
    }
    s += `<text x="${P(right)}" y="${P(base + 17)}" text-anchor="end" style="fill:var(--muted);${MONO}">2θ</text>`;
    s += `<text x="${P(left - 4)}" y="${P(26)}" text-anchor="start" style="fill:var(--muted);${MONO}">|S|²</text>`;

    // Hvem A og B er, og hva strukturen blir i endene.
    let note = `A = ${type.A}, B = ${type.B}`;
    if (r >= 0.995) note = `like atomer: ${type.alike}`;
    else if (r <= 0.005) note = `bare A: ${type.only}`;
    s += `<text x="${P(right)}" y="${P(26)}" text-anchor="end" style="fill:var(--fg);${MONO}">${note}</text>`;

    // Søylene.
    const bw = Math.max(4, Math.min(8, (right - left) / 60));
    for (const hkl of PEAKS) {
      const N = hkl[0] ** 2 + hkl[1] ** 2 + hkl[2] ** 2;
      const sinT = (Math.sqrt(N) * LAM) / 2;
      if (sinT > 1) continue;
      const x = xOf((2 * Math.asin(sinT) * 180) / Math.PI);
      const I = intensity(type, hkl, r) / norm;
      const name = `(${hkl.join("")})`;
      if (I < 1e-6) {
        s += `<line x1="${P(x)}" y1="${P(base)}" x2="${P(x)}" y2="${P(base - 5)}" stroke="var(--muted)" stroke-width="1.5"/>`;
        s += `<text transform="translate(${P(x + 4)} ${P(base - 9)}) rotate(-90)" style="fill:var(--muted);${MONO}">${name}</text>`;
        continue;
      }
      const hgt = Math.max(2, I * (base - top));
      s += `<rect x="${P(x - bw / 2)}" y="${P(base - hgt)}" width="${P(bw)}" height="${P(hgt)}" rx="1.5" fill="var(--accent)"/>`;
      s += `<text transform="translate(${P(x + 4)} ${P(base - hgt - 5)}) rotate(-90)" style="fill:var(--fg);${MONO}">${name}</text>`;
    }

    stage.innerHTML =
      `<svg width="100%" height="100%" viewBox="0 0 ${w.toFixed(0)} ${h.toFixed(0)}" ` +
      `preserveAspectRatio="none" role="img" aria-hidden="true" style="display:block">${s}</svg>`;
  }

  picker.sync(state.type);
  syncSlider();
  onResize(render);
  render();
}
