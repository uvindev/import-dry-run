import { z } from "zod";

const columnSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    type: z.enum([
      "string",
      "email",
      "integer",
      "decimal",
      "boolean",
      "date",
      "enum",
    ]),
    required: z.boolean().optional(),
    unique: z.boolean().optional(),
    values: z.array(z.string().max(200)).max(200).optional(),
    min: z.number().finite().optional(),
    max: z.number().finite().optional(),
    pattern: z.string().max(300).optional(),
  })
  .superRefine((column, context) => {
    if (
      column.type === "enum" &&
      (!column.values || column.values.length === 0)
    ) {
      context.addIssue({
        code: "custom",
        message: "Enum columns require at least one value.",
        path: ["values"],
      });
    }
    if (
      column.min !== undefined &&
      column.max !== undefined &&
      column.min > column.max
    ) {
      context.addIssue({
        code: "custom",
        message: "Minimum cannot be greater than maximum.",
        path: ["min"],
      });
    }
  });

export const importContractSchema = z.object({
  columns: z.array(columnSchema).min(1).max(100),
  allowExtraColumns: z.boolean(),
  trimWhitespace: z.boolean(),
  formulaPolicy: z.enum(["block", "warn", "allow"]),
});

export const auditInputSchema = z.object({
  csvText: z
    .string()
    .min(1, "Paste a CSV file before running the check.")
    .max(1_000_000),
  contractText: z
    .string()
    .min(1, "Paste a JSON contract before running the check.")
    .max(100_000),
});
