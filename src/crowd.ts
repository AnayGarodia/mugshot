// crowd(seeds) -> one SVG of whole-body doodle people standing together.
// Each seed keeps the exact face it has as an avatar.
import { faceParts, seededRng, type FaceOptions } from "./index.js";

type Pt = [number, number];
type Rng = () => number;

const rand = (r: Rng, a: number, b: number) => a + r() * (b - a);
const pick = <T,>(r: Rng, arr: T[]): T => arr[Math.floor(r() * arr.length)];
const chance = (r: Rng, p: number) => r() < p;

function wob(r: Rng, pts: Pt[], close = false, w = 1.1): string {
  const j: Pt[] = pts.map(([x, y]) => [x + rand(r, -w, w), y + rand(r, -w, w)]);
  if (j.length === 2) return `M${j[0][0].toFixed(1)} ${j[0][1].toFixed(1)} L${j[1][0].toFixed(1)} ${j[1][1].toFixed(1)}`;
  const p = close ? [j[j.length - 1], ...j, j[0], j[1]] : [j[0], ...j, j[j.length - 1]];
  let d = `M${p[1][0].toFixed(1)} ${p[1][1].toFixed(1)}`;
  for (let i = 1; i < p.length - 2; i++) {
    const p0 = p[i - 1], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2];
    d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return close ? d + " Z" : d;
}

export interface CrowdOptions extends Pick<FaceOptions, "color" | "background"> {
  paper?: string;    // body/head fill so rows occlude, default "#f4f1ea"
  width?: number;    // px, default computed
}

// One person in a 110 x 190 local box, feet on y=178. Stubby doodle
// proportions: the head is nearly half the character.
function person(seed: string, colorOn: boolean, paper = "#f4f1ea"): string {
  const fp = faceParts(seed, { color: colorOn, size: 100, paper });
  const ink = fp.ink, accent = colorOn ? fp.accent : ink;
  const rb = seededRng(seed, "body");
  const P: string[] = [];
  const path = (d: string, o: { fill?: string; w?: number; op?: number } = {}) =>
    P.push(`<path d="${d}" fill="${o.fill ?? "none"}" stroke="${ink}" stroke-width="${o.w ?? 1.6}"${o.op ? ` opacity="${o.op}"` : ""} stroke-linecap="round" stroke-linejoin="round"/>`);

  const cxp = 55;
  const build = rand(rb, 0.9, 1.2);
  const half = 15 * build;                       // torso half-width
  const shY = 94, hipY = 146 + rand(rb, 0, 5);   // shoulders / hips
  const legY = 176;

  // ground scribble
  path(wob(rb, [[cxp - 18, 182], [cxp - 4, 183.5], [cxp + 9, 182], [cxp + 19, 183]], false, 0.6), { w: 1, op: 0.3 });

  // legs + feet (short, slightly splayed) — drawn before the torso/dress
  const spread = rand(rb, 4, 7);
  path(wob(rb, [[cxp - spread, hipY - 2], [cxp - spread - rand(rb, 0, 2), legY]], false, 0.6), { w: 1.8 });
  path(wob(rb, [[cxp + spread, hipY - 2], [cxp + spread + rand(rb, 0, 2), legY]], false, 0.6), { w: 1.8 });
  path(wob(rb, [[cxp - spread - 1, legY], [cxp - spread - 8, legY + 1.5]], false, 0.4), { w: 1.6 });
  path(wob(rb, [[cxp + spread + 1, legY], [cxp + spread + 8, legY + 1.5]], false, 0.4), { w: 1.6 });

  // torso: soft sack (or a dress), rounded at the hips
  const isDress = fp.style === "fem" && chance(rb, 0.55);
  const style = pick(rb, ["plain", "plain", "fill", "stripes", "fill"]);
  const torso = isDress
    ? wob(rb, [
        [cxp - half * 0.6, shY], [cxp - half * 0.75, shY + 16], [cxp - half * 1.35, hipY + 4],
        [cxp + half * 1.35, hipY + 4], [cxp + half * 0.75, shY + 16], [cxp + half * 0.6, shY],
      ], true, 1.1)
    : wob(rb, [
        [cxp - half * 0.7, shY], [cxp - half, shY + 14], [cxp - half * 0.95, hipY - 8],
        [cxp - half * 0.6, hipY], [cxp + half * 0.6, hipY], [cxp + half * 0.95, hipY - 8],
        [cxp + half, shY + 14], [cxp + half * 0.7, shY],
      ], true, 1.1);
  path(torso, { fill: style === "fill" ? accent : paper });
  if (style === "stripes") {
    for (let y = shY + 10; y < hipY - 5; y += rand(rb, 6.5, 9)) {
      path(wob(rb, [[cxp - half * 0.92, y], [cxp, y + rand(rb, -1, 1)], [cxp + half * 0.92, y]], false, 0.5), { w: 1.2 });
    }
  }

  // arms: short and stubby, from the shoulder curve
  const pose = pick(rb, ["down", "down", "wave", "pockets", "crossed", "coffee", "point", "hips", "phone"]);
  const shL: Pt = [cxp - half * 0.9, shY + 8], shR: Pt = [cxp + half * 0.9, shY + 8];
  const mitt = (x: number, y: number) => P.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6" fill="none" stroke="${ink}" stroke-width="1.4"/>`);
  const armDown = (sh: Pt, dir: number) => {
    const hx = sh[0] + dir * rand(rb, 4, 6), hy = hipY - rand(rb, 4, 9);
    path(wob(rb, [sh, [sh[0] + dir * rand(rb, 3, 5), (shY + hipY) / 2 + 2], [hx, hy]], false, 0.6), { w: 1.7 });
    mitt(hx + dir * 1.5, hy + 2);
  };
  if (pose === "down") { armDown(shL, -1); armDown(shR, 1); }
  else if (pose === "wave") {
    armDown(shL, -1);
    const hx = shR[0] + rand(rb, 10, 14), hy = shY - rand(rb, 14, 20);
    path(wob(rb, [shR, [shR[0] + rand(rb, 7, 9), shY - 4], [hx, hy]], false, 0.7), { w: 1.7 });
    mitt(hx + 1, hy - 2.5);
  } else if (pose === "pockets") {
    path(wob(rb, [shL, [shL[0] - 5, shY + 14], [cxp - half * 0.6, shY + 26]], false, 0.6), { w: 1.7 });
    path(wob(rb, [shR, [shR[0] + 5, shY + 14], [cxp + half * 0.6, shY + 26]], false, 0.6), { w: 1.7 });
  } else if (pose === "crossed") {
    path(wob(rb, [shL, [shL[0] - 2, shY + 14], [cxp + 3, shY + 19], [shR[0] - 4, shY + 17]], false, 0.6), { w: 1.7 });
    path(wob(rb, [shR, [shR[0] + 2, shY + 20], [cxp - 3, shY + 26], [shL[0] + 4, shY + 24]], false, 0.6), { w: 1.7 });
  } else if (pose === "point") {
    armDown(shL, -1);
    const hx = shR[0] + rand(rb, 16, 20), hy = shY + rand(rb, -4, 2);
    path(wob(rb, [shR, [shR[0] + 9, shY + 2], [hx, hy]], false, 0.6), { w: 1.7 });
    path(wob(rb, [[hx, hy], [hx + 4.5, hy - 1.5]], false, 0.3), { w: 1.4 });
  } else if (pose === "hips") {
    path(wob(rb, [shL, [shL[0] - rand(rb, 7, 9), shY + 15], [cxp - half * 0.8, shY + 28]], false, 0.6), { w: 1.7 });
    path(wob(rb, [shR, [shR[0] + rand(rb, 7, 9), shY + 15], [cxp + half * 0.8, shY + 28]], false, 0.6), { w: 1.7 });
  } else if (pose === "phone") {
    armDown(shL, -1);
    const px2 = shR[0] + rand(rb, 3, 5), py2 = shY - rand(rb, 8, 12);
    path(wob(rb, [shR, [shR[0] + 7, shY + 6], [px2 + 3, py2 + 8]], false, 0.6), { w: 1.7 });
    P.push(`<rect x="${px2.toFixed(1)}" y="${(py2 - 4).toFixed(1)}" width="5" height="9.5" rx="1" fill="${paper}" stroke="${ink}" stroke-width="1.2"/>`);
  } else if (pose === "coffee") {
    armDown(shL, -1);
    const hx = shR[0] + rand(rb, 5, 8), hy = shY + rand(rb, 14, 18);
    path(wob(rb, [shR, [shR[0] + 7, shY + 8], [hx, hy]], false, 0.6), { w: 1.7 });
    P.push(`<rect x="${(hx - 0.5).toFixed(1)}" y="${(hy - 7).toFixed(1)}" width="8.5" height="9" rx="1.5" fill="${colorOn ? accent : "none"}" stroke="${ink}" stroke-width="1.3"/>`);
    path(wob(rb, [[hx + 3.5, hy - 10], [hx + 2.5, hy - 13.5], [hx + 4.5, hy - 17]], false, 0.4), { w: 1, op: 0.55 });
  }

  // neck patch: hides whatever stands behind the chin/collar gap
  P.push(`<path d="M${cxp - 6} 82 L${cxp + 6} 82 L${cxp + 7} ${shY + 6} L${cxp - 7} ${shY + 6} Z" fill="${paper}" stroke="none"/>`);

  // head on top, chin tucked into the collar
  const inner = fp.svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
  return `<g>${P.join("")}<g transform="translate(9,2) scale(0.92)">${inner}</g></g>`;
}

export function crowd(seeds: string[], options: CrowdOptions = {}): string {
  const colorOn = options.color !== false;
  const paper = options.paper ?? "#f4f1ea";
  const n = seeds.length;
  if (!n) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"/>`;
  const rows = n <= 5 ? 1 : n <= 14 ? 2 : 3;
  const perRow = Math.ceil(n / rows);
  const spacing = 84;
  const W = perRow * spacing + 64;
  const H = 200 + (rows - 1) * 54;
  let inner = "";
  const rowsSeeds: string[][] = [];
  for (let r = 0; r < rows; r++) rowsSeeds.push(seeds.slice(r * perRow, (r + 1) * perRow));
  // draw back rows first so the front overlaps them
  for (let r = 0; r < rows; r++) {
    const depth = rows - 1 - r;
    const row = rowsSeeds[r];
    const scale = 1 - depth * 0.08;
    const baseY = H - 192 * scale - depth * 54;
    const x0 = (W - row.length * spacing * scale) / 2 + (depth % 2 ? spacing * 0.5 * scale : 0);
    row.forEach((seed, k) => {
      const rj = seededRng(seed, "crowdjit");
      const x = x0 + (k * spacing + rand(rj, -7, 7)) * scale;
      const y = baseY + rand(rj, -3, 3);
      inner += `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${scale.toFixed(3)})"${depth ? ` opacity="${(1 - depth * 0.16).toFixed(2)}"` : ""}>${person(seed, colorOn, paper)}</g>`;
    });
  }
  const bg = options.background ?? "transparent";
  const width = options.width ?? W;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${width}" height="${Math.round(width * H / W)}">` +
    (bg !== "transparent" ? `<rect width="${W}" height="${H}" fill="${bg}"/>` : "") + inner + `</svg>`;
}
