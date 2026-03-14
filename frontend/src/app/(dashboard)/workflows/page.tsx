import WorkflowClient from "@/features/workflows/components/workflow-client";
import { Suspense } from "react";

const Page = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <WorkflowClient />
    </Suspense>
  );
};

export default Page;
