/**
 * 2D-gitterutforsker for TFY4220, modul 01.
 *
 * Poenget: de fem 2D-Bravais-gitrene er ikke fem urelaterte bilder, men fem
 * områder i ETT parameterrom (|a2|/|a1|, phi, sentrert ja/nei). Sliderne lar
 * leseren vandre kontinuerlig gjennom rommet mens utlesningen navngir
 * gittertypen man befinner seg i.
 *
 * Den lærerike delen er sentreringen: å sentrere et kvadrat gir bare et mindre
 * kvadratisk gitter, og å sentrere en heksagonal celle gir et rektangulært.
 * Bare det rektangulære systemet får en NY gittertype av sentrering, og det er
 * derfor det er 5 gitter og ikke 8. Klassifiseringen under sier dette eksplisitt
 * i stedet for å late som sentrering alltid betyr «sentrert rektangulært».
 *
 * Utlesningen teller nærmeste naboer i det gitteret man faktisk ser på, ikke i
 * cellen man tegnet. Det gjør sveipet gjennom den sentrerte rektangulære
 * familien avlesbart: |a₂|/|a₁| = 1 gir 4 naboer (kvadratisk), 1 < r < √3 gir
 * 4 (sentrert rektangulært), r = √3 gir 6 (heksagonalt) og r > √3 gir 2.
 * Familien er broen mellom de to mest symmetriske plangitrene.
 *
 * Kontrakt: default-eksporter init(api), api = { stage, controls, getSize, onResize, signal }.
 */

import { choiceRow } from "./_controls.js";

const SQRT3 = Math.sqrt(3);

/** Presets: [ratio, phi, centered] — én per gittertype. */
const PRESETS = [
  {
    key: "kvadratisk",
    label: "Kvadratisk",
    ratio: 1,
    phi: 90,
    centered: false,
  },
  {
    key: "rektangulaert",
    label: "Rektangulært",
    ratio: 1.45,
    phi: 90,
    centered: false,
  },
  {
    key: "sentrert",
    label: "Sentrert rekt.",
    ratio: 1.45,
    phi: 90,
    centered: true,
  },
  {
    key: "heksagonalt",
    label: "Heksagonalt",
    ratio: 1,
    phi: 120,
    centered: false,
  },
  { key: "skjevt", label: "Skjevt", ratio: 1.35, phi: 105, centered: false },
];

/**
 * Navngi gitteret som faktisk følger av (ratio, phi, centered).
 *
 * For de sentrerte tilfellene er svaret redusert basis, ikke cellen man tegnet:
 * et sentrert rektangel med sider a og b har de primitive vektorene
 * (a/2, ±b/2), som er like lange. Blir b = a er de dessuten ortogonale
 * (kvadratisk); blir b = a·sqrt(3) står de 120° på hverandre (heksagonalt).
 */
/**
 * Antall nærmeste naboer i det gitteret man faktisk ser, regnet fra de
 * primitive vektorene. Ved sentrering er de (a₁ ± a₂)/2, ikke a₁ og a₂, så
 * tellingen må gjøres på det reduserte gitteret. Slideren snapper til √3, som
 * ellers ikke er truffet av steget 0,01, og uten det treffet ville det
 * heksagonale tilfellet aldri vist 6.
 */
function neighbours(ratio, phi, centered) {
  const rad = (phi * Math.PI) / 180;
  const a1 = { x: 1, y: 0 };
  const a2 = { x: ratio * Math.cos(rad), y: ratio * Math.sin(rad) };
  const p1 = centered ? { x: (a1.x + a2.x) / 2, y: (a1.y + a2.y) / 2 } : a1;
  const p2 = centered ? { x: (a1.x - a2.x) / 2, y: (a1.y - a2.y) / 2 } : a2;

  const ds = [];
  for (let i = -4; i <= 4; i++)
    for (let j = -4; j <= 4; j++) {
      if (!i && !j) continue;
      ds.push(Math.hypot(i * p1.x + j * p2.x, i * p1.y + j * p2.y));
    }
  const min = Math.min(...ds);
  // Bare flyttallsstøy skal tolereres her. Slår man på en romsligere toleranse,
  // rapporteres 6 naboer i et gitter som har 4, og hele poenget forsvinner.
  return { count: ds.filter((d) => d < min * 1.0005).length, dist: min };
}

/**
 * Hvor i den sentrerte rektangulære familien man står. Familien løper fra det
 * kvadratiske gitteret (r = 1) til det heksagonale (r = √3, eller r = 1/√3 den
 * andre veien), og er den eneste sentreringen som gir en ny gittertype.
 */
function sweepNote(ratio) {
  const base =
    "Dette er den eneste sentreringen som gir en ny gittertype, og grunnen til at det finnes 5 og ikke 4 gitre i 2D.";
  if (ratio > SQRT3 || ratio < 1 / SQRT3)
    return `${base} Utenfor √3 er diagonalene lengre enn den korteste cellekanten, så bare 2 naboer er nærmest. Skyv tilbake mot √3 ≈ 1,73 (eller 1/√3 ≈ 0,58) og se tallet gå til 6.`;
  return `${base} Skyv |a₂|/|a₁| fra 1 mot √3 ≈ 1,73: 4 nærmeste naboer hele veien, og i det øyeblikket diagonalene blir like lange som a₁, står du i det heksagonale gitteret.`;
}

function classify(ratio, phi, centered) {
  const near = (x, y, tol) => Math.abs(x - y) < tol;
  const ortho = near(phi, 90, 0.5);
  const equal = near(ratio, 1, 0.01);
  const hex = equal && (near(phi, 120, 0.5) || near(phi, 60, 0.5));
  const rt3 = near(ratio, SQRT3, 0.02) || near(ratio, 1 / SQRT3, 0.02);

  if (!centered) {
    if (equal && ortho)
      return { name: "Kvadratisk gitter", cond: "|a₁| = |a₂|, φ = 90°" };
    if (ortho)
      return { name: "Rektangulært gitter", cond: "|a₁| ≠ |a₂|, φ = 90°" };
    if (hex)
      return { name: "Heksagonalt gitter", cond: "|a₁| = |a₂|, φ = 120°" };
    return { name: "Skjevt gitter", cond: "|a₁| ≠ |a₂|, φ ≠ 90°" };
  }

  if (ortho && equal)
    return {
      name: "Kvadratisk gitter",
      cond: "|a₁| = |a₂|, φ = 90°",
      note: "Et sentrert kvadrat er bare et kvadratisk gitter til, mindre og rotert 45°. Ingen ny type.",
    };
  if (ortho && rt3)
    return {
      name: "Heksagonalt gitter",
      cond: "|a₁| = |a₂|, φ = 120°",
      note: "Med |a₂| = √3·|a₁| blir de to primitive vektorene like lange og står 120° på hverandre: det sentrerte rektangelet ER det heksagonale gitteret. Diagonalene er nå nøyaktig like lange som a₁, og nabotallet hopper fra 4 til 6.",
    };
  if (ortho)
    return {
      name: "Sentrert rektangulært gitter",
      cond: "|a₁| ≠ |a₂|, φ = 90°, punkt i midten",
      note: sweepNote(ratio),
    };
  if (hex)
    return {
      name: "Rektangulært gitter",
      cond: "|a₁| ≠ |a₂|, φ = 90°",
      note: "Sentrering av den heksagonale cellen gir et rektangulært gitter med sidene |a₁|/2 og √3·|a₁|/2. Ingen ny type.",
    };
  return {
    name: "Skjevt gitter",
    cond: "|a₁| ≠ |a₂|, φ ≠ 90°",
    note: "Sentrering av et skjevt gitter gir bare enda et skjevt gitter. Ingen ny type.",
  };
}

export default function init({ stage, controls, getSize, onResize, signal }) {
  let ratio = 1.45;
  let phi = 90;
  let centered = true;
  let grid = true;

  // Kontroller
  const presetPick = choiceRow({
    ariaLabel: "Velg gittertype",
    items: PRESETS.map((p) => ({ value: p.key, label: p.label })),
    onPick: (key) => {
      const p = PRESETS.find((x) => x.key === key);
      ratio = p.ratio;
      phi = p.phi;
      centered = p.centered;
      syncInputs();
      render();
    },
    signal,
  });

  const mkSlider = (text, min, max, step, value, ariaLabel) => {
    const label = document.createElement("label");
    label.append(text);
    const out = document.createElement("output");
    const input = document.createElement("input");
    input.type = "range";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(value);
    input.setAttribute("aria-label", ariaLabel);
    label.append(out, input);
    return { label, out, input };
  };

  const ratioCtl = mkSlider(
    "Lengdeforhold |a₂|/|a₁| ",
    0.5,
    2,
    0.01,
    ratio,
    "Lengdeforhold mellom gittervektorene",
  );
  const phiCtl = mkSlider(
    "Vinkel φ ",
    60,
    120,
    1,
    phi,
    "Vinkel mellom gittervektorene i grader",
  );

  const centerBtn = document.createElement("button");
  centerBtn.type = "button";
  centerBtn.className = "sim-btn";
  centerBtn.textContent = "Sentrert";
  centerBtn.addEventListener(
    "click",
    () => {
      centered = !centered;
      syncInputs();
      render();
    },
    { signal },
  );

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
        syncInputs();
        render();
      },
      { signal },
    );
    viewRow.append(el);
    return { on: o.on, el };
  });

  const readout = document.createElement("div");
  readout.className = "sim-readout";

  controls.append(
    presetPick.el,
    viewRow,
    ratioCtl.label,
    phiCtl.label,
    centerBtn,
    readout,
  );

  ratioCtl.input.addEventListener(
    "input",
    () => {
      const raw = Number(ratioCtl.input.value);
      // √3 og 1/√3 er ikke multipler av steget 0,01, så uten snapping kan man
      // ikke stille inn det heksagonale tilfellet i det hele tatt. Med snapping
      // er det ENTEN eksakt heksagonalt ELLER tydelig utenfor, og navnet og
      // nabotallet i utlesningen kan aldri si hver sin ting.
      const hit = [1 / SQRT3, SQRT3].find((v) => Math.abs(raw - v) < 0.02);
      ratio = hit === undefined ? raw : hit;
      syncInputs();
      render();
    },
    { signal },
  );
  phiCtl.input.addEventListener(
    "input",
    () => {
      phi = Number(phiCtl.input.value);
      syncInputs();
      render();
    },
    { signal },
  );

  /** Hold slider-verdier, output-tekst og aria-pressed i takt med tilstanden. */
  function syncInputs() {
    ratioCtl.input.value = String(ratio);
    phiCtl.input.value = String(phi);
    ratioCtl.out.textContent = ratio.toFixed(2);
    phiCtl.out.textContent = `${phi}°`;
    centerBtn.setAttribute("aria-pressed", String(centered));
    for (const b of viewBtns)
      b.el.setAttribute("aria-pressed", String(b.on === grid));
    // Sliderne kan stå et sted som ikke svarer til noen preset; da markeres
    // ingen av dem.
    const hit = PRESETS.find(
      (p) =>
        Math.abs(p.ratio - ratio) < 0.005 &&
        p.phi === phi &&
        p.centered === centered,
    );
    presetPick.sync(hit ? hit.key : "");
  }

  // Tegning
  function render() {
    const { w, h } = getSize();
    const rad = (phi * Math.PI) / 180;

    // Gitterkonstant i px. I gittermodus må den holdes liten nok til at flere
    // perioder er synlige; vises bare cellen, blåses den opp til å fylle
    // flaten, ellers ligger en liten celle alene midt i et tomt felt.
    const cosA = Math.abs(Math.cos(rad));
    const sinA = Math.abs(Math.sin(rad)) || 1e-3;
    const s = grid
      ? Math.max(38, Math.min(88, Math.min(w, h) / 4.4))
      : Math.max(
          50,
          Math.min(
            210,
            Math.min(
              (w * 0.55) / (1 + ratio * cosA),
              (h * 0.62) / (ratio * sinA),
            ),
          ),
        );

    // a1 langs +x; a2 med skjerm-y snudd, så positiv φ peker oppover.
    const a1 = { x: s, y: 0 };
    const a2 = {
      x: s * ratio * Math.cos(rad),
      y: -s * ratio * Math.sin(rad),
    };

    // I gittermodus sitter origo litt nede til venstre, så cellen og pilene får
    // plass oppe til høyre. Vises bare cellen, sentreres den i stedet, ellers
    // ville den ligge i utkanten av en ellers tom flate.
    let ox = w * 0.3;
    let oy = h * 0.66;
    if (!grid) {
      const xs = [0, a1.x, a1.x + a2.x, a2.x];
      const ys = [0, a1.y, a1.y + a2.y, a2.y];
      ox = w / 2 - (Math.min(...xs) + Math.max(...xs)) / 2;
      oy = h / 2 - (Math.min(...ys) + Math.max(...ys)) / 2;
    }

    const pt = (n1, n2, half) => ({
      x: ox + (n1 + (half ? 0.5 : 0)) * a1.x + (n2 + (half ? 0.5 : 0)) * a2.x,
      y: oy + (n1 + (half ? 0.5 : 0)) * a1.y + (n2 + (half ? 0.5 : 0)) * a2.y,
    });
    const inside = (p) => p.x > -6 && p.x < w + 6 && p.y > -6 && p.y < h + 6;

    const base = [];
    const centres = [];
    if (grid) {
      for (let n1 = -14; n1 <= 14; n1++) {
        for (let n2 = -14; n2 <= 14; n2++) {
          const p = pt(n1, n2, false);
          if (inside(p)) base.push(p);
          if (centered) {
            const c = pt(n1, n2, true);
            if (inside(c)) centres.push(c);
          }
        }
      }
    } else {
      // Bare cellens egne punkter: de fire hjørnene, pluss midtpunktet når
      // gitteret er sentrert.
      for (const [n1, n2] of [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ])
        base.push(pt(n1, n2, false));
      if (centered) centres.push(pt(0, 0, true));
    }

    const P = (n) => n.toFixed(1);
    const cellPath = `M ${P(ox)} ${P(oy)} l ${P(a1.x)} ${P(a1.y)} l ${P(a2.x)} ${P(a2.y)} l ${P(-a1.x)} ${P(-a1.y)} Z`;

    // φ-buen: fra +x-retningen opp til a2. Sweep-flag 0 fordi skjerm-y er snudd.
    const ar = 26;
    const arc =
      `M ${P(ox + ar)} ${P(oy)} A ${ar} ${ar} 0 0 0 ` +
      `${P(ox + ar * Math.cos(rad))} ${P(oy - ar * Math.sin(rad))}`;

    // Ved sentrering: de faktiske primitive vektorene går til midtpunktet og
    // til midtpunktet i naboen — stiplet, slik forelesningsplansjen viser φ′.
    let primitives = "";
    if (centered) {
      const m = { x: (a1.x + a2.x) / 2, y: (a1.y + a2.y) / 2 };
      const m2 = { x: m.x - a1.x, y: m.y - a1.y };
      const dashed = (v) =>
        `<line x1="${P(ox)}" y1="${P(oy)}" x2="${P(ox + v.x)}" y2="${P(oy + v.y)}" stroke="var(--muted)" stroke-width="2" stroke-dasharray="5 4"/>`;
      // Den andre peker på midtpunktet i nabocellen, som ikke tegnes når bare
      // cellen vises. Da sløyfes den, ellers ender en vektor i tomme luften.
      primitives = grid ? dashed(m) + dashed(m2) : dashed(m);
    }

    const dot = (p, r, fill) =>
      `<circle cx="${P(p.x)}" cy="${P(p.y)}" r="${r}" style="fill:${fill}"/>`;
    const ring = (p, r) =>
      `<circle cx="${P(p.x)}" cy="${P(p.y)}" r="${r}" fill="none" stroke="var(--accent)" stroke-width="2"/>`;

    const arrow = (v, color, name, dx, dy) =>
      `<line x1="${P(ox)}" y1="${P(oy)}" x2="${P(ox + v.x)}" y2="${P(oy + v.y)}" stroke="${color}" stroke-width="2.5" marker-end="url(#bl-${name})"/>` +
      `<text x="${P(ox + v.x + dx)}" y="${P(oy + v.y + dy)}" text-anchor="middle" dominant-baseline="middle" style="fill:${color};font-family:var(--font-mono);font-size:12px;font-weight:600">${name === "a1" ? "a₁" : "a₂"}</text>`;

    // markerUnits="userSpaceOnUse": ellers skaleres pilhodet med stroke-width
    // (2,5) og blir 15 px på en vektor som kan være bare 40 px lang.
    const marker = (id, color) =>
      `<marker id="bl-${id}" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto-start-reverse">` +
      `<path d="M 0 0 L 10 5 L 0 10 z" style="fill:${color}"/></marker>`;

    stage.innerHTML =
      `<svg width="100%" height="100%" viewBox="0 0 ${w.toFixed(0)} ${h.toFixed(0)}" preserveAspectRatio="none" role="img" aria-hidden="true" style="display:block">` +
      `<defs>${marker("a1", "var(--accent)")}${marker("a2", "var(--green)")}</defs>` +
      // Enhetscellen, svakt fylt.
      `<path d="${cellPath}" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5" stroke-opacity="0.5"/>` +
      // Gitterpunktene.
      base.map((p) => dot(p, 3.5, "var(--fg)")).join("") +
      centres.map((p) => ring(p, 3.8)).join("") +
      primitives +
      // φ-buen med etikett.
      `<path d="${arc}" fill="none" stroke="var(--muted)" stroke-width="1.5"/>` +
      `<text x="${P(ox + (ar + 13) * Math.cos(rad / 2))}" y="${P(oy - (ar + 13) * Math.sin(rad / 2))}" text-anchor="middle" dominant-baseline="middle" style="fill:var(--muted);font-family:var(--font-mono);font-size:12px">φ</text>` +
      // De primitive gittervektorene sist, så de ligger øverst.
      arrow(a1, "var(--accent)", "a1", 0, 18) +
      arrow(a2, "var(--green)", "a2", -14, -6) +
      `</svg>`;

    const { name, cond, note } = classify(ratio, phi, centered);
    const { count, dist } = neighbours(ratio, phi, centered);
    readout.innerHTML =
      `<b>${name}</b> · ${cond} · <b>${count}</b> nærmeste naboer i avstand ` +
      `${dist.toFixed(2).replace(".", ",")}·|a₁|` +
      (note ? `<br>${note}` : "");
  }

  syncInputs();
  onResize(render);
  render();
}
