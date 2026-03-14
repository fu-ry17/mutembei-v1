import { AuthWrapper } from "@/features/auth/components/auth-wrapper";
import { SignInForm } from "@/features/auth/components/sign-in-form";
import { requireUnAuth } from "@/lib/auth-util";

const Page = async () => {
  await requireUnAuth();

  return (
    <AuthWrapper>
      <SignInForm />
    </AuthWrapper>
  );
};

export default Page;
