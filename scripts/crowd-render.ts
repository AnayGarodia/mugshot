import { crowd } from "../src/crowd.js";
import { Resvg } from "@resvg/resvg-js";
import { writeFileSync } from "node:fs";
const seeds = Array.from({ length: Number(process.argv[2] || 11) }, (_, i) => `team-${i}`);
const svg = crowd(seeds, { background: "#f4f1ea" });
writeFileSync("crowd.png", new Resvg(svg, { fitTo: { mode: "width", value: 1800 } }).render().asPng());
console.log("wrote crowd.png");
