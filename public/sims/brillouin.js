/**
 * Den første Brillouin-sonen for TFY4220, modul 04.
 *
 * Det resiproke gitteret til et 2D-gitter med |a₂|/|a₁| og vinkel som du
 * styrer. Fra origo tegnes linjer til de åtte nærmeste punktene, hver
 * halveres av en stiplet normal, og det minste området normalene lukker om
 * origo skyggelegges: det er sonen. Den er et rektangel når gittervektorene
 * står normalt på hverandre, ellers en sekskant. Sonen regnes som snittet av
 * halvplanene k·G ≤ |G|²/2 (Sutherland-Hodgman-klipping), så den er riktig
 * for alle gitre, ikke bare de som tegnes pent.
 *
 * Tegnet i enheter av 2π/|a₁|.
 *
 * Kontrakt: default-eksporter init(api), api = { stage, controls, getSize, onResize, signal }.
 */

export default function init({ stage, controls, getSize, onResize, signal }) {
  const state = { ratio: 1.0, phi: 90 };

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

  slider("|a₂|/|a₁|", "ratio", 0.6, 1.6, 0.02, (v) => v.toFixed(2), "Forholdet mellom lengdene av gittervektorene");
  slider("vinkel", "phi", 50, 130, 1, (v) => `${v.toFixed(0)}°`, "Vinkelen mellom gittervektorene, i grader");

  /** Beholder den delen av polygonet som oppfyller p·G ≤ |G|²/2. */
  function clip(poly, G) {
    const c = (G.x * G.x + G.y * G.y) / 2;
    const f = (p) => p.x * G.x + p.y * G.y - c;
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const A = poly[i];
      const B = poly[(i + 1) % poly.length];
      const fa = f(A);
      const fb = f(B);
      if (fa <= 1e-9) out.push(A);
      if (fa <= 1e-9 !== fb <= 1e-9) {
        const t = fa / (fa - fb);
        out.push({ x: A.x + t * (B.x - A.x), y: A.y + t * (B.y - A.y) });
      }
    }
    return out;
  }

  function render() {
    const { w, h } = getSize();
    const P = (x) => x.toFixed(1);

    // Direkte gitter i enheter av |a₁|, resiprokt i enheter av 2π/|a₁|.
    const rad = (state.phi * Math.PI) / 180;
    const a1 = { x: 1, y: 0 };
    const a2 = { x: state.ratio * Math.cos(rad), y: state.ratio * Math.sin(rad) };
    const det = a1.x * a2.y - a1.y * a2.x;
    const b1 = { x: a2.y / det, y: -a2.x / det };
    const b2 = { x: -a1.y / det, y: a1.x / det };
    const G = (i, j) => ({ x: i * b1.x + j * b2.x, y: i * b1.y + j * b2.y });

    // Sonen: snittet av halvplanene for alle G i nærheten.
    let zone = [
      { x: -50, y: -50 },
      { x: 50, y: -50 },
      { x: 50, y: 50 },
      { x: -50, y: 50 },
    ];
    for (let i = -2; i <= 2; i++)
      for (let j = -2; j <= 2; j++) if (i || j) zone = clip(zone, G(i, j));

    const Lmax = Math.max(Math.hypot(b1.x, b1.y), Math.hypot(b2.x, b2.y));
    const u = (h / 2 - 22) / (1.15 * Lmax); // px per resiprok enhet
    const cx = w / 2;
    const cy = h / 2 + 4;
    const toPx = (p) => ({ x: cx + p.x * u, y: cy - p.y * u });
    let s = "";

    // Stiplede normaler gjennom midtpunktet av hver nabovektor, og linjene dit.
    for (let i = -1; i <= 1; i++)
      for (let j = -1; j <= 1; j++) {
        if (!i && !j) continue;
        const g = G(i, j);
        const n = Math.hypot(g.x, g.y) || 1;
        const t = { x: -g.y / n, y: g.x / n };
        const m = { x: g.x / 2, y: g.y / 2 };
        const A = toPx({ x: m.x - 99 * t.x, y: m.y - 99 * t.y });
        const B = toPx({ x: m.x + 99 * t.x, y: m.y + 99 * t.y });
        s += `<line x1="${P(A.x)}" y1="${P(A.y)}" x2="${P(B.x)}" y2="${P(B.y)}" stroke="var(--border-strong)" stroke-width="1" stroke-dasharray="3 5"/>`;
        const Q = toPx(g);
        s += `<line x1="${P(cx)}" y1="${P(cy)}" x2="${P(Q.x)}" y2="${P(Q.y)}" stroke="var(--border-strong)" stroke-width="1" stroke-opacity="0.6"/>`;
      }

    // Sonen.
    const pts = zone.map(toPx).map((p) => `${P(p.x)},${P(p.y)}`).join(" ");
    s += `<polygon points="${pts}" fill="var(--accent)" fill-opacity="0.18" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/>`;

    // Gitterpunktene.
    for (let i = -4; i <= 4; i++)
      for (let j = -4; j <= 4; j++) {
        const q = toPx(G(i, j));
        if (q.x < -6 || q.x > w + 6 || q.y < -6 || q.y > h + 6) continue;
        const origin = !i && !j;
        s += `<circle cx="${P(q.x)}" cy="${P(q.y)}" r="${origin ? 4.5 : 3}" fill="${origin ? "var(--border-strong)" : "var(--muted)"}"/>`;
      }

    s +=
      `<text x="${P(cx)}" y="${P(cy - 14)}" text-anchor="middle" dominant-baseline="central" ` +
      `style="fill:var(--accent);font-family:var(--font-mono);font-size:var(--text-sm);font-weight:700;` +
      `paint-order:stroke;stroke:var(--canvas-bg);stroke-width:3px">1. sone</text>`;
    s += `<text x="10" y="20" style="fill:var(--muted);font-family:var(--font-mono);font-size:var(--text-xs)">resiprokt rom</text>`;

    stage.innerHTML =
      `<svg width="100%" height="100%" viewBox="0 0 ${w.toFixed(0)} ${h.toFixed(0)}" ` +
      `preserveAspectRatio="none" role="img" aria-hidden="true" style="display:block">${s}</svg>`;
  }

  onResize(render);
  render();
}
