import { face } from "../src/index.js";
import { Resvg } from "@resvg/resvg-js";
import { writeFileSync } from "node:fs";
const names = ["prisha","ananya","priya","aakriti","meera","shreya","kavya","diya","narendra","aditya","rahul","arjun"];
let inner = "";
names.forEach((s, i) => {
  const x = (i % 6) * 120, y = Math.floor(i / 6) * 130;
  inner += `<g transform="translate(${x},${y}) scale(1.15)">${face(s).replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "")}</g>`;
  inner += `<text x="${x + 58}" y="${y + 122}" font-family="monospace" font-size="10" text-anchor="middle" fill="#777">${s}</text>`;
});
writeFileSync("femgrid.png", new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="720" height="260"><rect width="720" height="260" fill="#f4f1ea"/>${inner}</svg>`, { fitTo: { mode: "width", value: 1440 } }).render().asPng());
console.log("ok");
