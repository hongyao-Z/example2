import assert from "node:assert/strict";
import { permutations } from "./permutations.js";

assert.equal(permutations(["B", "C"]).length, 2);
assert.equal(permutations(["B", "C", "D"]).length, 6);
assert.deepEqual(
  permutations(["B", "C"]).map((item) => item.join("-")).sort(),
  ["B-C", "C-B"],
);

console.log("permutations tests passed");
