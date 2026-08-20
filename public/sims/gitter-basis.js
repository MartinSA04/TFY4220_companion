/**
 * «Gitter ⊕ basis = krystallstruktur» for TFY4220, modul 01.
 *
 * Tre paneler: det bare gitteret, basisen som festes på hvert gitterpunkt, og
 * resultatet. Gitteret er fast heksagonalt gjennom hele widgeten — nettopp
 * poenget: gitteret endrer seg IKKE når du bytter basis. Bare strukturen gjør det.
 *
 * Basis-forskyvningen er parametrisert som en brøk av (a1+a2)/3. Ved 1 får du
 * honeycomb (grafén-strukturen), ved 0 faller atomene sammen og strukturen er
 * igjen et Bravais-gitter — som gjør det synlig hvorfor honeycomb ikke er ett.
 *
 * Kontrakt: default-eksporter init(api), api = { stage, controls, getSize, onResize, signal }.
 */

import { choiceRow } from "./_controls.js";

const BASES = [
  { key: "en", label: "1 atom" },
  { key: "to-like", label: "2 like atomer" },
  { key: "to-ulike", label: "2 ulike atomer" },
];

export default function init({ stage, controls, getSize, onResize, signal }) {
  let basis = "to-like";
  let frac = 1;

  // Kontroller
  const basisPick = choiceRow({
    ariaLabel: "Velg basis",
    items: BASES.map((b) => ({ value: b.key, label: b.label })),
    onPick: (k) => {
      basis = k;
      sync();
      render();
    },
    signal,
  });

  const label = document.createElement("label");
  label.append("Forskyvning av atom 2 ");
  const out = document.createElement("output");
  const input = document.createElement("input");
  input.type = "range";
  input.min = "0";
  input.max = "1";
  input.step = "0.02";
  input.value = String(frac);
  input.setAttribute("aria-label", "Basisforskyvning som brøk av (a₁+a₂)/3");
  label.append(out, input);
  input.addEventListener(
    "input",
    () => {
      frac = Number(input.value);
      sync();
      render();
    },
    { signal },
  );

  const readout = document.createElement("div");
  readout.className = "sim-readout";

  controls.append(basisPick.el, label, readout);

  function sync() {
    const two = basis !== "en";
    input.disabled = !two;
    label.style.opacity = two ? "1" : "0.45";
    out.textContent = two ? frac.toFixed(2) : "–";
    basisPick.sync(basis);
  }

  // Tegning
  const P = (n) => n.toFixed(1);

  function render() {
    const { w, h } = getSize();

    const pad = 8;
    const gw = 20; // kolonnene som holder ⊕ og =
    const pw = (w - 2 * pad - 2 * gw) / 3;
    const ph = h - 26; // plass til panelnavnene under
    const px = [pad, pad + pw + gw, pad + 2 * (pw + gw)];

    // Heksagonalt gitter: a1 langs +x, a2 60° opp. Skjerm-y er snudd.
    const L = Math.max(26, Math.min(52, pw / 2.5));
    const a1 = { x: L, y: 0 };
    const a2 = { x: L / 2, y: (-L * Math.sqrt(3)) / 2 };
    // Ideell honeycomb-forskyvning: (a1+a2)/3.
    const d = {
      x: (frac * (a1.x + a2.x)) / 3,
      y: (frac * (a1.y + a2.y)) / 3,
    };

    const twoAtom = basis !== "en";
    const colB = basis === "to-ulike" ? "var(--green)" : "var(--accent)";

    /** Gitterpunkter i panel `i`, sentrert, med margin så bindinger ved kanten ser hele ut. */
    function points(i, margin) {
      const cx = px[i] + pw / 2;
      const cy = ph / 2 + 4;
      const out = [];
      for (let n1 = -9; n1 <= 9; n1++) {
        for (let n2 = -9; n2 <= 9; n2++) {
          const x = cx + n1 * a1.x + n2 * a2.x;
          const y = cy + n1 * a1.y + n2 * a2.y;
          if (
            x > px[i] - margin &&
            x < px[i] + pw + margin &&
            y > -margin &&
            y < ph + margin
          )
            out.push({ x, y });
        }
      }
      return out;
    }

    const clip = (i) =>
      `<clipPath id="gb-clip-${i}"><rect x="${P(px[i])}" y="0" width="${P(pw)}" height="${P(ph)}"/></clipPath>`;

    const frame = (i) =>
      `<rect x="${P(px[i])}" y="0.5" width="${P(pw)}" height="${P(ph - 1)}" rx="4" fill="none" stroke="var(--border)" stroke-width="1"/>`;

    const panelLabel = (i, text) =>
      `<text x="${P(px[i] + pw / 2)}" y="${P(h - 7)}" text-anchor="middle" style="fill:var(--muted);font-family:var(--font-mono);font-size:12px">${text}</text>`;

    const glyph = (x, text) =>
      `<text x="${P(x)}" y="${P(ph / 2 + 4)}" text-anchor="middle" dominant-baseline="middle" style="fill:var(--muted);font-family:var(--font-mono);font-size:12px">${text}</text>`;

    const dot = (p, r, fill) =>
      `<circle cx="${P(p.x)}" cy="${P(p.y)}" r="${r}" style="fill:${fill}"/>`;

    // Panel 1 — bare gitteret. Ingen atomer: gitterpunkter er ren geometri.
    const panel1 = points(0, 0)
      .map((p) => dot(p, 3, "var(--fg)"))
      .join("");

    // Panel 2 — basisen alene, forstørret: gitterpunktet med atom(ene) på seg.
    // Paret sentreres i panelet (derfor -halve forskyvningen), ellers driver
    // komposisjonen mot øvre høyre hjørne når forskyvningen økes.
    const zoom = Math.min(pw, ph) * 0.42;
    const norm = Math.hypot((a1.x + a2.x) / 3, (a1.y + a2.y) / 3) || 1;
    const ox2 = (d.x / norm) * zoom;
    const oy2 = (d.y / norm) * zoom;
    const bcx = px[1] + pw / 2 - (twoAtom ? ox2 / 2 : 0);
    const bcy = ph / 2 + 4 - (twoAtom ? oy2 / 2 : 0);
    const bx = bcx + ox2;
    const by = bcy + oy2;
    const panel2 =
      (twoAtom && frac > 0.02
        ? `<line x1="${P(bcx)}" y1="${P(bcy)}" x2="${P(bx)}" y2="${P(by)}" stroke="var(--border-strong)" stroke-width="2"/>`
        : "") +
      dot({ x: bcx, y: bcy }, 9, "var(--accent)") +
      (twoAtom ? dot({ x: bx, y: by }, 9, colB) : "") +
      // Krysshåret markerer gitterpunktet, og må tegnes OPPÅ atomet: atomet
      // sitter nettopp der, så et kryss under det er usynlig — og bildeteksten
      // peker på krysset.
      `<path d="M ${P(bcx - 5.5)} ${P(bcy)} h 11 M ${P(bcx)} ${P(bcy - 5.5)} v 11" stroke="var(--canvas-bg)" stroke-width="1.8" stroke-linecap="round"/>`;

    // Panel 3 — basisen stemplet på hvert gitterpunkt.
    const lat = points(2, L * 1.4);
    const atomsA = lat;
    const atomsB = twoAtom
      ? lat.map((p) => ({ x: p.x + d.x, y: p.y + d.y }))
      : [];
    // Bindinger A–B innenfor litt over forskyvningslengden: ved ideell
    // forskyvning gir det nøyaktig honeycomb-nettet med tre bindinger per atom.
    const bondLen = Math.hypot(d.x, d.y);
    let bonds = "";
    if (twoAtom && bondLen > 2) {
      const max = bondLen * 1.15;
      for (const a of atomsA)
        for (const b of atomsB)
          if (Math.hypot(a.x - b.x, a.y - b.y) < max)
            bonds += `<line x1="${P(a.x)}" y1="${P(a.y)}" x2="${P(b.x)}" y2="${P(b.y)}" stroke="var(--border-strong)" stroke-width="2"/>`;
    }
    const panel3 =
      bonds +
      atomsA.map((p) => dot(p, 5, "var(--accent)")).join("") +
      atomsB.map((p) => dot(p, 5, colB)).join("");

    stage.innerHTML =
      `<svg width="100%" height="100%" viewBox="0 0 ${w.toFixed(0)} ${h.toFixed(0)}" preserveAspectRatio="none" role="img" aria-hidden="true" style="display:block">` +
      `<defs>${clip(0)}${clip(1)}${clip(2)}</defs>` +
      frame(0) +
      frame(1) +
      frame(2) +
      `<g clip-path="url(#gb-clip-0)">${panel1}</g>` +
      `<g clip-path="url(#gb-clip-1)">${panel2}</g>` +
      `<g clip-path="url(#gb-clip-2)">${panel3}</g>` +
      glyph(px[0] + pw + gw / 2, "⊕") +
      glyph(px[1] + pw + gw / 2, "=") +
      panelLabel(0, "Gitter") +
      panelLabel(1, "Basis") +
      panelLabel(2, "Krystall") +
      `</svg>`;

    readout.innerHTML = describe();
  }

  /** Utlesningen bærer hele poenget: gitteret er uendret, strukturen er det ikke. */
  function describe() {
    const lat = "Gitteret er <b>heksagonalt</b> i alle tre tilfellene.";
    if (basis === "en")
      return `${lat} Med ett atom i basisen er strukturen selv et Bravais-gitter, og hvert atom ser nøyaktig like omgivelser.`;
    if (frac < 0.05)
      return `${lat} Med forskyvning 0 faller de to atomene sammen, og strukturen er igjen et Bravais-gitter.`;
    const ideal = frac > 0.95;
    const same = basis === "to-like";
    const what = ideal
      ? same
        ? "Dette er <b>honeycomb</b>-strukturen, altså grafén."
        : "Dette er honeycomb med to grunnstoffer, som i heksagonal bornitrid."
      : "";
    const why = same
      ? "Strukturen er <b>ikke</b> et Bravais-gitter: omgivelsene sett fra atom 1 og atom 2 er rotert 180° i forhold til hverandre, så punktene er ikke ekvivalente."
      : "Strukturen er <b>ikke</b> et Bravais-gitter: de to atomene er ikke engang samme grunnstoff, og kan umulig se like omgivelser.";
    return `${lat} ${what} ${why}`;
  }

  sync();
  onResize(render);
  render();
}
