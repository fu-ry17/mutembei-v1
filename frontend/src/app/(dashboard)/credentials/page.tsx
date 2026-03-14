import { CredentialsClient } from "@/features/credentials/components/credentials-client";
import { requireAuth } from "@/lib/auth-util";

const Page = async () => {
  await requireAuth();

  return <CredentialsClient />;
};

export default Page;
