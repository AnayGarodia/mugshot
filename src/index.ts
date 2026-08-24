// mugshot — deterministic hand-drawn doodle face avatars.
// face(seed) -> SVG string. Same seed, same face, always.

export interface FaceOptions {
  size?: number;        // px, default 120
  background?: string;  // css color, default "transparent"
  ink?: string;         // stroke color, default near-black
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

// ---------- face ----------

interface Draw { d: string; fill?: boolean; width?: number }

export function face(seed: string, options: FaceOptions = {}): string {
  const size = options.size ?? 120;
  const ink = options.ink ?? "#1c1b1a";
  const bg = options.background ?? "transparent";
  const out: Draw[] = [];
  const dots: string[] = [];

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
    const a = (i / N) * Math.PI * 2 - Math.PI / 2; // start at top
    let rx = hw, ry = hh;
    const s = Math.sin(a); // 1 at bottom, -1 at top
    if (jaw === "square" && s > 0.3) { rx *= 1.08; ry *= 0.92; }
    if (jaw === "pointy" && s > 0.3) { rx *= 1 - (s - 0.3) * 0.22; }
    if (jaw === "wide" && Math.abs(s) < 0.5) { rx *= 1.1; }
    const wobR = 1 + rand(rh, -0.05, 0.05);
    headPts.push([cx + Math.cos(a) * rx * wobR, cy + s * ry * wobR]);
  }
  out.push({ d: inkPath(rh, headPts, { close: true, wobble: 1.4 }) });

  // head-edge x at height y (approx, for ears/hair)
  const edgeX = (y: number) => hw * Math.sqrt(Math.max(0, 1 - ((y - cy) / hh) ** 2));

  // --- pose: turn shifts feature midline ---
  const rp = stream(seed, "pose");
  const turn = chance(rp, 0.55) ? 0 : rand(rp, -1, 1) * pick(rp, [0.4, 0.7]);
  const xf = cx + turn * hw * 0.28;         // feature midline

  // --- ears ---
  const re2 = stream(seed, "ears");
  if (chance(re2, 0.55)) {
    const ey0 = cy + rand(re2, -4, 2);
    for (const s of [-1, 1]) {
      if (turn * s > 0.5) continue; // far ear hidden when turned
      const jawW = (jaw === "wide" && Math.abs((ey0 - cy) / hh) < 0.5) ? 1.1 : jaw === "square" ? 1.04 : 1;
      const ex0 = cx + s * edgeX(ey0) * jawW;
      out.push({ d: inkPath(re2, [[ex0, ey0 - 4], [ex0 + s * 3.5, ey0], [ex0, ey0 + 4]], { wobble: 0.8 }) });
    }
  }

  // --- eyes ---
  const re = stream(seed, "eyes");
  const ey = cy - hh * rand(re, 0.08, 0.22);
  const gap = hw * rand(re, 0.36, 0.5);
  const lx = xf - gap * (1 + turn * 0.25);  // near-side eye spreads, far-side compresses
  const rx2 = xf + gap * (1 - turn * 0.25);
  const hasGlasses = chance(stream(seed, "glasses"), 0.16);
  const kind = hasGlasses ? "dot" : pick(re, ["dot", "dot", "dot", "ring", "wink", "sleepy"]);
  const rEye = rand(re, 1.7, 2.5);
  const drawEye = (x: number, winkThis: boolean) => {
    if (kind === "wink" && winkThis) {
      out.push({ d: line(re, [x - 2.5, ey], [x + 2.5, ey + rand(re, -1, 1)]), width: 1.3 });
    } else if (kind === "ring") {
      out.push({ d: inkPath(re, circlePts(x, ey, rEye + 1.4), { close: true, wobble: 0.5 }), width: 1.2 });
      dots.push(`<circle cx="${x.toFixed(1)}" cy="${ey.toFixed(1)}" r="0.9"/>`);
    } else if (kind === "sleepy") {
      out.push({ d: inkPath(re, [[x - 2.5, ey], [x, ey + 1.6], [x + 2.5, ey]], { wobble: 0.5 }), width: 1.3 });
    } else {
      dots.push(`<circle cx="${x.toFixed(1)}" cy="${(ey + rand(re, -0.8, 0.8)).toFixed(1)}" r="${(rEye + rand(re, -0.2, 0.2)).toFixed(1)}"/>`);
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
    for (const x of [lx, rx2]) {
      out.push({
        d: shape === "round"
          ? inkPath(rg, circlePts(x, ey, gr), { close: true, wobble: 0.7 })
          : inkPath(rg, [[x - gr, ey - gr * 0.8], [x + gr, ey - gr * 0.8], [x + gr, ey + gr * 0.8], [x - gr, ey + gr * 0.8]], { close: true, wobble: 0.7 }),
        width: 1.2,
      });
    }
    out.push({ d: line(rg, [lx + gr, ey], [rx2 - gr, ey]), width: 1.2 });
    out.push({ d: line(rg, [lx - gr, ey], [cx - edgeX(ey), ey - 1]), width: 1.0 });
    out.push({ d: line(rg, [rx2 + gr, ey], [cx + edgeX(ey), ey - 1]), width: 1.0 });
  }

  // --- brows ---
  const rb = stream(seed, "brows");
  if (chance(rb, 0.45)) {
    const by = ey - rand(rb, 4, 7);
    const tilt = rand(rb, -1.5, 1.5);
    const bw = rand(rb, 2.5, 4.5);
    out.push({ d: line(rb, [lx - bw, by + tilt], [lx + bw, by - tilt]), width: rand(rb, 1.2, 2.2) });
    out.push({ d: line(rb, [rx2 - bw, by - tilt * rand(rb, 0.3, 1.5)], [rx2 + bw, by + tilt]), width: rand(rb, 1.2, 2.2) });
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

  // --- mouth ---
  const rm = stream(seed, "mouth");
  if (chance(rm, 0.95)) {
    const my = cy + hh * rand(rm, 0.42, 0.58);
    const mw = rand(rm, 4.5, 9);
    const mk = pick(rm, ["line", "line", "smile", "frown", "o", "smirk"]);
    const mx = xf + rand(rm, -1, 1);
    if (mk === "o") {
      out.push({ d: inkPath(rm, circlePts(mx, my, rand(rm, 1.5, 2.8)), { close: true, wobble: 0.5 }), width: 1.3 });
    } else if (mk === "smirk") {
      out.push({ d: inkPath(rm, [[mx - mw, my], [mx + mw * 0.3, my + 1], [mx + mw, my - rand(rm, 1.5, 3)]], { wobble: 0.6 }) });
    } else {
      const bend = mk === "smile" ? rand(rm, 1.5, 3.5) : mk === "frown" ? rand(rm, -3, -1.5) : rand(rm, -0.7, 0.7);
      out.push({ d: inkPath(rm, [[mx - mw, my], [mx, my + bend], [mx + mw, my + rand(rm, -1, 1)]], { wobble: 0.6 }) });
    }
  }

  // --- facial hair ---
  const rf = stream(seed, "fuzz");
  if (chance(rf, 0.18)) {
    const my = cy + hh * 0.5;
    if (chance(rf, 0.6)) { // mustache
      const muY = cy + hh * 0.38;
      out.push({ d: line(rf, [xf - rand(rf, 4, 7), muY], [xf + rand(rf, 4, 7), muY - 0.5], 1), width: rand(rf, 2, 3) });
    } else { // chin scruff
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
  const hairTopY = (a: number) => cy + Math.sin(a) * hh; // a in radians, -pi/2 = top
  const hairline = cy - hh * rand(rha, 0.22, 0.58);
  if (hairKind === "solid" || hairKind === "cap" || hairKind === "hatch") {
    // Mass hugging the skull from ear to ear, closed along a wavy hairline.
    const pts: Pt[] = [];
    const steps = 8;
    const yl = hairKind === "cap" ? cy - hh * 0.45 : hairline;
    for (let i = 0; i <= steps; i++) {
      const a = Math.PI + (i / steps) * Math.PI;         // left edge over top to right edge
      const px = cx + Math.cos(a) * (hw + 0.5) * rand(rha, 0.98, 1.05);
      pts.push([px, cy - Math.abs(Math.sin(a)) * (hh + rand(rha, 0, 2.5))]);
    }
    // fix endpoints to hairline height, then wavy return across forehead
    pts[0] = [cx - edgeX(yl), yl];
    pts[pts.length - 1] = [cx + edgeX(yl), yl];
    const back: Pt[] = [];
    const seg = pick(rha, [3, 4, 5]);
    const dip = pick(rha, [0, 0, 1, -1]); // side part dips one side
    for (let i = seg - 1; i >= 1; i--) {
      const t = i / seg;
      const bx = cx - edgeX(yl) + t * 2 * edgeX(yl);
      const wave = rand(rha, -2.5, 2.5) + (dip !== 0 ? Math.sin(t * Math.PI) * dip * ((bx - cx) / hw) * 5 : 0);
      back.push([bx, yl + 3 + wave]);
    }
    const hairD = inkPath(rha, [...pts, ...back.reverse()], { close: true, wobble: 1.2 });
    if (hairKind === "hatch") {
      out.push({ d: hairD, width: 1.4 });
      hatchClip = hairD;
      const ang = pick(rha, [-1, 1]) * rand(rha, 0.5, 1.1); // slope
      for (let hx = cx - hw - 6; hx < cx + hw + 6; hx += rand(rha, 2.2, 3.4)) {
        hatchLines.push(line(rha, [hx, cy - hh - 8], [hx + ang * 22, cy - hh * 0.2], 0.4));
      }
    } else {
      out.push({ d: hairD, fill: true });
    }
    if (hairKind === "cap") { // brim
      const by = yl + 2;
      const bs = turn >= 0 ? 1 : -1;
      out.push({ d: line(rha, [cx + bs * edgeX(by), by], [cx + bs * (edgeX(by) + rand(rha, 5, 9)), by + rand(rha, 0, 2)], 1), width: 2 });
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
      out.push({ d: line(rha, [bx, by], [ex2, ey2], 0.4), width: 1.5 });
    }
  } else if (hairKind === "curls") {
    const nC = Math.floor(rand(rha, 8, 12));
    for (let i = 0; i < nC; i++) {
      const a = Math.PI + ((i + 0.5) / nC) * Math.PI;
      const rr = rand(rha, 3, 4.5);
      const bx = cx + Math.cos(a) * (hw - rr * 0.3) * 1.02;
      const by = cy - Math.abs(Math.sin(a)) * (hh - rr * 0.3) * 1.05;
      out.push({ d: inkPath(rha, circlePts(bx, by, rr), { close: true, wobble: 0.45 }), width: 1.25 });
    }
  } else if (hairKind === "wisps") {
    for (let i = 0; i < 3; i++) {
      const bx = cx + rand(rha, -8, 8);
      const by = cy - hh * 1.0;
      out.push({ d: inkPath(rha, [[bx, by + 2], [bx + rand(rha, -2, 2), by - rand(rha, 3, 6)], [bx + rand(rha, -4, 4), by - rand(rha, 5, 9)]], { wobble: 0.5 }), width: 1.1 });
    }
  } // bald: nothing

  // ---------- assemble ----------
  const S = 100;
  const strokeW = rand(stream(seed, "pen"), 1.4, 1.8);
  const body = out.map(p =>
    `<path d="${p.d}" fill="${p.fill ? ink : "none"}" stroke="${ink}" stroke-width="${(p.width ?? strokeW).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>`
  ).join("");
  const clipId = "mug" + (xmur3(seed)() >>> 0).toString(36);
  const hatch = hatchClip
    ? `<clipPath id="${clipId}"><path d="${hatchClip}"/></clipPath><g clip-path="url(#${clipId})" stroke="${ink}" stroke-width="1.1" fill="none">${hatchLines.map(d => `<path d="${d}"/>`).join("")}</g>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${size}" height="${size}">` +
    (bg !== "transparent" ? `<rect width="${S}" height="${S}" fill="${bg}"/>` : "") +
    body + hatch + `<g fill="${ink}">${dots.join("")}</g></svg>`;
}

function circlePts(cx: number, cy: number, r: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}
