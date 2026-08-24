import { faceParts } from "../src/index.js";
for (const n of ["prisha", "narendra", "narendra modi", "ananya", "aditya", "priya", "rahul", "sandra", "alexandra", "krishna", "aakriti", "anay"]) {
  console.log(n.padEnd(16), faceParts(n).style);
}
