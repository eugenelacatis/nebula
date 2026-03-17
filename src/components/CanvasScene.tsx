'use client';

import { useEffect, useRef } from 'react';
import { SceneManager } from '@/three/SceneManager';

export default function CanvasScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<SceneManager | null>(null);

  useEffect(() => {
    if (!containerRef.current || managerRef.current) return;

    const manager = new SceneManager(containerRef.current);
    managerRef.current = manager;
    manager.start();

    return () => {
      manager.dispose();
      managerRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 w-full h-full"
      style={{ zIndex: 0 }}
    />
  );
}
