import type { ComparisonReport } from "@tidal/types";

export function renderComparisonReport(report: ComparisonReport): string {
  const lines = [
    "# Tidal Dataset Comparison", "", `Generated: ${report.generatedAt}`, "", "## Summary", "",
    `- Datasets: ${report.datasets.map((dataset) => dataset.id).join(", ")}`,
    `- Compared metrics: ${report.summary.comparedMetrics}`,
    `- Matching metrics: ${report.summary.matchingMetrics}`,
    `- Discrepancies: ${report.summary.discrepancies}`,
    `  - Value conflicts: ${report.summary.byKind["value-conflict"]}`,
    `  - Missing-in-dataset: ${report.summary.byKind["missing-in-dataset"]}`,
    "", "## Dataset coverage", "",
    ...Object.entries(report.coverage).map(([domain, datasets]) => `- ${domain}: ${datasets.join(", ") || "none"}`),
    "", "## Discrepancies", ""
  ];
  if (report.discrepancies.length === 0) lines.push("No discrepancies found among comparable normalized values.");
  for (const discrepancy of report.discrepancies) {
    lines.push(`### ${discrepancy.kind}: \`${discrepancy.entity}\` / \`${discrepancy.metric}\``, "");
    for (const observation of discrepancy.observations) lines.push(`- ${observation.datasetId}: \`${String(observation.value)}\` (${observation.provenance.sheet} ${observation.provenance.cells.join(", ")})`);
    if (discrepancy.missingFrom?.length) lines.push(`- Missing from: ${discrepancy.missingFrom.join(", ")}`);
    lines.push("");
  }
  if (report.importDiagnostics.length) {
    lines.push("## Import diagnostics", "");
    for (const diagnostic of report.importDiagnostics) lines.push(`- ${diagnostic.severity} ${diagnostic.code}: ${diagnostic.datasetId} — ${diagnostic.message}`);
  }
  return lines.join("\n");
}
