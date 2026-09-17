import assert from "node:assert/strict";

import { PLAYER_COUNT, RUNG_ROWS } from "./constants";
import {
  followPath,
  generateLadder,
  isPermutation,
  mulberry32,
  resolveAll,
  shuffled,
  validateRungs,
  type Rung,
} from "./ladder-engine";

function testKnownFixture() {
  const rungs: Rung[] = [
    { row: 0, col: 0 },
    { row: 1, col: 1 },
  ];
  const mapping = resolveAll(rungs, 3, 2);
  assert.deepEqual(mapping, [2, 0, 1]);
  assert.equal(followPath(0, rungs, 3, 2).endCol, 2);
  assert.equal(followPath(1, rungs, 3, 2).endCol, 0);
  assert.equal(followPath(2, rungs, 3, 2).endCol, 1);
}

function testGeneratedLaddersAreValidPermutations() {
  for (let seed = 1; seed <= 40; seed++) {
    const rng = mulberry32(seed * 97);
    const rungs = generateLadder(PLAYER_COUNT, RUNG_ROWS, rng);
    validateRungs(rungs, PLAYER_COUNT, RUNG_ROWS);
    const mapping = resolveAll(rungs, PLAYER_COUNT, RUNG_ROWS);
    assert.equal(
      isPermutation(mapping, PLAYER_COUNT),
      true,
      `seed=${seed} mapping=${mapping.join(",")}`,
    );
    assert.ok(rungs.length >= PLAYER_COUNT, `seed=${seed} too few rungs`);
  }
}

function testIdentityWhenEmpty() {
  const mapping = resolveAll([], PLAYER_COUNT, RUNG_ROWS);
  assert.deepEqual(
    mapping,
    Array.from({ length: PLAYER_COUNT }, (_, i) => i),
  );
}

function testShuffleKeepsMembers() {
  const src = ["a", "b", "c", "d"];
  const out = shuffled(src, mulberry32(7));
  assert.deepEqual([...out].sort(), [...src].sort());
}

function main() {
  testKnownFixture();
  testGeneratedLaddersAreValidPermutations();
  testIdentityWhenEmpty();
  testShuffleKeepsMembers();
  console.log("ladder-engine selftest: ok");
}

main();
