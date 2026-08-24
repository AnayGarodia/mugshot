#!/usr/bin/env node
// npx mugshot-avatars <seed> [--size 512] [--flat] [--svg] [-o out]
import { face } from "../dist/index.js";
import { writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const seed = args.find(a => !a.startsWith("-")) || "mugshot";
const flag = (n) => args.includes(n);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const size = Number(opt("--size", 512));
const portrait = !flag("--flat");
const svg = face(seed, { size, bust: portrait, backdrop: portrait, background: "#f4f1ea" });
const out = opt("-o", null);

if (flag("--svg") || (out && out.endsWith(".svg"))) {
  const p = out || `${seed}.svg`;
  writeFileSync(p, svg);
  console.log(`wrote ${p}`);
} else {
  try {
    const { Resvg } = await import("@resvg/resvg-js");
    const p = out || `${seed}.png`;
    writeFileSync(p, new Resvg(svg, { fitTo: { mode: "width", value: size } }).render().asPng());
    console.log(`wrote ${p} — upload it at https://github.com/settings/profile`);
  } catch {
    const p = out || `${seed}.svg`;
    writeFileSync(p, svg);
    console.log(`wrote ${p} (SVG — for PNG run: npx -p @resvg/resvg-js -p mugshot-avatars mugshot ${seed})`);
  }
}
