"use client";

import { useAudioStore } from "@/store/audioStore";

export default function HUD() {
  const beat = useAudioStore((s) => s.features.beat);

  if (!beat) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-10"
      style={{
        background:
          "radial-gradient(ellipse at center, transparent 60%, rgba(100,150,255,0.12) 100%)",
      }}
    />
  );
}
