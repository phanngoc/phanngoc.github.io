'use client';

import dynamic from 'next/dynamic';

const HRMFlow = dynamic(() => import('@/app/components/HRMFlow'), {
  ssr: false,
});

export default function HRMFlowWrapper() {
  return <HRMFlow />;
}

