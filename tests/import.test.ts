import { describe, expect, it } from "vitest";
import {
  auditImport,
  dryRunArtifact,
  errorReportCsv,
  ImportInputError,
} from "@/lib/import/analyze";
import { parseCsv } from "@/lib/import/parser";
import {
  acceptedSample,
  rejectedSample,
  sampleContract,
} from "@/lib/import/sample";

describe("CSV parser", () => {
  it("parses commas, CRLF, and trailing line endings", () => {
    expect(parseCsv("a,b\r\n1,2\r\n").rows).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("parses quoted commas, line breaks, and doubled quotes", () => {
    expect(parseCsv('a,b\n1,"two,\nlines"\n2,"say ""yes"""').rows).toEqual([
      ["a", "b"],
      ["1", "two,\nlines"],
      ["2", 'say "yes"'],
    ]);
  });

  it("removes a BOM from the first header", () => {
    expect(parseCsv("\uFEFFid,email\n1,a@example.com").rows[0]).toEqual([
      "id",
      "email",
    ]);
  });

  it("rejects an unclosed quoted field", () => {
    expect(() => parseCsv('a,b\n1,"open')).toThrow(
      "ends inside a quoted field",
    );
  });

  it("rejects characters after a closing quote", () => {
    expect(() => parseCsv('a\n"closed"suffix')).toThrow("Unexpected character");
  });
});

describe("import audit", () => {
  it("blocks the rejected sample with located errors", () => {
    const result = auditImport({
      csvText: rejectedSample,
      contractText: sampleContract,
    });
    expect(result.releaseState).toBe("blocked");
    expect(result.summary.dataRows).toBe(4);
    expect(result.summary.invalidRows).toBe(3);
    expect(
      result.findings.some(
        (finding) =>
          finding.rule === "IMP012" &&
          finding.row === 3 &&
          finding.column === "notes",
      ),
    ).toBe(true);
    expect(result.findings.some((finding) => finding.rule === "IMP011")).toBe(
      true,
    );
  });

  it("accepts a file that satisfies the contract", () => {
    const result = auditImport({
      csvText: acceptedSample,
      contractText: sampleContract,
    });
    expect(result.releaseState).toBe("ready");
    expect(result.summary).toEqual({
      dataRows: 3,
      validRows: 3,
      invalidRows: 0,
      errors: 0,
      warnings: 0,
    });
    expect(result.findings).toEqual([]);
  });

  it("reports missing, duplicate, and extra headers", () => {
    const contract = JSON.parse(sampleContract);
    const result = auditImport({
      csvText: "customer_id,customer_id,extra\nCUS-0001,CUS-0002,x",
      contractText: JSON.stringify(contract),
    });
    expect(result.findings.some((finding) => finding.rule === "IMP002")).toBe(
      true,
    );
    expect(result.findings.some((finding) => finding.rule === "IMP003")).toBe(
      true,
    );
    expect(result.findings.some((finding) => finding.rule === "IMP004")).toBe(
      true,
    );
  });

  it("reports a row field-count mismatch", () => {
    const contract = {
      columns: [{ name: "id", type: "string" }],
      allowExtraColumns: true,
      trimWhitespace: true,
      formulaPolicy: "allow",
    };
    const result = auditImport({
      csvText: "id\n1,2",
      contractText: JSON.stringify(contract),
    });
    expect(result.findings[0]?.rule).toBe("IMP005");
  });

  it("checks required, pattern, type, enum, range, and uniqueness rules", () => {
    const result = auditImport({
      csvText: rejectedSample,
      contractText: sampleContract,
    });
    for (const rule of [
      "IMP006",
      "IMP007",
      "IMP008",
      "IMP009",
      "IMP010",
      "IMP011",
    ])
      expect(result.findings.some((finding) => finding.rule === rule)).toBe(
        true,
      );
  });

  it("uses warning severity for formula review policy", () => {
    const contract = {
      columns: [{ name: "note", type: "string" }],
      allowExtraColumns: true,
      trimWhitespace: true,
      formulaPolicy: "warn",
    };
    const result = auditImport({
      csvText: "note\n=SUM(A1)",
      contractText: JSON.stringify(contract),
    });
    expect(result.releaseState).toBe("review");
    expect(result.findings[0]).toMatchObject({
      rule: "IMP012",
      severity: "medium",
    });
  });

  it("checks formula triggers in columns outside the contract", () => {
    const contract = {
      columns: [{ name: "id", type: "integer" }],
      allowExtraColumns: true,
      trimWhitespace: true,
      formulaPolicy: "block",
    };
    const result = auditImport({
      csvText: "id,unmapped\n1,  =SUM(A1)",
      contractText: JSON.stringify(contract),
    });
    expect(result.findings).toContainEqual(
      expect.objectContaining({
        column: "unmapped",
        rule: "IMP012",
        severity: "critical",
      }),
    );
  });

  it("does not echo source values in either export", () => {
    const marker = "PRIVATE-CUSTOMER-MARKER";
    const contract = {
      columns: [{ name: "id", type: "integer" }],
      allowExtraColumns: true,
      trimWhitespace: true,
      formulaPolicy: "allow",
    };
    const result = auditImport({
      csvText: `id\n${marker}`,
      contractText: JSON.stringify(contract),
    });
    expect(JSON.stringify(result.findings)).not.toContain(marker);
    expect(dryRunArtifact(result)).not.toContain(marker);
    expect(errorReportCsv(result)).not.toContain(marker);
  });

  it("creates a redacted machine-readable artifact", () => {
    const artifact = JSON.parse(
      dryRunArtifact(
        auditImport({ csvText: acceptedSample, contractText: sampleContract }),
      ),
    );
    expect(artifact).toMatchObject({ version: 1, releaseState: "ready" });
    expect(artifact.contract.columns[0]).toEqual({
      name: "customer_id",
      type: "string",
    });
  });

  it("escapes report fields as CSV", () => {
    const report = errorReportCsv(
      auditImport({ csvText: rejectedSample, contractText: sampleContract }),
    );
    expect(report).toContain('"IMP012","critical"');
    expect(report.split("\n")[0]).toBe("row,column,rule,severity,message");
  });

  it("rejects empty input", () => {
    expect(() =>
      auditImport({ csvText: "", contractText: sampleContract }),
    ).toThrow(ImportInputError);
  });

  it("rejects invalid JSON", () => {
    expect(() => auditImport({ csvText: "id\n1", contractText: "{" })).toThrow(
      "not valid JSON",
    );
  });

  it("rejects duplicate contract columns", () => {
    const contract = {
      columns: [
        { name: "id", type: "string" },
        { name: "id", type: "string" },
      ],
      allowExtraColumns: true,
      trimWhitespace: true,
      formulaPolicy: "allow",
    };
    expect(() =>
      auditImport({ csvText: "id\n1", contractText: JSON.stringify(contract) }),
    ).toThrow("must be unique");
  });

  it("rejects invalid contract regular expressions", () => {
    const contract = {
      columns: [{ name: "id", type: "string", pattern: "[" }],
      allowExtraColumns: true,
      trimWhitespace: true,
      formulaPolicy: "allow",
    };
    expect(() =>
      auditImport({ csvText: "id\n1", contractText: JSON.stringify(contract) }),
    ).toThrow("not a valid regular expression");
  });

  it("rejects files above the row limit", () => {
    const contract = {
      columns: [{ name: "id", type: "integer" }],
      allowExtraColumns: true,
      trimWhitespace: true,
      formulaPolicy: "allow",
    };
    const csvText = `id\n${Array.from({ length: 5_001 }, (_, index) => index).join("\n")}`;
    expect(() =>
      auditImport({ csvText, contractText: JSON.stringify(contract) }),
    ).toThrow("at most 5,000");
  });
});
