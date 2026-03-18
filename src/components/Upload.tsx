'use client';

import { useRef, useState, useCallback } from 'react';
import { useAppStore } from '@/store/appStore';
import { extractMetadata } from '@/lib/metadata';
import { audioPipeline } from '@/audio/AudioPipeline';
import { applyConfigImmediate, transitionToConfig } from '@/lib/transitions';
import { DEFAULT_SCENE_CONFIG } from '@/config/sceneConfig';

import { getSceneManager } from './Canvas';

export default function Upload() {
  const { phase, setPhase, setSongInfo } = useAppStore();
  const [dragging, setDragging] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|ogg|wav|flac|aac|m4a)$/i)) {
      alert('Please drop an audio file.');
      return;
    }

    setPhase('loading');

    // Snap to default immediately, then smoothly transition in
    applyConfigImmediate(DEFAULT_SCENE_CONFIG);
    transitionToConfig(DEFAULT_SCENE_CONFIG, 2.0);

    // Extract metadata
    const meta = await extractMetadata(file);
    setSongInfo({ title: meta.title, artist: meta.artist });

    // Create audio element
    const audio = new Audio();
    audio.src = URL.createObjectURL(file);
    audio.loop = false;
    audioRef.current = audio;

    // Init audio pipeline
    audioPipeline.init(audio);

    // Start playback
    try {
      await audio.play();
    } catch (e) {
      console.warn('Autoplay blocked:', e);
    }

    setPhase('active');
    getSceneManager()?.startReactivity();
  }, [setPhase, setSongInfo]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  if (phase === 'active') return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
      }}
    >
      <div
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? '#a855f7' : '#4a4a8a'}`,
          borderRadius: '16px',
          padding: '60px 80px',
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: 'rgba(10, 10, 26, 0.8)',
          backdropFilter: 'blur(10px)',
          transition: 'border-color 0.2s',
          maxWidth: '400px',
          width: '90vw',
        }}
      >
        {phase === 'loading' ? (
          <div style={{ color: '#a855f7', fontSize: '1.2rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '12px' }}>✦</div>
            Initializing cosmos…
          </div>
        ) : (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✦</div>
            <p style={{ color: '#e2e8f0', fontSize: '1.1rem', marginBottom: '8px', fontWeight: 600 }}>
              Drop an MP3 to begin
            </p>
            <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>
              or click to select a file
            </p>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        style={{ display: 'none' }}
        onChange={onFileChange}
      />
    </div>
  );
}
