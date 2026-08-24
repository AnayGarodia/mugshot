// mugshot — deterministic hand-drawn doodle face avatars.
// face(seed) -> SVG string. Same seed, same face, always.

export type Mood = "auto" | "happy" | "sad" | "grumpy" | "sleepy" | "surprised" | "wink" | "calm";

export interface FaceOptions {
  size?: number;        // px, default 120
  background?: string;  // css color, default "transparent"
  ink?: string;         // force a single stroke color (disables auto palette)
  color?: boolean;      // false = classic black ink, default true
  mood?: Mood;          // override the expression, identity stays put
  paper?: string;       // fill the head with this color (for overlapping scenes)
}

type Rng = () => number; // [0,1)
type Pt = [number, number];

// ---------- seeded randomness ----------

function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function mulberry32(a: number): Rng {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Independent sub-stream per feature: tweaking one feature's draws
// never reshuffles the others.
function stream(seed: string, feature: string): Rng {
  return mulberry32(xmur3(seed + ":" + feature)());
}

/** Deterministic per-seed random stream, for building on top of mugshot. */
export function seededRng(seed: string, tag = ""): () => number {
  return stream(seed, tag);
}

const pick = <T,>(r: Rng, arr: T[]): T => arr[Math.floor(r() * arr.length)];
const rand = (r: Rng, a: number, b: number) => a + r() * (b - a);
const chance = (r: Rng, p: number) => r() < p;

// ---------- ink primitives ----------

// Jitter points, then Catmull-Rom -> cubic bezier for a smooth wobbly line.
function inkPath(r: Rng, pts: Pt[], opts: { close?: boolean; wobble?: number } = {}): string {
  const wob = opts.wobble ?? 1.1;
  const j: Pt[] = pts.map(([x, y]) => [x + rand(r, -wob, wob), y + rand(r, -wob, wob)]);
  if (j.length === 2) {
    return `M${j[0][0].toFixed(1)} ${j[0][1].toFixed(1)} L${j[1][0].toFixed(1)} ${j[1][1].toFixed(1)}`;
  }
  const p = opts.close ? [j[j.length - 1], ...j, j[0], j[1]] : [j[0], ...j, j[j.length - 1]];
  let d = `M${p[1][0].toFixed(1)} ${p[1][1].toFixed(1)}`;
  for (let i = 1; i < p.length - 2; i++) {
    const p0 = p[i - 1], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  if (opts.close) d += " Z";
  return d;
}

function line(r: Rng, a: Pt, b: Pt, wobble = 0.8): string {
  const mid: Pt = [(a[0] + b[0]) / 2 + rand(r, -1, 1), (a[1] + b[1]) / 2 + rand(r, -1, 1)];
  return inkPath(r, [a, mid, b], { wobble });
}

function circlePts(cx: number, cy: number, r: number, n = 8): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

// ---------- palette ----------

const INKS = ["#1c1b1a", "#1c1b1a", "#1c1b1a", "#1c1b1a", "#2b3a67", "#4a3426", "#2f4a3c"];
const ACCENTS = ["#b5563f", "#3f5d9e", "#6f8f6a", "#c98a2d", "#8a5a83"];
const BLUSH = "#d98973";

// ---------- face ----------

interface Draw { d: string; fill?: string; stroke?: string; width?: number; opacity?: number; tag?: string }

export interface FaceParts {
  svg: string;
  ink: string;
  accent: string;
  eyes: { left: Pt; right: Pt; r: number; leftOpen: boolean; rightOpen: boolean };
}

export function face(seed: string, options: FaceOptions = {}): string {
  return build(seed, options).svg;
}

// Everything a component needs to animate a face: eye geometry + tagged pupil group.
export function faceParts(seed: string, options: FaceOptions = {}): FaceParts {
  return build(seed, options);
}

function build(seed: string, options: FaceOptions = {}): FaceParts {
  const size = options.size ?? 120;
  const colorOn = options.color !== false && !options.ink;
  const rpal = stream(seed, "palette");
  const ink = options.ink ?? (colorOn ? pick(rpal, INKS) : "#1c1b1a");
  const accent = colorOn ? pick(rpal, ACCENTS) : ink;
  const mood: Mood = options.mood ?? "auto";
  const bg = options.background ?? "transparent";
  const out: Draw[] = [];
  const dots: string[] = [];
  const pupils: string[] = [];

  // --- head ---
  const rh = stream(seed, "head");
  const hw = rand(rh, 24, 33);              // half width
  const hh = rand(rh, 28, 38);              // half height
  const cx = 50 + rand(rh, -1.5, 1.5);
  const cy = 54 + rand(rh, -2, 2);
  let jaw = pick(rh, ["round", "round", "square", "pointy", "wide"]);
  if (jaw === "pointy" && hw < 27) jaw = "round";
  const headPts: Pt[] = [];
  const N = 10;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2;
    let rx = hw;
    const s = Math.sin(a);
    if (jaw === "square" && s > 0.3) { rx *= 1.08; }
    if (jaw === "pointy" && s > 0.3) { rx *= 1 - (s - 0.3) * 0.22; }
    if (jaw === "wide" && Math.abs(s) < 0.5) { rx *= 1.1; }
    const wobR = 1 + rand(rh, -0.05, 0.05);
    headPts.push([cx + Math.cos(a) * rx * wobR, cy + s * hh * wobR]);
  }
  out.push({ d: inkPath(rh, headPts, { close: true, wobble: 1.4 }), fill: options.paper });

  const edgeX = (y: number) => hw * Math.sqrt(Math.max(0, 1 - ((y - cy) / hh) ** 2));

  // --- pose ---
  const rp = stream(seed, "pose");
  const turn = chance(rp, 0.55) ? 0 : rand(rp, -1, 1) * pick(rp, [0.4, 0.7]);
  const xf = cx + turn * hw * 0.28;

  // --- mood -> expression controls ---
  const rmood = stream(seed, "mood");
  const autoMood = pick(rmood, ["calm", "calm", "happy", "happy", "grumpy", "sleepy", "surprised", "wink"]);
  const m: Exclude<Mood, "auto"> = mood === "auto" ? (autoMood as Exclude<Mood, "auto">) : mood;

  // --- ears ---
  const re2 = stream(seed, "ears");
  const hasEars = chance(re2, 0.55);
  const earY = cy + rand(re2, -4, 2);
  if (hasEars) {
    for (const s of [-1, 1]) {
      if (turn * s > 0.5) continue;
      const jawW = (jaw === "wide" && Math.abs((earY - cy) / hh) < 0.5) ? 1.1 : jaw === "square" ? 1.04 : 1;
      const ex0 = cx + s * edgeX(earY) * jawW;
      out.push({ d: inkPath(re2, [[ex0, earY - 4], [ex0 + s * 3.5, earY], [ex0, earY + 4]], { wobble: 0.8 }) });
    }
  }

  // --- eyes ---
  const re = stream(seed, "eyes");
  const ey = cy - hh * rand(re, 0.08, 0.22);
  const gap = hw * rand(re, 0.36, 0.5);
  const lx = xf - gap * (1 + turn * 0.25);
  const rx2 = xf + gap * (1 - turn * 0.25);
  const hasGlasses = chance(stream(seed, "glasses"), 0.16);
  const seedEye = pick(re, ["dot", "dot", "dot", "ring", "dot", "dot"]);
  const kind =
    m === "sleepy" ? "sleepy" :
    m === "surprised" ? "ring" :
    m === "wink" ? "wink" :
    hasGlasses ? "dot" : seedEye;
  const rEye = rand(re, 1.7, 2.5) * (m === "surprised" ? 1.25 : 1);
  const drawEye = (x: number, winkThis: boolean) => {
    if (kind === "wink" && winkThis) {
      out.push({ d: line(re, [x - 2.5, ey], [x + 2.5, ey + rand(re, -1, 1)]), width: 1.3 });
    } else if (kind === "ring") {
      out.push({ d: inkPath(re, circlePts(x, ey, rEye + 1.4), { close: true, wobble: 0.5 }), width: 1.2 });
      pupils.push(`<circle cx="${x.toFixed(1)}" cy="${ey.toFixed(1)}" r="0.9"/>`);
    } else if (kind === "sleepy") {
      out.push({ d: inkPath(re, [[x - 2.5, ey], [x, ey + 1.6], [x + 2.5, ey]], { wobble: 0.5 }), width: 1.3 });
    } else {
      pupils.push(`<circle cx="${x.toFixed(1)}" cy="${(ey + rand(re, -0.8, 0.8)).toFixed(1)}" r="${(rEye + rand(re, -0.2, 0.2)).toFixed(1)}"/>`);
    }
  };
  const winkSide = chance(re, 0.5);
  drawEye(lx, winkSide);
  drawEye(rx2, !winkSide);

  // glasses
  const rg = stream(seed, "glasses");
  if (chance(rg, 0.16)) { // same first draw as hasGlasses above
    const gr = gap * 0.62;
    const shape = pick(rg, ["round", "square"]);
    const gInk = colorOn && chance(rg, 0.3) ? accent : ink;
    for (const x of [lx, rx2]) {
      out.push({
        d: shape === "round"
          ? inkPath(rg, circlePts(x, ey, gr), { close: true, wobble: 0.7 })
          : inkPath(rg, [[x - gr, ey - gr * 0.8], [x + gr, ey - gr * 0.8], [x + gr, ey + gr * 0.8], [x - gr, ey + gr * 0.8]], { close: true, wobble: 0.7 }),
        width: 1.2, stroke: gInk,
      });
    }
    out.push({ d: line(rg, [lx + gr, ey], [rx2 - gr, ey]), width: 1.2, stroke: gInk });
    out.push({ d: line(rg, [lx - gr, ey], [cx - edgeX(ey), ey - 1]), width: 1.0, stroke: gInk });
    out.push({ d: line(rg, [rx2 + gr, ey], [cx + edgeX(ey), ey - 1]), width: 1.0, stroke: gInk });
  }

  // --- brows ---
  const rb = stream(seed, "brows");
  const browBase = chance(rb, 0.45);
  const showBrows = m === "grumpy" || m === "sad" || m === "surprised" ? true : browBase;
  if (showBrows) {
    const lift = m === "surprised" ? 3.5 : 0;
    const by = ey - rand(rb, 4, 7) - lift;
    const seedTilt = rand(rb, -1.5, 1.5);
    // tilt: + = inner ends down (grumpy), - = inner ends up (sad)
    const tilt = m === "grumpy" ? rand(rb, 1.6, 2.6) : m === "sad" ? rand(rb, -2.4, -1.4) : m === "surprised" ? 0 : seedTilt;
    const bw = rand(rb, 2.5, 4.5);
    const w = m === "grumpy" ? rand(rb, 1.8, 2.6) : rand(rb, 1.2, 2.2);
    const uni = m !== "surprised" && chance(rb, 0.06);
    if (uni) {
      out.push({ d: line(rb, [lx - bw, by], [rx2 + bw, by + rand(rb, -1, 1)], 1), width: 2.4 });
    } else {
      out.push({ d: line(rb, [lx - bw, by - tilt], [lx + bw, by + tilt]), width: w });
      out.push({ d: line(rb, [rx2 - bw, by + tilt], [rx2 + bw, by - tilt]), width: w });
    }
  }

  // --- nose ---
  const rn = stream(seed, "nose");
  if (chance(rn, 0.92)) {
    const ny = ey + rand(rn, 3, 5);
    const nl = rand(rn, 6, 11);
    const dir = turn !== 0 ? Math.sign(turn) : (chance(rn, 0.5) ? 1 : -1);
    const nk = pick(rn, ["l", "l", "curve", "long"]);
    if (nk === "l") {
      out.push({ d: inkPath(rn, [[xf + dir * rand(rn, -1, 1), ny], [xf + dir * rand(rn, 0, 2), ny + nl], [xf + dir * rand(rn, 3, 5.5), ny + nl + rand(rn, -1, 1.5)]], { wobble: 0.7 }) });
    } else if (nk === "curve") {
      out.push({ d: inkPath(rn, [[xf - dir, ny], [xf + dir * 2.5, ny + nl * 0.6], [xf + dir * 1.5, ny + nl], [xf - dir * 1.5, ny + nl + 1]], { wobble: 0.7 }) });
    } else {
      out.push({ d: inkPath(rn, [[xf, ny - 1], [xf + dir * rand(rn, 1, 3), ny + nl + 2], [xf + dir * rand(rn, 2, 4), ny + nl + 3]], { wobble: 0.7 }) });
    }
  }

  // --- cheeks: blush / freckles ---
  const rc = stream(seed, "cheeks");
  const chY = ey + hh * 0.28;
  if (chance(rc, colorOn ? 0.3 : 0.12)) { // blush
    for (const s of [-1, 1]) {
      if (turn * s > 0.5) continue;
      const bx = xf + s * gap * 1.15;
      const pts: Pt[] = [];
      for (let i = 0; i < 3; i++) pts.push([bx - 3 + rand(rc, -1, 1), chY + i * 1.4], [bx + 3 + rand(rc, -1, 1), chY + i * 1.4 + 0.7]);
      out.push({ d: inkPath(rc, pts, { wobble: 0.5 }), width: 1, stroke: colorOn ? BLUSH : ink, opacity: colorOn ? 0.75 : 0.35 });
    }
  } else if (chance(rc, 0.16)) { // freckles
    for (let i = 0; i < Math.floor(rand(rc, 4, 8)); i++) {
      const s = chance(rc, 0.5) ? -1 : 1;
      dots.push(`<circle cx="${(xf + s * rand(rc, 4, gap * 1.2)).toFixed(1)}" cy="${(chY + rand(rc, -2, 3)).toFixed(1)}" r="0.55" opacity="0.6"/>`);
    }
  }

  // --- mouth ---
  const rm = stream(seed, "mouth");
  const my = cy + hh * rand(rm, 0.42, 0.58);
  const mw = rand(rm, 4.5, 9);
  const seedMouth = pick(rm, ["line", "line", "smile", "frown", "o", "smirk"]);
  const mk =
    m === "happy" ? "smile" :
    m === "sad" || m === "grumpy" ? (chance(rm, 0.4) ? "line" : "frown") :
    m === "surprised" ? "o" :
    m === "wink" ? "smirk" :
    m === "sleepy" ? (chance(rm, 0.5) ? "line" : "o") :
    seedMouth;
  const mx = xf + rand(rm, -1, 1);
  if (mk === "o") {
    const orr = m === "surprised" ? rand(rm, 2.4, 3.6) : rand(rm, 1.5, 2.8);
    out.push({ tag: "mouth", d: inkPath(rm, circlePts(mx, my, orr), { close: true, wobble: 0.5 }), width: 1.3 });
  } else if (mk === "smirk") {
    out.push({ tag: "mouth", d: inkPath(rm, [[mx - mw, my], [mx + mw * 0.3, my + 1], [mx + mw, my - rand(rm, 1.5, 3)]], { wobble: 0.6 }) });
  } else if (mk === "smile" && chance(rm, m === "happy" ? 0.35 : 0.12)) { // toothy grin
    const gw = mw * 1.1, gh = rand(rm, 3, 4.5);
    out.push({ tag: "mouth", d: inkPath(rm, [[mx - gw, my], [mx, my + gh], [mx + gw, my]], { close: true, wobble: 0.7 }), width: 1.2 });
    out.push({ tag: "mouth", d: line(rm, [mx - gw * 0.8, my + gh * 0.45], [mx + gw * 0.8, my + gh * 0.45], 0.4), width: 0.9 });
  } else {
    const bend =
      mk === "smile" ? rand(rm, 2, 4) * (m === "happy" ? 1.3 : 1) :
      mk === "frown" ? rand(rm, -3.5, -1.5) :
      rand(rm, -0.7, 0.7);
    out.push({ tag: "mouth", d: inkPath(rm, [[mx - mw, my], [mx, my + bend], [mx + mw, my + rand(rm, -1, 1)]], { wobble: 0.6 }) });
  }

  // --- facial hair ---
  const rf = stream(seed, "fuzz");
  if (chance(rf, 0.18)) {
    if (chance(rf, 0.6)) {
      const muY = cy + hh * 0.38;
      out.push({ d: line(rf, [xf - rand(rf, 4, 7), muY], [xf + rand(rf, 4, 7), muY - 0.5], 1), width: rand(rf, 2, 3) });
    } else {
      const chinY = cy + hh * 0.86;
      for (let i = 0; i < 5; i++) {
        const sx = xf + rand(rf, -6, 6);
        out.push({ d: line(rf, [sx, chinY + rand(rf, -1, 1)], [sx + rand(rf, -1, 1), chinY + rand(rf, 2.5, 4)], 0.4), width: 1 });
      }
    }
  }

  // --- hair ---
  let hatchClip = "";
  const hatchLines: string[] = [];
  const rha = stream(seed, "hair");
  const hairKind = pick(rha, ["solid", "solid", "hatch", "spiky", "curls", "cap", "bald", "wisps"]);
  const hairInk = colorOn && chance(rha, hairKind === "cap" ? 0.55 : 0.25) ? accent : ink;
  const hairline = cy - hh * rand(rha, 0.22, 0.58);
  if (hairKind === "solid" || hairKind === "cap" || hairKind === "hatch") {
    const pts: Pt[] = [];
    const steps = 8;
    const yl = hairKind === "cap" ? cy - hh * 0.45 : hairline;
    for (let i = 0; i <= steps; i++) {
      const a = Math.PI + (i / steps) * Math.PI;
      const px = cx + Math.cos(a) * (hw + 0.5) * rand(rha, 0.98, 1.05);
      pts.push([px, cy - Math.abs(Math.sin(a)) * (hh + rand(rha, 0, 2.5))]);
    }
    pts[0] = [cx - edgeX(yl), yl];
    pts[pts.length - 1] = [cx + edgeX(yl), yl];
    const back: Pt[] = [];
    const seg = pick(rha, [3, 4, 5]);
    const dip = pick(rha, [0, 0, 1, -1]);
    for (let i = seg - 1; i >= 1; i--) {
      const t = i / seg;
      const bx = cx - edgeX(yl) + t * 2 * edgeX(yl);
      const wave = rand(rha, -2.5, 2.5) + (dip !== 0 ? Math.sin(t * Math.PI) * dip * ((bx - cx) / hw) * 5 : 0);
      back.push([bx, yl + 3 + wave]);
    }
    const hairD = inkPath(rha, [...pts, ...back.reverse()], { close: true, wobble: 1.2 });
    if (hairKind === "hatch") {
      out.push({ d: hairD, width: 1.4, stroke: hairInk });
      hatchClip = hairD;
      const ang = pick(rha, [-1, 1]) * rand(rha, 0.5, 1.1);
      for (let hx = cx - hw - 6; hx < cx + hw + 6; hx += rand(rha, 2.2, 3.4)) {
        hatchLines.push(line(rha, [hx, cy - hh - 8], [hx + ang * 22, cy - hh * 0.2], 0.4));
      }
    } else {
      out.push({ d: hairD, fill: hairInk, stroke: hairInk });
    }
    if (hairKind === "cap") {
      const by = yl + 2;
      const bs = turn >= 0 ? 1 : -1;
      out.push({ d: line(rha, [cx + bs * edgeX(by), by], [cx + bs * (edgeX(by) + rand(rha, 5, 9)), by + rand(rha, 0, 2)], 1), width: 2, stroke: hairInk });
    }
  } else if (hairKind === "spiky") {
    const nSpikes = Math.floor(rand(rha, 6, 10));
    for (let i = 0; i < nSpikes; i++) {
      const a = Math.PI + ((i + 0.5) / nSpikes) * Math.PI;
      const bx = cx + Math.cos(a) * hw * 0.97;
      const by = cy - Math.abs(Math.sin(a)) * hh * 0.97;
      const len = rand(rha, 4, 9);
      const ex2 = bx + Math.cos(a) * len * 0.9 + rand(rha, -1.5, 1.5);
      const ey2 = by - Math.abs(Math.sin(a)) * len - rand(rha, 0, 2);
      out.push({ d: line(rha, [bx, by], [ex2, ey2], 0.4), width: 1.5, stroke: hairInk });
    }
  } else if (hairKind === "curls") {
    const nC = Math.floor(rand(rha, 8, 12));
    for (let i = 0; i < nC; i++) {
      const a = Math.PI + ((i + 0.5) / nC) * Math.PI;
      const rr = rand(rha, 3, 4.5);
      const bx = cx + Math.cos(a) * (hw - rr * 0.3) * 1.02;
      const by = cy - Math.abs(Math.sin(a)) * (hh - rr * 0.3) * 1.05;
      out.push({ d: inkPath(rha, circlePts(bx, by, rr), { close: true, wobble: 0.45 }), width: 1.25, stroke: hairInk });
    }
  } else if (hairKind === "wisps") {
    for (let i = 0; i < 3; i++) {
      const bx = cx + rand(rha, -8, 8);
      const by = cy - hh * 1.0;
      out.push({ d: inkPath(rha, [[bx, by + 2], [bx + rand(rha, -2, 2), by - rand(rha, 3, 6)], [bx + rand(rha, -4, 4), by - rand(rha, 5, 9)]], { wobble: 0.5 }), width: 1.1, stroke: hairInk });
    }
  } // bald: nothing

  // --- extras: headphones, top hat, earring ---
  const rx3 = stream(seed, "extras");
  const extra = pick(rx3, ["none", "none", "none", "none", "none", "none", "headphones", "tophat", "earring"]);
  if (extra === "headphones" && hairKind !== "cap") {
    const hInk = colorOn ? accent : ink;
    const bandPts: Pt[] = [];
    for (let i = 0; i <= 6; i++) {
      const a = Math.PI + (i / 6) * Math.PI;
      bandPts.push([cx + Math.cos(a) * (hw + 3), cy - Math.abs(Math.sin(a)) * (hh + 3.5)]);
    }
    out.push({ d: inkPath(rx3, bandPts, { wobble: 0.8 }), width: 2, stroke: hInk });
    for (const s of [-1, 1]) {
      const px = cx + s * edgeX(earY);
      out.push({ d: inkPath(rx3, circlePts(px, earY, 3.6, 8), { close: true, wobble: 0.5 }), fill: hInk, stroke: hInk });
    }
  } else if (extra === "tophat" && (hairKind === "bald" || hairKind === "wisps" || hairKind === "spiky")) {
    const hInk = colorOn && chance(rx3, 0.4) ? accent : ink;
    const topY = cy - hh - 1;
    const bw2 = hw * rand(rx3, 0.55, 0.68), ht = rand(rx3, 14, 20);
    out.push({ d: inkPath(rx3, [[cx - bw2, topY + 2], [cx - bw2 + rand(rx3, -1.5, 1.5), topY - ht], [cx + bw2 + rand(rx3, -1.5, 1.5), topY - ht], [cx + bw2, topY + 2]], { close: true, wobble: 0.9 }), fill: hInk, stroke: hInk });
    out.push({ d: line(rx3, [cx - bw2 - rand(rx3, 4, 7), topY + 3], [cx + bw2 + rand(rx3, 4, 7), topY + 2.5], 0.8), width: 2, stroke: hInk });
  } else if (extra === "earring" && hasEars) {
    const s = turn > 0.5 ? -1 : turn < -0.5 ? 1 : (chance(rx3, 0.5) ? -1 : 1);
    const px = cx + s * edgeX(earY);
    dots.push(`<circle cx="${(px + s * 1.2).toFixed(1)}" cy="${(earY + 5.6).toFixed(1)}" r="1.1"${colorOn ? ` fill="${accent}"` : ""}/>`);
  }

  // ---------- assemble ----------
  const S = 100;
  const strokeW = rand(stream(seed, "pen"), 1.4, 1.8);
  let body = "";
  let openTag: string | undefined;
  for (const p of out) {
    if (p.tag !== openTag) {
      if (openTag) body += "</g>";
      if (p.tag) body += `<g data-mug="${p.tag}">`;
      openTag = p.tag;
    }
    body += `<path d="${p.d}" fill="${p.fill ?? "none"}" stroke="${p.stroke ?? ink}" stroke-width="${(p.width ?? strokeW).toFixed(2)}"${p.opacity ? ` opacity="${p.opacity}"` : ""} stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  if (openTag) body += "</g>";
  const clipId = "mug" + (xmur3(seed)() >>> 0).toString(36);
  const hatch = hatchClip
    ? `<clipPath id="${clipId}"><path d="${hatchClip}"/></clipPath><g clip-path="url(#${clipId})" stroke="${out.find(o => o.d === hatchClip)?.stroke ?? ink}" stroke-width="1.1" fill="none">${hatchLines.map(d => `<path d="${d}"/>`).join("")}</g>`
    : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${size}" height="${size}">` +
    (bg !== "transparent" ? `<rect width="${S}" height="${S}" fill="${bg}"/>` : "") +
    body + hatch +
    `<g fill="${ink}">${dots.join("")}</g>` +
    `<g data-mug="pupils" fill="${ink}">${pupils.join("")}</g></svg>`;
  return {
    svg, ink, accent,
    eyes: {
      left: [lx, ey], right: [rx2, ey], r: rEye,
      leftOpen: kind !== "sleepy" && !(kind === "wink" && winkSide),
      rightOpen: kind !== "sleepy" && !(kind === "wink" && !winkSide),
    },
  };
}
