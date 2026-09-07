/**
 * Ewald-kulen for TFY4220, modul 04.
 *
 * Det resiproke gitteret til et kvadratisk gitter tegnes i planet, og
 * Ewald-sirkelen med radius k = 2π/λ slås om halen til k_i, som ender i
 * origo. Tre metoder, samme konstruksjon:
 *  - roterende krystall: gitteret dreies om origo, og slideren snapper til
 *    vinklene der et punkt ligger nøyaktig på sirkelen, så treffet er mulig
 *    å nå med fingeren (samme grep som bragg.js);
 *  - Laue: krystallen står i ro, og området mellom sirkelen for den korteste
 *    og den lengste bølgelengden skyggelegges; alle punktene i området gir
 *    refleks samtidig;
 *  - pulver: gitterpunktene erstattes av ringer med radius |G| om origo, og
 *    hvert snitt med Ewald-sirkelen gir en spredt stråle i vinkelen 2θ.
 *
 * Lengder måles i resiproke gitterenheter g = 2π/a, så k/g = a/λ.
 *
 * Kontrakt: default-eksporter init(api), api = { stage, controls, getSize, onResize, signal }.
 */
import { choiceRow } from "./_controls.js";

const LAM_MIN = 0.45; // λ/a
const LAM_MAX = 1.2;
const SNAP = 2.0; // grader
const RANGE = 6; // gitterpunkter i hver retning
const TOL = 0.02; // treff-toleranse i resiproke enheter
const FONT =
  "font-family:var(--font-mono);font-size:var(--text-sm);font-weight:700;" +
  "paint-order:stroke;stroke:var(--canvas-bg);stroke-width:3px";
const SUB = (t) => `<tspan dy="4" style="font-size:75%">${t}</tspan>`;

export default function init({ stage, controls, getSize, onResize, signal }) {
  const state = { method: "rot", phi: 15, lam: 0.62 };

  const methods = choiceRow({
    ariaLabel: "Metode for å samle diffraksjonsbildet",
    label: "metode",
    items: [
      { value: "rot", label: "Roterende krystall" },
      { value: "laue", label: "Laue" },
      { value: "powder", label: "Pulver" },
    ],
    onPick: (v) => {
      state.method = v;
      syncControls();
      render();
    },
    signal,
  });
  controls.append(methods.el);

  /** Slider med ledetekst og verdi, samme form som de andre simene i emnet. */
  function slider(text, key, min, max, step, fmt, aria) {
    const label = document.createElement("label");
    label.append(`${text} `);
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
      input.value = String(state[key]);
      out.textContent = fmt(state[key]);
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
    return { label, sync };
  }

  const phiCtl = slider(
    "krystallvinkel",
    "phi",
    0,
    90,
    0.5,
    (v) => `${v.toFixed(1)}°`,
    "Krystallens dreining om origo, i grader",
  );
  const lamCtl = slider(
    "bølgelengde",
    "lam",
    LAM_MIN,
    LAM_MAX,
    0.01,
    (v) => `${v.toFixed(2)} a`,
    "Bølgelengden i enheter av gitterkonstanten",
  );

  function syncControls() {
    methods.sync(state.method);
    phiCtl.label.style.display = state.method === "powder" ? "none" : "";
    lamCtl.label.style.display = state.method === "laue" ? "none" : "";
  }

  /** Alle dreievinkler i [0, 90) der et gitterpunkt ligger nøyaktig på sirkelen. */
  function hitAngles(kk) {
    const out = [];
    for (let i = -RANGE; i <= RANGE; i++)
      for (let j = -RANGE; j <= RANGE; j++) {
        if (!i && !j) continue;
        const G = Math.hypot(i, j);
        if (G > 2 * kk) continue;
        const a0 = Math.atan2(j, i);
        const c = Math.acos(-G / (2 * kk));
        for (const s of [c, -c]) {
          let phi = ((s - a0) * 180) / Math.PI;
          phi = (((phi % 360) + 360) % 360) % 90; // kvadratisk gitter: 90°-periodisk
          out.push(phi);
        }
      }
    return out;
  }

  /** Nærmeste treffvinkel innen snappe-avstand, ellers slideren som den er. */
  function snapped(kk) {
    let best = state.phi;
    let dist = SNAP;
    for (const a of hitAngles(kk)) {
      for (const cand of [a, a + 90, a - 90]) {
        const d = Math.abs(cand - state.phi);
        if (d < dist) {
          dist = d;
          best = cand;
        }
      }
    }
    return best;
  }

  function render() {
    const { w, h } = getSize();
    const P = (x) => x.toFixed(1);
    const g = Math.min(w * 0.135, (h - 20) / 4.6); // px per resiprok enhet
    const O = { x: w * 0.62, y: h / 2 + 6 };
    const toPx = (p) => ({ x: O.x + p.x * g, y: O.y - p.y * g });
    let s = "";

    const text = (x, y, str, col, anchor = "middle", font = FONT) =>
      `<text x="${P(x)}" y="${P(y)}" text-anchor="${anchor}" dominant-baseline="central" style="fill:${col};${font}">${str}</text>`;
    const circle = (c, r, extra) =>
      `<circle cx="${P(c.x)}" cy="${P(c.y)}" r="${P(r)}" ${extra}/>`;
    const line = (A, B, col, wdt, extra = "") =>
      `<line x1="${P(A.x)}" y1="${P(A.y)}" x2="${P(B.x)}" y2="${P(B.y)}" stroke="${col}" stroke-width="${wdt}" stroke-linecap="round" ${extra}/>`;
    const arrow = (A, B, col, wdt = 2.5) => {
      const n = Math.hypot(B.x - A.x, B.y - A.y) || 1;
      const d = { x: (B.x - A.x) / n, y: (B.y - A.y) / n };
      const p1 = { x: B.x - 9 * d.x + 4 * d.y, y: B.y - 9 * d.y - 4 * d.x };
      const p2 = { x: B.x - 9 * d.x - 4 * d.y, y: B.y - 9 * d.y + 4 * d.x };
      return (
        line(A, B, col, wdt) +
        `<polygon points="${P(B.x)},${P(B.y)} ${P(p1.x)},${P(p1.y)} ${P(p2.x)},${P(p2.y)}" fill="${col}"/>`
      );
    };
    /** Vinkelbue om C fra +x-retningen til den matematiske vinkelen ang, med «2θ». */
    const arc2theta = (C, ang) => {
      const r = 24;
      const S = { x: C.x + r, y: C.y };
      const E = { x: C.x + r * Math.cos(ang), y: C.y - r * Math.sin(ang) };
      const sweep = ang < 0 ? 1 : 0;
      const large = Math.abs(ang) > Math.PI ? 1 : 0;
      const L = { x: C.x + (r + 13) * Math.cos(ang / 2), y: C.y - (r + 13) * Math.sin(ang / 2) };
      return (
        `<path d="M ${P(S.x)} ${P(S.y)} A ${r} ${r} 0 ${large} ${sweep} ${P(E.x)} ${P(E.y)}" fill="none" stroke="var(--orange)" stroke-width="1.5"/>` +
        text(L.x, L.y, "2θ", "var(--orange)")
      );
    };
    /** Sirkel som subpath, for evenodd-fyll av området mellom to sirkler. */
    const ring = (c, r) =>
      `M ${P(c.x - r)} ${P(c.y)} A ${P(r)} ${P(r)} 0 1 0 ${P(c.x + r)} ${P(c.y)} A ${P(r)} ${P(r)} 0 1 0 ${P(c.x - r)} ${P(c.y)} Z`;
    const kiLabel = (C, R) =>
      text(C.x + R * 0.5, C.y + 15, `k${SUB("i")}`, "var(--accent)");

    const kk = 1 / state.lam; // k i enheter av g
    const phi = state.method === "rot" ? snapped(kk) : state.phi;
    const rad = (phi * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    // Det dreide resiproke gitteret, i enheter av g.
    const pts = [];
    for (let i = -RANGE; i <= RANGE; i++)
      for (let j = -RANGE; j <= RANGE; j++) {
        if (!i && !j) continue;
        pts.push({ x: i * cos - j * sin, y: i * sin + j * cos, G: Math.hypot(i, j) });
      }

    if (state.method !== "powder")
      for (const p of pts) {
        const q = toPx(p);
        if (q.x < -6 || q.x > w + 6 || q.y < -6 || q.y > h + 6) continue;
        s += circle(q, 3, 'fill="var(--muted)"');
      }
    const Opx = toPx({ x: 0, y: 0 });

    if (state.method === "rot") {
      const C = toPx({ x: -kk, y: 0 });
      const R = kk * g;
      s += circle(C, R, 'fill="none" stroke="var(--accent)" stroke-width="1.5"');
      s += arrow(C, Opx, "var(--accent)");
      s += kiLabel(C, R);
      for (const p of pts) {
        if (Math.abs(Math.hypot(p.x + kk, p.y) - kk) > TOL) continue;
        const q = toPx(p);
        const ang = Math.atan2(p.y, p.x + kk);
        s += arc2theta(C, ang);
        s += arrow(Opx, q, "var(--green)");
        s += arrow(C, q, "var(--red)");
        // Navn litt til siden for midten av hver pil.
        const mG = { x: (Opx.x + q.x) / 2, y: (Opx.y + q.y) / 2 };
        const nG = Math.hypot(q.x - Opx.x, q.y - Opx.y) || 1;
        s += text(
          mG.x + (11 * (q.y - Opx.y)) / nG,
          mG.y - (11 * (q.x - Opx.x)) / nG,
          "G",
          "var(--green)",
        );
        const mK = { x: (C.x + q.x) / 2, y: (C.y + q.y) / 2 };
        const nK = Math.hypot(q.x - C.x, q.y - C.y) || 1;
        s += text(
          mK.x - (12 * (q.y - C.y)) / nK,
          mK.y + (12 * (q.x - C.x)) / nK,
          `k${SUB("f")}`,
          "var(--red)",
        );
        s += circle(q, 5, 'fill="var(--red)"');
      }
    } else if (state.method === "laue") {
      const kmax = 1 / LAM_MIN;
      const kmin = 1 / LAM_MAX;
      const Cmax = toPx({ x: -kmax, y: 0 });
      const Cmin = toPx({ x: -kmin, y: 0 });
      const Rmax = kmax * g;
      const Rmin = kmin * g;
      s += `<path d="${ring(Cmax, Rmax)} ${ring(Cmin, Rmin)}" fill="var(--accent)" fill-opacity="0.13" fill-rule="evenodd"/>`;
      s += circle(Cmax, Rmax, 'fill="none" stroke="var(--accent)" stroke-width="1.5"');
      s += circle(Cmin, Rmin, 'fill="none" stroke="var(--accent)" stroke-width="1.5"');
      s += arrow(Cmax, Opx, "var(--accent)", 1.5);
      s += text(Cmax.x - Rmax + 8, Cmax.y - Rmax * 0.62, "kort λ", "var(--accent)", "start");
      s += text(Cmin.x, Cmin.y + Rmin + 13, "lang λ", "var(--accent)");
      s += kiLabel(Cmax, Rmax);
      for (const p of pts) {
        const dmax = Math.hypot(p.x + kmax, p.y);
        const dmin = Math.hypot(p.x + kmin, p.y);
        if (dmax > kmax + TOL || dmin < kmin - TOL || p.x >= 0) continue;
        const c = (p.G * p.G) / (2 * -p.x); // sentrum for sirkelen gjennom O og p
        const q = toPx(p);
        s += line(toPx({ x: -c, y: 0 }), q, "var(--red)", 1.5);
        s += circle(q, 5, 'fill="var(--red)"');
      }
    } else {
      const C = toPx({ x: -kk, y: 0 });
      const R = kk * g;
      const shells = [];
      for (let i = 0; i <= RANGE; i++)
        for (let j = i; j <= RANGE; j++) {
          const N = i * i + j * j;
          if (N && Math.sqrt(N) <= 2 * kk && !shells.includes(N)) shells.push(N);
        }
      shells.sort((a, b) => a - b);
      for (const N of shells)
        s += circle(Opx, Math.sqrt(N) * g, 'fill="none" stroke="var(--muted)" stroke-width="1" stroke-dasharray="3 5"');
      s += circle(C, R, 'fill="none" stroke="var(--accent)" stroke-width="1.5"');
      s += arrow(C, Opx, "var(--accent)");
      s += kiLabel(C, R);
      shells.forEach((N, idx) => {
        const two = 2 * Math.asin(Math.sqrt(N) / (2 * kk));
        for (const sg of [1, -1]) {
          const q = { x: C.x + R * Math.cos(two), y: C.y - sg * R * Math.sin(two) };
          const far = { x: C.x + 1.18 * R * Math.cos(two), y: C.y - sg * 1.18 * R * Math.sin(two) };
          s += line(C, far, "var(--red)", 1.5);
          s += circle(q, 4, 'fill="var(--red)"');
        }
        if (idx === 0) s += arc2theta(C, two);
      });
    }

    s += circle(Opx, 4.5, 'fill="var(--border-strong)"');
    s += text(
      10,
      20,
      "resiprokt rom",
      "var(--muted)",
      "start",
      "font-family:var(--font-mono);font-size:var(--text-xs)",
    );

    stage.innerHTML =
      `<svg width="100%" height="100%" viewBox="0 0 ${w.toFixed(0)} ${h.toFixed(0)}" ` +
      `preserveAspectRatio="none" role="img" aria-hidden="true" style="display:block">${s}</svg>`;
  }

  state.phi = hitAngles(1 / state.lam)
    .map((a) => Math.round(a * 2) / 2)
    .reduce((best, a) => (Math.abs(a - 15) < Math.abs(best - 15) ? a : best), 45);
  phiCtl.sync();
  syncControls();
  onResize(render);
  render();
}
