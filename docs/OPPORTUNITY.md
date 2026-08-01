# ImportDryRun opportunity

## Selected problem

Support, onboarding, and operations teams receive customer CSV files that fail only after reaching a production importer. A file can be valid CSV while violating the destination's required columns, types, enum values, uniqueness constraints, or spreadsheet-formula policy. The repair loop then crosses customer, support, and engineering teams.

ImportDryRun gives the receiving team a deterministic local check before production. It returns row and column locations with repair rules, not customer cell values.

## Why this candidate

The CSV importer market establishes budget for pre-import validation. Dromo lists a Professional plan at $599 per month for 250 imports and includes browser-side processing; OneSchema and Flatfile sell broader validation and import infrastructure through sales-led pricing. ImportDryRun takes a narrower position: a local receiving-desk check that works before a team changes its importer.

Alternative candidates were rejected:

- OAuth redirect review depends heavily on provider dashboards and exact deployment configuration. A static checker would have a weak evidence boundary.
- DMARC simulation enters a mature monitoring category and needs external DNS and mail telemetry to be useful.

## Buyer and moment

The target buyer is the person accountable for import acceptance: support lead, onboarding engineer, implementation consultant, or operations owner. The trigger is a customer file about to enter a production import job.

## Commercial hypothesis

The free product checks one file in one browser tab. Team would add shared and versioned contracts, branded customer intake links, run history, API access, and CI release gates at [TARGET] $29 per team per month. Price, demand, payment conversion, and revenue are unverified.

## Evidence

- RFC 4180 defines the common CSV record, header, quoting, embedded comma, embedded line break, and doubled-quote format used by the parser: https://www.rfc-editor.org/rfc/rfc4180
- OWASP documents spreadsheet formula triggers including equals, plus, minus, at sign, tab, carriage return, and line feed, while warning that no single sanitization approach is universal: https://owasp.org/www-community/attacks/CSV_Injection
- Dromo pricing and browser-processing claims: https://dromo.io/pricing
- OneSchema validation and pricing context: https://www.oneschema.co/pricing
- Flatfile commercial context: https://flatfile.com/pricing/

Sources were reviewed on 2026-08-01.
