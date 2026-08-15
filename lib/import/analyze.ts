/**
 * @project  ImportDryRun — iamuvin.com
 * @author   Uvin Vindula (IAMUVIN)
 * @website  https://iamuvin.com
 * @company  ASI Research Labs — asiresearch.io
 * @built    2026
 * @license  MIT
 */
import {
  auditInputSchema,
  importContractSchema,
} from "@/lib/schemas/import-contract";
import { CsvParseError, parseCsv } from "@/lib/import/parser";
import type {
  AuditResult,
  ContractColumn,
  Finding,
  ImportContract,
  ReleaseState,
} from "@/lib/import/types";

export class ImportInputError extends Error {}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const integerPattern = /^[+-]?\d+$/;
const decimalPattern = /^[+-]?(?:\d+\.?\d*|\.\d+)$/;
const formulaPattern = /^[=+\-@\t\r\n]/;

function hasFormulaTrigger(sourceValue: string): boolean {
  return (
    formulaPattern.test(sourceValue) ||
    formulaPattern.test(sourceValue.trimStart())
  );
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function validateContract(source: string): ImportContract {
  let decoded: unknown;
  try {
    decoded = JSON.parse(source);
  } catch {
    throw new ImportInputError("The contract is not valid JSON.");
  }
  const parsed = importContractSchema.safeParse(decoded);
  if (!parsed.success) {
    throw new ImportInputError(
      `Contract error: ${parsed.error.issues[0]?.message ?? "Invalid contract."}`,
    );
  }
  const names = new Set<string>();
  for (const column of parsed.data.columns) {
    if (names.has(column.name))
      throw new ImportInputError(
        `Contract column names must be unique: ${column.name}.`,
      );
    names.add(column.name);
    if (column.pattern) {
      try {
        new RegExp(column.pattern);
      } catch {
        throw new ImportInputError(
          `Contract pattern for ${column.name} is not a valid regular expression.`,
        );
      }
    }
  }
  return parsed.data;
}

function typeValid(column: ContractColumn, value: string): boolean {
  if (value === "") return true;
  if (column.type === "email") return emailPattern.test(value);
  if (column.type === "integer") return integerPattern.test(value);
  if (column.type === "decimal") return decimalPattern.test(value);
  if (column.type === "boolean")
    return ["true", "false", "1", "0"].includes(value.toLowerCase());
  if (column.type === "date") return isIsoDate(value);
  if (column.type === "enum") return Boolean(column.values?.includes(value));
  return true;
}

function typeRepair(column: ContractColumn): string {
  if (column.type === "date")
    return "Use an ISO calendar date in YYYY-MM-DD format.";
  if (column.type === "enum")
    return "Use one of the contract's allowed enum values.";
  return `Provide a valid ${column.type} value.`;
}

function releaseFor(findings: Finding[]): ReleaseState {
  if (
    findings.some(
      (finding) =>
        finding.severity === "critical" || finding.severity === "high",
    )
  )
    return "blocked";
  if (findings.length > 0) return "review";
  return "ready";
}

export function auditImport(input: {
  csvText: string;
  contractText: string;
}): AuditResult {
  const inputResult = auditInputSchema.safeParse(input);
  if (!inputResult.success)
    throw new ImportInputError(
      inputResult.error.issues[0]?.message ?? "Invalid input.",
    );
  const contract = validateContract(inputResult.data.contractText);
  let rows: string[][];
  try {
    rows = parseCsv(inputResult.data.csvText).rows;
  } catch (error) {
    if (error instanceof CsvParseError)
      throw new ImportInputError(error.message);
    throw error;
  }
  if (rows.length === 0)
    throw new ImportInputError("The CSV does not contain a header row.");
  const [headers, ...dataRows] = rows;
  if (dataRows.length > 5_000)
    throw new ImportInputError(
      "This release accepts at most 5,000 data rows per check.",
    );
  const findings: Finding[] = [];
  const normalizedHeaders = headers.map((header) =>
    contract.trimWhitespace ? header.trim() : header,
  );
  const indexByHeader = new Map<string, number>();
  normalizedHeaders.forEach((header, index) => {
    if (indexByHeader.has(header)) {
      findings.push({
        row: 1,
        column: header || null,
        rule: "IMP003",
        severity: "high",
        message: "The header appears more than once.",
        repair: "Keep one uniquely named header column.",
      });
    } else indexByHeader.set(header, index);
  });
  const contractNames = new Set(contract.columns.map((column) => column.name));
  for (const column of contract.columns) {
    if (!indexByHeader.has(column.name))
      findings.push({
        row: 1,
        column: column.name,
        rule: "IMP002",
        severity: "high",
        message: "A contract column is missing from the header.",
        repair: "Add the required header before importing.",
      });
  }
  if (!contract.allowExtraColumns) {
    for (const header of normalizedHeaders) {
      if (!contractNames.has(header))
        findings.push({
          row: 1,
          column: header || null,
          rule: "IMP004",
          severity: "medium",
          message: "The CSV contains a column outside the contract.",
          repair: "Remove the column or allow it in the contract.",
        });
    }
  }

  const uniqueValues = new Map<string, Map<string, number>>();
  contract.columns
    .filter((column) => column.unique)
    .forEach((column) => uniqueValues.set(column.name, new Map()));
  const invalidRows = new Set<number>();
  const addFinding = (finding: Finding) => {
    findings.push(finding);
    if (finding.row && finding.row > 1) invalidRows.add(finding.row);
  };

  dataRows.forEach((cells, dataIndex) => {
    const rowNumber = dataIndex + 2;
    if (cells.length !== headers.length)
      addFinding({
        row: rowNumber,
        column: null,
        rule: "IMP005",
        severity: "high",
        message: "The row field count does not match the header.",
        repair: "Add or remove fields until the row matches the header.",
      });
    if (contract.formulaPolicy !== "allow") {
      cells.forEach((sourceValue, columnIndex) => {
        if (!hasFormulaTrigger(sourceValue)) return;
        addFinding({
          row: rowNumber,
          column: normalizedHeaders[columnIndex] || null,
          rule: "IMP012",
          severity: contract.formulaPolicy === "block" ? "critical" : "medium",
          message: "The cell begins with a spreadsheet formula trigger.",
          repair:
            "Confirm intent and neutralize the value in the destination-specific import path.",
        });
      });
    }
    for (const column of contract.columns) {
      const columnIndex = indexByHeader.get(column.name);
      if (columnIndex === undefined) continue;
      const sourceValue = cells[columnIndex] ?? "";
      const value = contract.trimWhitespace ? sourceValue.trim() : sourceValue;
      if (column.required && value === "") {
        addFinding({
          row: rowNumber,
          column: column.name,
          rule: "IMP006",
          severity: "high",
          message: "A required cell is empty.",
          repair: "Supply the required value.",
        });
        continue;
      }
      if (!typeValid(column, value))
        addFinding({
          row: rowNumber,
          column: column.name,
          rule: column.type === "enum" ? "IMP008" : "IMP007",
          severity: "medium",
          message: `The cell does not satisfy the ${column.type} contract.`,
          repair: typeRepair(column),
        });
      if (
        value !== "" &&
        column.pattern &&
        !new RegExp(column.pattern).test(value)
      )
        addFinding({
          row: rowNumber,
          column: column.name,
          rule: "IMP009",
          severity: "medium",
          message: "The cell does not match the contract pattern.",
          repair: "Change the value to match the documented pattern.",
        });
      const numericValue = decimalPattern.test(value) ? Number(value) : null;
      if (
        numericValue !== null &&
        ((column.min !== undefined && numericValue < column.min) ||
          (column.max !== undefined && numericValue > column.max))
      )
        addFinding({
          row: rowNumber,
          column: column.name,
          rule: "IMP010",
          severity: "medium",
          message: "The numeric value is outside the contract range.",
          repair: "Use a value inside the documented minimum and maximum.",
        });
      if (
        column.type === "string" &&
        column.max !== undefined &&
        value.length > column.max
      )
        addFinding({
          row: rowNumber,
          column: column.name,
          rule: "IMP010",
          severity: "medium",
          message: "The text is longer than the contract maximum.",
          repair: "Shorten the value to the documented maximum length.",
        });
      if (column.unique && value !== "") {
        const seen = uniqueValues.get(column.name)!;
        const firstRow = seen.get(value);
        if (firstRow)
          addFinding({
            row: rowNumber,
            column: column.name,
            rule: "IMP011",
            severity: "high",
            message: "A value in a unique column repeats an earlier row.",
            repair: `Use a unique value; the first occurrence is on row ${firstRow}.`,
          });
        else seen.set(value, rowNumber);
      }
    }
  });

  const errors = findings.filter(
    (finding) => finding.severity !== "medium",
  ).length;
  const warnings = findings.length - errors;
  return {
    releaseState: releaseFor(findings),
    summary: {
      dataRows: dataRows.length,
      validRows: Math.max(0, dataRows.length - invalidRows.size),
      invalidRows: invalidRows.size,
      errors,
      warnings,
    },
    findings,
    contract,
  };
}

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export function errorReportCsv(result: AuditResult): string {
  const rows = ["row,column,rule,severity,message"];
  for (const finding of result.findings)
    rows.push(
      [
        finding.row ?? "",
        finding.column ?? "",
        finding.rule,
        finding.severity,
        finding.message,
      ]
        .map((value) => csvCell(String(value)))
        .join(","),
    );
  return rows.join("\n");
}

export function dryRunArtifact(result: AuditResult): string {
  return JSON.stringify(
    {
      version: 1,
      releaseState: result.releaseState,
      summary: result.summary,
      contract: {
        columns: result.contract.columns.map(({ name, type }) => ({
          name,
          type,
        })),
        allowExtraColumns: result.contract.allowExtraColumns,
        formulaPolicy: result.contract.formulaPolicy,
      },
    },
    null,
    2,
  );
}
