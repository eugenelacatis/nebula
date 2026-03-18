'use client';

import { useAppStore } from '@/store/appStore';

export default function HUD() {
  const { songInfo, phase } = useAppStore();

  if (phase !== 'active' || !songInfo) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '32px',
        left: '32px',
        zIndex: 10,
        animation: 'fadeIn 1s ease forwards',
      }}
    >
      <p style={{ color: '#e2e8f0', fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
        {songInfo.title}
      </p>
      <p style={{ color: '#a855f7', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
        {songInfo.artist}
      </p>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
