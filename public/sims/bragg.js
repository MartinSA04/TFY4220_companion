/**
 * Braggs lov for TFY4220, modul 03.
 *
 * To parallelle stråler reflekteres speilende fra naboplan med avstand d.
 * Strålen fra det nedre planet går de to markerte stykkene lenger, hvert på
 * d·sinθ, og søylen nederst måler gangforskjellen 2d·sinθ mot merker på hele
 * bølgelengder. Treffer den et merke, tennes refleksen — påstanden «bare
 * bestemte vinkler» er dermed tegnet, ikke fortalt.
 *
 * Forholdet λ/d = 0,46 er grafitt-tallene fra det gjennomregnede eksempelet
 * (λ = 1,54 Å, d = 3,35 Å), så de fire ordenene lander på de samme vinklene
 * som i teksten. Slideren snapper til braggvinklene så treffet er mulig å nå
 * med fingeren.
 *
 * Kontrakt: default-eksporter init(api), api = { stage, controls, getSize, onResize, signal }.
 */

const RATIO = 0.46; // λ/d, grafitt med Cu Kα
const SNAP = 1.4; // grader

/** Braggvinklene sinθ = n·λ/2d for de ordenene som finnes. */
const ORDERS = [];
for (let n = 1; n * (RATIO / 2) <= 1; n++)
  ORDERS.push({ n, theta: (Math.asin((n * RATIO) / 2) * 180) / Math.PI });

export default function init({ stage, controls, getSize, onResize, signal }) {
  let theta = 20;

  const label = document.createElement("label");
  label.append("Vinkel θ ");
  const out = document.createElement("output");
  const input = document.createElement("input");
  input.type = "range";
  input.min = "5";
  input.max = "80";
  input.step = "0.2";
  input.value = String(theta);
  input.setAttribute("aria-label", "Vinkelen mellom strålen og planet, i grader");
  label.append(out, input);
  input.addEventListener(
    "input",
    () => {
      theta = Number(input.value);
      sync();
      render();
    },
    { signal },
  );
  controls.append(label);

  /** Nærmeste braggvinkel innen snappe-avstand, ellers null. */
  function hit(t) {
    let best = null;
    for (const o of ORDERS)
      if (
        Math.abs(o.theta - t) < SNAP &&
        (!best || Math.abs(o.theta - t) < Math.abs(best.theta - t))
      )
        best = o;
    return best;
  }

  function sync() {
    input.value = String(theta);
    out.textContent = `${theta.toFixed(0)}°`;
  }

  function render() {
    const { w, h } = getSize();
    const order = hit(theta);
    const t = order ? order.theta : theta; // vist vinkel, snappet ved treff
    const rad = (t * Math.PI) / 180;
    const sin = Math.sin(rad);
    const cos = Math.cos(rad);
    const P = (x) => x.toFixed(1);

    // Planavstanden begrenses så begge planene og søylen alltid får plass.
    const d = Math.min(h * 0.24, 92);
    const y1 = h * 0.3;
    const y2 = y1 + d;
    const A = { x: w * 0.52, y: y1 };
    const B = { x: A.x, y: y2 };
    const u = { x: cos, y: sin }; // innkommende retning
    const v = { x: cos, y: -sin }; // utgående retning
    const C = { x: B.x - u.x * d * sin, y: B.y - u.y * d * sin };
    const D = { x: B.x + v.x * d * sin, y: B.y + v.y * d * sin };
    const L = w; // strålene klippes av viewBoxen

    let svg = "";

    // Atomplanene: linjer med atomer på, det nederste svakere.
    for (const [y, dim] of [
      [y1, false],
      [y2, false],
      [y2 + d, true],
    ]) {
      if (y > h - 46) continue;
      svg += `<line x1="0" y1="${P(y)}" x2="${w}" y2="${P(y)}" stroke="var(--border-strong)" stroke-width="1"${dim ? ' opacity="0.45"' : ""}/>`;
      for (let x = (A.x % 26) - 26; x < w; x += 26)
        svg += `<circle cx="${P(x)}" cy="${P(y)}" r="3" fill="var(--muted)"${dim ? ' opacity="0.45"' : ""}/>`;
    }

    // Strålene. Ved treff tennes de utgående i grønt.
    const ray = order ? "var(--green)" : "var(--accent)";
    const beams = [
      [A.x - u.x * L, A.y - u.y * L, A.x, A.y, "var(--accent)", 2],
      [B.x - u.x * L, B.y - u.y * L, B.x, B.y, "var(--accent)", 2],
      [A.x, A.y, A.x + v.x * L, A.y + v.y * L, ray, order ? 3 : 2],
      [B.x, B.y, B.x + v.x * L, B.y + v.y * L, ray, order ? 3 : 2],
    ];
    for (const [x1, yy1, x2, yy2, col, sw] of beams)
      svg += `<line x1="${P(x1)}" y1="${P(yy1)}" x2="${P(x2)}" y2="${P(yy2)}" stroke="${col}" stroke-width="${sw}" stroke-linecap="round"/>`;

    // Gangforskjellen: de to ekstra stykkene C→B og B→D, pluss de stiplede
    // normalene fra A som markerer hvor bølgefrontene er ajour.
    for (const [x1, yy1, x2, yy2] of [
      [A.x, A.y, C.x, C.y],
      [A.x, A.y, D.x, D.y],
    ])
      svg += `<line x1="${P(x1)}" y1="${P(yy1)}" x2="${P(x2)}" y2="${P(yy2)}" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="4 4"/>`;
    for (const [x1, yy1, x2, yy2] of [
      [C.x, C.y, B.x, B.y],
      [B.x, B.y, D.x, D.y],
    ])
      svg += `<line x1="${P(x1)}" y1="${P(yy1)}" x2="${P(x2)}" y2="${P(yy2)}" stroke="var(--violet)" stroke-width="5" stroke-linecap="round"/>`;

    // Vinkelbuen θ ved A, mellom planet og den innkommende strålen.
    const ar = 48;
    const mid = rad / 2;
    svg +=
      `<path d="M ${P(A.x - ar)} ${P(A.y)} A ${ar} ${ar} 0 0 1 ${P(A.x - ar * cos)} ${P(A.y - ar * sin)}" ` +
      `fill="none" stroke="var(--muted)" stroke-width="1.5"/>` +
      `<text x="${P(A.x - (ar + 13) * Math.cos(mid))}" y="${P(A.y - (ar + 13) * Math.sin(mid))}" ` +
      `text-anchor="middle" dominant-baseline="central" ` +
      `style="fill:var(--muted);font-family:var(--font-mono);font-size:var(--text-xs)">θ</text>`;

    // Målesøylen: gangforskjellen 2d·sinθ mot merker på hele bølgelengder.
    const by = h - 24;
    const bx = 24;
    const lam = d * RATIO;
    const bw = 2 * d * sin;
    svg += `<line x1="${bx}" y1="${by}" x2="${P(bx + 2 * d)}" y2="${by}" stroke="var(--border-strong)" stroke-width="1"/>`;
    for (const o of ORDERS) {
      const x = bx + o.n * lam;
      const on = order && order.n === o.n;
      svg +=
        `<line x1="${P(x)}" y1="${by - 7}" x2="${P(x)}" y2="${by + 7}" stroke="${on ? "var(--green)" : "var(--border-strong)"}" stroke-width="${on ? 3 : 1.5}"/>` +
        `<text x="${P(x)}" y="${by - 12}" text-anchor="middle" style="fill:${on ? "var(--green)" : "var(--muted)"};font-family:var(--font-mono);font-size:var(--text-xs)">${o.n}λ</text>`;
    }
    svg +=
      `<line x1="${bx}" y1="${by}" x2="${P(bx + bw)}" y2="${by}" stroke="${order ? "var(--green)" : "var(--violet)"}" stroke-width="6" stroke-linecap="round"/>` +
      `<text x="${bx}" y="${by + 18}" style="fill:var(--muted);font-family:var(--font-mono);font-size:var(--text-xs)">2d·sinθ</text>`;

    // Påstanden ved treff: refleksens orden, skrevet ved den utgående strålen.
    if (order)
      svg +=
        `<text x="${P(A.x + 78 * cos + 10)}" y="${P(A.y - 78 * sin)}" ` +
        `style="fill:var(--green);font-family:var(--font-mono);font-size:var(--text-sm);font-weight:700">n = ${order.n}</text>`;

    stage.innerHTML =
      `<svg width="100%" height="100%" viewBox="0 0 ${w.toFixed(0)} ${h.toFixed(0)}" ` +
      `preserveAspectRatio="none" role="img" aria-hidden="true" style="display:block">${svg}</svg>`;
  }

  sync();
  onResize(render);
  render();
}
