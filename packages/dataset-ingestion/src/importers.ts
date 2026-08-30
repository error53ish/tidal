import type { CombinationMetric, DatasetDescriptor, ImportDiagnostic, PhonemeMetric, Provenance, QuantitativeValues, SimilarityEdge, CvcCandidate, ConceptInventoryItem } from "@tidal/types";
import { columnAddress, type XlsxReader } from "./xlsx-reader.js";

const METRIC_FIELDS = ["eou", "eouConfidence", "roundness", "roundnessConfidence", "notes"] as const;
const REQUIRED_QUANTITATIVE_SHEETS = ["Base", "VV", "CVVC", "CC", "Similarity"];

function text(value: string | number | undefined): string | undefined {
  if (value === undefined || value === "") return undefined;
  return String(value).trim() || undefined;
}

function numberValue(value: string | number | undefined): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  return undefined;
}

function normalizedSymbol(value: string | number | undefined): string | undefined {
  return text(value)?.toLocaleLowerCase();
}

function provenance(descriptor: DatasetDescriptor, sheet: string, cells: string[]): Provenance {
  return { datasetId: descriptor.id, workbookFile: descriptor.workbookFile, workbookSha256: descriptor.workbookSha256, sheet, cells };
}

function metrics(reader: XlsxReader, sheet: string, startColumn: number, row: number): QuantitativeValues {
  const values = METRIC_FIELDS.map((_, index) => reader.cell(sheet, columnAddress(startColumn + index, row)));
  return { eou: numberValue(values[0]), eouConfidence: numberValue(values[1]), roundness: numberValue(values[2]), roundnessConfidence: numberValue(values[3]), notes: text(values[4]) };
}

export function importDiagnostics(reader: XlsxReader, descriptor: DatasetDescriptor): ImportDiagnostic[] {
  return REQUIRED_QUANTITATIVE_SHEETS.filter((sheet) => !reader.hasSheet(sheet)).map((sheet) => ({
    ...provenance(descriptor, sheet, []), code: "missing-sheet", severity: "error", message: `Required quantitative sheet '${sheet}' is missing.`
  }));
}

export function importBase(reader: XlsxReader, descriptor: DatasetDescriptor): PhonemeMetric[] {
  if (!reader.hasSheet("Base")) return [];
  const range = reader.range("Base");
  if (!range) return [];
  const results: PhonemeMetric[] = [];
  for (let row = 2; row <= range.e.r; row++) {
    const primaryCell = columnAddress(1, row); // B
    const secondaryCell = columnAddress(2, row); // C
    const primary = normalizedSymbol(reader.cell("Base", primaryCell));
    const secondary = normalizedSymbol(reader.cell("Base", secondaryCell));
    const symbol = primary ?? secondary;
    if (!symbol) continue;
    const cells = [primaryCell, secondaryCell, ...METRIC_FIELDS.map((_, index) => columnAddress(3 + index, row))];
    results.push({ ...provenance(descriptor, "Base", cells), symbol, displaySound: primary ? text(reader.cell("Base", secondaryCell)) : undefined, ...metrics(reader, "Base", 3, row) });
  }
  return results;
}

function importMatrix(reader: XlsxReader, descriptor: DatasetDescriptor, table: CombinationMetric["table"], rowLabelColumn: number, targetHeaderRow: number, fallbackHeaderRow?: number): CombinationMetric[] {
  if (!reader.hasSheet(table)) return [];
  const range = reader.range(table);
  if (!range) return [];
  const results: CombinationMetric[] = [];
  for (let row = 4; row <= range.e.r; row++) {
    const leftCell = columnAddress(rowLabelColumn, row);
    const left = normalizedSymbol(reader.cell(table, leftCell));
    if (!left) continue;
    for (let metricStart = 4; metricStart <= range.e.c; metricStart += 6) {
      const targetHeaderCell = columnAddress(metricStart - 1, targetHeaderRow);
      const fallbackHeaderCell = fallbackHeaderRow === undefined ? undefined : columnAddress(metricStart - 1, fallbackHeaderRow);
      const right = normalizedSymbol(reader.cell(table, targetHeaderCell)) ?? (fallbackHeaderCell ? normalizedSymbol(reader.cell(table, fallbackHeaderCell)) : undefined);
      if (!right) continue;
      const recordMetrics = metrics(reader, table, metricStart, row);
      if (Object.values(recordMetrics).every((value) => value === undefined)) continue;
      results.push({ ...provenance(descriptor, table, [leftCell, targetHeaderCell, ...(fallbackHeaderCell ? [fallbackHeaderCell] : []), ...METRIC_FIELDS.map((_, index) => columnAddress(metricStart + index, row))]), table, left, right, ...recordMetrics });
    }
  }
  return results;
}

export function importCombinations(reader: XlsxReader, descriptor: DatasetDescriptor): CombinationMetric[] {
  return [
    ...importMatrix(reader, descriptor, "VV", 1, 1),
    ...importMatrix(reader, descriptor, "CVVC", 2, 1),
    ...importMatrix(reader, descriptor, "CC", 2, 1, 2)
  ];
}

export function importSimilarity(reader: XlsxReader, descriptor: DatasetDescriptor): SimilarityEdge[] {
  if (!reader.hasSheet("Similarity")) return [];
  const range = reader.range("Similarity");
  if (!range) return [];
  const results: SimilarityEdge[] = [];
  for (let row = 1; row <= range.e.r; row++) {
    const phoneme = normalizedSymbol(reader.cell("Similarity", columnAddress(0, row)));
    const similarTo = normalizedSymbol(reader.cell("Similarity", columnAddress(1, row)));
    const strength = numberValue(reader.cell("Similarity", columnAddress(2, row)));
    if (phoneme && similarTo && strength !== undefined) results.push({ ...provenance(descriptor, "Similarity", [columnAddress(0, row), columnAddress(1, row), columnAddress(2, row)]), phoneme, similarTo, strength });
  }
  return results;
}

export function importCandidates(reader: XlsxReader, descriptor: DatasetDescriptor): CvcCandidate[] {
  const sheet = "CVC Candidates v2";
  if (!reader.hasSheet(sheet)) return [];
  const range = reader.range(sheet);
  if (!range) return [];
  const results: CvcCandidate[] = [];
  for (let row = 1; row <= range.e.r; row++) {
    const rank = numberValue(reader.cell(sheet, columnAddress(0, row)));
    const form = normalizedSymbol(reader.cell(sheet, columnAddress(1, row)));
    const eou = numberValue(reader.cell(sheet, columnAddress(2, row)));
    const maxSimilarity = numberValue(reader.cell(sheet, columnAddress(3, row)));
    if (rank !== undefined && form && eou !== undefined && maxSimilarity !== undefined) results.push({ ...provenance(descriptor, sheet, [columnAddress(0, row), columnAddress(1, row), columnAddress(2, row), columnAddress(3, row)]), rank, form, eou, maxSimilarityToEarlierCandidate: maxSimilarity });
  }
  return results;
}

export function importConceptInventory(reader: XlsxReader, descriptor: DatasetDescriptor): ConceptInventoryItem[] {
  const sheet = "Concept Inventory";
  if (!reader.hasSheet(sheet)) return [];
  const range = reader.range(sheet);
  if (!range) return [];
  const results: ConceptInventoryItem[] = [];
  for (let row = 1; row <= range.e.r; row++) {
    const ordinal = numberValue(reader.cell(sheet, columnAddress(0, row)));
    const concept = text(reader.cell(sheet, columnAddress(2, row)));
    if (ordinal === undefined || !concept) continue;
    results.push({ ...provenance(descriptor, sheet, Array.from({ length: 8 }, (_, column) => columnAddress(column, row))), ordinal, category: text(reader.cell(sheet, columnAddress(1, row))), concept, treatment: text(reader.cell(sheet, columnAddress(3, row))), primitive: text(reader.cell(sheet, columnAddress(4, row))), rationale: text(reader.cell(sheet, columnAddress(5, row))), candidateForm: text(reader.cell(sheet, columnAddress(6, row))), assigned: text(reader.cell(sheet, columnAddress(7, row))) });
  }
  return results;
}
