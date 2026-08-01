"use client";

import { useEffect, useMemo, useState } from "react";
import {
  auditImport,
  dryRunArtifact,
  errorReportCsv,
  ImportInputError,
} from "@/lib/import/analyze";
import {
  acceptedSample,
  rejectedSample,
  sampleContract,
} from "@/lib/import/sample";
import type { AuditResult } from "@/lib/import/types";
import { track } from "@/lib/analytics";

async function copyText(value: string): Promise<void> {
  await navigator.clipboard.writeText(value);
}

export function Workbench() {
  const [csvText, setCsvText] = useState(rejectedSample);
  const [contractText, setContractText] = useState(sampleContract);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<"artifact" | "report" | null>(null);

  useEffect(() => track("workbench_viewed"), []);
  const artifact = useMemo(
    () => (result ? dryRunArtifact(result) : ""),
    [result],
  );
  const report = useMemo(
    () => (result ? errorReportCsv(result) : ""),
    [result],
  );

  function runCheck() {
    setCopied(null);
    try {
      setResult(auditImport({ csvText, contractText }));
      setError("");
      track("import_checked");
    } catch (cause) {
      setResult(null);
      setError(
        cause instanceof ImportInputError
          ? cause.message
          : "The check could not finish.",
      );
    }
  }

  function loadCsv(value: string) {
    setCsvText(value);
    setResult(null);
    setError("");
    setCopied(null);
  }

  async function copyOutput(kind: "artifact" | "report", value: string) {
    await copyText(value);
    setCopied(kind);
    if (kind === "report") track("error_report_copied");
  }

  return (
    <section className="desk" id="desk" aria-labelledby="desk-title">
      <div className="desk-heading">
        <div>
          <p className="kicker">Receiving desk</p>
          <h2 id="desk-title">Inspect the file against the import contract.</h2>
        </div>
        <p className="local-stamp">LOCAL PROCESSING / SOURCE STAYS HERE</p>
      </div>

      <div className="input-ledger">
        <label className="editor">
          <span>
            <b>01</b> CSV candidate{" "}
            <small>{csvText.length.toLocaleString()} characters</small>
          </span>
          <textarea
            aria-label="CSV candidate"
            spellCheck={false}
            value={csvText}
            onChange={(event) => setCsvText(event.target.value)}
          />
        </label>
        <label className="editor contract-editor">
          <span>
            <b>02</b> JSON contract <small>typed column rules</small>
          </span>
          <textarea
            aria-label="JSON contract"
            spellCheck={false}
            value={contractText}
            onChange={(event) => setContractText(event.target.value)}
          />
        </label>
      </div>

      <div className="desk-actions">
        <button className="run-button" type="button" onClick={runCheck}>
          Run dry run
        </button>
        <button type="button" onClick={() => loadCsv(rejectedSample)}>
          Restore rejected sample
        </button>
        <button type="button" onClick={() => loadCsv(acceptedSample)}>
          Load accepted sample
        </button>
        <button type="button" onClick={() => loadCsv("")}>
          Clear CSV
        </button>
      </div>

      <div className="status-region" aria-live="polite">
        {error ? (
          <div className="input-error" role="alert">
            <strong>CHECK STOPPED</strong>
            <span>{error}</span>
            <button type="button" onClick={() => loadCsv(rejectedSample)}>
              Restore sample data
            </button>
          </div>
        ) : null}
        {!result && !error ? (
          <div className="empty-result">
            <span>NO RECEIPT YET</span>
            <p>
              Run the supplied rejected sample to see row-level repair
              instructions.
            </p>
          </div>
        ) : null}
        {result ? (
          <div className={`receipt ${result.releaseState}`}>
            <header>
              <div>
                <span>DRY RUN RECEIPT</span>
                <strong>{result.releaseState.toUpperCase()}</strong>
              </div>
              <p>
                {result.releaseState === "ready"
                  ? "The supplied rows satisfy this contract."
                  : result.releaseState === "review"
                    ? "Warnings need an import-owner decision."
                    : "Repair blocking rows before production import."}
              </p>
            </header>
            <dl className="summary-grid">
              <div>
                <dt>Data rows</dt>
                <dd>{result.summary.dataRows}</dd>
              </div>
              <div>
                <dt>Valid</dt>
                <dd>{result.summary.validRows}</dd>
              </div>
              <div>
                <dt>Invalid</dt>
                <dd>{result.summary.invalidRows}</dd>
              </div>
              <div>
                <dt>Errors</dt>
                <dd>{result.summary.errors}</dd>
              </div>
              <div>
                <dt>Warnings</dt>
                <dd>{result.summary.warnings}</dd>
              </div>
            </dl>
            <div className="finding-region">
              <div className="finding-heading">
                <h3>Finding ledger</h3>
                <span>
                  {result.findings.length} finding
                  {result.findings.length === 1 ? "" : "s"}
                </span>
              </div>
              {result.findings.length === 0 ? (
                <p className="accepted-note">
                  No contract violations found in the supplied rows.
                </p>
              ) : (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Row</th>
                        <th>Column</th>
                        <th>Rule</th>
                        <th>Severity</th>
                        <th>Finding / repair</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.findings.map((finding, index) => (
                        <tr
                          key={`${finding.rule}-${finding.row}-${finding.column}-${index}`}
                        >
                          <td>{finding.row ?? "—"}</td>
                          <td>{finding.column ?? "—"}</td>
                          <td>
                            <code>{finding.rule}</code>
                          </td>
                          <td>
                            <span className={`severity ${finding.severity}`}>
                              {finding.severity}
                            </span>
                          </td>
                          <td>
                            <strong>{finding.message}</strong>
                            <small>{finding.repair}</small>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="outputs">
              <article>
                <div>
                  <span>import-dry-run.json</span>
                  <button
                    type="button"
                    onClick={() => void copyOutput("artifact", artifact)}
                  >
                    {copied === "artifact" ? "Copied" : "Copy artifact"}
                  </button>
                </div>
                <pre>{artifact}</pre>
              </article>
              <article>
                <div>
                  <span>errors-only.csv</span>
                  <button
                    type="button"
                    onClick={() => void copyOutput("report", report)}
                  >
                    {copied === "report" ? "Copied" : "Copy error CSV"}
                  </button>
                </div>
                <pre>{report}</pre>
              </article>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
