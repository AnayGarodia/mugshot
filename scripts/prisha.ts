import { face } from "../src/index.js";
import { Resvg } from "@resvg/resvg-js";
import { writeFileSync } from "node:fs";
const cases: [string, any][] = [
  ["prisha", {}], ["prisha", { mood: "sleepy" }], ["ada", {}], ["keisha", {}],
  ["marcus", {}], ["andre", {}], ["prisha", { bust: true, backdrop: true }], ["zoya", { mood: "sleepy" }],
];
let inner = "";
cases.forEach(([s, o], i) => {
  const x = (i % 8) * 120;
  inner += `<g transform="translate(${x},0) scale(1.15)">${face(s, o).replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "")}</g>`;
  inner += `<text x="${x + 58}" y="128" font-family="monospace" font-size="9" text-anchor="middle" fill="#777">${s}${o.mood ? " (asleep)" : ""}</text>`;
});
writeFileSync("prisha.png", new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="960" height="136"><rect width="960" height="136" fill="#f4f1ea"/>${inner}</svg>`, { fitTo: { mode: "width", value: 1920 } }).render().asPng());
console.log("ok");
