'use client';

import { useAppStore } from '@/store/appStore';
import { useSceneStore } from '@/store/sceneStore';
import { pipelineRef } from '@/audio/pipelineRef';
import { useEffect, useRef, useState, useCallback } from 'react';

export default function HUD() {
  const phase = useAppStore((s) => s.phase);
  const metadata = useAppStore((s) => s.metadata);
  const mood = useSceneStore((s) => s.config.mood);
  const [paused, setPaused] = useState(false);
  const [volume, setVolume] = useState(1);
  const waveformRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  // Waveform draw loop
  useEffect(() => {
    if (phase !== 'active') {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    const canvas = waveformRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      const waveform = pipelineRef.current?.getWaveform();
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      if (!waveform) return;

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1.5;
      const sliceWidth = w / waveform.length;
      let x = 0;
      for (let i = 0; i < waveform.length; i++) {
        const v = waveform[i] / 128.0;
        const y = (v * h) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.stroke();
    };
    draw();
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [phase]);

  // Keyboard shortcuts
  useEffect(() => {
    if (phase !== 'active') return;
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (!pipelineRef.current) return;
        const nowPaused = pipelineRef.current.togglePause();
        setPaused(nowPaused);
      } else if (e.code === 'KeyM') {
        const next = volume === 0 ? 1 : 0;
        setVolume(next);
        pipelineRef.current?.setVolume(next);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, volume]);

  // Mouse look — tilt camera on mousemove
  useEffect(() => {
    if (phase !== 'active') return;
    const onMouseMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      (window as Window & { __nebulaMouseLook?: { x: number; y: number } }).__nebulaMouseLook = { x: nx, y: ny };
    };
    window.addEventListener('mousemove', onMouseMove);
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, [phase]);

  const handlePause = useCallback(() => {
    if (!pipelineRef.current) return;
    const nowPaused = pipelineRef.current.togglePause();
    setPaused(nowPaused);
  }, []);

  const handleVolume = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    pipelineRef.current?.setVolume(v);
  }, []);

  // Reset paused state when song changes
  useEffect(() => {
    if (phase === 'active') setPaused(false);
  }, [phase]);

  if (phase === 'idle') return null;

  return (
    <>
      {phase === 'loading' && (
        <div
          className="fixed inset-0 flex items-center justify-center pointer-events-none select-none"
          style={{ zIndex: 20 }}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 rounded-full border-2 border-white/30 border-t-white/80 animate-spin" />
            <p className="text-white/40 text-sm tracking-widest uppercase">Charting course</p>
          </div>
        </div>
      )}

      {phase === 'active' && metadata && (
        <>
          {/* Song info — top left */}
          <div
            className="fixed top-6 left-6 pointer-events-none select-none animate-fade-in"
            style={{ zIndex: 20 }}
          >
            <h1 className="text-white/85 text-xl font-light tracking-wide leading-tight">
              {metadata.title}
            </h1>
            <p className="text-white/45 text-sm mt-1 tracking-wide">{metadata.artist}</p>
            <p className="text-white/20 text-xs mt-2 tracking-widest uppercase">{mood}</p>
          </div>

          {/* Waveform — bottom center */}
          <div
            className="fixed bottom-8 left-1/2 -translate-x-1/2 pointer-events-none"
            style={{ zIndex: 20 }}
          >
            <canvas
              ref={waveformRef}
              width={320}
              height={48}
              className="opacity-60"
            />
          </div>

          {/* Keybind hint — bottom left */}
          <div
            className="fixed bottom-6 left-6 pointer-events-none select-none"
            style={{ zIndex: 20 }}
          >
            <p className="text-white/15 text-xs tracking-widest">SPACE · pause&nbsp;&nbsp;M · mute</p>
          </div>

          {/* Controls — bottom right */}
          <div
            className="fixed bottom-6 right-6 flex items-center gap-4 select-none"
            style={{ zIndex: 20 }}
          >
            {/* Volume */}
            <div className="flex items-center gap-2">
              <span className="text-white/30 text-xs">
                {volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
              </span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.02"
                value={volume}
                onChange={handleVolume}
                className="w-24 h-1 accent-white/60 cursor-pointer opacity-60 hover:opacity-100 transition-opacity"
              />
            </div>

            {/* Pause/Play */}
            <button
              onClick={handlePause}
              className="w-8 h-8 rounded-full border border-white/20 bg-white/5 hover:bg-white/15 transition-colors flex items-center justify-center text-white/60 hover:text-white/90 text-sm"
            >
              {paused ? '▶' : '⏸'}
            </button>
          </div>
        </>
      )}
    </>
  );
}
