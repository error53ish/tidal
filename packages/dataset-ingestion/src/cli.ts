import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { compareDatasets, discoverSourceWorkbooks, importWorkbook, renderComparisonReport } from "./index.js";

const reportDirectory = resolve(process.cwd(), "data/reports");
const sourceDirectory = process.env.TIDAL_SOURCE_DIR ?? resolve(process.cwd(), ".local/data/source");
const datasets = discoverSourceWorkbooks(sourceDirectory).map(({ filePath, registration }) => importWorkbook(filePath, registration));
const report = compareDatasets(datasets);
mkdirSync(reportDirectory, { recursive: true });
writeFileSync(resolve(reportDirectory, "dataset-comparison.json"), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(resolve(reportDirectory, "dataset-comparison.md"), `${renderComparisonReport(report)}\n`);
process.stdout.write(`${renderComparisonReport(report)}\n`);
