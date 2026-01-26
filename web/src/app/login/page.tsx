import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";

function LoginFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
