import type { ComparisonObservation, ComparisonReport, DatasetDiscrepancy, ImportedDataset, Provenance } from "@tidal/types";

type Value = string | number | undefined;
interface Comparable { entity: string; metric: string; value: Value; dataset: ImportedDataset; provenance: Provenance; }

function valuesForDataset(dataset: ImportedDataset): Comparable[] {
  const results: Comparable[] = [];
  for (const metric of dataset.phonemeMetrics) for (const field of ["eou", "eouConfidence", "roundness", "roundnessConfidence", "notes"] as const) results.push({ entity: `phoneme:${metric.symbol}`, metric: field, value: metric[field], dataset, provenance: metric });
  for (const metric of dataset.combinationMetrics) for (const field of ["eou", "eouConfidence", "roundness", "roundnessConfidence", "notes"] as const) results.push({ entity: `${metric.table}:${metric.left}:${metric.right}`, metric: field, value: metric[field], dataset, provenance: metric });
  for (const edge of dataset.similarityEdges) results.push({ entity: `similarity:${edge.phoneme}:${edge.similarTo}`, metric: "strength", value: edge.strength, dataset, provenance: edge });
  for (const candidate of dataset.cvcCandidates) for (const field of ["rank", "eou", "maxSimilarityToEarlierCandidate"] as const) results.push({ entity: `cvc-candidate:${candidate.form}`, metric: field, value: candidate[field], dataset, provenance: candidate });
  return results;
}

function sameValue(values: Value[]): boolean { return new Set(values.map((value) => JSON.stringify(value))).size <= 1; }

function participatingDatasets(entity: string, datasets: ImportedDataset[]): ImportedDataset[] {
  if (entity.startsWith("cvc-candidate:")) return datasets.filter((dataset) => dataset.cvcCandidates.length > 0);
  return datasets;
}

export function compareDatasets(datasets: ImportedDataset[]): ComparisonReport {
  const groups = new Map<string, Comparable[]>();
  for (const item of datasets.flatMap(valuesForDataset)) {
    const key = `${item.entity}|${item.metric}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  const discrepancies: DatasetDiscrepancy[] = [];
  let matchingMetrics = 0;
  for (const items of groups.values()) {
    const participants = participatingDatasets(items[0].entity, datasets);
    const present = new Set(items.map((item) => item.dataset.descriptor.id));
    const missingFrom = participants.map((dataset) => dataset.descriptor.id).filter((id) => !present.has(id));
    const observations: ComparisonObservation[] = items.map((item) => ({ datasetId: item.dataset.descriptor.id, value: item.value, provenance: item.provenance }));
    if (missingFrom.length > 0) discrepancies.push({ kind: "missing-in-dataset", entity: items[0].entity, metric: items[0].metric, observations, missingFrom });
    else if (!sameValue(items.map((item) => item.value))) discrepancies.push({ kind: "value-conflict", entity: items[0].entity, metric: items[0].metric, observations });
    else matchingMetrics++;
  }
  const byKind = { "value-conflict": discrepancies.filter((item) => item.kind === "value-conflict").length, "missing-in-dataset": discrepancies.filter((item) => item.kind === "missing-in-dataset").length };
  return {
    generatedAt: new Date().toISOString(),
    datasets: datasets.map((dataset) => dataset.descriptor),
    coverage: {
      phonemeMetrics: datasets.filter((dataset) => dataset.phonemeMetrics.length > 0).map((dataset) => dataset.descriptor.id),
      combinationMetrics: datasets.filter((dataset) => dataset.combinationMetrics.length > 0).map((dataset) => dataset.descriptor.id),
      similarityEdges: datasets.filter((dataset) => dataset.similarityEdges.length > 0).map((dataset) => dataset.descriptor.id),
      cvcCandidates: datasets.filter((dataset) => dataset.cvcCandidates.length > 0).map((dataset) => dataset.descriptor.id),
      conceptInventory: datasets.filter((dataset) => dataset.conceptInventory.length > 0).map((dataset) => dataset.descriptor.id)
    },
    summary: { comparedMetrics: groups.size, matchingMetrics, discrepancies: discrepancies.length, byKind },
    discrepancies,
    importDiagnostics: datasets.flatMap((dataset) => dataset.importDiagnostics)
  };
}
