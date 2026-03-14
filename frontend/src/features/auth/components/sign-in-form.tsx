"use client";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { FcGoogle } from "react-icons/fc";

export const SignInForm = () => {
  const handleGoogleSignIn = async () => {
    await authClient.signIn.social({
      provider: "google",
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to your account to continue
        </p>
      </div>

      <Button
        variant="outline"
        className="w-full h-11 gap-3 font-medium"
        onClick={handleGoogleSignIn}
      >
        <FcGoogle className="size-5" />
        Continue with Google
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        By continuing, you agree to our{" "}
        <a
          href="/terms"
          className="underline underline-offset-4 hover:text-foreground transition-colors"
        >
          Terms of Service
        </a>{" "}
        and{" "}
        <a
          href="/privacy"
          className="underline underline-offset-4 hover:text-foreground transition-colors"
        >
          Privacy Policy
        </a>
      </p>
    </div>
  );
};
