/**
 * Stabling av tette kulelag for TFY4220, modul 02.
 *
 * Sett ovenfra: lag A er et tett kulelag, lag B ligger i fordypningene, og
 * valget for lag 3 (over A igjen, eller over de ubrukte fordypningene C) er
 * det som skiller hcp fra fcc. Kryssene markerer de ledige fordypningene til
 * det laget som ligger øverst, så valget er synlig FØR man drar slideren dit.
 *
 * Klassene A, B og C er de tre forskyvningene 0, (e1+e2)/3 og 2(e1+e2)/3 av
 * det trekantede gitteret. Stablingssekvensen tegnes som fargede bokstaver
 * oppe i hjørnet — det er selve påstanden ABAB/ABC, ikke en tallutlesning.
 *
 * Kontrakt: default-eksporter init(api), api = { stage, controls, getSize, onResize, signal }.
 */

import { choiceRow } from "./_controls.js";

/** Fargen per posisjonsklasse. Går igjen i kuler, kryss og sekvenslinja. */
const CLASS_COLOR = {
  A: "var(--accent)",
  B: "var(--green)",
  C: "var(--violet)",
};

const MODES = {
  hcp: { seq: ["A", "B", "A"], label: "ABABAB · hcp" },
  fcc: { seq: ["A", "B", "C"], label: "ABCABC · fcc" },
};

export default function init({ stage, controls, getSize, onResize, signal }) {
  let mode = "hcp";
  let layers = 2;

  const modePick = choiceRow({
    ariaLabel: "Velg stablingsrekkefølge",
    items: Object.entries(MODES).map(([k, m]) => ({
      value: k,
      label: m.label,
    })),
    onPick: (k) => {
      mode = k;
      sync();
      render();
    },
    signal,
  });

  const label = document.createElement("label");
  label.append("Antall lag ");
  const out = document.createElement("output");
  const input = document.createElement("input");
  input.type = "range";
  input.min = "1";
  input.max = "3";
  input.step = "1";
  input.value = String(layers);
  input.setAttribute("aria-label", "Antall kulelag som vises");
  label.append(out, input);
  input.addEventListener(
    "input",
    () => {
      layers = Number(input.value);
      sync();
      render();
    },
    { signal },
  );

  controls.append(modePick.el, label);

  function sync() {
    modePick.sync(mode);
    input.value = String(layers);
    out.textContent = String(layers);
  }

  function render() {
    const { w, h } = getSize();

    // Kulediameteren s settes så det får plass en håndfull kuler i begge
    // retninger uansett flatens form; naborad-avstanden er s·√3/2.
    const s = Math.min(w, h) / 3.6;
    const r = s / 2;
    const e1 = { x: s, y: 0 };
    const e2 = { x: s / 2, y: (s * Math.sqrt(3)) / 2 };
    const OFFS = {
      A: { x: 0, y: 0 },
      B: { x: (e1.x + e2.x) / 3, y: (e1.y + e2.y) / 3 },
      C: { x: (2 * (e1.x + e2.x)) / 3, y: (2 * (e1.y + e2.y)) / 3 },
    };

    const cx = w / 2;
    const cy = h / 2;
    const inside = (p, m) => p.x > -m && p.x < w + m && p.y > -m && p.y < h + m;

    /** Alle posisjonene i én klasse som treffer flaten (pluss litt margin). */
    function positions(cls, margin) {
      const pts = [];
      for (let i = -8; i <= 8; i++)
        for (let j = -8; j <= 8; j++) {
          const p = {
            x: cx + i * e1.x + j * e2.x + OFFS[cls].x - s * 1.25,
            y: cy + i * e1.y + j * e2.y + OFFS[cls].y - s * 0.7,
          };
          if (inside(p, margin)) pts.push(p);
        }
      return pts;
    }

    const seq = MODES[mode].seq.slice(0, layers);
    const top = seq[seq.length - 1];
    const P = (x) => x.toFixed(1);
    let svg = "";

    // Lagene males nedenfra og opp, med mindre skiver for hvert lag — samme
    // konvensjon som lærebokfigurene. Alle tre lagene er da synlige samtidig,
    // og hcp sitt tredje lag leses som en liten skive midt på kula i lag 1.
    const LAYER_R = [1, 0.55, 0.32];
    seq.forEach((cls, idx) => {
      const rr = (r - 1) * LAYER_R[idx];
      for (const p of positions(cls, r))
        svg +=
          `<circle cx="${P(p.x)}" cy="${P(p.y)}" r="${P(rr)}" ` +
          `style="fill:${CLASS_COLOR[cls]}" ` +
          `stroke="var(--canvas-bg)" stroke-width="2"/>`;
    });

    // Kryssene: de to posisjonsklassene som IKKE er øverste lag er de ledige
    // fordypningene, og neste lag kan legges i hvilken som helst av dem. Etter
    // tredje lag er valget tatt, og kryssene har gjort jobben sin.
    if (layers < 3) {
      for (const cls of ["A", "B", "C"].filter((c) => c !== top)) {
        const k = r * 0.22;
        for (const p of positions(cls, 0))
          svg +=
            `<g stroke="${CLASS_COLOR[cls]}" stroke-width="2.5" stroke-linecap="round">` +
            `<line x1="${P(p.x - k)}" y1="${P(p.y - k)}" x2="${P(p.x + k)}" y2="${P(p.y + k)}"/>` +
            `<line x1="${P(p.x - k)}" y1="${P(p.y + k)}" x2="${P(p.x + k)}" y2="${P(p.y - k)}"/>` +
            `</g>`;
      }
    }

    // Én bokstav per synlig klasse, på posisjonen nærmest midten, så navnene
    // A, B og C står i selve figuren og ikke bare i teksten.
    const seen = new Set(seq);
    if (layers < 3) ["A", "B", "C"].forEach((c) => seen.add(c));
    for (const cls of seen) {
      const pts = positions(cls, 0);
      if (!pts.length) continue;
      const p = pts.reduce((best, q) =>
        Math.hypot(q.x - cx, q.y - cy) < Math.hypot(best.x - cx, best.y - cy)
          ? q
          : best,
      );
      const onBall = seq.includes(cls);
      // Bokstaven må få plass på den ØVERSTE skiven i sin klasse, som kan
      // være liten (hcp sitt tredje lag ligger rett over lag 1).
      const topIdx = seq.lastIndexOf(cls);
      const size = onBall
        ? Math.max(11, r * [0.5, 0.3, 0.22][topIdx])
        : r * 0.38;
      svg +=
        `<text x="${P(p.x)}" y="${P(p.y)}" text-anchor="middle" dominant-baseline="central" ` +
        `style="fill:${onBall ? "var(--canvas-bg)" : CLASS_COLOR[cls]};` +
        `font-family:var(--font-mono);font-size:${P(size)}px;font-weight:700;` +
        `paint-order:stroke;stroke:${onBall ? CLASS_COLOR[cls] : "var(--canvas-bg)"};stroke-width:3px">${cls}</text>`;
    }

    // Stablingssekvensen så langt, som fargede bokstaver: «A B A» ER påstanden
    // om hcp, tegnet i stedet for fortalt.
    const chip = 22;
    MODES[mode].seq.forEach((cls, i) => {
      const x = 14 + i * (chip + 8);
      const shown = i < layers;
      svg +=
        `<rect x="${x}" y="12" width="${chip}" height="${chip}" rx="6" ` +
        `style="fill:${shown ? CLASS_COLOR[cls] : "none"};stroke:${shown ? "none" : "var(--border-strong)"}"` +
        `${shown ? "" : ' stroke-dasharray="3 3"'}/>` +
        (shown
          ? `<text x="${x + chip / 2}" y="${12 + chip / 2}" text-anchor="middle" dominant-baseline="central" ` +
            `style="fill:var(--canvas-bg);font-family:var(--font-mono);font-size:12px;font-weight:700">${cls}</text>`
          : "");
    });

    stage.innerHTML =
      `<svg width="100%" height="100%" viewBox="0 0 ${w.toFixed(0)} ${h.toFixed(0)}" ` +
      `preserveAspectRatio="none" role="img" aria-hidden="true" style="display:block">${svg}</svg>`;
  }

  sync();
  onResize(render);
  render();
}
