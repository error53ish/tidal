export type DatasetId =
  | "cvc-top100-v2"
  | "concept-inventory"
  | "ratings";

export interface DatasetDescriptor {
  id: DatasetId;
  label: string;
  workbookFile: string;
  workbookSha256: string;
  sheets: string[];
}

export interface Provenance {
  datasetId: DatasetId;
  workbookFile: string;
  workbookSha256: string;
  sheet: string;
  cells: string[];
}

export interface QuantitativeValues {
  eou?: number;
  eouConfidence?: number;
  roundness?: number;
  roundnessConfidence?: number;
  notes?: string;
}

export interface PhonemeMetric extends Provenance, QuantitativeValues {
  symbol: string;
  displaySound?: string;
}

export interface CombinationMetric extends Provenance, QuantitativeValues {
  table: "VV" | "CVVC" | "CC";
  left: string;
  right: string;
}

export interface SimilarityEdge extends Provenance {
  phoneme: string;
  similarTo: string;
  strength: number;
}

export interface CvcCandidate extends Provenance {
  rank: number;
  form: string;
  eou: number;
  maxSimilarityToEarlierCandidate: number;
}

export interface ConceptInventoryItem extends Provenance {
  ordinal: number;
  category?: string;
  concept: string;
  treatment?: string;
  primitive?: string;
  rationale?: string;
  candidateForm?: string;
  assigned?: string;
}

export type DiagnosticSeverity = "info" | "warning" | "error";

export interface ImportDiagnostic extends Provenance {
  code: "missing-sheet" | "invalid-cell" | "source-layout-warning";
  severity: DiagnosticSeverity;
  message: string;
}

export interface ImportedDataset {
  descriptor: DatasetDescriptor;
  phonemeMetrics: PhonemeMetric[];
  combinationMetrics: CombinationMetric[];
  similarityEdges: SimilarityEdge[];
  cvcCandidates: CvcCandidate[];
  conceptInventory: ConceptInventoryItem[];
  importDiagnostics: ImportDiagnostic[];
}

export interface ComparisonObservation {
  datasetId: DatasetId;
  value: string | number | undefined;
  provenance: Provenance;
}

export interface DatasetDiscrepancy {
  kind: "value-conflict" | "missing-in-dataset";
  entity: string;
  metric: string;
  observations: ComparisonObservation[];
  missingFrom?: DatasetId[];
}

export interface ComparisonReport {
  generatedAt: string;
  datasets: DatasetDescriptor[];
  coverage: Record<string, DatasetId[]>;
  summary: {
    comparedMetrics: number;
    matchingMetrics: number;
    discrepancies: number;
    byKind: Record<DatasetDiscrepancy["kind"], number>;
  };
  discrepancies: DatasetDiscrepancy[];
  importDiagnostics: ImportDiagnostic[];
}
