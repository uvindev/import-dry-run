/**
 * @project  ImportDryRun — iamuvin.com
 * @author   Uvin Vindula (IAMUVIN)
 * @website  https://iamuvin.com
 * @company  ASI Research Labs — asiresearch.io
 * @built    2026
 * @license  Proprietary — all rights reserved
 */
import type { ParsedCsv } from "@/lib/import/types";

export class CsvParseError extends Error {}

export function parseCsv(source: string): ParsedCsv {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let closedQuote = false;

  const finishField = () => {
    row.push(field);
    field = "";
    closedQuote = false;
  };
  const finishRow = () => {
    finishField();
    rows.push(row);
    row = [];
  };

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (quoted) {
      if (character === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
        closedQuote = true;
      } else {
        field += character;
      }
      continue;
    }
    if (
      closedQuote &&
      character !== "," &&
      character !== "\r" &&
      character !== "\n"
    ) {
      throw new CsvParseError("Unexpected character after a closing quote.");
    }
    if (character === '"') {
      if (field.length > 0)
        throw new CsvParseError("Unexpected quote inside an unquoted field.");
      quoted = true;
    } else if (character === ",") {
      finishField();
    } else if (character === "\r" || character === "\n") {
      if (character === "\r" && next === "\n") index += 1;
      finishRow();
    } else {
      field += character;
    }
  }

  if (quoted) throw new CsvParseError("The CSV ends inside a quoted field.");
  if (field.length > 0 || row.length > 0 || closedQuote) finishRow();
  if (rows[0]?.[0]) rows[0][0] = rows[0][0].replace(/^\uFEFF/, "");
  return { rows };
}
