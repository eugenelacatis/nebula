'use client';

import { useMemo, useState } from 'react';
import { DEFAULT_SCENE_CONFIG, SceneConfig, clampConfig } from '@/config/sceneConfig';
import { useAppStore } from '@/store/appStore';
import { useSceneStore } from '@/store/sceneStore';

type NumericKey =
  | 'starDensity'
  | 'bloomStrengthBase'
  | 'warpSpeedBase'
  | 'streakLengthMultiplier'
  | 'cameraShakeIntensity'
  | 'cosmicTension'
  | 'nebulaIntensity';

const numericControls: Array<{
  key: NumericKey;
  label: string;
  min: number;
  max: number;
  step: number;
}> = [
  { key: 'starDensity', label: 'Star Density', min: 0.1, max: 0.8, step: 0.01 },
  { key: 'bloomStrengthBase', label: 'Bloom Base', min: 0, max: 0.6, step: 0.01 },
  { key: 'warpSpeedBase', label: 'Warp Speed', min: 0.3, max: 2, step: 0.01 },
  { key: 'streakLengthMultiplier', label: 'Streak Length', min: 0.2, max: 1.5, step: 0.01 },
  { key: 'cameraShakeIntensity', label: 'Camera Shake', min: 0, max: 0.5, step: 0.01 },
  { key: 'cosmicTension', label: 'Cosmic Tension', min: 0, max: 1, step: 0.01 },
  { key: 'nebulaIntensity', label: 'Nebula Intensity', min: 0, max: 0.5, step: 0.01 },
];

const colorControls: Array<{ key: keyof Pick<SceneConfig, 'primaryColor' | 'secondaryColor' | 'accentColor'>; label: string }> = [
  { key: 'primaryColor', label: 'Primary' },
  { key: 'secondaryColor', label: 'Secondary' },
  { key: 'accentColor', label: 'Accent' },
];

function formatValue(value: number): string {
  return value.toFixed(2);
}

export default function DebugPanel() {
  const phase = useAppStore((state) => state.phase);
  const config = useSceneStore((state) => state.config);
  const patchConfig = useSceneStore((state) => state.patchConfig);
  const setConfig = useSceneStore((state) => state.setConfig);
  const [isOpen, setIsOpen] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  const exportPayload = useMemo(() => JSON.stringify(clampConfig(config), null, 2), [config]);
  const defaultSnippet = useMemo(() => {
    return `export const DEFAULT_SCENE_CONFIG: SceneConfig = ${exportPayload};`;
  }, [exportPayload]);

  if (phase === 'loading') {
    return null;
  }

  const handleNumericChange = (key: NumericKey, value: number) => {
    patchConfig(clampConfig({ ...config, [key]: value }));
  };

  const handleColorChange = (
    key: keyof Pick<SceneConfig, 'primaryColor' | 'secondaryColor' | 'accentColor'>,
    value: string
  ) => {
    patchConfig({ [key]: value } as Partial<SceneConfig>);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportPayload);
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 1500);
    } catch {
      setCopyState('failed');
      window.setTimeout(() => setCopyState('idle'), 1500);
    }
  };

  const handleCopyDefaults = async () => {
    try {
      await navigator.clipboard.writeText(defaultSnippet);
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 1500);
    } catch {
      setCopyState('failed');
      window.setTimeout(() => setCopyState('idle'), 1500);
    }
  };

  return (
    <div className="fixed top-6 right-6 z-30 flex flex-col items-end gap-3 select-none">
      <button
        onClick={() => setIsOpen((open) => !open)}
        className="rounded-full border border-white/20 bg-black/45 px-4 py-2 text-xs tracking-[0.25em] text-white/70 backdrop-blur-md transition-colors hover:bg-black/60 hover:text-white"
      >
        {isOpen ? 'CLOSE TUNER' : 'OPEN TUNER'}
      </button>

      {isOpen && (
        <div className="w-[320px] rounded-2xl border border-white/10 bg-black/70 p-4 text-white/80 shadow-2xl backdrop-blur-md">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs tracking-[0.28em] text-white/35">LIVE TUNING</p>
              <p className="mt-1 text-sm text-white/55">Adjust visually, then copy the JSON and send it to me.</p>
            </div>
            <button
              onClick={() => setConfig({ ...DEFAULT_SCENE_CONFIG })}
              className="rounded-md border border-white/10 px-2 py-1 text-[10px] tracking-[0.2em] text-white/55 transition-colors hover:bg-white/10 hover:text-white"
            >
              RESET
            </button>
          </div>

          <div className="space-y-3">
            {numericControls.map((control) => (
              <label key={control.key} className="block">
                <div className="mb-1 flex items-center justify-between text-xs text-white/60">
                  <span>{control.label}</span>
                  <span>{formatValue(config[control.key])}</span>
                </div>
                <input
                  type="range"
                  min={control.min}
                  max={control.max}
                  step={control.step}
                  value={config[control.key]}
                  onChange={(event) => handleNumericChange(control.key, parseFloat(event.target.value))}
                  className="w-full accent-white"
                />
              </label>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {colorControls.map((control) => (
              <label key={control.key} className="flex flex-col gap-1 text-[11px] text-white/55">
                <span>{control.label}</span>
                <input
                  type="color"
                  value={config[control.key]}
                  onChange={(event) => handleColorChange(control.key, event.target.value)}
                  className="h-9 w-full cursor-pointer rounded border border-white/10 bg-transparent"
                />
              </label>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleCopy}
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs tracking-[0.2em] text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              COPY JSON
            </button>
            <button
              onClick={handleCopyDefaults}
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs tracking-[0.2em] text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              COPY DEFAULTS
            </button>
          </div>

          <div className="mt-3 rounded-lg border border-white/10 bg-black/30 p-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">Status</p>
            <p className="mt-1 text-xs text-white/55">
              {copyState === 'copied' && 'Copied to clipboard.'}
              {copyState === 'failed' && 'Clipboard copy failed. I can add a textarea fallback if needed.'}
              {copyState === 'idle' && 'Tune the scene, copy the config, and paste it here for me to promote to defaults.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
