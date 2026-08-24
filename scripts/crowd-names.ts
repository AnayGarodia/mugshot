import { crowd } from "../src/crowd.js";
import { Resvg } from "@resvg/resvg-js";
import { writeFileSync } from "node:fs";
const svg = crowd(["ada","alan","grace","donald","barbara","tony","margaret","edsger","radia","leslie","sophie"], { background: "#f4f1ea" });
writeFileSync("crowd.png", new Resvg(svg, { fitTo: { mode: "width", value: 1800 } }).render().asPng());
console.log("ok");
