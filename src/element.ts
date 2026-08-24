// <mug-shot seed="anay"> — a living doodle avatar.
// Blinks, follows the cursor, watches the field you type in, dozes off
// when idle, and reacts to events: el.react("happy").
import { faceParts, type FaceParts, type Mood } from "./index.js";

const OPEN_ATTRS = ["seed", "mood", "size", "color", "ink", "idle"];

export class MugShotElement extends HTMLElement {
  static observedAttributes = OPEN_ATTRS;
  #parts!: FaceParts;
  #pupils: SVGGElement | null = null;
  #lids: SVGGElement | null = null;
  #blinkT?: ReturnType<typeof setTimeout>;
  #idleT?: ReturnType<typeof setTimeout>;
  #reactT?: ReturnType<typeof setTimeout>;
  #asleep = false;
  #reacting: Mood | null = null;
  #gaze: [number, number] | null = null;   // client coords to look at
  #focusEl: Element | null = null;
  #onMove = (e: PointerEvent) => { this.#focusEl = null; this.#gaze = [e.clientX, e.clientY]; this.#aim(); this.#wake(); };
  #onKey = () => this.#wake();
  #onFocus = (e: FocusEvent) => {
    const t = e.target as Element;
    if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) { this.#focusEl = t; this.#aim(); }
  };

  connectedCallback() {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    this.#render();
    document.addEventListener("pointermove", this.#onMove, { passive: true });
    document.addEventListener("keydown", this.#onKey, { passive: true });
    document.addEventListener("focusin", this.#onFocus);
    this.#scheduleBlink();
    this.#scheduleIdle();
  }

  disconnectedCallback() {
    document.removeEventListener("pointermove", this.#onMove);
    document.removeEventListener("keydown", this.#onKey);
    document.removeEventListener("focusin", this.#onFocus);
    clearTimeout(this.#blinkT); clearTimeout(this.#idleT); clearTimeout(this.#reactT);
  }

  attributeChangedCallback() { if (this.shadowRoot) this.#render(); }

  /** Temporary expression, then back to normal. */
  react(mood: Mood, ms = 1800) {
    this.#reacting = mood; this.#asleep = false;
    clearTimeout(this.#reactT);
    this.#render();
    this.#reactT = setTimeout(() => { this.#reacting = null; this.#render(); }, ms);
  }

  get #mood(): Mood {
    if (this.#reacting) return this.#reacting;
    if (this.#asleep) return "sleepy";
    return (this.getAttribute("mood") as Mood) || "auto";
  }

  #render() {
    const size = Number(this.getAttribute("size") || 120);
    this.#parts = faceParts(this.getAttribute("seed") || "mugshot", {
      size,
      mood: this.#mood,
      color: this.getAttribute("color") !== "false",
      ink: this.getAttribute("ink") || undefined,
      background: "transparent",
    });
    this.shadowRoot!.innerHTML = `<style>:host{display:inline-block;line-height:0}svg{width:100%;height:100%}</style>` + this.#parts.svg;
    const svg = this.shadowRoot!.querySelector("svg")!;
    this.#pupils = svg.querySelector('[data-mug="pupils"]');
    // blink lids: short ink strokes over each open eye, hidden until a blink
    const { eyes, ink } = this.#parts;
    const lid = (p: [number, number]) =>
      `<path d="M${p[0] - 2.6} ${p[1]} Q${p[0]} ${p[1] + 1.6} ${p[0] + 2.6} ${p[1]}" stroke="${ink}" stroke-width="1.3" fill="none" stroke-linecap="round"/>`;
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("display", "none");
    g.innerHTML = (eyes.leftOpen ? lid(eyes.left) : "") + (eyes.rightOpen ? lid(eyes.right) : "");
    svg.appendChild(g);
    this.#lids = g;
    this.#aim();
  }

  #aim() {
    if (!this.#pupils || this.#asleep) return;
    let target = this.#gaze;
    if (this.#focusEl && this.#focusEl.isConnected) {
      const r = this.#focusEl.getBoundingClientRect();
      target = [r.left + r.width / 2, r.top + r.height / 2];
    }
    if (!target) return;
    const r = this.getBoundingClientRect();
    if (!r.width) return;
    const dx = target[0] - (r.left + r.width / 2);
    const dy = target[1] - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy) || 1;
    const reach = Math.min(1, len / 80) * 1.4; // viewBox units
    this.#pupils.setAttribute("transform", `translate(${(dx / len * reach).toFixed(2)} ${(dy / len * reach).toFixed(2)})`);
  }

  #scheduleBlink() {
    clearTimeout(this.#blinkT);
    this.#blinkT = setTimeout(() => {
      if (!this.#asleep && this.#lids && this.#pupils) {
        this.#lids.removeAttribute("display");
        this.#pupils.setAttribute("visibility", "hidden");
        setTimeout(() => {
          this.#lids?.setAttribute("display", "none");
          this.#pupils?.removeAttribute("visibility");
        }, 130);
      }
      this.#scheduleBlink();
    }, 1800 + Math.random() * 4200);
  }

  #scheduleIdle() {
    clearTimeout(this.#idleT);
    const ms = Number(this.getAttribute("idle") || 30000);
    if (ms <= 0) return;
    this.#idleT = setTimeout(() => { this.#asleep = true; this.#render(); }, ms);
  }

  #wake() {
    if (this.#asleep) { this.#asleep = false; this.#render(); }
    this.#scheduleIdle();
  }
}

if (typeof customElements !== "undefined" && !customElements.get("mug-shot")) {
  customElements.define("mug-shot", MugShotElement);
}
