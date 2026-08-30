import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { compareDatasets, discoverSourceWorkbooks, importWorkbook } from "../src/index.js";

const sourceDirectory = resolve(process.cwd(), ".local/data/source");
const datasets = discoverSourceWorkbooks(sourceDirectory).map(({ filePath, registration }) => importWorkbook(filePath, registration));

describe("workbook ingestion", () => {
  it("imports all registered workbooks with separate provenance", () => {
    expect(datasets).toHaveLength(3);
    expect(new Set(datasets.map((dataset) => dataset.descriptor.workbookSha256)).size).toBe(3);
    for (const dataset of datasets) {
      expect(dataset.phonemeMetrics.length).toBeGreaterThan(20);
      expect(dataset.combinationMetrics.length).toBeGreaterThan(100);
      expect(dataset.similarityEdges.length).toBeGreaterThan(50);
      expect(dataset.importDiagnostics).toEqual([]);
      expect(dataset.phonemeMetrics[0].datasetId).toBe(dataset.descriptor.id);
      expect(dataset.phonemeMetrics[0].cells.length).toBeGreaterThan(1);
    }
  });

  it("keeps optional workbook-specific sheets optional", () => {
    expect(datasets.find((dataset) => dataset.descriptor.id === "concept-inventory")?.conceptInventory.length).toBe(100);
    expect(datasets.find((dataset) => dataset.descriptor.id === "ratings")?.conceptInventory).toEqual([]);
  });
});

describe("dataset comparison", () => {
  it("reports observations without selecting a canonical value", () => {
    const report = compareDatasets(datasets);
    expect(report.datasets).toHaveLength(3);
    expect(report.summary.comparedMetrics).toBeGreaterThan(100);
    expect(report.coverage.cvcCandidates).toEqual(["cvc-top100-v2", "concept-inventory"]);
    for (const discrepancy of report.discrepancies) {
      expect(discrepancy.observations.length).toBeGreaterThan(0);
      expect(discrepancy.observations[0].provenance.datasetId).toBe(discrepancy.observations[0].datasetId);
    }
  });
});
