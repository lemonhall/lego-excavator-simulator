import { describe, expect, it } from "vitest";
import { computeCommunityModelPlacement } from "./app";

describe("community model placement", () => {
  it("REQ-0005-003 spaces the first three spawned models far enough apart", () => {
    const placements = [0, 1, 2].map((index) => computeCommunityModelPlacement(index));

    for (let a = 0; a < placements.length; a += 1) {
      for (let b = a + 1; b < placements.length; b += 1) {
        const dx = placements[a].x - placements[b].x;
        const dz = placements[a].z - placements[b].z;
        expect(Math.hypot(dx, dz)).toBeGreaterThanOrEqual(4.8);
      }
    }
  });
});
