import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import type { DatasetId } from "@tidal/types";
import { openXlsx } from "./xlsx-reader.js";

export interface SourceRegistration {
  id: DatasetId;
  label: string;
  requiredSheets: string[];
  excludedSheets?: string[];
}

export const SOURCE_REGISTRY: readonly SourceRegistration[] = [
  { id: "cvc-top100-v2", label: "CVC Top 100 v2", requiredSheets: ["CVC Candidates v2"], excludedSheets: ["Concept Inventory"] },
  { id: "concept-inventory", label: "Concept Inventory", requiredSheets: ["CVC Candidates v2", "Concept Inventory"] },
  { id: "ratings", label: "Ratings", requiredSheets: ["Base", "VV", "CVVC", "CC", "Similarity"], excludedSheets: ["CVC Candidates v2", "Concept Inventory"] }
];

export interface DiscoveredSource {
  filePath: string;
  registration: SourceRegistration;
}

function matchesRegistration(sheetNames: string[], registration: SourceRegistration): boolean {
  return registration.requiredSheets.every((sheet) => sheetNames.includes(sheet))
    && !registration.excludedSheets?.some((sheet) => sheetNames.includes(sheet));
}

export function discoverSourceWorkbooks(sourceDirectory = resolve(process.cwd(), ".local/data/source")): DiscoveredSource[] {
  const workbooks = readdirSync(sourceDirectory)
    .filter((fileName) => fileName.toLocaleLowerCase().endsWith(".xlsx"))
    .map((fileName) => resolve(sourceDirectory, fileName));

  return SOURCE_REGISTRY.map((registration) => {
    const matches = workbooks.filter((filePath) => matchesRegistration(openXlsx(filePath).sheetNames(), registration));
    if (matches.length !== 1) throw new Error(`Expected exactly one workbook matching '${registration.id}', found ${matches.length}.`);
    return { filePath: matches[0], registration };
  });
}
