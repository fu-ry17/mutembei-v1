"use client";

import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, RefreshCw, ArrowLeftRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend,
} from "@/components/ui/field";
import {
  DATA_SOURCE_FIELDS,
  DEFAULT_ROWS,
  formSchema,
  FormValues,
  LevelKey,
  LEVELS,
} from "./charge-config";
import { useCreateUpdateJob } from "@/features/jobs/hooks/use-create-update";
import { useRouter } from "next/navigation";

interface ChargeLevelProps {
  fieldKey: LevelKey;
  label: string;
  form: ReturnType<typeof useForm<FormValues>>;
  disabled?: boolean;
}

const ChargeLevel = ({ fieldKey, label, form, disabled }: ChargeLevelProps) => {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: fieldKey,
  });

  return (
    <FieldSet className="gap-2.5">
      <div className="flex items-center justify-between mb-1">
        <FieldLegend
          variant="label"
          className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium"
        >
          {label}
        </FieldLegend>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="h-6 text-[11px] gap-1 px-2 text-muted-foreground hover:text-foreground"
          onClick={() => append({ name: "", amount: 0 })}
        >
          <Plus className="w-3 h-3" /> Add
        </Button>
      </div>

      <FieldGroup className="gap-1.5">
        {fields.length === 0 && (
          <p className="text-xs text-muted-foreground py-3 text-center border border-dashed border-border rounded-lg">
            No charges — click Add
          </p>
        )}
        {fields.map((field, index) => (
          <div key={field.id} className="flex items-center gap-2">
            <Controller
              name={`${fieldKey}.${index}.name`}
              control={form.control}
              render={({ field, fieldState }) => (
                <Field
                  data-invalid={fieldState.invalid}
                  className="flex-1 min-w-0"
                >
                  <Input
                    {...field}
                    disabled={disabled}
                    aria-invalid={fieldState.invalid}
                    placeholder="Charge name"
                    className="h-8 text-xs"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] font-mono text-muted-foreground">
                KSH
              </span>
              <Controller
                name={`${fieldKey}.${index}.amount`}
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field
                    data-invalid={fieldState.invalid}
                    className="w-16 shrink-0"
                  >
                    <Input
                      {...field}
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      type="number"
                      min={0}
                      disabled={disabled}
                      placeholder="0"
                      aria-invalid={fieldState.invalid}
                      className="w-16 h-8 text-xs text-right font-mono px-1"
                    />
                  </Field>
                )}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => remove(index)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        ))}
      </FieldGroup>
    </FieldSet>
  );
};

export const ShifConfigForm = ({ workflowId }: { workflowId: string }) => {
  const router = useRouter();
  const { mutate: save, isPending } = useCreateUpdateJob();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sheet_id: "",
      benefits_gid: "",
      facility_gid: "",
      county: "",
      assignee: "",
      l2: DEFAULT_ROWS,
      l3: DEFAULT_ROWS,
      l4: DEFAULT_ROWS,
      l5: DEFAULT_ROWS,
    },
  });

  const syncFromL2 = () => {
    const l2 = form.getValues("l2");
    (["l3", "l4", "l5"] as const).forEach((k) =>
      form.setValue(
        k,
        l2.map((r) => ({ ...r })),
      ),
    );
  };

  const onSubmit = async (values: FormValues) => {
    const payload = {
      title: `${values.county}_Shif_Config`,
      description: `${values.county}_shif_config ${new Date().toLocaleString()}`,
      type: "shif_config" as const,
      status: "pending",
      workflow_id: workflowId,
      extra: {
        sheet_id: values.sheet_id,
        benefits_gid: values.benefits_gid,
        facility_gid: values.facility_gid,
        county: values.county,
        assignee: values.assignee,
        l2: values.l2,
        l3: values.l3,
        l4: values.l4,
        l5: values.l5,
      },
    };

    save(
      { ...payload },
      {
        onSuccess: () => {
          router.push(`/workflows/${workflowId}`);
        },
      },
    );
  };

  return (
    <form
      id="shif-config-form"
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-6"
    >
      {/* Data Source */}
      <div className="flex flex-col gap-4">
        <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          Data source
        </p>

        <Controller
          name="sheet_id"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="sheet_id" className="text-sm">
                Google Sheet ID
              </FieldLabel>
              <Input
                {...field}
                id="sheet_id"
                disabled={isPending}
                aria-invalid={fieldState.invalid}
                placeholder="1rJBjTHT12dj29hjKmkFhUaL4EX7teS99..."
                className="font-mono text-xs h-9"
              />
              <FieldDescription className="text-[11px]">
                Found in the URL between <span className="font-mono">/d/</span>{" "}
                and <span className="font-mono">/edit</span>
              </FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <div className="grid grid-cols-2 gap-3">
          {DATA_SOURCE_FIELDS.map(({ name, label, placeholder, mono }) => (
            <Controller
              key={name}
              name={name}
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={name} className="text-sm">
                    {label}
                  </FieldLabel>
                  <Input
                    {...field}
                    id={name}
                    disabled={isPending}
                    aria-invalid={fieldState.invalid}
                    placeholder={placeholder}
                    className={`h-9 ${mono ? "font-mono text-xs" : "text-sm"}`}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          ))}
        </div>
      </div>

      <Separator />

      {/* Charge Configuration */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Charge configuration
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            className="h-7 text-xs gap-1.5"
            onClick={syncFromL2}
          >
            <ArrowLeftRight className="w-3 h-3" /> Sync L2 → All
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {LEVELS.map((level) => (
            <ChargeLevel
              key={level.key}
              fieldKey={level.key}
              label={level.label}
              form={form}
              disabled={isPending}
            />
          ))}
        </div>
      </div>

      <Separator />

      {/* Actions */}
      <div className="flex items-center gap-3 justify-end">
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          className="p-4 text-xs"
          onClick={() => form.reset()}
        >
          Reset
        </Button>
        <Button
          type="submit"
          className="p-4 gap-2 text-xs text-white"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Running…
            </>
          ) : (
            <>Save Changes</>
          )}
        </Button>
      </div>
    </form>
  );
};

export default ShifConfigForm;
