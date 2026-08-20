/**
 * De fire symmetrioperasjonene for TFY4220, modul 01.
 *
 * Motivet er en vimpel, valgt fordi den er asymmetrisk begge veier: speiling
 * og 180°-rotasjon gir synlig ulike bilder. Et symmetrisk motiv ville gjort de
 * to operasjonene umulige å skille, som er nettopp forvekslingen widgeten
 * finnes for å hindre.
 *
 * Sliderne fører operasjonen fra 0 til 1 i stedet for å vise før/etter, slik at
 * speiling og inversjon får sitt karakteristiske gjennomslag i midtstillingen.
 *
 * Rotasjonsmodus tar i tillegg med flislegningstesten fra forelesningen: k
 * regulære n-kanter rundt ett hjørne, og gapet som blir til overs når
 * 360° ikke er delelig på innvendig vinkel.
 *
 * Kontrakt: default-eksporter init(api), api = { stage, controls, getSize, onResize, signal }.
 */

import { choiceRow } from "./_controls.js";

const MODES = [
  { key: "translasjon", label: "Translasjon" },
  { key: "speiling", label: "Speiling" },
  { key: "inversjon", label: "Inversjon" },
  { key: "rotasjon", label: "Rotasjon" },
];

const NS = [2, 3, 4, 5, 6, 7];
const ALLOWED = new Set([1, 2, 3, 4, 6]);

/** Vimpelen: stang opp til venstre, flagg ut mot høyre. */
const MOTIF = "0,0 0,-30 17,-24 4,-18 4,0";

export default function init({ stage, controls, getSize, onResize, signal }) {
  let mode = "speiling";
  let t = 1;
  let n = 5;

  // Kontroller
  const modePick = choiceRow({
    ariaLabel: "Velg symmetrioperasjon",
    items: MODES.map((m) => ({ value: m.key, label: m.label })),
    onPick: (k) => {
      mode = k;
      sync();
      render();
    },
    signal,
  });

  const nRow = document.createElement("div");
  nRow.style.cssText =
    "flex-basis:100%;display:flex;flex-wrap:wrap;gap:6px;align-items:center";
  nRow.setAttribute("role", "group");
  nRow.setAttribute("aria-label", "Velg tellighet");
  const nLabel = document.createElement("span");
  nLabel.style.cssText =
    "font-family:var(--font-mono);font-size:var(--text-xs);color:var(--muted)";
  nLabel.textContent = "Tellighet n";
  nRow.append(nLabel);

  const nBtns = NS.map((k) => {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "sim-btn";
    el.textContent = String(k);
    el.addEventListener(
      "click",
      () => {
        n = k;
        sync();
        render();
      },
      { signal },
    );
    nRow.append(el);
    return { n: k, el };
  });

  const label = document.createElement("label");
  label.append("Utfør operasjonen ");
  const out = document.createElement("output");
  const input = document.createElement("input");
  input.type = "range";
  input.min = "0";
  input.max = "1";
  input.step = "0.02";
  input.value = String(t);
  input.setAttribute("aria-label", "Hvor langt operasjonen er utført");
  label.append(out, input);
  input.addEventListener(
    "input",
    () => {
      t = Number(input.value);
      sync();
      render();
    },
    { signal },
  );

  const readout = document.createElement("div");
  readout.className = "sim-readout";

  controls.append(modePick.el, nRow, label, readout);

  function sync() {
    modePick.sync(mode);
    const rot = mode === "rotasjon";
    for (const b of nBtns) {
      b.el.disabled = !rot;
      b.el.setAttribute("aria-pressed", String(rot && b.n === n));
    }
    nRow.style.opacity = rot ? "1" : "0.4";
    out.textContent = t.toFixed(2);
  }

  // Tegning
  const P = (x) => x.toFixed(1);
  const pennant = (tf, fill, opacity = 1) =>
    `<polygon points="${MOTIF}" transform="${tf}" style="fill:${fill}" opacity="${opacity}"/>`;

  function render() {
    const { w, h } = getSize();
    const cy = h / 2 + 15;
    const k = Math.max(1.2, Math.min(2.4, h / 150)); // motivskala

    let body = "";
    let note = "";

    if (mode === "translasjon") {
      const step = Math.max(58, Math.min(96, w / 6));
      const x0 = w / 2 - step * 1.5;
      // Gitteret av identiske motiver, og ett som forskyves over på naboen.
      for (let i = 0; i < 4; i++)
        body += pennant(
          `translate(${P(x0 + i * step)},${P(cy)}) scale(${k})`,
          "var(--border-strong)",
          0.55,
        );
      body += pennant(
        `translate(${P(x0 + t * step)},${P(cy)}) scale(${k})`,
        "var(--accent)",
      );
      body +=
        `<line x1="${P(x0)}" y1="${P(cy + 16)}" x2="${P(x0 + step)}" y2="${P(cy + 16)}" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="4 4"/>` +
        `<text x="${P(x0 + step / 2)}" y="${P(cy + 32)}" text-anchor="middle" style="fill:var(--muted);font-family:var(--font-mono);font-size:12px">R</text>`;
      note =
        t > 0.97
          ? "Motivet ligger nå oppå naboen. Gitteret er uendret av forskyvningen, som er det translasjonssymmetri betyr."
          : "Forskyv med én gittervektor <b>R</b>. Mønsteret skal se identisk ut etterpå.";
    }

    if (mode === "speiling") {
      const mx = w / 2;
      const dx = Math.max(46, Math.min(80, w / 9));
      body +=
        `<line x1="${P(mx)}" y1="14" x2="${P(mx)}" y2="${P(h - 14)}" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="5 4"/>` +
        `<text x="${P(mx + 8)}" y="26" style="fill:var(--muted);font-family:var(--font-mono);font-size:12px">m</text>`;
      body += pennant(
        `translate(${P(mx - dx)},${P(cy)}) scale(${k})`,
        "var(--border-strong)",
        0.55,
      );
      // Speilingen må skje om LINJA, ikke om motivets eget origo: derfor
      // uttrykkes den i speilplanets ramme, med motivet forskjøvet dx inn i
      // den. x-skalaen går fra +1 til −1 og flater ut på veien.
      body += pennant(
        `translate(${P(mx)},${P(cy)}) scale(${P(k * (1 - 2 * t))},${k}) translate(${P(-dx / k)},0)`,
        "var(--accent)",
      );
      note =
        "Speiling om planet <b>m</b>. Legg merke til at vimpelen snur retning: bildet kan ikke skyves tilbake på originalen.";
    }

    if (mode === "inversjon") {
      // Motivet forskyves bort fra senteret, ellers ville bildet lande oppå
      // originalen og operasjonen bli usynlig.
      const dx = Math.max(40, Math.min(70, w / 10));
      const dy = 22;
      const cxp = w / 2;
      const cyp = cy - 8;
      body += pennant(
        `translate(${P(cxp - dx)},${P(cyp - dy)}) scale(${k})`,
        "var(--border-strong)",
        0.55,
      );
      // Samme rammetriks som speilingen: skaleringen skjer om senteret i.
      body += pennant(
        `translate(${P(cxp)},${P(cyp)}) scale(${P(k * (1 - 2 * t))}) translate(${P(-dx / k)},${P(-dy / k)})`,
        "var(--accent)",
      );
      body +=
        `<circle cx="${P(cxp)}" cy="${P(cyp)}" r="3.5" style="fill:var(--muted)"/>` +
        `<text x="${P(cxp + 9)}" y="${P(cyp - 7)}" style="fill:var(--muted);font-family:var(--font-mono);font-size:12px">i</text>`;
      note =
        "Inversjon gjennom punktet <b>i</b>: hvert punkt går til sin motsatte side. I 2D gir det samme bilde som 180°-rotasjon, i 3D ikke.";
    }

    if (mode === "rotasjon") {
      // Flislegningstesten trenger en regulær n-kant, og den finnes først fra
      // n = 3. For n = 2 er innvendig vinkel 0°, og 360/0 ville blitt uendelig
      // mange «tokanter» å tegne. Da vises bare motivet, midtstilt.
      const tiling = n >= 3;
      const lx = tiling ? w * 0.28 : w / 2;
      const rx = w * 0.72;
      const step = 360 / n;
      for (let i = 0; i < n; i++)
        body += pennant(
          `translate(${P(lx)},${P(cy - 10)}) rotate(${P(i * step)}) scale(${P(k * 1.15)})`,
          "var(--border-strong)",
          0.55,
        );
      body += pennant(
        `translate(${P(lx)},${P(cy - 10)}) rotate(${P(t * step)}) scale(${P(k * 1.15)})`,
        "var(--accent)",
      );
      body += `<circle cx="${P(lx)}" cy="${P(cy - 10)}" r="3.5" style="fill:var(--muted)"/>`;

      if (tiling) {
        // n-kanter lagt kant mot kant rundt ett felles hjørne.
        const theta = (180 * (n - 2)) / n;
        const fit = Math.floor(360 / theta + 1e-9);
        const gap = 360 - fit * theta;
        const side = Math.max(26, Math.min(46, h / 6));
        for (let i = 0; i < fit; i++)
          body += `<polygon points="${ngon(n, side, i * theta - 90)
            .map(([x, y]) => `${P(rx + x)},${P(cy - 10 + y)}`)
            .join(
              " ",
            )}" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5"/>`;
        if (gap > 0.5) {
          const a0 = (fit * theta - 90) * (Math.PI / 180);
          const a1 = -90 * (Math.PI / 180) + 2 * Math.PI;
          const rr = side * 1.5;
          body +=
            `<path d="M ${P(rx)} ${P(cy - 10)} L ${P(rx + rr * Math.cos(a0))} ${P(cy - 10 + rr * Math.sin(a0))} A ${P(rr)} ${P(rr)} 0 0 1 ${P(rx + rr * Math.cos(a1))} ${P(cy - 10 + rr * Math.sin(a1))} Z" fill="var(--warning-bg)" stroke="var(--warning)" stroke-width="1.5"/>` +
            `<text x="${P(rx + rr * 0.72 * Math.cos((a0 + a1) / 2))}" y="${P(cy - 10 + rr * 0.72 * Math.sin((a0 + a1) / 2))}" text-anchor="middle" dominant-baseline="middle" style="fill:var(--fg);font-family:var(--font-mono);font-size:12px">${gap.toFixed(0)}°</text>`;
        }
        body += `<circle cx="${P(rx)}" cy="${P(cy - 10)}" r="3" style="fill:var(--muted)"/>`;

        note = ALLOWED.has(n)
          ? `<b>n = ${n} er tillatt.</b> ${fit} regulære ${n}-kanter møtes i hjørnet og fyller nøyaktig 360°, så huskeregelen går opp. Aksen er forenlig med et gitter fordi 2·cos(2π/${n}) er et heltall, og huskeregelen speiler bare det.`
          : `<b>n = ${n} er umulig i en krystall.</b> ${fit} regulære ${n}-kanter dekker ${(fit * theta).toFixed(0)}°, så det står igjen ${gap.toFixed(0)}°. Hullet er huskeregelens bilde på at 2·cos(2π/${n}) ikke er et heltall.`;
      } else {
        note = `<b>n = ${n} er tillatt.</b> En 2-tellig akse fører motivet over i seg selv ved en halv omdreining. Huskeregelen vises fra n = 3, siden det ikke finnes noen regulær 2-kant.`;
      }
    }

    stage.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 ${w.toFixed(0)} ${h.toFixed(0)}" preserveAspectRatio="none" role="img" aria-hidden="true" style="display:block">${body}</svg>`;
    readout.innerHTML = note;
  }

  /** Regulær n-kant med ett hjørne i origo og første kant langs vinkelen a1 (grader). */
  function ngon(sides, side, a1deg) {
    const theta = (Math.PI * (sides - 2)) / sides;
    const Rc = side / (2 * Math.sin(Math.PI / sides));
    const cAng = a1deg * (Math.PI / 180) + theta / 2;
    const cx = Rc * Math.cos(cAng);
    const cy = Rc * Math.sin(cAng);
    const start = Math.atan2(-cy, -cx);
    const pts = [];
    for (let i = 0; i < sides; i++) {
      const a = start + (i * 2 * Math.PI) / sides;
      pts.push([cx + Rc * Math.cos(a), cy + Rc * Math.sin(a)]);
    }
    return pts;
  }

  sync();
  onResize(render);
  render();
}
