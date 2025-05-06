import { Suspense } from 'react';
import Activate from '@/app/components/layout/Activate';

export default function ActivatePage() {
  return (
    <Suspense fallback={<div>Loading....</div>}>
      <Activate />
    </Suspense>
  )
}