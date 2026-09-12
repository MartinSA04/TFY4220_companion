/**
 * Madelung-summen for TFY4220, modul 05.
 *
 * Et kvadratisk gitter av vekslende ladninger, 13 × 13 ioner, med
 * referanseionet i midten. Delsummen α_k = Σ (±)/p_ij regnes på to måter:
 *  - etter avstand: skall for skall, alle ioner med samme avstand på én gang.
 *    Hvert skall bærer en stor nettoladning, og delsummen hopper mellom −0,8
 *    og 4 uten å roe seg;
 *  - nøytrale kvadrater (Evjens metode): kvadratet med halvkant n gjennom
 *    ionesentrene, der kantioner teller ½ og hjørneioner ¼. Hvert kvadrat er
 *    nøytralt, og delsummen står på 1,61 fra n = 2.
 * Ionene som er med, fylles med vekten som fyllgrad, og skallet eller
 * kvadratet tegnes som stiplet kant. Til høyre (under, på telefon) tegnes
 * delsummene mot k, med den eksakte verdien som stiplet linje merket α på aksen.
 *
 * Kontrakt: default-eksporter init(api), api = { stage, controls, getSize, onResize, signal }.
 */
import { choiceRow } from "./_controls.js";

const HALF = 6; // gitteret går fra −6 til 6 i begge retninger
const ALPHA = 1.6155; // Madelung-konstanten for det kvadratiske gitteret (Evjen, n → ∞)
const Y_MIN = -1.2;
const Y_MAX = 4.4;
const MONO = "font-family:var(--font-mono);font-size:var(--text-xs)";

/** +1 for ioner med motsatt ladning av referanseionet, −1 for samme. */
const sign = (i, j) => ((i + j) & 1 ? 1 : -1);

/** Skallene etter avstand, med kumulativ delsum. */
function shells() {
  const m = new Map();
  for (let i = -HALF; i <= HALF; i++)
    for (let j = -HALF; j <= HALF; j++) {
      if (!i && !j) continue;
      const r2 = i * i + j * j;
      if (r2 > HALF * HALF) continue;
      m.set(r2, (m.get(r2) || 0) + sign(i, j) / Math.sqrt(r2));
    }
  const out = [];
  let s = 0;
  for (const r2 of [...m.keys()].sort((a, b) => a - b)) {
    s += m.get(r2);
    out.push({ r2, sum: s });
  }
  return out;
}

/** Evjen-vekten til ion (i, j) i kvadratet med halvkant n: 1 inne, ½ på kanten, ¼ i hjørnet. */
function weight(i, j, n) {
  const a = Math.abs(i);
  const b = Math.abs(j);
  if (a > n || b > n) return 0;
  return (a === n ? 0.5 : 1) * (b === n ? 0.5 : 1);
}

/** Nøytrale kvadrater, med delsummen for hvert n. */
function cells() {
  const out = [];
  for (let n = 1; n <= HALF; n++) {
    let s = 0;
    for (let i = -n; i <= n; i++)
      for (let j = -n; j <= n; j++) {
        if (!i && !j) continue;
        s += (weight(i, j, n) * sign(i, j)) / Math.hypot(i, j);
      }
    out.push({ n, sum: s });
  }
  return out;
}

const SHELLS = shells();
const CELLS = cells();
const fmt = (v) => v.toFixed(2).replace(".", ",");

export default function init({ stage, controls, getSize, onResize, signal }) {
  const state = { mode: "shell", k: 1 };
  const maxK = () => (state.mode === "shell" ? SHELLS.length : CELLS.length);

  const picker = choiceRow({
    ariaLabel: "Hvordan rekken summeres",
    label: "summér",
    items: [
      { value: "shell", label: "etter avstand" },
      { value: "cell", label: "nøytrale kvadrater" },
    ],
    onPick: (v) => {
      state.mode = v;
      state.k = Math.min(state.k, maxK());
      picker.sync(v);
      syncSlider();
      render();
    },
    signal,
  });
  controls.append(picker.el);

  const label = document.createElement("label");
  const name = document.createElement("span");
  label.append(name, " ");
  const out = document.createElement("output");
  const input = document.createElement("input");
  input.type = "range";
  input.min = "1";
  input.step = "1";
  input.setAttribute("aria-label", "Hvor mange skall eller kvadrater som er med i summen");
  label.append(out, input);
  const syncSlider = () => {
    name.textContent = state.mode === "shell" ? "skall" : "kvadrater";
    input.max = String(maxK());
    input.value = String(state.k);
    out.textContent = String(state.k);
  };
  input.addEventListener(
    "input",
    () => {
      state.k = Number(input.value);
      syncSlider();
      render();
    },
    { signal },
  );
  controls.append(label);

  function render() {
    const { w, h } = getSize();
    const P = (x) => x.toFixed(1);
    const pad = 10;
    const stacked = w < 480;
    const series = state.mode === "shell" ? SHELLS : CELLS;
    const k = state.k;

    // Gitterets rute og diagrammets rute: side om side, eller over hverandre på telefon.
    let lat;
    let chart;
    if (stacked) {
      const side = Math.min(w - 2 * pad, Math.round(h * 0.56));
      lat = { x: (w - side) / 2, y: pad, s: side };
      chart = { x: pad + 30, y: pad + side + 24, w: w - 2 * pad - 30 - 10, h: h - side - 3 * pad - 24 - 16 };
    } else {
      const side = Math.min(h - 2 * pad, Math.round(w * 0.5));
      lat = { x: pad, y: (h - side) / 2, s: side };
      chart = { x: pad + side + 44, y: pad + 24, w: w - pad - side - 44 - pad - 10, h: h - 2 * pad - 24 - 20 };
    }
    const d = lat.s / (2 * HALF + 1);
    const r = d * 0.36;
    const cx = (i) => lat.x + (i + HALF + 0.5) * d;
    const cy = (j) => lat.y + (j + HALF + 0.5) * d;
    let s = "";

    // Ionene: fylte med vekten som fyllgrad når de er med, hule ellers.
    for (let i = -HALF; i <= HALF; i++)
      for (let j = -HALF; j <= HALF; j++) {
        const ref = !i && !j;
        const inc = ref
          ? 1
          : state.mode === "shell"
            ? i * i + j * j <= SHELLS[k - 1].r2
              ? 1
              : 0
            : weight(i, j, k);
        const fill = sign(i, j) > 0 ? "var(--orange)" : "var(--accent)";
        if (ref) {
          s += `<circle cx="${P(cx(i))}" cy="${P(cy(j))}" r="${P(r)}" fill="${fill}" stroke="var(--fg)" stroke-width="2"/>`;
        } else if (inc > 0) {
          s += `<circle cx="${P(cx(i))}" cy="${P(cy(j))}" r="${P(r)}" fill="${fill}" fill-opacity="${inc}" stroke="${fill}" stroke-width="1"/>`;
        } else {
          s += `<circle cx="${P(cx(i))}" cy="${P(cy(j))}" r="${P(r)}" fill="none" stroke="var(--border-strong)" stroke-width="1"/>`;
        }
      }

    // Grensen for det som er med: sirkelen gjennom skallet, eller kvadratet gjennom kantionene.
    if (state.mode === "shell") {
      const rad = Math.sqrt(SHELLS[k - 1].r2) * d;
      s += `<circle cx="${P(cx(0))}" cy="${P(cy(0))}" r="${P(rad)}" fill="none" stroke="var(--fg)" stroke-width="1.5" stroke-dasharray="5 4"/>`;
    } else {
      const half = k * d;
      s += `<rect x="${P(cx(0) - half)}" y="${P(cy(0) - half)}" width="${P(2 * half)}" height="${P(2 * half)}" fill="none" stroke="var(--fg)" stroke-width="1.5" stroke-dasharray="5 4"/>`;
    }

    // Diagrammet over delsummene.
    const n = series.length;
    const xOf = (i) => chart.x + ((i - 1) / Math.max(1, n - 1)) * chart.w;
    const yOf = (v) => chart.y + chart.h - ((v - Y_MIN) / (Y_MAX - Y_MIN)) * chart.h;
    const bottom = chart.y + chart.h;

    // Tegnforklaring og aksetittel i toppen av diagrammet.
    s += `<text x="${P(chart.x - 26)}" y="${P(chart.y - 9)}" style="fill:var(--fg);${MONO}">` +
      `<tspan fill="var(--accent)">●</tspan> + <tspan fill="var(--orange)">●</tspan> −</text>`;
    s += `<text x="${P(chart.x + chart.w)}" y="${P(chart.y - 9)}" text-anchor="end" style="fill:var(--muted);${MONO}">${state.mode === "shell" ? "delsum α, skall for skall" : "delsum α, kvadrat for kvadrat"}</text>`;

    // Akser og ticks.
    s += `<line x1="${P(chart.x)}" y1="${P(chart.y)}" x2="${P(chart.x)}" y2="${P(bottom)}" stroke="var(--border-strong)" stroke-width="1"/>`;
    s += `<line x1="${P(chart.x)}" y1="${P(bottom)}" x2="${P(chart.x + chart.w)}" y2="${P(bottom)}" stroke="var(--border-strong)" stroke-width="1"/>`;
    for (const v of [0, 1, 2, 3, 4]) {
      const y = yOf(v);
      s += `<line x1="${P(chart.x - 4)}" y1="${P(y)}" x2="${P(chart.x)}" y2="${P(y)}" stroke="var(--border-strong)" stroke-width="1"/>`;
      s += `<text x="${P(chart.x - 7)}" y="${P(y + 4)}" text-anchor="end" style="fill:var(--muted);${MONO}">${v}</text>`;
    }
    s += `<line x1="${P(chart.x)}" y1="${P(yOf(0))}" x2="${P(chart.x + chart.w)}" y2="${P(yOf(0))}" stroke="var(--border-strong)" stroke-width="1" stroke-dasharray="2 3"/>`;
    const xTicks = state.mode === "shell" ? [1, 5, 10, 15] : [1, 2, 3, 4, 5, 6];
    for (const i of xTicks) {
      const x = xOf(i);
      s += `<line x1="${P(x)}" y1="${P(bottom)}" x2="${P(x)}" y2="${P(bottom + 4)}" stroke="var(--border-strong)" stroke-width="1"/>`;
      s += `<text x="${P(x)}" y="${P(bottom + 15)}" text-anchor="middle" style="fill:var(--muted);${MONO}">${i}</text>`;
    }

    // Den eksakte verdien.
    const ya = yOf(ALPHA);
    s += `<line x1="${P(chart.x)}" y1="${P(ya)}" x2="${P(chart.x + chart.w)}" y2="${P(ya)}" stroke="var(--green)" stroke-width="1.5" stroke-dasharray="6 4"/>`;
    s += `<line x1="${P(chart.x - 4)}" y1="${P(ya)}" x2="${P(chart.x)}" y2="${P(ya)}" stroke="var(--green)" stroke-width="1.5"/>`;
    s += `<text x="${P(chart.x - 22)}" y="${P(ya + 4)}" text-anchor="end" style="fill:var(--green);font-weight:700;${MONO}">α</text>`;

    // Delsummene fram til k.
    let path = "";
    for (let i = 1; i <= k; i++) path += `${i === 1 ? "M" : "L"}${P(xOf(i))} ${P(yOf(series[i - 1].sum))} `;
    s += `<path d="${path}" fill="none" stroke="var(--fg)" stroke-opacity="0.45" stroke-width="1.5"/>`;
    for (let i = 1; i < k; i++) {
      s += `<circle cx="${P(xOf(i))}" cy="${P(yOf(series[i - 1].sum))}" r="3" fill="var(--accent)"/>`;
    }
    const last = series[k - 1].sum;
    const lx = xOf(k);
    const ly = yOf(last);
    s += `<circle cx="${P(lx)}" cy="${P(ly)}" r="5" fill="var(--accent)" stroke="var(--canvas-bg)" stroke-width="2"/>`;
    const left = lx > chart.x + chart.w * 0.6;
    const onLine = Math.abs(ly - ya) < 14;
    s += `<text x="${P(left ? lx - 9 : lx + 9)}" y="${P(onLine ? ly + 17 : ly + 4)}" text-anchor="${left ? "end" : "start"}" style="fill:var(--fg);font-weight:700;${MONO}">${fmt(last)}</text>`;

    stage.innerHTML =
      `<svg width="100%" height="100%" viewBox="0 0 ${w.toFixed(0)} ${h.toFixed(0)}" ` +
      `preserveAspectRatio="none" role="img" aria-hidden="true" style="display:block">${s}</svg>`;
  }

  picker.sync(state.mode);
  syncSlider();
  onResize(render);
  render();
}
