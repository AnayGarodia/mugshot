import { face } from "../src/index.js";
import { Resvg } from "@resvg/resvg-js";
import { writeFileSync } from "node:fs";
const moods = ["auto", "happy", "sad", "grumpy", "sleepy", "surprised", "wink"] as const;
let inner = "";
["anay", "mug-12"].forEach((seed, row) => {
  moods.forEach((m, i) => {
    const svg = face(seed, { mood: m }).replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
    inner += `<g transform="translate(${i * 120},${row * 140}) scale(1.2)">${svg}</g>`;
    if (row === 0) inner += `<text x="${i * 120 + 60}" y="136" font-family="monospace" font-size="11" text-anchor="middle">${m}</text>`;
  });
});
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="840" height="290"><rect width="840" height="290" fill="#f4f1ea"/>${inner}</svg>`;
writeFileSync("moods.png", new Resvg(sheet, { fitTo: { mode: "width", value: 1680 } }).render().asPng());
console.log("wrote moods.png");
