var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _MugShotElement_instances, _MugShotElement_parts, _MugShotElement_svg, _MugShotElement_pupils, _MugShotElement_lids, _MugShotElement_boilPaths, _MugShotElement_timers, _MugShotElement_boilT, _MugShotElement_asleep, _MugShotElement_reacting, _MugShotElement_saying, _MugShotElement_gaze, _MugShotElement_glance, _MugShotElement_focusEl, _MugShotElement_lastMove, _MugShotElement_lastPos, _MugShotElement_jumpy, _MugShotElement_social, _MugShotElement_dreamy, _MugShotElement_reduced, _MugShotElement_onMove, _MugShotElement_onKey, _MugShotElement_onFocus, _MugShotElement_onEnter, _MugShotElement_mood_get, _MugShotElement_after, _MugShotElement_render, _MugShotElement_aim, _MugShotElement_blinkOnce, _MugShotElement_loopBlink, _MugShotElement_loopGlance, _MugShotElement_startBoil, _MugShotElement_scheduleIdle, _MugShotElement_wake;
// <mug-shot seed="anay"> — a living doodle character.
//
// It blinks, its strokes boil like hand-drawn animation, its pupils follow
// your cursor, it watches inputs you focus, glances around when bored,
// dozes off with floating Zzz when you leave, and can talk: el.say("hi").
// Each seed has a temperament (jumpy / social / dreamy) that shapes how
// often all of that happens — two avatars don't just look different,
// they behave differently.
import { faceParts, seededRng } from "./index.js";
const HERD = new Set();
export class MugShotElement extends HTMLElement {
    constructor() {
        super(...arguments);
        _MugShotElement_instances.add(this);
        _MugShotElement_parts.set(this, void 0);
        _MugShotElement_svg.set(this, null);
        _MugShotElement_pupils.set(this, null);
        _MugShotElement_lids.set(this, null);
        _MugShotElement_boilPaths.set(this, []);
        _MugShotElement_timers.set(this, []);
        _MugShotElement_boilT.set(this, void 0);
        _MugShotElement_asleep.set(this, false);
        _MugShotElement_reacting.set(this, null);
        _MugShotElement_saying.set(this, false);
        _MugShotElement_gaze.set(this, null);
        _MugShotElement_glance.set(this, null);
        _MugShotElement_focusEl.set(this, null);
        _MugShotElement_lastMove.set(this, 0);
        _MugShotElement_lastPos.set(this, null);
        // temperament: fixed per seed
        _MugShotElement_jumpy.set(this, 0.5);
        _MugShotElement_social.set(this, 0.5);
        _MugShotElement_dreamy.set(this, 0.5);
        _MugShotElement_reduced.set(this, typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches);
        _MugShotElement_onMove.set(this, (e) => {
            const now = performance.now();
            if (__classPrivateFieldGet(this, _MugShotElement_lastPos, "f") && __classPrivateFieldGet(this, _MugShotElement_jumpy, "f") > 0.45 && !__classPrivateFieldGet(this, _MugShotElement_reacting, "f")) {
                const speed = Math.hypot(e.clientX - __classPrivateFieldGet(this, _MugShotElement_lastPos, "f")[0], e.clientY - __classPrivateFieldGet(this, _MugShotElement_lastPos, "f")[1]) / Math.max(1, now - __classPrivateFieldGet(this, _MugShotElement_lastMove, "f"));
                const r = this.getBoundingClientRect();
                const near = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)) < Math.max(220, r.width * 2);
                if (speed > 2.2 && near)
                    this.react("surprised", 650);
            }
            __classPrivateFieldSet(this, _MugShotElement_lastPos, [e.clientX, e.clientY], "f");
            __classPrivateFieldSet(this, _MugShotElement_lastMove, now, "f");
            __classPrivateFieldSet(this, _MugShotElement_focusEl, null, "f");
            __classPrivateFieldSet(this, _MugShotElement_glance, null, "f");
            __classPrivateFieldSet(this, _MugShotElement_gaze, [e.clientX, e.clientY], "f");
            __classPrivateFieldGet(this, _MugShotElement_instances, "m", _MugShotElement_aim).call(this);
            __classPrivateFieldGet(this, _MugShotElement_instances, "m", _MugShotElement_wake).call(this);
        });
        _MugShotElement_onKey.set(this, () => __classPrivateFieldGet(this, _MugShotElement_instances, "m", _MugShotElement_wake).call(this));
        _MugShotElement_onFocus.set(this, (e) => {
            const t = e.target;
            if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) {
                __classPrivateFieldSet(this, _MugShotElement_focusEl, t, "f");
                __classPrivateFieldGet(this, _MugShotElement_instances, "m", _MugShotElement_aim).call(this);
            }
        });
        _MugShotElement_onEnter.set(this, () => { if (__classPrivateFieldGet(this, _MugShotElement_social, "f") > 0.35 && !__classPrivateFieldGet(this, _MugShotElement_asleep, "f") && !__classPrivateFieldGet(this, _MugShotElement_reacting, "f"))
            this.react("happy", 1100); });
    }
    connectedCallback() {
        if (!this.shadowRoot)
            this.attachShadow({ mode: "open" });
        const seed = this.getAttribute("seed") || "mugshot";
        const rt = seededRng(seed, "temper");
        __classPrivateFieldSet(this, _MugShotElement_jumpy, rt(), "f");
        __classPrivateFieldSet(this, _MugShotElement_social, rt(), "f");
        __classPrivateFieldSet(this, _MugShotElement_dreamy, rt(), "f");
        __classPrivateFieldGet(this, _MugShotElement_instances, "m", _MugShotElement_render).call(this);
        document.addEventListener("pointermove", __classPrivateFieldGet(this, _MugShotElement_onMove, "f"), { passive: true });
        document.addEventListener("keydown", __classPrivateFieldGet(this, _MugShotElement_onKey, "f"), { passive: true });
        document.addEventListener("focusin", __classPrivateFieldGet(this, _MugShotElement_onFocus, "f"));
        this.addEventListener("pointerenter", __classPrivateFieldGet(this, _MugShotElement_onEnter, "f"));
        __classPrivateFieldGet(this, _MugShotElement_instances, "m", _MugShotElement_loopBlink).call(this);
        __classPrivateFieldGet(this, _MugShotElement_instances, "m", _MugShotElement_loopGlance).call(this);
        __classPrivateFieldGet(this, _MugShotElement_instances, "m", _MugShotElement_scheduleIdle).call(this);
        __classPrivateFieldGet(this, _MugShotElement_instances, "m", _MugShotElement_startBoil).call(this);
        HERD.add(this);
    }
    disconnectedCallback() {
        HERD.delete(this);
        document.removeEventListener("pointermove", __classPrivateFieldGet(this, _MugShotElement_onMove, "f"));
        document.removeEventListener("keydown", __classPrivateFieldGet(this, _MugShotElement_onKey, "f"));
        document.removeEventListener("focusin", __classPrivateFieldGet(this, _MugShotElement_onFocus, "f"));
        this.removeEventListener("pointerenter", __classPrivateFieldGet(this, _MugShotElement_onEnter, "f"));
        __classPrivateFieldGet(this, _MugShotElement_timers, "f").forEach(clearTimeout);
        __classPrivateFieldSet(this, _MugShotElement_timers, [], "f");
        clearInterval(__classPrivateFieldGet(this, _MugShotElement_boilT, "f"));
    }
    attributeChangedCallback(name) {
        if (!this.shadowRoot)
            return;
        if (name === "seed") {
            const rt = seededRng(this.getAttribute("seed") || "mugshot", "temper");
            __classPrivateFieldSet(this, _MugShotElement_jumpy, rt(), "f");
            __classPrivateFieldSet(this, _MugShotElement_social, rt(), "f");
            __classPrivateFieldSet(this, _MugShotElement_dreamy, rt(), "f");
        }
        __classPrivateFieldGet(this, _MugShotElement_instances, "m", _MugShotElement_render).call(this);
    }
    /** Temporary expression, then back to normal. */
    react(mood, ms = 1800) {
        __classPrivateFieldSet(this, _MugShotElement_reacting, mood, "f");
        __classPrivateFieldSet(this, _MugShotElement_asleep, false, "f");
        __classPrivateFieldGet(this, _MugShotElement_instances, "m", _MugShotElement_render).call(this);
        __classPrivateFieldGet(this, _MugShotElement_instances, "m", _MugShotElement_after).call(this, ms, () => { __classPrivateFieldSet(this, _MugShotElement_reacting, null, "f"); __classPrivateFieldGet(this, _MugShotElement_instances, "m", _MugShotElement_render).call(this); });
    }
    /** Speech bubble in the same ink, with mouth flapping while it types. */
    say(text, opts = {}) {
        const root = this.shadowRoot;
        root.querySelector(".bubble")?.remove();
        __classPrivateFieldGet(this, _MugShotElement_instances, "m", _MugShotElement_wake).call(this);
        const b = document.createElement("div");
        b.className = "bubble";
        root.querySelector(".wrap").appendChild(b);
        __classPrivateFieldSet(this, _MugShotElement_saying, true, "f");
        __classPrivateFieldGet(this, _MugShotElement_svg, "f")?.classList.add("talking");
        const r0 = this.getBoundingClientRect();
        for (const o of HERD) {
            if (o !== this && o.isConnected)
                o.lookAt([r0.left + r0.width / 2, r0.top + r0.height / 2], 1400 + text.length * 45);
        }
        let i = 0;
        const tick = () => {
            b.textContent = text.slice(0, ++i);
            if (i < text.length)
                __classPrivateFieldGet(this, _MugShotElement_instances, "m", _MugShotElement_after).call(this, 24 + Math.random() * 30, tick);
            else {
                __classPrivateFieldSet(this, _MugShotElement_saying, false, "f");
                __classPrivateFieldGet(this, _MugShotElement_svg, "f")?.classList.remove("talking");
                __classPrivateFieldGet(this, _MugShotElement_instances, "m", _MugShotElement_after).call(this, opts.hold ?? 1600 + text.length * 40, () => { b.classList.add("fade"); __classPrivateFieldGet(this, _MugShotElement_instances, "m", _MugShotElement_after).call(this, 350, () => b.remove()); });
            }
        };
        tick();
    }
    /** Turn the eyes toward a point (client coords) for a moment. */
    lookAt(target, ms = 1500) {
        __classPrivateFieldSet(this, _MugShotElement_glance, target, "f");
        __classPrivateFieldGet(this, _MugShotElement_instances, "m", _MugShotElement_aim).call(this);
        __classPrivateFieldGet(this, _MugShotElement_instances, "m", _MugShotElement_after).call(this, ms, () => { __classPrivateFieldSet(this, _MugShotElement_glance, null, "f"); __classPrivateFieldGet(this, _MugShotElement_instances, "m", _MugShotElement_aim).call(this); });
    }
}
_MugShotElement_parts = new WeakMap(), _MugShotElement_svg = new WeakMap(), _MugShotElement_pupils = new WeakMap(), _MugShotElement_lids = new WeakMap(), _MugShotElement_boilPaths = new WeakMap(), _MugShotElement_timers = new WeakMap(), _MugShotElement_boilT = new WeakMap(), _MugShotElement_asleep = new WeakMap(), _MugShotElement_reacting = new WeakMap(), _MugShotElement_saying = new WeakMap(), _MugShotElement_gaze = new WeakMap(), _MugShotElement_glance = new WeakMap(), _MugShotElement_focusEl = new WeakMap(), _MugShotElement_lastMove = new WeakMap(), _MugShotElement_lastPos = new WeakMap(), _MugShotElement_jumpy = new WeakMap(), _MugShotElement_social = new WeakMap(), _MugShotElement_dreamy = new WeakMap(), _MugShotElement_reduced = new WeakMap(), _MugShotElement_onMove = new WeakMap(), _MugShotElement_onKey = new WeakMap(), _MugShotElement_onFocus = new WeakMap(), _MugShotElement_onEnter = new WeakMap(), _MugShotElement_instances = new WeakSet(), _MugShotElement_mood_get = function _MugShotElement_mood_get() {
    if (__classPrivateFieldGet(this, _MugShotElement_reacting, "f"))
        return __classPrivateFieldGet(this, _MugShotElement_reacting, "f");
    if (__classPrivateFieldGet(this, _MugShotElement_asleep, "f"))
        return "sleepy";
    return this.getAttribute("mood") || "auto";
}, _MugShotElement_after = function _MugShotElement_after(ms, fn) { __classPrivateFieldGet(this, _MugShotElement_timers, "f").push(setTimeout(fn, ms)); }, _MugShotElement_render = function _MugShotElement_render() {
    const size = Number(this.getAttribute("size") || 120);
    const bubbleKeep = this.shadowRoot.querySelector(".bubble");
    __classPrivateFieldSet(this, _MugShotElement_parts, faceParts(this.getAttribute("seed") || "mugshot", {
        size, mood: __classPrivateFieldGet(this, _MugShotElement_instances, "a", _MugShotElement_mood_get),
        color: this.getAttribute("color") !== "false",
        ink: this.getAttribute("ink") || undefined,
        style: this.getAttribute("look") || undefined,
    }), "f");
    const ink = __classPrivateFieldGet(this, _MugShotElement_parts, "f").ink;
    this.shadowRoot.innerHTML = `<style>
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
    </style><div class="wrap${__classPrivateFieldGet(this, _MugShotElement_asleep, "f") ? " asleep" : ""}">${__classPrivateFieldGet(this, _MugShotElement_parts, "f").svg}</div>`;
    if (bubbleKeep)
        this.shadowRoot.querySelector(".wrap").appendChild(bubbleKeep);
    const svg = this.shadowRoot.querySelector("svg");
    __classPrivateFieldSet(this, _MugShotElement_svg, svg, "f");
    if (__classPrivateFieldGet(this, _MugShotElement_saying, "f"))
        svg.classList.add("talking");
    __classPrivateFieldSet(this, _MugShotElement_pupils, svg.querySelector('[data-mug="pupils"]'), "f");
    __classPrivateFieldSet(this, _MugShotElement_boilPaths, Array.from(svg.querySelectorAll("path")), "f");
    // blink lids
    const { eyes, ink: eyeInk } = __classPrivateFieldGet(this, _MugShotElement_parts, "f");
    const lid = (p) => `<path d="M${p[0] - 2.6} ${p[1]} Q${p[0]} ${p[1] + 1.6} ${p[0] + 2.6} ${p[1]}" stroke="${eyeInk}" stroke-width="1.3" fill="none" stroke-linecap="round"/>`;
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("display", "none");
    g.innerHTML = (eyes.leftOpen ? lid(eyes.left) : "") + (eyes.rightOpen ? lid(eyes.right) : "");
    svg.appendChild(g);
    __classPrivateFieldSet(this, _MugShotElement_lids, g, "f");
    // Zzz
    if (__classPrivateFieldGet(this, _MugShotElement_asleep, "f")) {
        const zg = document.createElementNS("http://www.w3.org/2000/svg", "g");
        zg.innerHTML = [0, 1, 2].map(i => `<text class="z" x="${70 + i * 4}" y="${26 - i * 2}">z</text>`).join("");
        svg.appendChild(zg);
    }
    __classPrivateFieldGet(this, _MugShotElement_instances, "m", _MugShotElement_aim).call(this);
}, _MugShotElement_aim = function _MugShotElement_aim() {
    if (!__classPrivateFieldGet(this, _MugShotElement_pupils, "f") || __classPrivateFieldGet(this, _MugShotElement_asleep, "f"))
        return;
    let target = __classPrivateFieldGet(this, _MugShotElement_glance, "f") ?? __classPrivateFieldGet(this, _MugShotElement_gaze, "f");
    if (!__classPrivateFieldGet(this, _MugShotElement_glance, "f") && __classPrivateFieldGet(this, _MugShotElement_focusEl, "f") && __classPrivateFieldGet(this, _MugShotElement_focusEl, "f").isConnected) {
        const r = __classPrivateFieldGet(this, _MugShotElement_focusEl, "f").getBoundingClientRect();
        target = [r.left + r.width / 2, r.top + r.height / 2];
    }
    if (!target)
        return;
    const r = this.getBoundingClientRect();
    if (!r.width)
        return;
    const dx = target[0] - (r.left + r.width / 2);
    const dy = target[1] - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy) || 1;
    const reach = Math.min(1, len / 80) * 1.4;
    __classPrivateFieldGet(this, _MugShotElement_pupils, "f").setAttribute("transform", `translate(${(dx / len * reach).toFixed(2)} ${(dy / len * reach).toFixed(2)})`);
}, _MugShotElement_blinkOnce = function _MugShotElement_blinkOnce(again = false) {
    if (__classPrivateFieldGet(this, _MugShotElement_asleep, "f") || !__classPrivateFieldGet(this, _MugShotElement_lids, "f") || !__classPrivateFieldGet(this, _MugShotElement_pupils, "f"))
        return;
    __classPrivateFieldGet(this, _MugShotElement_lids, "f").removeAttribute("display");
    __classPrivateFieldGet(this, _MugShotElement_pupils, "f").setAttribute("visibility", "hidden");
    __classPrivateFieldGet(this, _MugShotElement_instances, "m", _MugShotElement_after).call(this, 120, () => {
        __classPrivateFieldGet(this, _MugShotElement_lids, "f")?.setAttribute("display", "none");
        __classPrivateFieldGet(this, _MugShotElement_pupils, "f")?.removeAttribute("visibility");
        if (again)
            __classPrivateFieldGet(this, _MugShotElement_instances, "m", _MugShotElement_after).call(this, 140, () => __classPrivateFieldGet(this, _MugShotElement_instances, "m", _MugShotElement_blinkOnce).call(this, false));
    });
}, _MugShotElement_loopBlink = function _MugShotElement_loopBlink() {
    __classPrivateFieldGet(this, _MugShotElement_instances, "m", _MugShotElement_after).call(this, 1600 + Math.random() * 4600, () => {
        __classPrivateFieldGet(this, _MugShotElement_instances, "m", _MugShotElement_blinkOnce).call(this, Math.random() < __classPrivateFieldGet(this, _MugShotElement_jumpy, "f") * 0.5); // jumpy ones double-blink
        __classPrivateFieldGet(this, _MugShotElement_instances, "m", _MugShotElement_loopBlink).call(this);
    });
}, _MugShotElement_loopGlance = function _MugShotElement_loopGlance() {
    const idleGap = 3200 + (1 - __classPrivateFieldGet(this, _MugShotElement_dreamy, "f")) * 5200;
    __classPrivateFieldGet(this, _MugShotElement_instances, "m", _MugShotElement_after).call(this, idleGap + Math.random() * 3000, () => {
        if (!__classPrivateFieldGet(this, _MugShotElement_asleep, "f") && performance.now() - __classPrivateFieldGet(this, _MugShotElement_lastMove, "f") > 2200) {
            const r = this.getBoundingClientRect();
            const others = [...HERD].filter(o => o !== this && o.isConnected);
            if (others.length && Math.random() < 0.55) {
                const o = others[Math.floor(Math.random() * others.length)];
                const or = o.getBoundingClientRect();
                __classPrivateFieldSet(this, _MugShotElement_glance, [or.left + or.width / 2, or.top + or.height / 2], "f");
            }
            else {
                __classPrivateFieldSet(this, _MugShotElement_glance, [r.left + (Math.random() - 0.5) * 900, r.top + (Math.random() - 0.5) * 700], "f");
            }
            __classPrivateFieldGet(this, _MugShotElement_instances, "m", _MugShotElement_aim).call(this);
            __classPrivateFieldGet(this, _MugShotElement_instances, "m", _MugShotElement_after).call(this, 700 + Math.random() * 900, () => { __classPrivateFieldSet(this, _MugShotElement_glance, null, "f"); __classPrivateFieldGet(this, _MugShotElement_instances, "m", _MugShotElement_aim).call(this); });
        }
        __classPrivateFieldGet(this, _MugShotElement_instances, "m", _MugShotElement_loopGlance).call(this);
    });
}, _MugShotElement_startBoil = function _MugShotElement_startBoil() {
    if (__classPrivateFieldGet(this, _MugShotElement_reduced, "f"))
        return;
    clearInterval(__classPrivateFieldGet(this, _MugShotElement_boilT, "f"));
    __classPrivateFieldSet(this, _MugShotElement_boilT, setInterval(() => {
        const amp = __classPrivateFieldGet(this, _MugShotElement_asleep, "f") ? 0.22 : 0.42;
        for (const p of __classPrivateFieldGet(this, _MugShotElement_boilPaths, "f")) {
            p.setAttribute("transform", `translate(${((Math.random() - 0.5) * 2 * amp).toFixed(2)} ${((Math.random() - 0.5) * 2 * amp).toFixed(2)})`);
        }
    }, __classPrivateFieldGet(this, _MugShotElement_asleep, "f") ? 260 : 130), "f");
}, _MugShotElement_scheduleIdle = function _MugShotElement_scheduleIdle() {
    const ms = Number(this.getAttribute("idle") || 30000);
    if (ms <= 0)
        return;
    __classPrivateFieldGet(this, _MugShotElement_instances, "m", _MugShotElement_after).call(this, ms, () => {
        if (performance.now() - __classPrivateFieldGet(this, _MugShotElement_lastMove, "f") >= ms - 50) {
            __classPrivateFieldSet(this, _MugShotElement_asleep, true, "f");
            __classPrivateFieldGet(this, _MugShotElement_instances, "m", _MugShotElement_render).call(this);
            __classPrivateFieldGet(this, _MugShotElement_instances, "m", _MugShotElement_startBoil).call(this);
        }
        __classPrivateFieldGet(this, _MugShotElement_instances, "m", _MugShotElement_scheduleIdle).call(this);
    });
}, _MugShotElement_wake = function _MugShotElement_wake() {
    if (__classPrivateFieldGet(this, _MugShotElement_asleep, "f")) {
        __classPrivateFieldSet(this, _MugShotElement_asleep, false, "f");
        __classPrivateFieldGet(this, _MugShotElement_instances, "m", _MugShotElement_render).call(this);
        __classPrivateFieldGet(this, _MugShotElement_instances, "m", _MugShotElement_startBoil).call(this);
    }
};
MugShotElement.observedAttributes = ["seed", "mood", "size", "color", "ink", "idle", "look"];
if (typeof customElements !== "undefined" && !customElements.get("mug-shot")) {
    customElements.define("mug-shot", MugShotElement);
}
