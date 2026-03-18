"use client";

import { useEffect, useRef, useState } from "react";
import { usePlayerStore } from "@/store/playerStore";
import { loadAudioFile, loadAudioUrl } from "@/lib/audioLoader";

export default function LibraryPanel() {
  const [open, setOpen] = useState(true);
  const [tracks, setTracks] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const currentTitle = usePlayerStore((s) => s.title);

  useEffect(() => {
    fetch("/api/audio-files")
      .then((r) => r.json())
      .then((files: string[]) => setTracks(files))
      .catch(() => {});
  }, []);

  const handleFile = (file: File) => loadAudioFile(file);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const playTrack = (filename: string) => loadAudioUrl(`/audio/${filename}`);

  const displayName = (filename: string) =>
    filename.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");

  return (
    <>
      {/* Toggle tab */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-50 bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 rounded-r-lg px-1.5 py-4 text-white/40 hover:text-white/70 transition-all"
        style={{ writingMode: "vertical-rl" }}
      >
        {open ? "◀ Library" : "▶ Library"}
      </button>

      {/* Panel */}
      <div
        className={`fixed left-0 top-0 h-full z-40 flex flex-col transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ width: 260 }}
      >
        <div className="flex flex-col h-full bg-black/60 backdrop-blur-xl border-r border-white/10">
          {/* Header */}
          <div className="px-5 pt-6 pb-4 border-b border-white/10">
            <p className="text-xs font-semibold tracking-[0.2em] text-white/30 uppercase mb-0.5">
              Nebula
            </p>
            <h2 className="text-white font-semibold text-lg leading-tight">Library</h2>
          </div>

          {/* Track list */}
          <div className="flex-1 overflow-y-auto py-2 scrollbar-hide">
            {tracks.length === 0 ? (
              <p className="text-white/20 text-xs text-center mt-8 px-5">
                Drop MP3s into{" "}
                <span className="font-mono text-white/30">public/audio/</span>
              </p>
            ) : (
              tracks.map((filename) => {
                const isPlaying = displayName(filename) === currentTitle;
                return (
                  <button
                    key={filename}
                    onClick={() => playTrack(filename)}
                    className={`w-full text-left px-5 py-3 flex items-center gap-3 group transition-colors ${
                      isPlaying
                        ? "bg-white/10 text-white"
                        : "text-white/50 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <span
                      className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors ${
                        isPlaying
                          ? "bg-cyan-400/20 text-cyan-400"
                          : "bg-white/5 text-white/20 group-hover:text-white/50"
                      }`}
                    >
                      {isPlaying ? "▶" : "♪"}
                    </span>
                    <span className="truncate text-sm font-medium leading-tight">
                      {displayName(filename)}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Upload drop zone */}
          <div className="p-4 border-t border-white/10">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={`cursor-pointer rounded-xl border border-dashed p-4 text-center transition-all ${
                dragging
                  ? "border-cyan-400/60 bg-cyan-400/10"
                  : "border-white/15 hover:border-white/30 hover:bg-white/5"
              }`}
            >
              <p className="text-white/40 text-xs">Drop audio or</p>
              <p className="text-white/60 text-xs font-medium mt-0.5">click to browse</p>
              <input
                ref={inputRef}
                type="file"
                accept="audio/*,.mp3"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
