/**
 * Planck-kurven for FTIR-laben i TFY4220, laget etter regnearket
 * «Lab2 - Planck.xls» fra laboppgaven.
 *
 * Regnearket tar temperaturen T, regner ut I(ν) = (2hν³/c²)/(e^{hν/kT} − 1)
 * for bølgetallene σ = 1, 100, 200, …, 50 000 cm⁻¹ (med λ = 1/σ og ν = cσ),
 * summerer trapesene mellom nabopunktene og ganger med π, og setter summen ved
 * siden av Stefan-Boltzmanns lov σT⁴. Denne simuleringen gjør det samme med de
 * samme konstantene og det samme rutenettet, så tallene er regnearkets.
 * Tabellen kan lastes ned som CSV.
 *
 * Tegningen: I(ν) mot σ, arealet under kurven fylt, og den delen av arealet
 * som ligger i det synlige området (380–750 nm) i spektralfargene, merket med
 * hvor stor andel av den utstrålte effekten den er: π∫I dν over det synlige
 * delt på σT⁴. En festet
 * kurve (først regnearkets 1400 K) står stiplet igjen, så du ser toppen flytte
 * seg og arealet vokse.
 *
 * Kontrakt: default-eksporter init(api), api = { stage, controls, getSize, onResize, signal }.
 */

// Konstantene i regnearket (celle D6–D9).
const C = 299792458; // m/s
const H = 6.62606896e-34; // J s
const K = 1.3806504e-23; // J/K
const SB = 5.6704e-8; // W m⁻² K⁻⁴

// Regnearkets rutenett: 1 cm⁻¹, så 100 til 50 000 cm⁻¹ i steg på 100.
const GRID = [1];
for (let s = 100; s <= 50000; s += 100) GRID.push(s);

const T_MIN = 200;
const T_MAX = 6000;
const T_SHEET = 1400;
const VIS = [380, 750]; // nm
const MONO = "font-family:var(--font-mono);font-size:var(--text-xs)";

/** I(ν) i W m⁻² sr⁻¹ Hz⁻¹, med ν i Hz (regnearkets kolonne D). */
function planck(nu, T) {
  const x = (H * nu) / (K * T);
  if (x > 700) return 0;
  return (2 * H * nu ** 3) / (C * C * Math.expm1(x));
}
const nuOf = (sigma) => C * sigma * 100; // σ i cm⁻¹ → ν i Hz
const sigmaPeak = (T) => (5.879e10 * T) / (100 * C); // Wien, likning (2) i laboppgaven

/** Andelen av den utstrålte effekten som er synlig lys: π∫I dν over 380–750 nm delt på σT⁴ (Simpson). */
function visibleShare(T) {
  const a = nuOf(1e7 / VIS[1]);
  const b = nuOf(1e7 / VIS[0]);
  const n = 400;
  const h = (b - a) / n;
  let s = planck(a, T) + planck(b, T);
  for (let i = 1; i < n; i++) s += (i % 2 ? 4 : 2) * planck(a + i * h, T);
  return (Math.PI * (h / 3) * s) / (SB * T ** 4);
}

/** Prosent med to gjeldende siffer, desimalkomma. */
function pct(share) {
  const p = share * 100;
  if (p < 1e-3) return "≈ 0 %";
  const digits = p >= 10 ? 0 : p >= 1 ? 1 : Math.max(1, 1 - Math.floor(Math.log10(p)));
  return `${p.toFixed(digits).replace(".", ",")} %`;
}

/** Regnearkets tabell og arealanslag for temperaturen T. */
function sheet(T) {
  const rows = GRID.map((s) => {
    const nu = nuOf(s);
    return { lambda: C / nu, nu, sigma: s, I: planck(nu, T), piece: 0 };
  });
  let sum = 0;
  for (let i = 1; i < rows.length; i++) {
    rows[i].piece = ((rows[i - 1].I + rows[i].I) / 2) * (rows[i].nu - rows[i - 1].nu);
    sum += rows[i].piece;
  }
  return { rows, area: sum * Math.PI, sb: SB * T ** 4 };
}

const SUP = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
/** 2,178·10⁵ med desimalkomma. */
function sci(x, digits = 3) {
  if (x === 0) return "0";
  const e = Math.floor(Math.log10(Math.abs(x)));
  const m = x / 10 ** e;
  const exp = String(e).replace(/./g, (ch) => SUP[ch] ?? ch);
  return `${m.toFixed(digits).replace(".", ",")}·10${exp}`;
}
/** 12 500 med tynt mellomrom som tusenskille. */
const thousands = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

/** En «pen» øvre grense: 1, 2, 2,5 eller 5 ganger en tierpotens. */
function niceCeil(x) {
  const e = 10 ** Math.floor(Math.log10(x));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * e >= x) return m * e;
  return 10 * e;
}

/**
 * Spektralfargen til en bølgelengde i nm (Brutons tilnærming), med fall mot
 * kantene av det synlige området. Fargene er de vanlige for synlig lys, ikke
 * temafargene.
 */
function spectral(nm) {
  let r = 0;
  let g = 0;
  let b = 0;
  if (nm < 440) {
    r = (440 - nm) / 60;
    b = 1;
  } else if (nm < 490) {
    g = (nm - 440) / 50;
    b = 1;
  } else if (nm < 510) {
    g = 1;
    b = (510 - nm) / 20;
  } else if (nm < 580) {
    r = (nm - 510) / 70;
    g = 1;
  } else if (nm < 645) {
    r = 1;
    g = (645 - nm) / 65;
  } else {
    r = 1;
  }
  const f = nm < 420 ? 0.3 + (0.7 * (nm - 380)) / 40 : nm > 700 ? 0.3 + (0.7 * (780 - nm)) / 80 : 1;
  const c = (v) => Math.round(255 * Math.pow(Math.max(0, v * f), 0.8));
  return `rgb(${c(r)},${c(g)},${c(b)})`;
}

export default function init({ stage, controls, getSize, onResize, signal }) {
  const state = { T: T_SHEET, pinned: T_SHEET };

  // ── kontroller ──────────────────────────────────────────────────────────
  const label = document.createElement("label");
  label.append("T ");
  const out = document.createElement("output");
  const input = document.createElement("input");
  input.type = "range";
  input.min = String(T_MIN);
  input.max = String(T_MAX);
  input.step = "10";
  input.value = String(state.T);
  input.setAttribute("aria-label", "Temperaturen til det svarte legemet i kelvin");
  label.append(out, input);
  input.addEventListener(
    "input",
    () => {
      state.T = Number(input.value);
      update();
    },
    { signal },
  );

  const pinBtn = document.createElement("button");
  pinBtn.type = "button";
  pinBtn.className = "sim-btn";
  pinBtn.textContent = "Fest kurven";
  pinBtn.addEventListener(
    "click",
    () => {
      state.pinned = state.T;
      update();
    },
    { signal },
  );

  const csvBtn = document.createElement("button");
  csvBtn.type = "button";
  csvBtn.className = "sim-btn";
  csvBtn.textContent = "Last ned tabellen (CSV)";
  csvBtn.addEventListener("click", download, { signal });

  const btnRow = document.createElement("div");
  btnRow.style.cssText = "flex-basis:100%;display:flex;flex-wrap:wrap;gap:6px";
  btnRow.append(pinBtn, csvBtn);

  const readout = document.createElement("p");
  readout.className = "sim-readout";
  readout.setAttribute("aria-live", "polite");

  controls.append(label, btnRow, readout);

  // ── CSV med regnearkets kolonner ────────────────────────────────────────
  function download() {
    const { rows, area, sb } = sheet(state.T);
    const n = (x) => x.toExponential(6).replace(".", ",");
    const lines = [
      `Temperatur T;${state.T};K`,
      `Lyshastighet c;${C};m s-1`,
      `Plancks konstant h;${n(H)};J s`,
      `Boltzmanns konstant k;${n(K)};J K-1`,
      `Stefan-Boltzmanns konstant;${n(SB)};W m-2 K-4`,
      "",
      "Bølgelengde [m];Frekvens [Hz];Bølgetall [cm-1];Intensitet [W m-2 sr-1 Hz-1];Arealbit [W m-2 sr-1]",
      ...rows.map((r, i) => [n(r.lambda), n(r.nu), r.sigma, n(r.I), i === 0 ? "" : n(r.piece)].join(";")),
      "",
      `Anslått areal (sum ganger pi);${n(area)};W m-2`,
      `Stefan-Boltzmanns lov;${n(sb)};W m-2`,
    ];
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `planck-${state.T}K.csv`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ── tegning ─────────────────────────────────────────────────────────────
  function update() {
    out.textContent = `${thousands(state.T)} K`;
    pinBtn.disabled = state.pinned === state.T;
    const { area, sb } = sheet(state.T);
    readout.innerHTML = `Arealet ganger π er <b>${sci(area)} W/m²</b>, og σ<sub>SB</sub>T⁴ er <b>${sci(sb)} W/m²</b>.`;
    render();
  }

  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return;
    const P = (x) => x.toFixed(1);
    const T = state.T;
    const Tp = state.pinned;
    const tHi = Math.max(T, Tp);

    const plot = { x: 44, y: 34, w: w - 44 - 16, h: h - 34 - 40 };
    const sMax = Math.min(50000, niceCeil(5.5 * sigmaPeak(tHi)));
    const iMax = 1.12 * planck(nuOf(sigmaPeak(tHi)), tHi);
    const X = (s) => plot.x + (s / sMax) * plot.w;
    const bottom = plot.y + plot.h;
    const Y = (I) => bottom - (I / iMax) * plot.h;

    const curve = (Tc, from, to, n) => {
      const pts = [];
      for (let i = 0; i <= n; i++) {
        const s = from + ((to - from) * i) / n;
        pts.push([X(s), Y(planck(nuOf(Math.max(s, 1e-6)), Tc))]);
      }
      return pts;
    };
    const line = (pts) => pts.map((p, i) => `${i ? "L" : "M"}${P(p[0])} ${P(p[1])}`).join(" ");
    const area = (pts) => `${line(pts)} L${P(pts[pts.length - 1][0])} ${P(bottom)} L${P(pts[0][0])} ${P(bottom)} Z`;

    let s = "";
    let defs = "";

    // Arealet under kurven.
    const main = curve(T, 0, sMax, 360);
    s += `<path d="${area(main)}" fill="var(--accent)" fill-opacity="0.16"/>`;

    // Den synlige delen av arealet, i spektralfargene.
    const sVisLo = 1e7 / VIS[1];
    const sVisHi = 1e7 / VIS[0];
    if (sVisLo < sMax) {
      let stops = "";
      for (let nm = VIS[1]; nm >= VIS[0]; nm -= 10) {
        const off = ((1e7 / nm - sVisLo) / (sVisHi - sVisLo)) * 100;
        stops += `<stop offset="${off.toFixed(1)}%" stop-color="${spectral(nm)}"/>`;
      }
      defs += `<linearGradient id="planck-vis" gradientUnits="userSpaceOnUse" x1="${P(X(sVisLo))}" x2="${P(X(sVisHi))}" y1="0" y2="0">${stops}</linearGradient>`;
      const vis = curve(T, sVisLo, Math.min(sVisHi, sMax), 120);
      s += `<path d="${area(vis)}" fill="url(#planck-vis)" fill-opacity="0.9"/>`;
      const label = `synlig: ${pct(visibleShare(T))}`;
      // Etiketten står rett til høyre for båndet, over kurven, så den verken
      // krysser kurven eller etikettene ved toppen.
      const edge = Math.min(sVisHi, sMax);
      let lx = X(edge) + 6;
      let anchor = "start";
      if (lx + 100 > plot.x + plot.w) {
        lx = plot.x + plot.w;
        anchor = "end";
      }
      const ly = Math.max(plot.y + 10, Math.min(bottom - 6, Y(planck(nuOf(edge), T)) - 8));
      s += `<text x="${P(lx)}" y="${P(ly)}" text-anchor="${anchor}" style="fill:var(--fg);font-weight:700;${MONO}">${label}</text>`;
    } else {
      s += `<text x="${P(plot.x + plot.w)}" y="${P(bottom - 8)}" text-anchor="end" style="fill:var(--muted);${MONO}">synlig lys: ${pct(visibleShare(T))} →</text>`;
    }

    // Den festede kurven.
    if (Tp !== T) {
      const ghost = curve(Tp, 0, sMax, 360);
      s += `<path d="${line(ghost)}" fill="none" stroke="var(--muted)" stroke-width="1.3" stroke-dasharray="5 4"/>`;
      const gp = sigmaPeak(Tp);
      const gy = Y(planck(nuOf(gp), Tp));
      if (bottom - gy > 14) {
        s += `<text x="${P(X(gp))}" y="${P(gy - 6)}" text-anchor="middle" style="fill:var(--muted);${MONO}">${thousands(Tp)} K</text>`;
      }
    }

    // Kurven og toppen.
    s += `<path d="${line(main)}" fill="none" stroke="var(--fg)" stroke-width="2"/>`;
    const pk = sigmaPeak(T);
    const px = X(pk);
    const py = Y(planck(nuOf(pk), T));
    s += `<line x1="${P(px)}" y1="${P(py)}" x2="${P(px)}" y2="${P(bottom)}" stroke="var(--accent)" stroke-width="1.2" stroke-dasharray="3 3"/>`;
    s += `<circle cx="${P(px)}" cy="${P(py)}" r="4.5" fill="var(--accent)" stroke="var(--canvas-bg)" stroke-width="2"/>`;
    const right = px < plot.x + plot.w * 0.6;
    s += `<text x="${P(right ? px + 9 : px - 9)}" y="${P(Math.max(plot.y - 14, py - 14))}" text-anchor="${right ? "start" : "end"}" style="fill:var(--fg);font-weight:700;${MONO}">${thousands(T)} K</text>`;
    s += `<text x="${P(right ? px + 9 : px - 9)}" y="${P(Math.max(plot.y - 1, py - 1))}" text-anchor="${right ? "start" : "end"}" style="fill:var(--accent-ink);${MONO}">topp ${thousands(pk)} cm⁻¹</text>`;

    // Aksene.
    s += `<line x1="${P(plot.x)}" y1="${P(plot.y - 8)}" x2="${P(plot.x)}" y2="${P(bottom)}" stroke="var(--border-strong)" stroke-width="1"/>`;
    s += `<line x1="${P(plot.x)}" y1="${P(bottom)}" x2="${P(plot.x + plot.w)}" y2="${P(bottom)}" stroke="var(--border-strong)" stroke-width="1"/>`;
    s += `<text x="${P(plot.x - 6)}" y="${P(plot.y - 12)}" text-anchor="end" style="fill:var(--muted);${MONO}">I(ν)</text>`;
    const nTicks = w < 480 ? 2 : 4;
    for (let i = 0; i <= nTicks; i++) {
      const v = (sMax * i) / nTicks;
      const x = X(v);
      s += `<line x1="${P(x)}" y1="${P(bottom)}" x2="${P(x)}" y2="${P(bottom + 4)}" stroke="var(--border-strong)" stroke-width="1"/>`;
      s += `<text x="${P(x)}" y="${P(bottom + 16)}" text-anchor="${i === 0 ? "start" : i === nTicks ? "end" : "middle"}" style="fill:var(--muted);${MONO}">${thousands(v)}</text>`;
    }
    s += `<text x="${P(plot.x + plot.w)}" y="${P(bottom + 32)}" text-anchor="end" style="fill:var(--muted);${MONO}">bølgetall σ (cm⁻¹)</text>`;

    stage.innerHTML =
      `<svg width="100%" height="100%" viewBox="0 0 ${w.toFixed(0)} ${h.toFixed(0)}" ` +
      `preserveAspectRatio="none" role="img" aria-hidden="true" style="display:block"><defs>${defs}</defs>${s}</svg>`;
  }

  onResize(render);
  update();
}
