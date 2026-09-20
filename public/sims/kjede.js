/**
 * Kjeden for TFY4220, modul 06: bølger på en endimensjonal atomkjede.
 *
 * Øverst tegnes kjeden, 16 atomer med fjærer, og utsvinget animeres som en
 * løpende bølge u_n(t) = A cos(k x_n − ωt). Utsvinget tegnes på tvers av
 * kjeden for at det skal synes, slik Kittel også gjør. Nederst tegnes
 * dispersjonsrelasjonen ω(k) fra −2π/a til 2π/a med første Brillouin-sone
 * skravert og et merke på den valgte bølgen.
 *
 *  - én atomtype: ω = 2√(C/M)|sin(ka/2)|. Glidebryteren går til 2π/a, og
 *    utenfor sonen tegnes også bølgen med k − 2π/a: den går gjennom de samme
 *    atomene til samme tid, så de to er samme svingning. På sonegrensen står
 *    bølgen stille.
 *  - to atomtyper (M1 = 2M2, samme C): to grener. Amplitudeforholdet u/v
 *    følger av bevegelsesligningene, så atomene svinger i fase i den
 *    akustiske grenen og i motfase i den optiske, og på sonegrensen står den
 *    ene undergitteret stille.
 *
 * Enheter: a = 1, C = 1, M = M2 = 1. Kontrakt: default-eksporter init(api),
 * api = { stage, controls, getSize, onResize, signal }.
 */
import { choiceRow } from "./_controls.js";

const NATOM = 16;
const M1 = 2; // det tunge atomet i den toatomige kjeden
const M2 = 1;
const OMEGA_TOP = 2.15; // toppen av ω-aksen (ω_max = 2 for én atomtype)
const RATE = 1.6; // tidsenheter per sekund
const MONO = "font-family:var(--font-mono);font-size:var(--text-xs)";

/** ω for én atomtype, ka = q·π. */
const omegaMono = (q) => 2 * Math.abs(Math.sin((q * Math.PI) / 2));

/** ω² for de to grenene i den toatomige kjeden. */
function omegaDi(q, branch) {
  const s = Math.sin((q * Math.PI) / 2);
  const inv = 1 / M1 + 1 / M2;
  const root = Math.sqrt(inv * inv - (4 * s * s) / (M1 * M2));
  return Math.sqrt(branch === "op" ? inv + root : inv - root);
}

/**
 * Amplitudene (u, v) til det tunge og det lette atomet, normert så den
 * største er 1. Ansatsen er faset med posisjonen, så forholdet er reelt:
 * (2C − M1ω²) u = 2C cos(ka/2) v og (2C − M2ω²) v = 2C cos(ka/2) u.
 */
function amplitudes(q, branch) {
  const w2 = omegaDi(q, branch) ** 2;
  const c = 2 * Math.cos((q * Math.PI) / 2);
  const d1 = 2 - M1 * w2;
  const d2 = 2 - M2 * w2;
  let u;
  let v;
  if (Math.abs(d1) >= Math.abs(d2)) {
    v = 1;
    u = c / d1;
  } else {
    u = 1;
    v = c / d2;
  }
  const n = Math.max(Math.abs(u), Math.abs(v)) || 1;
  return { u: u / n, v: v / n };
}

const fmt = (x) => x.toFixed(2).replace(".", ",");

export default function init({ stage, controls, getSize, onResize, signal }) {
  const state = { mode: "mono", branch: "ak", q: 0.5 };
  let t = 0;
  let playing = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── kontroller ──────────────────────────────────────────────────────────
  const chain = choiceRow({
    ariaLabel: "Hvor mange atomtyper kjeden har",
    label: "kjede",
    items: [
      { value: "mono", label: "én atomtype" },
      { value: "di", label: "to atomtyper" },
    ],
    onPick: (v) => {
      state.mode = v;
      if (v === "di" && state.q > 1) state.q = 1;
      chain.sync(v);
      syncBranch();
      syncSlider();
      render();
    },
    signal,
  });
  controls.append(chain.el);

  const branch = choiceRow({
    ariaLabel: "Hvilken gren av dispersjonsrelasjonen",
    label: "gren",
    items: [
      { value: "ak", label: "akustisk" },
      { value: "op", label: "optisk" },
    ],
    onPick: (v) => {
      state.branch = v;
      branch.sync(v);
      render();
    },
    signal,
  });
  controls.append(branch.el);
  const syncBranch = () => {
    branch.el.style.display = state.mode === "di" ? "" : "none";
  };

  const label = document.createElement("label");
  label.append("k ");
  const out = document.createElement("output");
  const input = document.createElement("input");
  input.type = "range";
  input.min = "0";
  input.step = "0.05";
  input.setAttribute("aria-label", "Bølgevektoren k i enheter av π/a");
  label.append(out, input);
  const syncSlider = () => {
    input.max = state.mode === "mono" ? "2" : "1";
    input.value = String(state.q);
    out.textContent = `${fmt(state.q)} π/a`;
  };
  input.addEventListener(
    "input",
    () => {
      state.q = Number(input.value);
      syncSlider();
      render();
    },
    { signal },
  );
  controls.append(label);

  const playBtn = document.createElement("button");
  playBtn.type = "button";
  playBtn.className = "sim-btn";
  playBtn.textContent = playing ? "Pause" : "Spill av";
  playBtn.addEventListener(
    "click",
    () => {
      playing = !playing;
      playBtn.textContent = playing ? "Pause" : "Spill av";
      start();
    },
    { signal },
  );
  controls.append(playBtn);

  // ── tegning ─────────────────────────────────────────────────────────────
  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return;
    const P = (x) => x.toFixed(1);
    const pad = 12;
    const mono = state.mode === "mono";
    const q = state.q;
    const omega = mono ? omegaMono(q) : omegaDi(q, state.branch);
    const k = q * Math.PI;
    let s = "";

    // Kjeden: 16 atomer, likevektslinje midt i den øvre halvdelen.
    const chainH = Math.round(h * 0.47);
    const pitch = (w - 2 * pad - 16) / (NATOM - 1);
    const x0 = pad + 8;
    const yEq = pad + chainH / 2;
    const amp = Math.min(chainH * 0.36, 60);
    const cell = mono ? 1 : 2; // atomer per gitterkonstant
    const xOf = (i) => x0 + i * pitch;
    // Posisjonen i enheter av a, og utsvinget til atom i.
    const posA = (i) => i / cell;
    const { u, v } = mono ? { u: 1, v: 1 } : amplitudes(q, state.branch);
    const dispOf = (i) => {
      const heavy = mono || i % 2 === 0;
      return (heavy ? u : v) * amp * Math.cos(k * posA(i) - omega * t);
    };

    s += `<line x1="${P(pad)}" y1="${P(yEq)}" x2="${P(w - pad)}" y2="${P(yEq)}" stroke="var(--border)" stroke-width="1" stroke-dasharray="3 4"/>`;

    // Bølgekurvene, stiplet: en gjennom hvert undergitter. Utenfor sonen
    // tegnes i tillegg bølgen med k − 2π/a, som treffer de samme atomene.
    const curve = (kk, ampl, stroke) => {
      let d = "";
      for (let px = x0 - 6; px <= xOf(NATOM - 1) + 6; px += 2) {
        const xa = (px - x0) / pitch / cell;
        const y = yEq - ampl * Math.cos(kk * xa - omega * t);
        d += `${d ? "L" : "M"}${P(px)} ${P(y)} `;
      }
      return `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="1.2" stroke-dasharray="4 4"/>`;
    };
    if (mono) {
      s += curve(k, amp, q > 1 ? "var(--muted)" : "var(--accent)");
      if (q > 1) s += curve(k - 2 * Math.PI, amp, "var(--accent)");
    } else {
      s += curve(k, u * amp, "var(--accent)");
      s += curve(k, v * amp, "var(--orange)");
    }

    // Fjærene: rette streker mellom naboatomer, så strekket synes.
    const pts = [];
    for (let i = 0; i < NATOM; i++) pts.push([xOf(i), yEq - dispOf(i)]);
    for (let i = 0; i < NATOM - 1; i++) {
      s += `<line x1="${P(pts[i][0])}" y1="${P(pts[i][1])}" x2="${P(pts[i + 1][0])}" y2="${P(pts[i + 1][1])}" stroke="var(--border-strong)" stroke-width="1.5"/>`;
    }
    for (let i = 0; i < NATOM; i++) {
      const heavy = mono || i % 2 === 0;
      const r = heavy ? Math.min(7, pitch * 0.3) : Math.min(5, pitch * 0.22);
      const fill = heavy ? "var(--accent)" : "var(--orange)";
      s += `<circle cx="${P(pts[i][0])}" cy="${P(pts[i][1])}" r="${P(r)}" fill="${fill}"/>`;
    }

    // Gitterkonstanten a, som klamme under kjeden.
    const yb = pad + chainH - 6;
    const xb0 = xOf(0);
    const xb1 = xOf(cell);
    s += `<line x1="${P(xb0)}" y1="${P(yb)}" x2="${P(xb1)}" y2="${P(yb)}" stroke="var(--muted)" stroke-width="1"/>`;
    s += `<line x1="${P(xb0)}" y1="${P(yb - 4)}" x2="${P(xb0)}" y2="${P(yb + 4)}" stroke="var(--muted)" stroke-width="1"/>`;
    s += `<line x1="${P(xb1)}" y1="${P(yb - 4)}" x2="${P(xb1)}" y2="${P(yb + 4)}" stroke="var(--muted)" stroke-width="1"/>`;
    s += `<text x="${P((xb0 + xb1) / 2)}" y="${P(yb - 6)}" text-anchor="middle" style="fill:var(--muted);${MONO}">a</text>`;
    if (!mono) {
      s += `<text x="${P(w - pad)}" y="${P(yb + 2)}" text-anchor="end" style="fill:var(--muted);${MONO}">` +
        `<tspan fill="var(--accent)">●</tspan> M₁ = 2M₂  <tspan fill="var(--orange)">●</tspan> M₂</text>`;
    }

    // Dispersjonsrelasjonen.
    const g = {
      x: pad + 26,
      y: pad + chainH + 22,
      w: w - 2 * pad - 26 - 6,
      h: h - pad - chainH - 22 - 22,
    };
    const gx = (qq) => g.x + ((qq + 2) / 4) * g.w;
    const gy = (om) => g.y + g.h - (om / OMEGA_TOP) * g.h;
    const bottom = g.y + g.h;

    // Første Brillouin-sone.
    s += `<rect x="${P(gx(-1))}" y="${P(g.y)}" width="${P(gx(1) - gx(-1))}" height="${P(g.h)}" fill="var(--accent)" fill-opacity="0.08"/>`;
    // Navnet på sonen bare der det får plass uten å ligge over kurvetoppene.
    if (gx(1) - gx(-1) >= 300) {
      s += `<text x="${P(gx(0))}" y="${P(g.y + 11)}" text-anchor="middle" style="fill:var(--muted);${MONO}">1. Brillouin-sone</text>`;
    }

    // Akser.
    s += `<line x1="${P(g.x)}" y1="${P(g.y)}" x2="${P(g.x)}" y2="${P(bottom)}" stroke="var(--border-strong)" stroke-width="1"/>`;
    s += `<line x1="${P(g.x)}" y1="${P(bottom)}" x2="${P(g.x + g.w)}" y2="${P(bottom)}" stroke="var(--border-strong)" stroke-width="1"/>`;
    s += `<text x="${P(g.x - 6)}" y="${P(g.y + 4)}" text-anchor="end" style="fill:var(--muted);${MONO}">ω</text>`;
    const ticks = [
      [-2, "−2π/a"],
      [-1, "−π/a"],
      [0, "0"],
      [1, "π/a"],
      [2, "2π/a"],
    ];
    for (const [qq, txt] of ticks) {
      const x = gx(qq);
      s += `<line x1="${P(x)}" y1="${P(bottom)}" x2="${P(x)}" y2="${P(bottom + 4)}" stroke="var(--border-strong)" stroke-width="1"/>`;
      const anchor = qq === -2 ? "start" : qq === 2 ? "end" : "middle";
      s += `<text x="${P(x)}" y="${P(bottom + 15)}" text-anchor="${anchor}" style="fill:var(--muted);${MONO}">${txt}</text>`;
    }

    // Kurvene.
    const plot = (fn, stroke) => {
      let d = "";
      for (let qq = -2; qq <= 2.0001; qq += 0.02) {
        d += `${d ? "L" : "M"}${P(gx(qq))} ${P(gy(fn(qq)))} `;
      }
      return `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="2"/>`;
    };
    if (mono) {
      s += plot(omegaMono, "var(--fg)");
    } else {
      // Det forbudte båndet mellom grenene.
      const yTop = gy(Math.sqrt(2 / M2));
      const yBot = gy(Math.sqrt(2 / M1));
      s += `<rect x="${P(g.x)}" y="${P(yTop)}" width="${P(g.w)}" height="${P(yBot - yTop)}" fill="var(--orange)" fill-opacity="0.14"/>`;
      s += `<text x="${P(g.x + g.w - 4)}" y="${P((yTop + yBot) / 2 + 4)}" text-anchor="end" style="fill:var(--muted);${MONO}">forbudt</text>`;
      s += plot((qq) => omegaDi(qq, "ak"), "var(--fg)");
      s += plot((qq) => omegaDi(qq, "op"), "var(--fg)");
      s += `<text x="${P(gx(0))}" y="${P(gy(omegaDi(0, "op")) - 6)}" text-anchor="middle" style="fill:var(--fg);${MONO}">optisk</text>`;
      s += `<text x="${P(gx(0.42))}" y="${P(gy(omegaDi(0.42, "ak")) + 14)}" text-anchor="start" style="fill:var(--fg);${MONO}">akustisk</text>`;
    }

    // Merket for den valgte bølgen, og tvillingen i sonen når k ligger utenfor.
    if (mono && q > 1) {
      s += `<line x1="${P(gx(q))}" y1="${P(gy(omega))}" x2="${P(gx(q - 2))}" y2="${P(gy(omega))}" stroke="var(--accent)" stroke-width="1" stroke-dasharray="3 3"/>`;
      s += `<circle cx="${P(gx(q - 2))}" cy="${P(gy(omega))}" r="5" fill="var(--canvas-bg)" stroke="var(--accent)" stroke-width="2"/>`;
    }
    s += `<circle cx="${P(gx(q))}" cy="${P(gy(omega))}" r="5.5" fill="var(--accent)" stroke="var(--canvas-bg)" stroke-width="2"/>`;

    stage.innerHTML =
      `<svg width="100%" height="100%" viewBox="0 0 ${w.toFixed(0)} ${h.toFixed(0)}" ` +
      `preserveAspectRatio="none" role="img" aria-hidden="true" style="display:block">${s}</svg>`;
  }

  // ── animasjon ───────────────────────────────────────────────────────────
  let raf = 0;
  let last = 0;
  let visible = true;
  function frame(now) {
    raf = 0;
    if (signal.aborted) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    t += dt * RATE;
    render();
    if (playing && visible) raf = requestAnimationFrame(frame);
  }
  function start() {
    if (raf || !playing || !visible) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  const io = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
    },
    { threshold: 0 },
  );
  io.observe(stage);
  signal.addEventListener(
    "abort",
    () => {
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
    },
    { once: true },
  );

  chain.sync(state.mode);
  branch.sync(state.branch);
  syncBranch();
  syncSlider();
  onResize(render);
  render();
  start();
}
