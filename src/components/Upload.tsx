'use client';

import { useCallback, useRef, useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { useSceneStore } from '@/store/sceneStore';
import { AudioPipeline } from '@/audio/AudioPipeline';
import { pipelineRef } from '@/audio/pipelineRef';
import { extractMetadata } from '@/lib/metadata';
import { transitionToConfig } from '@/lib/transitions';
import { clampConfig, DEFAULT_SCENE_CONFIG } from '@/config/sceneConfig';
import { seedConfigFromSong } from '@/lib/colorSeed';
import type { SceneSeedResponse } from '@/config/apiContract';

const ACCEPTED_TYPES = ['audio/mpeg', 'audio/mp3'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

function pickIdentityFields(config: Partial<SceneSeedResponse['config']>) {
  return {
    primaryColor: config.primaryColor,
    secondaryColor: config.secondaryColor,
    accentColor: config.accentColor,
    mood: config.mood,
  };
}

export default function Upload() {
  const phase = useAppStore((s) => s.phase);
  const setPhase = useAppStore((s) => s.setPhase);
  const setMetadata = useAppStore((s) => s.setMetadata);
  const setAudioUrl = useAppStore((s) => s.setAudioUrl);
  const reset = useAppStore((s) => s.reset);
  const patchConfig = useSceneStore((s) => s.patchConfig);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type) && !file.name.endsWith('.mp3')) {
      alert('Please drop an MP3 file.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      alert('File too large. Maximum 50MB.');
      return;
    }

    setPhase('loading');

    const metadata = await extractMetadata(file);
    setMetadata(metadata);

    const seeded = clampConfig({
      ...DEFAULT_SCENE_CONFIG,
      ...seedConfigFromSong(metadata.title, metadata.artist),
    });
    patchConfig(pickIdentityFields(seeded));

    const url = URL.createObjectURL(file);
    setAudioUrl(url);

    if (pipelineRef.current) {
      pipelineRef.current.dispose();
    }
    pipelineRef.current = new AudioPipeline();
    await pipelineRef.current.init(url);

    pipelineRef.current.onEnded = () => {
      pipelineRef.current?.dispose();
      pipelineRef.current = null;
      reset();
    };

    pipelineRef.current.start();

    fetchSceneSeed(metadata.title, metadata.artist);
    setPhase('active');
  }, [patchConfig, reset, setAudioUrl, setMetadata, setPhase]);

  const fetchSceneSeed = async (title: string, artist: string) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    try {
      const res = await fetch('/api/scene-seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, artist }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data: SceneSeedResponse = await res.json();
      const clamped = clampConfig(data.config);
      transitionToConfig(clamped, { preserveTunedValues: true });
    } catch {
      // Color seed already applied, no action needed
    }
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  if (phase !== 'idle') return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 10 }}
    >
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          cursor-pointer select-none
          border-2 border-dashed rounded-2xl
          px-12 py-16 text-center
          transition-all duration-300 ease-out
          backdrop-blur-sm
          ${dragOver
            ? 'border-white/60 bg-white/10 scale-105'
            : 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/8'
          }
        `}
      >
        <div className="mb-4 text-white/20 text-4xl select-none">✦</div>
        <p className="text-white/70 text-lg font-light tracking-wide animate-pulse-slow">
          Drop an MP3 to begin
        </p>
        <p className="text-white/30 text-sm mt-2">
          or click to browse
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp3,audio/mpeg"
          onChange={onFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
}
