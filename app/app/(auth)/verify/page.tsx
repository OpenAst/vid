import { Suspense } from "react";
import Verify from "@/app/components/layout/Verify";

export default function Page() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen">🔄 Loading...</div>}>
      <Verify/>
    </Suspense>
  );
}
