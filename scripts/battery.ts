import { faceParts } from "../src/index.js";
const expect: [string, string][] = [
  ["maitree","fem"],["prakarsh","masc"],["utkarsh","masc"],["aarti","fem"],["simran","fem"],
  ["priyanka","fem"],["rohit","masc"],["prisha","fem"],["narendra","masc"],["aditya","masc"],
  ["ananya","fem"],["aakriti","fem"],["anay","masc"],["sandra","fem"],["harsh","masc"],
  ["deepti","fem"],["ayesha","fem"],["imran","masc"],["shruti","fem"],["vedant","masc"],
];
let bad = 0;
for (const [n, want] of expect) {
  const got = faceParts(n).style;
  if (got !== want) { console.log("MISS", n, "got", got, "want", want); bad++; }
}
console.log(bad === 0 ? "battery: all correct" : `battery: ${bad} misses`);
