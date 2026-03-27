import { CreateHeader } from "@/features/jobs/componets/create-header";
import { SelfOnboardingForm } from "@/features/jobs/componets/forms/self-onboarding/self-onboarding-form";
import ShifConfigForm from "@/features/jobs/componets/forms/shif-config";
import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ workflowId: string }>;
  searchParams: Promise<{ type?: string }>;
}

const Page = async ({ params, searchParams }: Props) => {
  const { workflowId } = await params;
  const { type } = await searchParams;

  if (!type) redirect(`/workflows/${workflowId}`);

  return (
    <div>
      <CreateHeader workflowId={workflowId} type={type!} />
      <div className="py-6">
        {type === "self_onboarding" && (
          <SelfOnboardingForm workflowId={workflowId} type={type} />
        )}
        {type === "shif_config" && <ShifConfigForm workflowId={workflowId} />}
      </div>
    </div>
  );
};

export default Page;
