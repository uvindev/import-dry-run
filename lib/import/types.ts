/** @author Uvin Vindula (IAMUVIN) @website https://iamuvin.com */
export type ColumnType =
  | "string"
  | "email"
  | "integer"
  | "decimal"
  | "boolean"
  | "date"
  | "enum";

export type Severity = "critical" | "high" | "medium";
export type ReleaseState = "ready" | "review" | "blocked";

export interface ContractColumn {
  name: string;
  type: ColumnType;
  required?: boolean;
  unique?: boolean;
  values?: string[];
  min?: number;
  max?: number;
  pattern?: string;
}

export interface ImportContract {
  columns: ContractColumn[];
  allowExtraColumns: boolean;
  trimWhitespace: boolean;
  formulaPolicy: "block" | "warn" | "allow";
}

export interface Finding {
  row: number | null;
  column: string | null;
  rule: string;
  severity: Severity;
  message: string;
  repair: string;
}

export interface AuditSummary {
  dataRows: number;
  validRows: number;
  invalidRows: number;
  errors: number;
  warnings: number;
}

export interface AuditResult {
  releaseState: ReleaseState;
  summary: AuditSummary;
  findings: Finding[];
  contract: ImportContract;
}

export interface ParsedCsv {
  rows: string[][];
}
