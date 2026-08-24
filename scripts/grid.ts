import { face } from "../src/index.js";
import { Renderer } from "@resvg/resvg-js";
import { Resvg } from "@resvg/resvg-js";
import { writeFileSync } from "node:fs";

const COLS = 8, ROWS = 6, CELL = 120;
const seeds = process.argv[2]
  ? [process.argv[2]]
  : Array.from({ length: COLS * ROWS }, (_, i) => `mug-${i}`);

let inner = "";
seeds.forEach((s, i) => {
  const x = (i % COLS) * CELL, y = Math.floor(i / COLS) * CELL;
  const svg = face(s).replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
  inner += `<g transform="translate(${x},${y}) scale(1.2)">${svg}</g>`;
});
const W = COLS * CELL, H = ROWS * CELL;
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#f4f1ea"/>${inner}</svg>`;
const png = new Resvg(sheet, { fitTo: { mode: "width", value: W * 2 } }).render().asPng();
writeFileSync("grid.png", png);
console.log("wrote grid.png", W, "x", H);
