/**
 * Direkte og resiprokt gitter for TFY4220, modul 03.
 *
 * To paneler: til venstre et 2D-gitter styrt av |a1|, |a2| og vinkelen, til
 * høyre det resiproke gitteret regnet ut fra a_i·b_j = 2πδ_ij. Påstandene som
 * tegnes: b1 står normalt på a2 (stiplede retningslinjer i høyre panel), og
 * lange avstander i det ene gitteret er korte i det andre — strekk a1 og se
 * b1 krympe.
 *
 * Det resiproke panelet tegnes i enheter av 2π per lengdeenhet, så |a1| = 1
 * og 90° gir like tette gitre i begge paneler.
 *
 * Kontrakt: default-eksporter init(api), api = { stage, controls, getSize, onResize, signal }.
 */

export default function init({ stage, controls, getSize, onResize, signal }) {
  const state = { L1: 1.0, L2: 1.0, phi: 90 };

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
    const sync = () => (out.textContent = fmt(state[key]));
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

  slider("|a₁|", "L1", 0.6, 1.6, 0.02, (v) => v.toFixed(2), "Lengden av den første gittervektoren");
  slider("|a₂|", "L2", 0.6, 1.6, 0.02, (v) => v.toFixed(2), "Lengden av den andre gittervektoren");
  slider("vinkel", "phi", 40, 140, 1, (v) => `${v.toFixed(0)}°`, "Vinkelen mellom gittervektorene, i grader");

  function render() {
    const { w, h } = getSize();
    const P = (x) => x.toFixed(1);
    const gap = 12;
    const pw = (w - gap) / 2;

    // Matematiske vektorer, y oppover; fortegnet snus ved tegning.
    const rad = (state.phi * Math.PI) / 180;
    const a1 = { x: state.L1, y: 0 };
    const a2 = { x: state.L2 * Math.cos(rad), y: state.L2 * Math.sin(rad) };
    const det = a1.x * a2.y - a1.y * a2.x;
    const b1 = { x: (2 * Math.PI * a2.y) / det, y: (-2 * Math.PI * a2.x) / det };
    const b2 = { x: (-2 * Math.PI * a1.y) / det, y: (2 * Math.PI * a1.x) / det };

    const u = Math.min(pw, h) / 5.2; // px per lengdeenhet, direkte panel
    const uR = u / (2 * Math.PI); // px per invers lengdeenhet, resiprokt panel

    /** Ett panel: gitterpunkter fra v1/v2, vektorpiler, valgfrie normalspor. */
    function panel(x0, name, v1, v2, scale, guides) {
      const cx = x0 + pw / 2;
      const cy = h / 2 + 8;
      const toPx = (p) => ({ x: cx + p.x * scale, y: cy - p.y * scale });
      let s = `<clipPath id="rk-${name}"><rect x="${P(x0)}" y="0" width="${P(pw)}" height="${h}"/></clipPath>`;
      s += `<g clip-path="url(#rk-${name})">`;

      // Gitterpunktene.
      for (let i = -8; i <= 8; i++)
        for (let j = -8; j <= 8; j++) {
          const p = toPx({ x: i * v1.x + j * v2.x, y: i * v1.y + j * v2.y });
          if (p.x < x0 - 6 || p.x > x0 + pw + 6 || p.y < -6 || p.y > h + 6) continue;
          const origin = i === 0 && j === 0;
          s += `<circle cx="${P(p.x)}" cy="${P(p.y)}" r="${origin ? 4.5 : 3}" fill="${origin ? "var(--border-strong)" : "var(--muted)"}"/>`;
        }

      // Stiplede spor langs de DIREKTE vektorene i det resiproke panelet, så
      // normaliteten b1 ⊥ a2 og b2 ⊥ a1 er synlig uten å sammenligne paneler.
      if (guides)
        for (const g of guides) {
          const n = Math.hypot(g.x, g.y) || 1;
          const d = { x: g.x / n, y: g.y / n };
          const A = toPx({ x: -d.x * 99, y: -d.y * 99 });
          const B = toPx({ x: d.x * 99, y: d.y * 99 });
          s += `<line x1="${P(A.x)}" y1="${P(A.y)}" x2="${P(B.x)}" y2="${P(B.y)}" stroke="var(--border-strong)" stroke-width="1" stroke-dasharray="3 5"/>`;
        }

      // Vektorpilene med navn.
      for (const [v, col, txt] of [
        [v1, "var(--accent)", name === "dir" ? "a₁" : "b₁"],
        [v2, "var(--green)", name === "dir" ? "a₂" : "b₂"],
      ]) {
        const O = toPx({ x: 0, y: 0 });
        const T = toPx(v);
        const n = Math.hypot(T.x - O.x, T.y - O.y) || 1;
        const d = { x: (T.x - O.x) / n, y: (T.y - O.y) / n };
        const p1 = { x: T.x - 9 * d.x + 4 * d.y, y: T.y - 9 * d.y - 4 * d.x };
        const p2 = { x: T.x - 9 * d.x - 4 * d.y, y: T.y - 9 * d.y + 4 * d.x };
        s +=
          `<line x1="${P(O.x)}" y1="${P(O.y)}" x2="${P(T.x)}" y2="${P(T.y)}" stroke="${col}" stroke-width="2.5" stroke-linecap="round"/>` +
          `<polygon points="${P(T.x)},${P(T.y)} ${P(p1.x)},${P(p1.y)} ${P(p2.x)},${P(p2.y)}" fill="${col}"/>` +
          `<text x="${P(T.x + 12 * d.x)}" y="${P(T.y + 12 * d.y)}" text-anchor="middle" dominant-baseline="central" ` +
          `style="fill:${col};font-family:var(--font-mono);font-size:var(--text-sm);font-weight:700;` +
          `paint-order:stroke;stroke:var(--canvas-bg);stroke-width:3px">${txt}</text>`;
      }

      s +=
        `<text x="${P(x0 + 10)}" y="20" style="fill:var(--muted);font-family:var(--font-mono);font-size:var(--text-xs)">` +
        `${name === "dir" ? "direkte" : "resiprokt"}</text></g>`;
      return s;
    }

    let svg = panel(0, "dir", a1, a2, u, null);
    svg += `<line x1="${P(pw + gap / 2)}" y1="8" x2="${P(pw + gap / 2)}" y2="${h - 8}" stroke="var(--border)" stroke-width="1"/>`;
    svg += panel(pw + gap, "res", b1, b2, uR, [a1, a2]);

    stage.innerHTML =
      `<svg width="100%" height="100%" viewBox="0 0 ${w.toFixed(0)} ${h.toFixed(0)}" ` +
      `preserveAspectRatio="none" role="img" aria-hidden="true" style="display:block">${svg}</svg>`;
  }

  onResize(render);
  render();
}
