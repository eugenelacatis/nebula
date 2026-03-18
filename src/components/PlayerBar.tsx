"use client";

import { usePlayerStore } from "@/store/playerStore";
import { globalAudioEl } from "@/lib/audioLoader";

function fmt(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

export default function PlayerBar() {
  const { isPlaying, currentTime, duration, title, artist } = usePlayerStore();

  const toggle = () => {
    const el = globalAudioEl;
    if (!el) return;
    isPlaying ? el.pause() : el.play().catch(() => {});
  };

  const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = globalAudioEl;
    if (el) el.currentTime = parseFloat(e.target.value);
  };

  // Don't render until a track is loaded
  if (!duration) return null;

  const pct = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center gap-5 px-6 py-3 bg-black/70 backdrop-blur-2xl border-t border-white/8">
      {/* Track info */}
      <div className="flex items-center gap-3 min-w-0 w-52 flex-shrink-0">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500/30 to-indigo-500/30 border border-white/10 flex items-center justify-center flex-shrink-0">
          <span className="text-white/50 text-xs">♪</span>
        </div>
        <div className="min-w-0">
          <p className="text-white text-sm font-medium truncate leading-tight">{title}</p>
          <p className="text-white/40 text-xs truncate">{artist}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex-1 flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-4">
          <button
            onClick={toggle}
            className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-black text-sm hover:bg-white/90 transition-colors flex-shrink-0"
          >
            {isPlaying ? "⏸" : "▶"}
          </button>
        </div>

        {/* Seek bar */}
        <div className="w-full max-w-xl flex items-center gap-2">
          <span className="text-white/30 text-xs tabular-nums w-9 text-right">{fmt(currentTime)}</span>
          <div className="relative flex-1 h-1 group">
            <div className="absolute inset-0 rounded-full bg-white/10" />
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-400"
              style={{ width: `${pct}%` }}
            />
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={onSeek}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
            />
          </div>
          <span className="text-white/30 text-xs tabular-nums w-9">{fmt(duration)}</span>
        </div>
      </div>

      {/* Right spacer (keeps controls centered) */}
      <div className="w-52 flex-shrink-0" />
    </div>
  );
}
