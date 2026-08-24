import { face } from "../src/index.js";
import { Resvg } from "@resvg/resvg-js";
import { writeFileSync } from "node:fs";
const names = ["ada","grace","barbara","margaret","radia","sophie","yukiko","priya","fatima","zoe","lucia","ingrid",
               "alan","donald","tony","leslie","edsger","linus","ken","dennis","bjarne","guido","brendan","anders"];
const COLS = 12, CELL = 120;
let inner = "";
names.forEach((s, i) => {
  const x = (i % COLS) * CELL, y = Math.floor(i / COLS) * CELL;
  const svg = face(s).replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
  inner += `<g transform="translate(${x},${y}) scale(1.2)">${svg}</g>`;
  inner += `<text x="${x + 60}" y="${y + 116}" font-family="monospace" font-size="10" text-anchor="middle" fill="#777">${s}</text>`;
});
const W = COLS * CELL, H = Math.ceil(names.length / COLS) * CELL;
writeFileSync("names.png", new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#f4f1ea"/>${inner}</svg>`, { fitTo: { mode: "width", value: W * 1.8 } }).render().asPng());
console.log("wrote names.png");
