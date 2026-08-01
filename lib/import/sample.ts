/** @author Uvin Vindula (IAMUVIN) @website https://iamuvin.com */
export const sampleContract = JSON.stringify(
  {
    columns: [
      {
        name: "customer_id",
        type: "string",
        required: true,
        unique: true,
        pattern: "^CUS-[0-9]{4}$",
      },
      { name: "email", type: "email", required: true, unique: true },
      {
        name: "plan",
        type: "enum",
        required: true,
        values: ["starter", "pro", "enterprise"],
      },
      { name: "seats", type: "integer", required: true, min: 1, max: 500 },
      { name: "start_date", type: "date", required: true },
      { name: "notes", type: "string", max: 80 },
    ],
    allowExtraColumns: false,
    trimWhitespace: true,
    formulaPolicy: "block",
  },
  null,
  2,
);

export const rejectedSample = `customer_id,email,plan,seats,start_date,notes,unexpected
CUS-0001,alice@example.com,pro,10,2026-08-01,ready,x
CUS-0001,bad-email,gold,0,01/08/2026,"=HYPERLINK(""https://bad.example"")",x
,carol@example.com,starter,3,2026-02-30,ok,x
CUS-04,carol@example.com,starter,501,2026-08-04,ok,x`;

export const acceptedSample = `customer_id,email,plan,seats,start_date,notes
CUS-0001,alice@example.com,pro,10,2026-08-01,"prefers email"
CUS-0002,bob@example.com,starter,2,2026-08-03,"ready"
CUS-0003,carol@example.com,enterprise,125,2026-08-04,"London team"`;
