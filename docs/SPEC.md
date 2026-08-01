# ImportDryRun 0.1 specification

## Outcome

A user pastes a CSV candidate and JSON contract, runs a check, and receives a release state, row counts, a finding ledger, a redacted JSON artifact, and an errors-only CSV report. The source data stays in the browser.

## Inputs

- CSV text up to 1,000,000 characters and 5,000 data rows.
- A JSON contract with 1–100 unique column definitions.
- Column rules: `name`, `type`, `required`, `unique`, `values`, `min`, `max`, and `pattern`.
- File rules: `allowExtraColumns`, `trimWhitespace`, and `formulaPolicy`.

## Parsing and validation

- Parse comma-delimited records, CRLF or LF boundaries, quoted commas and line breaks, and doubled quotes.
- Reject unclosed quotes and unexpected characters around quoted fields.
- Check duplicate, missing, and disallowed extra headers.
- Check row field counts, required cells, type shape, enums, patterns, numeric or text bounds, and uniqueness.
- Recognize strict ISO calendar dates in `YYYY-MM-DD` form.
- Recognize formula-trigger prefixes described by OWASP and apply the contract's `block`, `warn`, or `allow` policy.

## Output contract

- `blocked`: at least one critical or high finding.
- `review`: medium findings only.
- `ready`: no findings.
- Findings include row, column, rule, severity, message, and repair guidance.
- Findings, JSON artifact, analytics, and error CSV never include source cell values.
- The JSON artifact contains version, release state, counts, column names and types, extra-column policy, and formula policy.

## Recovery states

- Empty CSV: ask the user to paste a file and offer sample restoration.
- Invalid JSON or contract: name the first contract error without running the file.
- Malformed CSV: name the parsing boundary without echoing the field.
- Oversized input: report the relevant product limit.

## Acceptance

- The rejected sample produces a blocked receipt with exact row and column findings.
- The accepted sample produces a ready receipt with zero findings.
- Formula-like cell content is detected but never reproduced in output artifacts.
- Quoted commas, quoted line breaks, doubled quotes, CRLF, BOM headers, and trailing line endings parse deterministically.
- Formatting, lint, TypeScript, unit tests, production build, signature audit, secret scan, static safety review, and browser checks pass.
