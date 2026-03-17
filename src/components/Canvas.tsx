'use client';

import dynamic from 'next/dynamic';

const CanvasScene = dynamic(() => import('./CanvasScene'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 bg-[#0a0a1a]" />
  ),
});

export default function Canvas() {
  return <CanvasScene />;
}
