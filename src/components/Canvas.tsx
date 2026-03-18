'use client';

import { useEffect, useRef } from 'react';
import { SceneManager } from '@/three/SceneManager';

let sceneManagerInstance: SceneManager | null = null;

export function getSceneManager(): SceneManager | null {
  return sceneManagerInstance;
}

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const manager = new SceneManager(canvasRef.current);
    sceneManagerInstance = manager;

    return () => {
      manager.dispose();
      sceneManagerInstance = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
      }}
    />
  );
}
