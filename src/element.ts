// <mug-shot seed="anay"> — a living doodle character.
//
// It blinks, its strokes boil like hand-drawn animation, its pupils follow
// your cursor, it watches inputs you focus, glances around when bored,
// dozes off with floating Zzz when you leave, and can talk: el.say("hi").
// Each seed has a temperament (jumpy / social / dreamy) that shapes how
// often all of that happens — two avatars don't just look different,
// they behave differently.
import { faceParts, seededRng, type FaceParts, type Mood } from "./index.js";

export class MugShotElement extends HTMLElement {
  static observedAttributes = ["seed", "mood", "size", "color", "ink", "idle"];
  #parts!: FaceParts;
  #svg: SVGSVGElement | null = null;
  #pupils: SVGGElement | null = null;
  #lids: SVGGElement | null = null;
  #boilPaths: SVGPathElement[] = [];
  #timers: ReturnType<typeof setTimeout>[] = [];
  #boilT?: ReturnType<typeof setInterval>;
  #asleep = false;
  #reacting: Mood | null = null;
  #saying = false;
  #gaze: [number, number] | null = null;
  #glance: [number, number] | null = null;
  #focusEl: Element | null = null;
  #lastMove = 0;
  #lastPos: [number, number] | null = null;
  // temperament: fixed per seed
  #jumpy = 0.5; #social = 0.5; #dreamy = 0.5;
  #reduced = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

  #onMove = (e: PointerEvent) => {
    const now = performance.now();
    if (this.#lastPos && this.#jumpy > 0.45 && !this.#reacting) {
      const speed = Math.hypot(e.clientX - this.#lastPos[0], e.clientY - this.#lastPos[1]) / Math.max(1, now - this.#lastMove);
      const r = this.getBoundingClientRect();
      const near = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)) < Math.max(220, r.width * 2);
      if (speed > 2.2 && near) this.react("surprised", 650);
    }
    this.#lastPos = [e.clientX, e.clientY]; this.#lastMove = now;
    this.#focusEl = null; this.#glance = null;
    this.#gaze = [e.clientX, e.clientY];
    this.#aim(); this.#wake();
  };
  #onKey = () => this.#wake();
  #onFocus = (e: FocusEvent) => {
    const t = e.target as Element;
    if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) { this.#focusEl = t; this.#aim(); }
  };
  #onEnter = () => { if (this.#social > 0.35 && !this.#asleep && !this.#reacting) this.react("happy", 1100); };

  connectedCallback() {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    const seed = this.getAttribute("seed") || "mugshot";
    const rt = seededRng(seed, "temper");
    this.#jumpy = rt(); this.#social = rt(); this.#dreamy = rt();
    this.#render();
    document.addEventListener("pointermove", this.#onMove, { passive: true });
    document.addEventListener("keydown", this.#onKey, { passive: true });
    document.addEventListener("focusin", this.#onFocus);
    this.addEventListener("pointerenter", this.#onEnter);
    this.#loopBlink(); this.#loopGlance(); this.#scheduleIdle(); this.#startBoil();
  }

  disconnectedCallback() {
    document.removeEventListener("pointermove", this.#onMove);
    document.removeEventListener("keydown", this.#onKey);
    document.removeEventListener("focusin", this.#onFocus);
    this.removeEventListener("pointerenter", this.#onEnter);
    this.#timers.forEach(clearTimeout); this.#timers = [];
    clearInterval(this.#boilT);
  }

  attributeChangedCallback(name: string) {
    if (!this.shadowRoot) return;
    if (name === "seed") {
      const rt = seededRng(this.getAttribute("seed") || "mugshot", "temper");
      this.#jumpy = rt(); this.#social = rt(); this.#dreamy = rt();
    }
    this.#render();
  }

  /** Temporary expression, then back to normal. */
  react(mood: Mood, ms = 1800) {
    this.#reacting = mood; this.#asleep = false;
    this.#render();
    this.#after(ms, () => { this.#reacting = null; this.#render(); });
  }

  /** Speech bubble in the same ink, with mouth flapping while it types. */
  say(text: string, opts: { hold?: number } = {}) {
    const root = this.shadowRoot!;
    root.querySelector(".bubble")?.remove();
    this.#wake();
    const b = document.createElement("div");
    b.className = "bubble";
    root.querySelector(".wrap")!.appendChild(b);
    this.#saying = true;
    this.#svg?.classList.add("talking");
    let i = 0;
    const tick = () => {
      b.textContent = text.slice(0, ++i);
      if (i < text.length) this.#after(24 + Math.random() * 30, tick);
      else {
        this.#saying = false;
        this.#svg?.classList.remove("talking");
        this.#after(opts.hold ?? 1600 + text.length * 40, () => { b.classList.add("fade"); this.#after(350, () => b.remove()); });
      }
    };
    tick();
  }

  get #mood(): Mood {
    if (this.#reacting) return this.#reacting;
    if (this.#asleep) return "sleepy";
    return (this.getAttribute("mood") as Mood) || "auto";
  }

  #after(ms: number, fn: () => void) { this.#timers.push(setTimeout(fn, ms)); }

  #render() {
    const size = Number(this.getAttribute("size") || 120);
    const bubbleKeep = this.shadowRoot!.querySelector(".bubble");
    this.#parts = faceParts(this.getAttribute("seed") || "mugshot", {
      size, mood: this.#mood,
      color: this.getAttribute("color") !== "false",
      ink: this.getAttribute("ink") || undefined,
    });
    const ink = this.#parts.ink;
    this.shadowRoot!.innerHTML = `<style>
      :host{display:inline-block;line-height:0}
      .wrap{position:relative;width:100%;height:100%}
      svg{width:100%;height:100%;overflow:visible;transition:transform .9s ease}
      .asleep svg{transform:rotate(6deg) translateY(3%)}
      [data-mug="mouth"]{transform-box:fill-box;transform-origin:center}
      .talking [data-mug="mouth"]{animation:flap .16s infinite alternate ease-in-out}
      @keyframes flap{to{transform:scaleY(.4) translateY(1px)}}
      .z{font:italic 700 14px ui-monospace,monospace;fill:${ink};opacity:0;animation:zz 2.6s infinite}
      .z:nth-child(2){animation-delay:.8s}.z:nth-child(3){animation-delay:1.6s}
      @keyframes zz{0%{opacity:0;transform:translate(0,0)}25%{opacity:.7}100%{opacity:0;transform:translate(9px,-16px)}}
      .bubble{position:absolute;left:72%;bottom:88%;background:#fffdf8;border:1.6px solid ${ink};color:${ink};
        border-radius:11px 13px 12px 2px;padding:5px 9px;font:12.5px/1.4 ui-monospace,monospace;
        min-width:24px;max-width:200px;width:max-content;white-space:pre-wrap;transition:opacity .3s;z-index:1}
      .bubble.fade{opacity:0}
      @media (prefers-reduced-motion: reduce){.asleep svg{transform:none}.talking [data-mug="mouth"]{animation:none}}
    </style><div class="wrap${this.#asleep ? " asleep" : ""}">${this.#parts.svg}</div>`;
    if (bubbleKeep) this.shadowRoot!.querySelector(".wrap")!.appendChild(bubbleKeep);
    const svg = this.shadowRoot!.querySelector("svg")!;
    this.#svg = svg;
    if (this.#saying) svg.classList.add("talking");
    this.#pupils = svg.querySelector('[data-mug="pupils"]');
    this.#boilPaths = Array.from(svg.querySelectorAll("path"));
    // blink lids
    const { eyes, ink: eyeInk } = this.#parts;
    const lid = (p: [number, number]) =>
      `<path d="M${p[0] - 2.6} ${p[1]} Q${p[0]} ${p[1] + 1.6} ${p[0] + 2.6} ${p[1]}" stroke="${eyeInk}" stroke-width="1.3" fill="none" stroke-linecap="round"/>`;
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("display", "none");
    g.innerHTML = (eyes.leftOpen ? lid(eyes.left) : "") + (eyes.rightOpen ? lid(eyes.right) : "");
    svg.appendChild(g);
    this.#lids = g;
    // Zzz
    if (this.#asleep) {
      const zg = document.createElementNS("http://www.w3.org/2000/svg", "g");
      zg.innerHTML = [0, 1, 2].map(i => `<text class="z" x="${70 + i * 4}" y="${26 - i * 2}">z</text>`).join("");
      svg.appendChild(zg);
    }
    this.#aim();
  }

  #aim() {
    if (!this.#pupils || this.#asleep) return;
    let target = this.#glance ?? this.#gaze;
    if (!this.#glance && this.#focusEl && this.#focusEl.isConnected) {
      const r = this.#focusEl.getBoundingClientRect();
      target = [r.left + r.width / 2, r.top + r.height / 2];
    }
    if (!target) return;
    const r = this.getBoundingClientRect();
    if (!r.width) return;
    const dx = target[0] - (r.left + r.width / 2);
    const dy = target[1] - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy) || 1;
    const reach = Math.min(1, len / 80) * 1.4;
    this.#pupils.setAttribute("transform", `translate(${(dx / len * reach).toFixed(2)} ${(dy / len * reach).toFixed(2)})`);
  }

  #blinkOnce(again = false) {
    if (this.#asleep || !this.#lids || !this.#pupils) return;
    this.#lids.removeAttribute("display");
    this.#pupils.setAttribute("visibility", "hidden");
    this.#after(120, () => {
      this.#lids?.setAttribute("display", "none");
      this.#pupils?.removeAttribute("visibility");
      if (again) this.#after(140, () => this.#blinkOnce(false));
    });
  }

  #loopBlink() {
    this.#after(1600 + Math.random() * 4600, () => {
      this.#blinkOnce(Math.random() < this.#jumpy * 0.5); // jumpy ones double-blink
      this.#loopBlink();
    });
  }

  // bored? look somewhere else for a moment
  #loopGlance() {
    const idleGap = 3200 + (1 - this.#dreamy) * 5200;
    this.#after(idleGap + Math.random() * 3000, () => {
      if (!this.#asleep && performance.now() - this.#lastMove > 2200) {
        const r = this.getBoundingClientRect();
        this.#glance = [r.left + (Math.random() - 0.5) * 900, r.top + (Math.random() - 0.5) * 700];
        this.#aim();
        this.#after(700 + Math.random() * 900, () => { this.#glance = null; this.#aim(); });
      }
      this.#loopGlance();
    });
  }

  #startBoil() {
    if (this.#reduced) return;
    clearInterval(this.#boilT);
    this.#boilT = setInterval(() => {
      const amp = this.#asleep ? 0.22 : 0.42;
      for (const p of this.#boilPaths) {
        p.setAttribute("transform", `translate(${((Math.random() - 0.5) * 2 * amp).toFixed(2)} ${((Math.random() - 0.5) * 2 * amp).toFixed(2)})`);
      }
    }, this.#asleep ? 260 : 130);
  }

  #scheduleIdle() {
    const ms = Number(this.getAttribute("idle") || 30000);
    if (ms <= 0) return;
    this.#after(ms, () => {
      if (performance.now() - this.#lastMove >= ms - 50) { this.#asleep = true; this.#render(); this.#startBoil(); }
      this.#scheduleIdle();
    });
  }

  #wake() {
    if (this.#asleep) { this.#asleep = false; this.#render(); this.#startBoil(); }
  }
}

if (typeof customElements !== "undefined" && !customElements.get("mug-shot")) {
  customElements.define("mug-shot", MugShotElement);
}
