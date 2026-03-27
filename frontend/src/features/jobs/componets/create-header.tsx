"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface CreateHeaderProps {
  workflowId: string;
  type: string;
}

const TYPE_LABELS: Record<string, string> = {
  self_onboarding: "Self Onboarding",
  shif_config: "SHIF Configuration",
};

export const CreateHeader = ({ workflowId, type }: CreateHeaderProps) => {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={() => router.push(`/workflows/${workflowId}`)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit py-2"
      >
        <ArrowLeft size={12} /> Back to workflow
      </button>
      <h1 className="text-lg font-semibold tracking-tight">
        New {TYPE_LABELS[type] ?? type} Job
      </h1>
      <p className="text-sm text-muted-foreground">
        Configure and attach this job to your workflow.
      </p>
    </div>
  );
};
