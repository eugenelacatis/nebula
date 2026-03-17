'use client';

import { useAppStore } from '@/store/appStore';

export default function HUD() {
  const phase = useAppStore((s) => s.phase);
  const metadata = useAppStore((s) => s.metadata);

  if (phase === 'idle' || !metadata) return null;

  return (
    <div
      className="fixed top-6 left-6 pointer-events-none select-none"
      style={{ zIndex: 20 }}
    >
      <h1 className="text-white/80 text-xl font-light tracking-wide">
        {metadata.title}
      </h1>
      <p className="text-white/40 text-sm mt-1">
        {metadata.artist}
      </p>
    </div>
  );
}
