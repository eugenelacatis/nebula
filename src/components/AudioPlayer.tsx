"use client";

import { usePlayerStore } from "@/store/playerStore";
import { globalAudioEl } from "@/lib/audioLoader";

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function AudioPlayer() {
  const { isPlaying, currentTime, duration, title, artist } = usePlayerStore();

  const toggle = () => {
    const el = globalAudioEl;
    if (!el) return;
    if (isPlaying) {
      el.pause();
    } else {
      el.play().catch(() => {});
    }
  };

  const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = globalAudioEl;
    if (!el) return;
    el.currentTime = parseFloat(e.target.value);
  };

  return (
    <div className="flex flex-col gap-1 min-w-0">
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white text-sm"
        >
          {isPlaying ? "⏸" : "▶"}
        </button>
        <div className="min-w-0">
          <p className="text-white text-sm font-medium truncate">{title}</p>
          <p className="text-gray-400 text-xs truncate">{artist}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-gray-500 text-xs w-8">{formatTime(currentTime)}</span>
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={onSeek}
          className="flex-1 h-1 accent-blue-400"
        />
        <span className="text-gray-500 text-xs w-8">{formatTime(duration)}</span>
      </div>
    </div>
  );
}
