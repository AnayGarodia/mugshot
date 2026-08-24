import { face } from "../src/index.js";
import assert from "node:assert";

// determinism: same seed -> byte-identical SVG
for (const s of ["anay", "mug-7", "", "🦆", "a much longer seed string"]) {
  assert.strictEqual(face(s), face(s), `not deterministic for "${s}"`);
}
// different seeds differ
assert.notStrictEqual(face("a"), face("b"));
// options respected
assert.ok(face("x", { size: 64 }).includes('width="64"'));
assert.ok(face("x", { background: "#fff" }).includes('fill="#fff"'));
assert.ok(face("x", { ink: "#345" }).includes("#345"));
// valid-ish svg, no NaN coordinates
for (let i = 0; i < 200; i++) {
  const svg = face("fuzz-" + i);
  assert.ok(svg.startsWith("<svg") && svg.endsWith("</svg>"));
  assert.ok(!svg.includes("NaN"), "NaN in fuzz-" + i);
}
console.log("all tests pass");
