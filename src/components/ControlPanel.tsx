"use client";

import { useState } from "react";
import { useSceneStore } from "@/store/sceneStore";

export default function ControlPanel() {
  const [open, setOpen] = useState(false);
  const { config, setSceneConfig } = useSceneStore();

  const update = (key: keyof typeof config, value: number) => {
    setSceneConfig({ ...config, [key]: value });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        onClick={() => setOpen((v) => !v)}
        className="bg-white/10 hover:bg-white/20 text-white rounded-full w-10 h-10 flex items-center justify-center text-lg transition-colors"
      >
        ⚙
      </button>

      {open && (
        <div className="absolute bottom-12 right-0 bg-black/70 backdrop-blur-sm rounded-xl p-4 w-56 text-white text-xs space-y-3">
          <p className="font-semibold text-sm mb-2">Controls</p>

          <label className="flex flex-col gap-1">
            <span>Bloom ({config.bloomStrengthBase.toFixed(1)})</span>
            <input
              type="range"
              min={0}
              max={3}
              step={0.1}
              value={config.bloomStrengthBase}
              onChange={(e) => update("bloomStrengthBase", parseFloat(e.target.value))}
              className="accent-blue-400"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span>Warp Speed ({config.warpSpeedBase.toFixed(1)})</span>
            <input
              type="range"
              min={0.5}
              max={3}
              step={0.1}
              value={config.warpSpeedBase}
              onChange={(e) => update("warpSpeedBase", parseFloat(e.target.value))}
              className="accent-blue-400"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span>Camera Shake ({config.cameraShakeIntensity.toFixed(1)})</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={config.cameraShakeIntensity}
              onChange={(e) => update("cameraShakeIntensity", parseFloat(e.target.value))}
              className="accent-blue-400"
            />
          </label>
        </div>
      )}
    </div>
  );
}
