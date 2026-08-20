/**
 * «Gitterpunktet er en adresse, ikke et atom» for TFY4220, modul 01.
 *
 * Honeycomb-nettet tegnes én gang og rører seg aldri. Oppå det ligger et
 * overlegg av gitterpunkter som krysshår, og slideren skyver gitterets ORIGO
 * kontinuerlig gjennom den faste strukturen langs a₁+a₂. Atomene på skjermen er
 * de samme ved hver eneste sliderverdi; bare krysshårene flytter seg, og bare
 * basiskoordinatene i utlesningen endrer seg.
 *
 * Ved fire posisjoner langs den linja havner gitterpunktet i sentrum av en
 * sekskant, på et A-atom, midt på en C–C-binding og på et B-atom. Alle fire er
 * like riktige beskrivelser av den samme krystallen, og de tre første er
 * konvensjoner som faktisk brukes i litteraturen. Utlesningen snapper til dem.
 *
 * Merk forskjellen fra gitter-basis.js, som holder gitteret fast og varierer
 * basisen. Denne gjør det motsatte.
 *
 * Kontrakt: default-eksporter init(api), api = { stage, controls, getSize, onResize, signal }.
 */

import { choiceRow } from "./_controls.js";

const SQRT3 = Math.sqrt(3);

/** De tre kanoniske origoene, som brøk av (a₁+a₂). */
const SPOTS = [
  { key: "sekskant", label: "I sekskantsenter", s: 0 },
  { key: "atom", label: "På atom", s: 1 / 3 },
  { key: "binding", label: "På binding", s: 1 / 2 },
];

/** Alt slideren skal snappe til, inkludert B-atomet og periodens slutt. */
const SNAPS = [0, 1 / 3, 1 / 2, 2 / 3, 1];
const TOL = 0.02;

/** Norsk desimalkomma, og de brøkene som faktisk dukker opp skrives som brøk. */
const NAMED = new Map([
  [0, "0"],
  [1 / 6, "⅙"],
  [1 / 3, "⅓"],
  [1 / 2, "½"],
  [2 / 3, "⅔"],
  [5 / 6, "⅚"],
]);
function frac(x) {
  for (const [v, s] of NAMED) if (Math.abs(x - v) < 0.004) return s;
  return x.toFixed(2).replace(".", ",");
}

export default function init({ stage, controls, getSize, onResize, signal }) {
  let s = 0;

  // Kontroller
  const spotPick = choiceRow({
    ariaLabel: "Hopp til en kanonisk origoposisjon",
    items: SPOTS.map((p) => ({ value: p.key, label: p.label })),
    onPick: (k) => {
      s = SPOTS.find((p) => p.key === k).s;
      sync();
      render();
    },
    signal,
  });

  const label = document.createElement("label");
  label.append("Flytt gitterets origo ");
  const out = document.createElement("output");
  const input = document.createElement("input");
  input.type = "range";
  input.min = "0";
  input.max = "1";
  input.step = "0.01";
  input.value = String(s);
  input.setAttribute("aria-label", "Gitterets origo som brøk av a₁+a₂");
  label.append(out, input);
  input.addEventListener(
    "input",
    () => {
      const raw = Number(input.value);
      // Snapping, ikke bare avrunding i utlesningen: krysshåret skal lande
      // nøyaktig på atomet, ellers ser den kanoniske posisjonen omtrentlig ut.
      const hit = SNAPS.find((v) => Math.abs(raw - v) < TOL);
      s = hit === undefined ? raw : hit;
      sync();
      render();
    },
    { signal },
  );

  const readout = document.createElement("div");
  readout.className = "sim-readout";

  controls.append(spotPick.el, label, readout);

  function sync() {
    input.value = String(s);
    out.textContent = frac(s);
    const hit = SPOTS.find((p) => Math.abs(p.s - s) < 0.004);
    spotPick.sync(hit ? hit.key : "");
  }

  // Tegning
  const P = (n) => n.toFixed(1);

  /**
   * Strukturen er den samme uansett sliderverdi, så den bygges én gang per
   * størrelse og gjenbrukes ordrett. Da er «atomene har ikke rørt seg» ikke noe
   * leseren må ta på tro: markupen er bokstavelig talt den samme strengen.
   */
  let cache = { key: "", svg: "" };

  function geometry(w, h) {
    const L = Math.max(34, Math.min(78, Math.min(w, h) / 4.2));
    const a1 = { x: L, y: 0 };
    const a2 = { x: L / 2, y: (-L * SQRT3) / 2 };
    const sum = { x: a1.x + a2.x, y: a1.y + a2.y };
    return { L, a1, a2, sum, cx: w / 2, cy: h / 2 };
  }

  function structure(w, h, g) {
    const key = `${w}|${h}`;
    if (cache.key === key) return cache.svg;

    const { a1, a2, sum, cx, cy, L } = g;
    const m = L * 1.2;
    const inside = (p) => p.x > -m && p.x < w + m && p.y > -m && p.y < h + m;
    const A = [];
    const B = [];
    for (let n1 = -10; n1 <= 10; n1++) {
      for (let n2 = -10; n2 <= 10; n2++) {
        const bx = cx + n1 * a1.x + n2 * a2.x;
        const by = cy + n1 * a1.y + n2 * a2.y;
        const a = { x: bx + sum.x / 3, y: by + sum.y / 3 };
        const b = { x: bx + (2 * sum.x) / 3, y: by + (2 * sum.y) / 3 };
        if (inside(a)) A.push(a);
        if (inside(b)) B.push(b);
      }
    }

    // Bindinger: hvert A har nøyaktig tre B innenfor bindingslengden |a₁+a₂|/3.
    const bond = Math.hypot(sum.x, sum.y) / 3;
    let bonds = "";
    for (const a of A)
      for (const b of B)
        if (Math.hypot(a.x - b.x, a.y - b.y) < bond * 1.12)
          bonds += `<line x1="${P(a.x)}" y1="${P(a.y)}" x2="${P(b.x)}" y2="${P(b.y)}" stroke="var(--border-strong)" stroke-width="2.5" stroke-linecap="round"/>`;

    const dot = (p, fill) =>
      `<circle cx="${P(p.x)}" cy="${P(p.y)}" r="6" style="fill:${fill}"/>`;

    // Bokstavene A og B settes på det midterste paret. Uten dem må utlesningen
    // forklare fargekoden i hver eneste setning.
    const lx = cx + sum.x / 3;
    const ly = cy + sum.y / 3;
    const letters =
      `<text x="${P(lx - 12)}" y="${P(ly + 12)}" text-anchor="middle" style="fill:var(--muted);font-family:var(--font-mono);font-size:12px">A</text>` +
      `<text x="${P(cx + (2 * sum.x) / 3 + 12)}" y="${P(cy + (2 * sum.y) / 3 - 9)}" text-anchor="middle" style="fill:var(--muted);font-family:var(--font-mono);font-size:12px">B</text>`;

    cache = {
      key,
      svg:
        bonds +
        A.map((p) => dot(p, "var(--accent)")).join("") +
        B.map((p) => dot(p, "var(--green)")).join("") +
        letters,
    };
    return cache.svg;
  }

  function render() {
    const { w, h } = getSize();
    const g = geometry(w, h);
    const { a1, a2, sum, cx, cy, L } = g;

    const atoms = structure(w, h, g);

    // Gitterpunktene, forskjøvet s·(a₁+a₂) fra sekskantsentrene.
    const org = [];
    const m = L * 1.2;
    for (let n1 = -10; n1 <= 10; n1++)
      for (let n2 = -10; n2 <= 10; n2++) {
        const p = {
          x: cx + s * sum.x + n1 * a1.x + n2 * a2.x,
          y: cy + s * sum.y + n1 * a1.y + n2 * a2.y,
          mid: n1 === 0 && n2 === 0,
        };
        if (p.x > -m && p.x < w + m && p.y > -m && p.y < h + m) org.push(p);
      }

    // Trekantgitteret som origoene danner, svakt i bakgrunnen: det er DET som
    // holder seg likt mens origo vandrer.
    let mesh = "";
    const link = (p, v) =>
      `<line x1="${P(p.x)}" y1="${P(p.y)}" x2="${P(p.x + v.x)}" y2="${P(p.y + v.y)}" stroke="var(--muted)" stroke-width="1" opacity="0.35"/>`;
    for (const p of org)
      mesh +=
        link(p, a1) + link(p, a2) + link(p, { x: a2.x - a1.x, y: a2.y - a1.y });

    // Krysshåret tegnes med et lokk i bakgrunnsfargen under selve krysset, så
    // det leses like godt oppå et atom som i tomrommet mellom dem.
    const cross = (p) => {
      const r = p.mid ? 9 : 7;
      const d = `M ${P(p.x - r)} ${P(p.y)} h ${P(2 * r)} M ${P(p.x)} ${P(p.y - r)} v ${P(2 * r)}`;
      return (
        `<path d="${d}" stroke="var(--canvas-bg)" stroke-width="${p.mid ? 4.5 : 3.6}" stroke-linecap="round"/>` +
        `<path d="${d}" stroke="var(--fg)" stroke-width="${p.mid ? 2.2 : 1.6}" stroke-linecap="round"/>`
      );
    };

    stage.innerHTML =
      `<svg width="100%" height="100%" viewBox="0 0 ${w.toFixed(0)} ${h.toFixed(0)}" preserveAspectRatio="none" role="img" aria-hidden="true" style="display:block">` +
      mesh +
      atoms +
      org.map(cross).join("") +
      `</svg>`;

    readout.innerHTML = describe();
  }

  /** Utlesningen bærer poenget: samme struktur, ny adresse, nye basiskoordinater. */
  function describe() {
    const wrap = (x) => ((x % 1) + 1) % 1;
    const coord = (u) => (frac(u) === "0" ? "0" : `${frac(u)}(a₁+a₂)`);
    const basis = `Basis: ${coord(wrap(1 / 3 - s))} og ${coord(wrap(2 / 3 - s))}, målt fra gitterpunktet.`;

    const near = (v) => Math.abs(s - v) < 0.004;
    let where;
    let note;
    if (near(0) || near(1)) {
      where = "i sentrum av en sekskant";
      note =
        "Ingen av de to karbonatomene sitter på et gitterpunkt. Simon og Delft velger denne.";
    } else if (near(1 / 3)) {
      where = "på et A-atom";
      note =
        "Nå ligger det ene atomet på gitterpunktet, slik Cornell tegner det. A og B er begge karbon, og skiller seg bare ved plassen i basisen.";
    } else if (near(2 / 3)) {
      where = "på et B-atom";
      note =
        "Samme beskrivelse som forrige, med A og B byttet om. Ingen av dem er mer opprinnelig enn den andre.";
    } else if (near(1 / 2)) {
      where = "midt på en C–C-binding";
      note =
        "Gitterpunktet ligger i tomrommet mellom to kjerner, og beskrivelsen er like gyldig.";
    } else {
      where = "i et tomrom";
      note = "Basiskoordinatene er stygge, og beskrivelsen er like riktig.";
    }

    return (
      `<b>Gitterpunktet ligger ${where}.</b> ${basis} ${note}<br>` +
      "Atomene har ikke flyttet seg. Bare krysshårene har det."
    );
  }

  sync();
  onResize(render);
  render();
}
