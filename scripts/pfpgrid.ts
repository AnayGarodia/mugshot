import { face } from "../src/index.js";
import { Resvg } from "@resvg/resvg-js";
import { writeFileSync } from "node:fs";
const names = ["anay","prisha","grace","narendra","maitree","kenji","fatima","linus","chioma","olga","marco","aditi"];
let inner = "";
names.forEach((s, i) => {
  const x = (i % 6) * 130, y = Math.floor(i / 6) * 140;
  inner += `<g transform="translate(${x},${y}) scale(1.25)">${face(s, { bust: true, backdrop: true }).replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "")}</g>`;
  inner += `<text x="${x + 62}" y="${y + 134}" font-family="monospace" font-size="10" text-anchor="middle" fill="#777">${s}</text>`;
});
writeFileSync("pfpgrid.png", new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="780" height="280"><rect width="780" height="280" fill="#f4f1ea"/>${inner}</svg>`, { fitTo: { mode: "width", value: 1560 } }).render().asPng());
console.log("ok");
