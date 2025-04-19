import { Suspense } from "react";
import ResetPasswordConfirm from "@/app/components/layout/ResetPasswordConfirm";

export default function Page() {
  return (
    <Suspense fallback={<div className="text-center p-8">Loading...</div>}>
      <ResetPasswordConfirm />
    </Suspense>
  );
}
