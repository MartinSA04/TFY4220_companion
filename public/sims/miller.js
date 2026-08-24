/**
 * Miller-indekser i en kubisk celle for TFY4220, modul 02.
 *
 * Én celle med aksene a₁, a₂, a₃, og planet (hkl) som fylt mangekant. Ringene
 * på aksene er skjæringspunktene med verdi påskrevet, så steg 1 i oppskriften
 * (les av skjæringspunktene) står i selve figuren. Pilen ut av planet er
 * retningen [hkl] — at den står normalt på planet er den kubiske spesial-
 * egenskapen modulen påstår, tegnet i stedet for fortalt.
 *
 * «Hele familien» tegner alle planene hx + ky + lz = m (heltallige m) som
 * treffer cellen, med en målepil for avstanden d mellom naboplan. Et plan som
 * bare treffer cellen i en kant tegnes som en tykk strek — planet finnes,
 * cellen viser bare snittet.
 *
 * Projeksjon, dybdesortering og drag-rotasjon følger bravais3d.js.
 *
 * Kontrakt: default-eksporter init(api), api = { stage, controls, getSize, onResize, signal }.
 */

import { choiceRow } from "./_controls.js";

const D2R = Math.PI / 180;
const AZ0 = 32;
const EL0 = 26;
const EL_MIN = 4;
const EL_MAX = 86;

const MACRON = "\u0304"; // kombinerende strek over et negativt siffer, som i (22̄1)

/** Ett siffer med eventuell strek over, slik krystallografien skriver −1. */
const digit = (n) => (n < 0 ? String(-n) + MACRON : String(n));
const name = (hkl, open, close) => open + hkl.map(digit).join("") + close;

/** Skjæringspunktet 1/h som brøk, for påskriften på aksen. */
const FRAC = { 1: "1", 2: "½", 3: "⅓" };
const intercept = (h) => (h < 0 ? "−" : "") + FRAC[Math.abs(h)];

const PLANES = [
  { key: "100", hkl: [1, 0, 0] },
  { key: "110", hkl: [1, 1, 0] },
  { key: "111", hkl: [1, 1, 1] },
  { key: "221n", hkl: [2, 2, -1] },
];

const AXES = [
  { label: "a₁", dir: [1, 0, 0], color: "var(--accent)" },
  { label: "a₂", dir: [0, 1, 0], color: "var(--green)" },
  { label: "a₃", dir: [0, 0, 1], color: "var(--violet)" },
];

const CORNERS = [];
for (const x of [0, 1])
  for (const y of [0, 1]) for (const z of [0, 1]) CORNERS.push([x, y, z]);
const EDGES = [];
for (let i = 0; i < 8; i++)
  for (let j = i + 1; j < 8; j++) {
    const d =
      Math.abs(CORNERS[i][0] - CORNERS[j][0]) +
      Math.abs(CORNERS[i][1] - CORNERS[j][1]) +
      Math.abs(CORNERS[i][2] - CORNERS[j][2]);
    if (d === 1) EDGES.push([i, j]);
  }

const dot = (n, p) => n[0] * p[0] + n[1] * p[1] + n[2] * p[2];

/**
 * Snittet av planet hx + ky + lz = m med cellen [0,1]³: skjæringspunktene med
 * de tolv kantene, uten duplikater, ordnet rundt tyngdepunktet i planets eget
 * koordinatsystem. 3+ punkter er en mangekant, 2 er en kant, mindre er nada.
 */
function clip(hkl, m) {
  const pts = [];
  const seen = new Set();
  const add = (p) => {
    const k = p.map((v) => v.toFixed(4)).join(",");
    if (!seen.has(k)) {
      seen.add(k);
      pts.push(p);
    }
  };
  for (const [i, j] of EDGES) {
    const a = CORNERS[i];
    const b = CORNERS[j];
    const fa = dot(hkl, a) - m;
    const fb = dot(hkl, b) - m;
    if (fa === 0) add(a);
    if (fb === 0) add(b);
    if (fa * fb < 0) {
      const t = fa / (fa - fb);
      add(a.map((v, k2) => v + t * (b[k2] - v)));
    }
  }
  if (pts.length < 3) return pts;
  const g = [0, 1, 2].map((k) => pts.reduce((s, p) => s + p[k], 0) / pts.length);
  const L = Math.hypot(...hkl);
  const nn = hkl.map((v) => v / L);
  let u = pts[0].map((v, k) => v - g[k]);
  const uL = Math.hypot(...u) || 1;
  u = u.map((v) => v / uL);
  const wv = [
    nn[1] * u[2] - nn[2] * u[1],
    nn[2] * u[0] - nn[0] * u[2],
    nn[0] * u[1] - nn[1] * u[0],
  ];
  return pts
    .map((p) => {
      const d3 = p.map((v, k) => v - g[k]);
      return { p, ang: Math.atan2(dot(wv, d3), dot(u, d3)) };
    })
    .sort((a, b) => a.ang - b.ang)
    .map((o) => o.p);
}

export default function init({ stage, controls, getSize, onResize, signal }) {
  let planeKey = "111";
  let family = false;
  let az = AZ0;
  let elev = EL0;

  const planePick = choiceRow({
    ariaLabel: "Velg plan",
    items: PLANES.map((p) => ({ value: p.key, label: name(p.hkl, "(", ")") })),
    onPick: (k) => {
      planeKey = k;
      sync();
      render();
    },
    signal,
  });

  const viewPick = choiceRow({
    ariaLabel: "Ett plan eller hele familien",
    items: [
      { value: "en", label: "Ett plan" },
      { value: "familie", label: "Hele familien" },
    ],
    onPick: (k) => {
      family = k === "familie";
      sync();
      render();
    },
    signal,
  });

  const label = document.createElement("label");
  label.append("Rotasjon ");
  const out = document.createElement("output");
  const input = document.createElement("input");
  input.type = "range";
  input.min = "0";
  input.max = "360";
  input.step = "1";
  input.setAttribute("aria-label", "Rotasjon av cellen i grader");
  label.append(out, input);
  input.addEventListener(
    "input",
    () => {
      az = Number(input.value);
      sync();
      render();
    },
    { signal },
  );

  const resetBtn = document.createElement("button");
  resetBtn.type = "button";
  resetBtn.className = "sim-btn";
  resetBtn.textContent = "Tilbakestill visning";
  resetBtn.addEventListener(
    "click",
    () => {
      az = AZ0;
      elev = EL0;
      sync();
      render();
    },
    { signal },
  );

  controls.append(planePick.el, viewPick.el, label, resetBtn);

  // Drag baner kameraet; loddrett sveip skal fortsatt rulle siden på mobil.
  stage.style.cursor = "grab";
  stage.style.touchAction = "pan-y";
  let drag = null;
  stage.addEventListener(
    "pointerdown",
    (e) => {
      drag = { x: e.clientX, y: e.clientY, az, elev };
      stage.setPointerCapture?.(e.pointerId);
      stage.style.cursor = "grabbing";
    },
    { signal },
  );
  stage.addEventListener(
    "pointermove",
    (e) => {
      if (!drag) return;
      az = (((drag.az - (e.clientX - drag.x) * 0.5) % 360) + 360) % 360;
      elev = Math.max(
        EL_MIN,
        Math.min(EL_MAX, drag.elev + (e.clientY - drag.y) * 0.4),
      );
      sync();
      render();
    },
    { signal },
  );
  const endDrag = (e) => {
    if (!drag) return;
    drag = null;
    stage.style.cursor = "grab";
    stage.releasePointerCapture?.(e.pointerId);
  };
  stage.addEventListener("pointerup", endDrag, { signal });
  stage.addEventListener("pointercancel", endDrag, { signal });

  function sync() {
    planePick.sync(planeKey);
    viewPick.sync(family ? "familie" : "en");
    input.value = String(az);
    out.textContent = `${Math.round(az)}°`;
  }

  const P = (x) => x.toFixed(1);
  const SEG_PX = 8;
  const lerp = (a, b, t) => a + (b - a) * t;

  function segments(p, q, svg) {
    const outSegs = [];
    const N = Math.max(
      1,
      Math.min(28, Math.round(Math.hypot(q.x - p.x, q.y - p.y) / SEG_PX)),
    );
    for (let i = 0; i < N; i++) {
      const t0 = i / N;
      const t1 = (i + 1) / N;
      outSegs.push({
        depth: lerp(p.depth, q.depth, (t0 + t1) / 2),
        svg: svg(
          { x: lerp(p.x, q.x, t0), y: lerp(p.y, q.y, t0) },
          { x: lerp(p.x, q.x, t1), y: lerp(p.y, q.y, t1) },
        ),
      });
    }
    return outSegs;
  }

  function render() {
    const { w, h } = getSize();
    const plane = PLANES.find((p) => p.key === planeKey);
    const hkl = plane.hkl;
    const n2 = dot(hkl, hkl);
    const nL = Math.sqrt(n2);

    const rad = az * D2R;
    const cs = Math.cos(rad);
    const sn = Math.sin(rad);
    const sinEl = Math.sin(elev * D2R);
    const cosEl = Math.cos(elev * D2R);

    const proj = ([X0, Y0, Z0]) => {
      const X = X0 - 0.5;
      const Y = Y0 - 0.5;
      const Z = Z0 - 0.5;
      const x1 = X * cs - Y * sn;
      const y1 = X * sn + Y * cs;
      return { x: x1, y: y1 * sinEl - Z * cosEl, depth: y1 };
    };

    // Aksepilene, pluss den stiplede forlengelsen til et negativt
    // skjæringspunkt. Skalaen tar hensyn til alt som skal med, så cellen
    // ligger stille under rotasjonen (kuletilpasning som i bravais3d).
    const AX_TIP = 1.3;
    const extent = [CORNERS.map((c) => c.map(Number))].flat();
    for (const ax of AXES) extent.push(ax.dir.map((v) => v * AX_TIP));
    hkl.forEach((hi, i) => {
      if (hi < 0) extent.push(AXES[i].dir.map((v) => v / hi));
    });
    const rMax = Math.max(
      ...extent.map((p) => Math.hypot(p[0] - 0.5, p[1] - 0.5, p[2] - 0.5)),
    );
    const s = (Math.min(w, h) / 2 - 20) / rMax;
    const fit = (pr) => ({ ...pr, x: pr.x * s + w / 2, y: pr.y * s + h / 2 });
    const F = (p3) => fit(proj(p3));

    const drawables = [];

    for (const [i, j] of EDGES)
      drawables.push(
        ...segments(
          F(CORNERS[i]),
          F(CORNERS[j]),
          (a, b) =>
            `<line x1="${P(a.x)}" y1="${P(a.y)}" x2="${P(b.x)}" y2="${P(b.y)}" ` +
            `stroke="var(--fg)" stroke-width="1.5" stroke-linecap="round"/>`,
        ),
      );

    // Planene. Én mangekant får dybden til sitt eget tyngdepunkt — grovt, men
    // fyllet er halvgjennomsiktig, så en feilsortert kant bak planet synes
    // uansett.
    const fvals = CORNERS.map((c) => dot(hkl, c));
    const ms = family
      ? Array.from(
          { length: Math.floor(Math.max(...fvals)) - Math.ceil(Math.min(...fvals)) + 1 },
          (_, i) => Math.ceil(Math.min(...fvals)) + i,
        )
      : [1];
    let polyM1 = null;
    for (const m of ms) {
      const pts = clip(hkl, m);
      if (m === 1 && pts.length >= 3) polyM1 = pts;
      if (pts.length === 2 && family) {
        const a = F(pts[0]);
        const b = F(pts[1]);
        drawables.push({
          depth: (a.depth + b.depth) / 2,
          svg:
            `<line x1="${P(a.x)}" y1="${P(a.y)}" x2="${P(b.x)}" y2="${P(b.y)}" ` +
            `stroke="var(--accent)" stroke-width="4" stroke-linecap="round" opacity="0.9"/>`,
        });
      } else if (pts.length >= 3) {
        const prj = pts.map(F);
        const depth = prj.reduce((sum, p) => sum + p.depth, 0) / prj.length;
        const d2 = prj.map((p, i) => `${i ? "L" : "M"}${P(p.x)} ${P(p.y)}`).join("");
        drawables.push({
          depth,
          svg:
            `<path d="${d2}Z" style="fill:var(--accent)" fill-opacity="0.32" ` +
            `stroke="var(--accent)" stroke-width="1.5" stroke-linejoin="round"/>`,
        });
      }
    }

    const scene = drawables
      .sort((a, b) => a.depth - b.depth)
      .map((d) => d.svg)
      .join("");

    // Påskriftene: akser, skjæringspunkter, [hkl]-pilen og d-målet males
    // oppå scenen. De er merkelapper, ikke geometri som skal sorteres.
    let overlay = "";
    let defs = "";
    AXES.forEach((ax, i) => {
      defs +=
        `<marker id="mi-ax${i}" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" ` +
        `markerWidth="9" markerHeight="9" orient="auto-start-reverse">` +
        `<path d="M 0 0 L 10 5 L 0 10 z" style="fill:${ax.color}"/></marker>`;
      const O = F([0, 0, 0]);
      const tip = F(ax.dir.map((v) => v * AX_TIP));
      overlay +=
        `<line x1="${P(O.x)}" y1="${P(O.y)}" x2="${P(tip.x)}" y2="${P(tip.y)}" ` +
        `stroke="${ax.color}" stroke-width="2.5" stroke-linecap="round" marker-end="url(#mi-ax${i})"/>`;
      const dx = tip.x - O.x;
      const dy = tip.y - O.y;
      const L = Math.hypot(dx, dy) || 1;
      overlay +=
        `<text x="${P(tip.x + (dx / L) * 14)}" y="${P(tip.y + (dy / L) * 14)}" ` +
        `text-anchor="middle" dominant-baseline="central" ` +
        `style="fill:${ax.color};font-family:var(--font-mono);font-size:12px;font-weight:600">${ax.label}</text>`;
      // Stiplet forlengelse forbi origo når skjæringspunktet er negativt.
      if (hkl[i] < 0) {
        const neg = F(ax.dir.map((v) => v / hkl[i]));
        overlay +=
          `<line x1="${P(O.x)}" y1="${P(O.y)}" x2="${P(neg.x)}" y2="${P(neg.y)}" ` +
          `stroke="${ax.color}" stroke-width="1.5" stroke-dasharray="5 4" opacity="0.8"/>`;
      }
    });

    // Skjæringspunktene med verdi: steg 1 i Miller-oppskriften, avlest rett
    // av figuren. Vises bare for ett plan — i familiemodus er de m-avhengige.
    if (!family)
      hkl.forEach((hi, i) => {
        if (hi === 0) return;
        const pt = F(AXES[i].dir.map((v) => v / hi));
        overlay +=
          `<circle cx="${P(pt.x)}" cy="${P(pt.y)}" r="5" style="fill:var(--canvas-bg)" ` +
          `stroke="${AXES[i].color}" stroke-width="2.5"/>` +
          `<text x="${P(pt.x)}" y="${P(pt.y - 12)}" text-anchor="middle" ` +
          `style="fill:var(--fg);font-family:var(--font-mono);font-size:12px;font-weight:600">${intercept(hi)}</text>`;
      });

    // [hkl]-pilen ut av planets tyngdepunkt: normalt på planet, fordi cellen
    // er kubisk.
    if (!family && polyM1) {
      const g = [0, 1, 2].map(
        (k) => polyM1.reduce((sum, p) => sum + p[k], 0) / polyM1.length,
      );
      const tip3 = g.map((v, k) => v + (hkl[k] / nL) * 0.45);
      const G = F(g);
      const T = F(tip3);
      defs +=
        `<marker id="mi-n" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" ` +
        `markerWidth="10" markerHeight="10" orient="auto-start-reverse">` +
        `<path d="M 0 0 L 10 5 L 0 10 z" style="fill:var(--fg)"/></marker>`;
      const dx = T.x - G.x;
      const dy = T.y - G.y;
      const L = Math.hypot(dx, dy) || 1;
      overlay +=
        `<line x1="${P(G.x)}" y1="${P(G.y)}" x2="${P(T.x)}" y2="${P(T.y)}" ` +
        `stroke="var(--fg)" stroke-width="2.5" stroke-linecap="round" marker-end="url(#mi-n)"/>` +
        `<text x="${P(T.x + (dx / L) * 8)}" y="${P(T.y + (dy / L) * 8 - 10)}" text-anchor="middle" ` +
        `style="fill:var(--fg);font-family:var(--font-mono);font-size:12px;font-weight:600">${name(hkl, "[", "]")}</text>`;
    }

    // Målepilen for d: den korteste veien mellom to naboplan, tegnet mellom
    // fotpunktene på normalen gjennom cellens midtpunkt.
    if (family) {
      const c = [0.5, 0.5, 0.5];
      const fc = dot(hkl, c);
      const mlo = Math.floor(fc);
      const foot = (m) => c.map((v, k) => v - ((fc - m) / n2) * hkl[k]);
      const A = F(foot(mlo));
      const B = F(foot(mlo + 1));
      defs +=
        `<marker id="mi-d" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" ` +
        `markerWidth="8" markerHeight="8" orient="auto-start-reverse">` +
        `<path d="M 0 0 L 10 5 L 0 10 z" style="fill:var(--fg)"/></marker>`;
      overlay +=
        `<line x1="${P(A.x)}" y1="${P(A.y)}" x2="${P(B.x)}" y2="${P(B.y)}" ` +
        `stroke="var(--fg)" stroke-width="2" marker-start="url(#mi-d)" marker-end="url(#mi-d)"/>` +
        `<text x="${P((A.x + B.x) / 2 + 10)}" y="${P((A.y + B.y) / 2 - 8)}" ` +
        `style="fill:var(--fg);font-family:var(--font-mono);font-size:12px;font-style:italic">d</text>`;
    }

    // Planets navn i hjørnet, i begge modiene — der kolliderer det ikke med
    // pilene og ringene inne i scenen.
    overlay += `<text x="16" y="24" style="fill:var(--accent);font-family:var(--font-mono);font-size:12px;font-weight:600">${name(hkl, "(", ")")}</text>`;

    stage.innerHTML =
      `<svg width="100%" height="100%" viewBox="0 0 ${w.toFixed(0)} ${h.toFixed(0)}" ` +
      `preserveAspectRatio="none" role="img" aria-hidden="true" style="display:block">` +
      `<defs>${defs}</defs>${scene}${overlay}</svg>`;
  }

  sync();
  onResize(render);
  render();
}
