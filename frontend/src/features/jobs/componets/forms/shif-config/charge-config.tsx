import z from "zod";

export const chargeRowSchema = z.object({
  name: z.string().min(1, "Name required"),
  amount: z.number().min(0),
});

export const formSchema = z.object({
  sheet_id: z.string().min(1, "Sheet ID required"),
  benefits_gid: z.string().min(1, "Required"),
  facility_gid: z.string().min(1, "Required"),
  county: z.string().min(1, "Required"),
  assignee: z.string().min(1, "Required"),
  l2: z.array(chargeRowSchema),
  l3: z.array(chargeRowSchema),
  l4: z.array(chargeRowSchema),
  l5: z.array(chargeRowSchema),
});

export type FormValues = z.infer<typeof formSchema>;
export type LevelKey = "l2" | "l3" | "l4" | "l5";

export const DEFAULT_ROWS = [
  { name: "Inpatient Daily Bed Charge", amount: 0 },
  { name: "Inpatient Daily Service-Units", amount: 0 },
];

export const DATA_SOURCE_FIELDS: {
  name: keyof Pick<
    FormValues,
    "benefits_gid" | "facility_gid" | "county" | "assignee"
  >;
  label: string;
  placeholder: string;
  mono?: boolean;
}[] = [
  {
    name: "benefits_gid",
    label: "Benefits GID",
    placeholder: "e.g. 0",
    mono: true,
  },
  {
    name: "facility_gid",
    label: "Company Level GID",
    placeholder: "e.g. 492649183",
    mono: true,
  },
  { name: "county", label: "County", placeholder: "e.g. Mombasa" },
  { name: "assignee", label: "Assignee", placeholder: "e.g. John Doe" },
];

export const LEVELS: { key: LevelKey; label: string }[] = [
  { key: "l2", label: "Level 2" },
  { key: "l3", label: "Level 3" },
  { key: "l4", label: "Level 4" },
  { key: "l5", label: "Level 5" },
];
