import { basename } from "node:path";
import type { DatasetDescriptor, ImportedDataset } from "@tidal/types";
import { importBase, importCandidates, importCombinations, importConceptInventory, importDiagnostics, importSimilarity } from "./importers.js";
import { openXlsx, sha256File } from "./xlsx-reader.js";
import type { SourceRegistration } from "./registry.js";

export function importWorkbook(filePath: string, registration: SourceRegistration): ImportedDataset {
  const reader = openXlsx(filePath);
  const descriptor: DatasetDescriptor = { id: registration.id, label: registration.label, workbookFile: basename(filePath), workbookSha256: sha256File(filePath), sheets: reader.sheetNames() };
  return {
    descriptor,
    phonemeMetrics: importBase(reader, descriptor),
    combinationMetrics: importCombinations(reader, descriptor),
    similarityEdges: importSimilarity(reader, descriptor),
    cvcCandidates: importCandidates(reader, descriptor),
    conceptInventory: importConceptInventory(reader, descriptor),
    importDiagnostics: importDiagnostics(reader, descriptor)
  };
}
