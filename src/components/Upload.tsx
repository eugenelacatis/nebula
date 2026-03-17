'use client';

import { useCallback, useRef, useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { AudioPipeline } from '@/audio/AudioPipeline';
import { extractMetadata } from '@/lib/metadata';
import { transitionToConfig } from '@/lib/transitions';
import { clampConfig } from '@/config/sceneConfig';
import type { SceneSeedResponse } from '@/config/apiContract';

const ACCEPTED_TYPES = ['audio/mpeg', 'audio/mp3'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

let audioPipeline: AudioPipeline | null = null;

export default function Upload() {
  const phase = useAppStore((s) => s.phase);
  const setPhase = useAppStore((s) => s.setPhase);
  const setMetadata = useAppStore((s) => s.setMetadata);
  const setAudioUrl = useAppStore((s) => s.setAudioUrl);
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

    // Extract metadata
    const metadata = await extractMetadata(file);
    setMetadata(metadata);
    console.log('[Upload] Metadata:', metadata.title, '-', metadata.artist);

    // Create object URL for audio element
    const url = URL.createObjectURL(file);
    setAudioUrl(url);

    // Init audio pipeline
    if (audioPipeline) {
      audioPipeline.dispose();
    }
    audioPipeline = new AudioPipeline();
    await audioPipeline.init(url);
    audioPipeline.start();

    // Fire scene seed request (non-blocking, 3s timeout)
    fetchSceneSeed(metadata.title, metadata.artist);

    setPhase('active');
  }, [setPhase, setMetadata, setAudioUrl]);

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
      transitionToConfig(clamped);
      console.log('[Upload] Scene seed applied. From AI:', data.fromAI);
    } catch (err) {
      clearTimeout(timeoutId);
      console.warn('[Upload] Scene seed fetch failed or timed out, using defaults.', err);
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
        <p className="text-white/70 text-lg font-light tracking-wide">
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
