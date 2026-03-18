'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/appStore';
import { useAudioStore } from '@/store/audioStore';

const BAR_COUNT = 64;
const WIDTH = 200;
const HEIGHT = 60;

export default function Waveform() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const phase = useAppStore((s) => s.phase);

  useEffect(() => {
    if (phase !== 'active') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      const { frequencyData } = useAudioStore.getState();
      ctx.clearRect(0, 0, WIDTH, HEIGHT);

      const step = Math.floor(frequencyData.length / BAR_COUNT);
      const barWidth = WIDTH / BAR_COUNT - 1;

      for (let i = 0; i < BAR_COUNT; i++) {
        const val = frequencyData[i * step] / 255;
        const barH = val * HEIGHT;
        const x = i * (barWidth + 1);
        ctx.fillStyle = `rgba(168, 85, 247, ${0.4 + val * 0.6})`;
        ctx.fillRect(x, HEIGHT - barH, barWidth, barH);
      }
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [phase]);

  if (phase !== 'active') return null;

  return (
    <canvas
      ref={canvasRef}
      width={WIDTH}
      height={HEIGHT}
      style={{
        position: 'fixed',
        bottom: '32px',
        right: '32px',
        zIndex: 10,
        opacity: 0.8,
      }}
    />
  );
}
