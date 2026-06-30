import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  analyzeLDrawText,
  extractTopLevelLDrawPartReferences,
  validateCommunityModelCatalog,
  type CommunityModelCatalog
} from "./communityModels";

const realLDrawCatalog: CommunityModelCatalog = {
  schemaVersion: 2,
  models: [
    {
      id: "mini-construction",
      name: "Mini Construction",
      category: "Vehicle",
      sourceKind: "ldraw-packed",
      format: "ldraw",
      file: "/community-models/ldraw/4915-1-MiniConstruction.mpd_Packed.mpd",
      sourceUrl:
        "https://github.com/mrdoob/three.js/blob/dev/examples/models/ldraw/officialLibrary/models/4915-1-MiniConstruction.mpd_Packed.mpd",
      license: "Three.js MIT; embedded LDraw parts under their declared LDraw/CCAL terms",
      attribution: "three.js examples and LDraw.org contributors",
      recommendedScale: 0.012,
      thumbnailColor: "#facc15"
    },
    {
      id: "lighthouse",
      name: "Lighthouse",
      category: "Building",
      sourceKind: "ldraw-packed",
      format: "ldraw",
      file: "/community-models/ldraw/30023-1-Lighthouse.ldr_Packed.mpd",
      sourceUrl:
        "https://github.com/mrdoob/three.js/blob/dev/examples/models/ldraw/officialLibrary/models/30023-1-Lighthouse.ldr_Packed.mpd",
      license: "Three.js MIT; embedded LDraw parts under their declared LDraw/CCAL terms",
      attribution: "three.js examples and LDraw.org contributors",
      recommendedScale: 0.012,
      thumbnailColor: "#ef4444"
    },
    {
      id: "radar-truck",
      name: "Radar Truck",
      category: "Vehicle",
      sourceKind: "ldraw-packed",
      format: "ldraw",
      file: "/community-models/ldraw/889-1-RadarTruck.mpd_Packed.mpd",
      sourceUrl:
        "https://github.com/mrdoob/three.js/blob/dev/examples/models/ldraw/officialLibrary/models/889-1-RadarTruck.mpd_Packed.mpd",
      license: "Three.js MIT; embedded LDraw parts under their declared LDraw/CCAL terms",
      attribution: "three.js examples and LDraw.org contributors",
      recommendedScale: 0.012,
      thumbnailColor: "#38bdf8"
    }
  ]
};

describe("community LDraw models", () => {
  it("REQ-0005-001 accepts only traceable LDraw brick-level catalog entries", () => {
    const result = validateCommunityModelCatalog(realLDrawCatalog);

    expect(result.valid).toBe(true);
    expect(realLDrawCatalog.models).toHaveLength(3);
  });

  it("REQ-0005-001 rejects authored procedural samples masquerading as community models", () => {
    const fakeCatalog = {
      schemaVersion: 1,
      models: [
        {
          id: "sample-watchtower",
          name: "Sample Watchtower",
          category: "Farm",
          source: "Bundled sample inspired by community LEGO farm builds; authored for this project.",
          license: "Project sample",
          thumbnailColor: "#facc15",
          recommendedScale: 1,
          parts: [{ id: "a", kind: "brick" }]
        }
      ]
    } as unknown as CommunityModelCatalog;

    const result = validateCommunityModelCatalog(fakeCatalog);

    expect(result.valid).toBe(false);
    expect(result.errors.join("\n")).toContain("schemaVersion must be 2");
    expect(result.errors.join("\n")).toContain('format "ldraw"');
    expect(result.errors.join("\n")).toContain("sourceUrl");
  });

  it("REQ-0005-001 extracts LDraw type 1 brick references from the top-level model", () => {
    const text = [
      "0 Example LDraw model",
      "1 14 0 0 0 1 0 0 0 1 0 0 0 1 3001.dat",
      "1 4 20 0 0 1 0 0 0 1 0 0 0 1 submodel.ldr",
      "0 FILE embedded.dat",
      "1 16 0 0 0 1 0 0 0 1 0 0 0 1 ignored.dat"
    ].join("\n");

    const references = extractTopLevelLDrawPartReferences(text);
    const summary = analyzeLDrawText(text);

    expect(references.map((part) => part.fileName)).toEqual(["3001.dat", "submodel.ldr"]);
    expect(summary).toMatchObject({
      fileCount: 1,
      partReferenceCount: 2,
      hasEmbeddedFiles: true
    });
  });

  it("REQ-0005-001 bundled manifest points to real packed LDraw files with embedded part data", () => {
    const manifestText = readFileSync("public/community-models/manifest.json", "utf8");
    const catalog = JSON.parse(manifestText) as CommunityModelCatalog;
    const result = validateCommunityModelCatalog(catalog);

    expect(result.valid, result.errors.join("\n")).toBe(true);
    for (const model of catalog.models) {
      const fileText = readFileSync(`public${model.file}`, "utf8");
      const summary = analyzeLDrawText(fileText);

      expect(fileText).toContain("0 FILE ");
      expect(fileText).toContain(".dat");
      expect(summary.fileCount).toBeGreaterThan(2);
      expect(summary.partReferenceCount).toBeGreaterThan(0);
      expect(summary.uniquePartFiles.length).toBeGreaterThan(0);
    }
  });
});
