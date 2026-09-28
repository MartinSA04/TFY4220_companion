/**
 * Delte kontroller for simuleringene i dette emnet.
 *
 * `choiceRow` gir det samme valget i to former: en knapperad på brede skjermer
 * og en nativ <select> på telefon. Sju krystallsystemer eller fem gittertyper
 * som knapper brytes over flere rader og spiser halve skjermen, mens en select
 * blir stående på én linje og åpner OS-plukkeren. Det er samme grep som
 * rammeverkets egen seksjonsfilter i Flashcards bruker.
 *
 * Begge formene ligger i DOM-en hele tiden, og JS viser én av gangen: en
 * kurs-sim kan ikke skrive media queries (kontrollene injiseres uten scoped
 * CSS), så bruddpunktet leses med matchMedia i stedet.
 */

const PHONE = "(max-width: 640px)";

/**
 * @param {object} o
 * @param {string} o.ariaLabel   Navn på gruppen, brukt av begge formene.
 * @param {string} [o.label]     Valgfri ledetekst foran raden.
 * @param {{value: string, label: string}[]} o.items
 * @param {(value: string) => void} o.onPick
 * @param {AbortSignal} o.signal
 * @returns {{ el: HTMLElement, sync: (current: string, disabled?: (v: string) => boolean) => void }}
 */
export function choiceRow({ ariaLabel, label, items, onPick, signal }) {
  const wrap = document.createElement("div");
  wrap.style.cssText =
    "flex-basis:100%;display:flex;flex-wrap:wrap;gap:6px;align-items:center";

  if (label) {
    const tag = document.createElement("span");
    tag.style.cssText =
      "font-family:var(--font-mono);font-size:var(--text-xs);color:var(--muted)";
    tag.textContent = label;
    wrap.append(tag);
  }

  const row = document.createElement("div");
  row.style.cssText = "display:flex;flex-wrap:wrap;gap:6px";
  row.setAttribute("role", "group");
  row.setAttribute("aria-label", ariaLabel);

  const select = document.createElement("select");
  // .sim-btn er :global() i Simulation.astro, så en <select> arver den samme
  // pillen som knappene — fyll, radius og mono-typen. Listen selv forblir nativ.
  select.className = "sim-btn";
  select.setAttribute("aria-label", ariaLabel);
  select.style.cssText = "max-width:60vw;text-overflow:ellipsis";

  const btns = [];
  const opts = [];
  for (const it of items) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "sim-btn";
    b.textContent = it.label;
    b.addEventListener("click", () => onPick(it.value), { signal });
    row.append(b);
    btns.push(b);

    const o = document.createElement("option");
    o.value = it.value;
    o.textContent = it.label;
    select.append(o);
    opts.push(o);
  }

  select.addEventListener("change", () => onPick(select.value), { signal });
  wrap.append(row, select);

  const mq = window.matchMedia(PHONE);
  const applyLayout = () => {
    row.style.display = mq.matches ? "none" : "flex";
    select.style.display = mq.matches ? "block" : "none";
  };
  mq.addEventListener("change", applyLayout, { signal });
  applyLayout();

  return {
    el: wrap,
    sync(current, disabled = () => false) {
      for (let i = 0; i < items.length; i++) {
        const off = disabled(items[i].value);
        btns[i].disabled = off;
        btns[i].setAttribute(
          "aria-pressed",
          String(!off && items[i].value === current),
        );
        opts[i].disabled = off;
      }
      select.value = current;
    },
  };
}

/**
 * Et kort tekstfelt for tall eller Miller-indekser, med ledeteksten over, slik
 * rammeverket stiler <label> i kontrollraden. Feltet er type="text" med
 * inputmode, så både «12,99» og «12.99» går an; `parseNum` leser begge.
 *
 * @param {object} o
 * @param {string} o.label       Ledeteksten over feltet.
 * @param {string} o.ariaLabel   Fullt navn for skjermlesere.
 * @param {string} [o.value]     Startverdi.
 * @param {string} [o.placeholder]
 * @param {string} [o.width]     CSS-bredde på feltet, f.eks. "5.5em".
 * @param {"decimal"|"text"} [o.mode]
 * @param {(value: string) => void} o.onInput
 * @param {AbortSignal} o.signal
 * @returns {{ el: HTMLLabelElement, input: HTMLInputElement }}
 */
export function textField({ label, ariaLabel, value = "", placeholder = "", width = "5.5em", mode = "decimal", onInput, signal }) {
  const el = document.createElement("label");
  // Rammeverkets label har flex: 1 og min-width 180px; et kort felt skal bare
  // ta plassen det trenger.
  el.style.cssText = "flex:0 0 auto;min-width:0";
  el.append(label);
  const input = document.createElement("input");
  input.type = "text";
  input.inputMode = mode;
  input.autocomplete = "off";
  input.spellcheck = false;
  input.value = value;
  input.placeholder = placeholder;
  input.setAttribute("aria-label", ariaLabel);
  input.style.cssText =
    `width:${width};font-family:var(--font-mono);font-size:var(--text-sm);` +
    "color:var(--fg);background:var(--control-fill, var(--bg-elevated));" +
    "border:1px solid var(--border);border-radius:var(--radius-sm);padding:0.3em 0.5em";
  input.addEventListener("input", () => onInput(input.value), { signal });
  el.append(input);
  return { el, input };
}

/** Tall fra et tekstfelt: komma eller punktum som desimaltegn, NaN når feltet er tomt. */
export function parseNum(s) {
  const t = String(s).trim().replace(/\s+/g, "").replace(",", ".").replace(/[−–]/g, "-");
  return t === "" ? NaN : Number(t);
}

/**
 * Miller-indekser fra et tekstfelt: «111», «2-20», «1 -1 3» eller «10 0 2».
 * Uten mellomrom eller komma er hvert siffer én indeks. Gir null når det ikke
 * er nøyaktig tre.
 */
export function parseHkl(s) {
  const t = String(s).trim().replace(/[−–]/g, "-");
  if (t === "") return null;
  const parts = /[\s,;]/.test(t) ? t.match(/-?\d+/g) : t.match(/-?\d/g);
  if (!parts || parts.length !== 3) return null;
  return parts.map(Number);
}

/** Tall med desimalkomma og minustegn, med fast antall desimaler. */
export const fmt = (x, digits) => x.toFixed(digits).replace(".", ",").replace("-", "−");

/** Indeksene som tekst for SVG, med strek over negative indekser. */
export const hklSvg = (hkl) =>
  hkl.map((n) => (n < 0 ? `<tspan text-decoration="overline">${-n}</tspan>` : String(n))).join("");

/** Indeksene som ren tekst, med minustegn foran negative. */
export const hklText = (hkl) => hkl.map((n) => (n < 0 ? `−${-n}` : String(n))).join(" ");
