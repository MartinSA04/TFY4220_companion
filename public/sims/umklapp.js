/**
 * To fononer blir til ett, for TFY4220, modul 07.
 *
 * Første Brillouin-sone for et kvadratisk gitter med gitterkonstant a, tegnet
 * i enheter av π/a, med nabosonene stiplet. To fononer k₁ og k₂ går ut fra
 * sonesenteret Γ med faste retninger (+40° og −10° fra kₓ-aksen) og samme
 * lengde, som glidebryteren styrer. Summen k₁ + k₂ tegnes hode mot hale.
 *
 *  - Ligger summen i sonen, er k₃ = k₁ + k₂: en normalprosess.
 *  - Ligger den utenfor, flyttes den inn med den resiproke gittervektoren G
 *    (her (2π/a, 0)), og k₃ = k₁ + k₂ − G peker bakover: en Umklapp-prosess.
 *
 * Nederst står x-komponenten av den samlede krystallimpulsen før (k₁ + k₂) og
 * etter (k₃) kollisjonen, på samme akse. I Debye-modellen er varmestrømmen
 * proporsjonal med den.
 *
 * Kontrakt: default-eksporter init(api), api = { stage, controls, getSize, onResize, signal }.
 */

const ANG1 = (40 * Math.PI) / 180;
const ANG2 = (-10 * Math.PI) / 180;
const VIEW = { x0: -1.3, x1: 2.3, y0: -1.22, y1: 1.22 }; // i enheter av π/a
const MONO = "font-family:var(--font-mono);font-size:var(--text-xs)";
const HALO = "paint-order:stroke;stroke:var(--canvas-bg);stroke-width:3px";
const fmt = (x) => x.toFixed(2).replace(".", ",");

export default function init({ stage, controls, getSize, onResize, signal }) {
  const state = { q: 0.7 };

  // ── kontroll ────────────────────────────────────────────────────────────
  const label = document.createElement("label");
  label.append("|k₁| = |k₂| ");
  const out = document.createElement("output");
  const input = document.createElement("input");
  input.type = "range";
  input.min = "0.2";
  input.max = "1";
  input.step = "0.01";
  input.value = String(state.q);
  input.setAttribute("aria-label", "Lengden av k₁ og k₂ i enheter av π/a");
  label.append(out, input);
  const sync = () => (out.textContent = `${fmt(state.q)} π/a`);
  input.addEventListener(
    "input",
    () => {
      state.q = Number(input.value);
      sync();
      render();
    },
    { signal },
  );
  controls.append(label);

  // ── tegning ─────────────────────────────────────────────────────────────
  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return;
    const P = (x) => x.toFixed(1);
    const pad = 12;
    const meterH = 66;

    // k-rommet: lik skala i begge retninger, sentrert i flaten over måleren.
    const top = pad + 18;
    const bottom = h - pad - meterH - 6;
    const vw = VIEW.x1 - VIEW.x0;
    const vh = VIEW.y1 - VIEW.y0;
    const s = Math.min((w - 2 * pad) / vw, (bottom - top) / vh);
    const left = (w - vw * s) / 2;
    const upper = top + (bottom - top - vh * s) / 2;
    const X = (kx) => left + (kx - VIEW.x0) * s;
    const Y = (ky) => upper + (VIEW.y1 - ky) * s;

    const q = state.q;
    const k1 = { x: q * Math.cos(ANG1), y: q * Math.sin(ANG1) };
    const k2 = { x: q * Math.cos(ANG2), y: q * Math.sin(ANG2) };
    const sum = { x: k1.x + k2.x, y: k1.y + k2.y };
    const G = { x: 2 * Math.round(sum.x / 2), y: 2 * Math.round(sum.y / 2) };
    const umklapp = G.x !== 0 || G.y !== 0;
    const k3 = { x: sum.x - G.x, y: sum.y - G.y };

    let svg = "";

    /** Pil fra (x1, y1) til (x2, y2) i piksler, med hode av samme farge. */
    const arrow = (x1, y1, x2, y2, color, width, dash = "") => {
      const len = Math.hypot(x2 - x1, y2 - y1);
      if (len < 1) return "";
      const ux = (x2 - x1) / len;
      const uy = (y2 - y1) / len;
      const hl = Math.min(9, len * 0.5);
      const hw = hl * 0.45;
      const bx = x2 - ux * hl;
      const by = y2 - uy * hl;
      const d = dash ? ` stroke-dasharray="${dash}"` : "";
      return (
        `<line x1="${P(x1)}" y1="${P(y1)}" x2="${P(bx)}" y2="${P(by)}" stroke="${color}" stroke-width="${width}"${d}/>` +
        `<polygon points="${P(x2)},${P(y2)} ${P(bx - uy * hw)},${P(by + ux * hw)} ${P(bx + uy * hw)},${P(by - ux * hw)}" fill="${color}"/>`
      );
    };
    /** Pil i k-rommet, fra a til b. */
    const karrow = (a, b, color, width, dash) => arrow(X(a.x), Y(a.y), X(b.x), Y(b.y), color, width, dash);
    /** Etikett ved spissen av en vektor, skjøvet videre langs den. */
    const tipLabel = (v, text, color, push = 13) => {
      const n = Math.hypot(v.x, v.y) || 1;
      const x = X(v.x) + (v.x / n) * push;
      const y = Y(v.y) - (v.y / n) * push;
      const anchor = v.x / n > 0.35 ? "start" : v.x / n < -0.35 ? "end" : "middle";
      return `<text x="${P(x)}" y="${P(y + 4)}" text-anchor="${anchor}" style="fill:${color};${MONO};${HALO}">${text}</text>`;
    };

    // Nabosonene: stiplede grenser over hele utsnittet.
    for (const kx of [-1, 1]) {
      svg += `<line x1="${P(X(kx))}" y1="${P(Y(VIEW.y1))}" x2="${P(X(kx))}" y2="${P(Y(VIEW.y0))}" stroke="var(--border)" stroke-width="1" stroke-dasharray="4 4"/>`;
    }
    for (const ky of [-1, 1]) {
      svg += `<line x1="${P(X(VIEW.x0))}" y1="${P(Y(ky))}" x2="${P(X(VIEW.x1))}" y2="${P(Y(ky))}" stroke="var(--border)" stroke-width="1" stroke-dasharray="4 4"/>`;
    }
    // Første sone.
    svg += `<rect x="${P(X(-1))}" y="${P(Y(1))}" width="${P(2 * s)}" height="${P(2 * s)}" fill="var(--accent)" fill-opacity="0.08" stroke="var(--border-strong)" stroke-width="1.5"/>`;
    svg += `<text x="${P(X(-1) + 6)}" y="${P(Y(1) + 15)}" style="fill:var(--muted);${MONO}">1. sone</text>`;
    // Grensene på kₓ-aksen, under sonen.
    const yTick = Y(-1) + 13;
    svg += `<text x="${P(X(-1))}" y="${P(yTick)}" text-anchor="middle" style="fill:var(--muted);${MONO}">−π/a</text>`;
    svg += `<text x="${P(X(1))}" y="${P(yTick)}" text-anchor="middle" style="fill:var(--muted);${MONO}">π/a</text>`;
    svg += `<text x="${P(X(2))}" y="${P(yTick)}" text-anchor="middle" style="fill:var(--muted);${MONO}">2π/a</text>`;

    // De resiproke gitterpunktene i utsnittet: Γ og (2π/a, 0).
    svg += `<circle cx="${P(X(2))}" cy="${P(Y(0))}" r="3" fill="var(--muted)"/>`;
    svg += `<circle cx="${P(X(0))}" cy="${P(Y(0))}" r="3.5" fill="var(--border-strong)"/>`;
    svg += `<text x="${P(X(0) - 6)}" y="${P(Y(0) + 14)}" text-anchor="end" style="fill:var(--muted);${MONO}">Γ</text>`;

    const O = { x: 0, y: 0 };
    if (umklapp) {
      // Summen fra Γ og vektoren G som flytter den inn i sonen.
      svg += karrow(O, sum, "var(--muted)", 1.5, "5 4");
      svg += karrow(k3, sum, "var(--muted)", 1.5);
      const gx = X(k3.x + 0.18 * G.x);
      svg += `<text x="${P(gx)}" y="${P(Y(k3.y) - 6)}" text-anchor="middle" style="fill:var(--muted);${MONO};${HALO}">G</text>`;
    }
    // k₂ hode mot hale, fra spissen av k₁ til summen.
    svg += karrow(k1, sum, "var(--accent)", 1.2, "3 3");
    svg += karrow(O, k1, "var(--accent)", 2.5);
    svg += karrow(O, k2, "var(--accent)", 2.5);
    svg += karrow(O, k3, "var(--orange)", 2.5);

    svg += tipLabel(k1, "k₁", "var(--accent)");
    svg += tipLabel(k2, "k₂", "var(--accent)");
    if (umklapp) {
      svg += tipLabel(k3, "k₃", "var(--orange)");
      svg += `<text x="${P(X(sum.x) + 8)}" y="${P(Y(sum.y) - 8)}" text-anchor="start" style="fill:var(--muted);${MONO};${HALO}">k₁ + k₂</text>`;
    } else {
      svg += tipLabel(sum, "k₃ = k₁ + k₂", "var(--orange)");
    }

    svg += `<text x="${P(pad)}" y="${P(pad + 6)}" style="fill:var(--fg);font-family:var(--font-mono);font-size:var(--text-sm)">${umklapp ? "Umklapp-prosess, G ≠ 0" : "normalprosess, G = 0"}</text>`;

    // ── måleren: x-komponenten av den samlede krystallimpulsen ────────────
    const mTop = h - pad - meterH;
    const xm0 = pad + 40;
    const xm1 = w - pad;
    const zero = (xm0 + xm1) / 2;
    const unit = (xm1 - xm0) / 2 / 2; // ±2π/a over halve bredden
    const rows = [
      { y: mTop + 24, label: "før", value: sum.x, color: "var(--accent)" },
      { y: mTop + 50, label: "etter", value: k3.x, color: "var(--orange)" },
    ];
    svg += `<text x="${P(xm1)}" y="${P(mTop + 6)}" text-anchor="end" style="fill:var(--muted);${MONO}">samlet kₓ</text>`;
    svg += `<line x1="${P(zero)}" y1="${P(mTop + 12)}" x2="${P(zero)}" y2="${P(mTop + 60)}" stroke="var(--border-strong)" stroke-width="1"/>`;
    svg += `<text x="${P(zero)}" y="${P(mTop + 6)}" text-anchor="middle" style="fill:var(--muted);${MONO}">0</text>`;
    for (const r of rows) {
      svg += `<line x1="${P(xm0)}" y1="${P(r.y)}" x2="${P(xm1)}" y2="${P(r.y)}" stroke="var(--border)" stroke-width="1"/>`;
      svg += `<text x="${P(pad)}" y="${P(r.y + 4)}" style="fill:var(--muted);${MONO}">${r.label}</text>`;
      svg += arrow(zero, r.y, zero + r.value * unit, r.y, r.color, 4);
    }

    stage.innerHTML =
      `<svg width="100%" height="100%" viewBox="0 0 ${w.toFixed(0)} ${h.toFixed(0)}" ` +
      `preserveAspectRatio="none" role="img" aria-hidden="true" style="display:block">${svg}</svg>`;
  }

  sync();
  onResize(render);
  render();
}
