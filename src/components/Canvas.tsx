"use client";

import { useEffect, useRef } from "react";
import { SceneManager } from "@/three/SceneManager";

let sceneManager: SceneManager | null = null;

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    sceneManager = new SceneManager();
    sceneManager.init(canvas);

    return () => {
      sceneManager?.dispose();
      sceneManager = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{ width: "100vw", height: "100vh" }}
    />
  );
}
