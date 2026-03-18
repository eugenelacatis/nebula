'use client';

import { useEffect, useRef, useCallback, useLayoutEffect, useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { useAudioStore } from '@/store/audioStore';
import { usePlayerStore, type TrackInfo } from '@/store/playerStore';
import { audioPipeline } from '@/audio/AudioPipeline';
import { transitionToConfig } from '@/lib/transitions';
import { DEFAULT_SCENE_CONFIG } from '@/config/sceneConfig';
import { extractMetadata } from '@/lib/metadata';
import { getSceneManager } from './Canvas';

// ─── icons ────────────────────────────────────────────────────────────────────

const IconPlay = () => (
  <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor">
    <path d="M0 0 L10 6 L0 12 Z" />
  </svg>
);

const IconPause = () => (
  <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor">
    <rect x="0" y="0" width="3.5" height="12" rx="1" />
    <rect x="6.5" y="0" width="3.5" height="12" rx="1" />
  </svg>
);

const IconSkipBack = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="currentColor">
    <rect x="0" y="0" width="2" height="13" rx="1" />
    <path d="M13 0 L3 6.5 L13 13 Z" />
  </svg>
);

const IconLoop = () => (
  <svg width="14" height="12" viewBox="0 0 14 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 4 Q1 1 4 1 H11" />
    <path d="M9 0 L11 1 L9 2" fill="currentColor" stroke="none" />
    <path d="M13 8 Q13 11 10 11 H3" />
    <path d="M5 12 L3 11 L5 10" fill="currentColor" stroke="none" />
  </svg>
);

const IconVolume = ({ level }: { level: number }) => (
  <svg width="14" height="12" viewBox="0 0 14 12" fill="currentColor">
    <path d="M0 4 H3.5 L7 1 V11 L3.5 8 H0 Z" />
    {level > 0 && <path d="M9 4 Q11 6 9 8" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" />}
    {level > 0.5 && <path d="M11 2 Q14 6 11 10" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" />}
  </svg>
);

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmt(s: number) {
  if (!isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// ─── mini waveform ────────────────────────────────────────────────────────────

function MiniWaveform() {
  const ref = useRef<HTMLCanvasElement>(null);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    const BARS = 36;
    const bw = Math.floor(W / BARS) - 1;

    const draw = () => {
      raf.current = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, W, H);
      const { frequencyData } = useAudioStore.getState();
      const step = Math.floor(frequencyData.length / BARS);
      for (let i = 0; i < BARS; i++) {
        const v = frequencyData[i * step] / 255;
        const bh = Math.max(1, v * H);
        ctx.fillStyle = `rgba(255,255,255,${0.15 + v * 0.7})`;
        ctx.fillRect(i * (bw + 1), H - bh, bw, bh);
      }
    };
    raf.current = requestAnimationFrame(draw);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, []);

  return <canvas ref={ref} width={108} height={32} style={{ display: 'block', opacity: 0.9 }} />;
}

// ─── rail (seek / volume) ─────────────────────────────────────────────────────

function Rail({ value, max, onChange, disabled, width }: {
  value: number; max: number; onChange: (v: number) => void;
  disabled?: boolean; width?: number | string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ position: 'relative', height: 3, width: width ?? '100%', flexShrink: 0 }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: 2, background: '#1e1e1e' }} />
      <div style={{
        position: 'absolute', top: 0, left: 0, height: '100%',
        width: `${pct}%`, borderRadius: 2, background: '#ffffff',
        transition: 'width 0.08s linear',
      }} />
      <input type="range" min={0} max={max || 0} step={max > 10 ? 0.5 : 0.01}
        value={value} disabled={disabled} onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ position: 'absolute', inset: '-6px 0', opacity: 0, cursor: disabled ? 'default' : 'pointer', width: '100%' }}
      />
    </div>
  );
}

// ─── icon button ──────────────────────────────────────────────────────────────

function IconBtn({ onClick, disabled, active, title, children, large }: {
  onClick?: () => void; disabled?: boolean; active?: boolean;
  title?: string; children: React.ReactNode; large?: boolean;
}) {
  const size = large ? 38 : 28;
  return (
    <button onClick={onClick} disabled={disabled} title={title} style={{
      width: size, height: size, borderRadius: '50%', border: 'none',
      background: large ? (active ? '#1a1a1a' : 'transparent') : 'transparent',
      color: disabled ? '#2a2a2a' : active ? '#ffffff' : '#666666',
      cursor: disabled ? 'default' : 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, transition: 'color 0.12s',
    }}>
      {children}
    </button>
  );
}

// ─── left library panel ───────────────────────────────────────────────────────

const PANEL_W = 260;

function LibraryPanel({
  samples,
  currentTrack,
  playing,
  onPlay,
  onUpload,
}: {
  samples: TrackInfo[];
  currentTrack: TrackInfo | null;
  playing: boolean;
  onPlay: (s: TrackInfo) => void;
  onUpload: () => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <>
      {/* Tab button — sits on right edge of panel */}
      <button
        onClick={() => setOpen((o) => !o)}
        title={open ? 'Close library' : 'Open library'}
        style={{
          position: 'fixed',
          top: '50%',
          left: open ? PANEL_W : 0,
          transform: 'translateY(-50%)',
          zIndex: 30,
          background: 'rgba(6,6,6,0.96)',
          borderTop: '1px solid #181818',
          borderBottom: '1px solid #181818',
          borderRight: '1px solid #181818',
          borderLeft: open ? '1px solid #181818' : 'none',
          borderRadius: '0 3px 3px 0',
          color: '#888888',
          width: 22,
          height: 60,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'left 0.25s ease',
          fontSize: 10,
          letterSpacing: '0.08em',
        }}
      >
        {open ? '‹' : '›'}
      </button>

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          bottom: 72,
          left: open ? 0 : -PANEL_W,
          width: PANEL_W,
          zIndex: 20,
          background: 'rgba(6,6,6,0.97)',
          backdropFilter: 'blur(20px)',
          borderRight: '1px solid #141414',
          transition: 'left 0.25s ease',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {/* Header */}
        <div style={{ padding: '22px 18px 16px', flexShrink: 0 }}>
          <p style={{
            color: '#e8e8e8', fontSize: 16, fontWeight: 300,
            margin: '0 0 4px', letterSpacing: '0.12em',
          }}>
            NEBULA
          </p>
          <p style={{ color: '#555555', fontSize: 10, margin: 0, letterSpacing: '0.06em' }}>
            Audio-reactive space visualization
          </p>
        </div>

        <div style={{ height: 1, background: '#111111', flexShrink: 0 }} />

        {/* Track list label */}
        {samples.length > 0 && (
          <div style={{
            padding: '14px 18px 8px', flexShrink: 0,
            fontSize: 9, fontWeight: 600, letterSpacing: '0.14em',
            color: '#333333', textTransform: 'uppercase',
          }}>
            Tracks
          </div>
        )}

        {/* Scrollable track list */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {samples.map((s) => {
            const isActive = currentTrack?.src === s.src;
            return (
              <button
                key={s.src}
                onClick={() => onPlay(s)}
                style={{
                  width: '100%',
                  padding: '10px 18px',
                  background: isActive ? '#111111' : 'transparent',
                  border: 'none',
                  borderBottom: '1px solid #0d0d0d',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = '#0e0e0e';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }}
              >
                {/* active indicator */}
                <div style={{
                  width: 3, height: 20, borderRadius: 2, flexShrink: 0,
                  background: isActive && playing ? '#e8e8e8' : isActive ? '#444444' : 'transparent',
                  transition: 'background 0.15s',
                }} />
                <div style={{ overflow: 'hidden', minWidth: 0 }}>
                  <p style={{
                    margin: 0, fontSize: 12,
                    color: isActive ? '#e8e8e8' : '#777777',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    letterSpacing: '0.01em',
                  }}>
                    {s.title}
                  </p>
                  {s.artist && (
                    <p style={{
                      margin: '2px 0 0', fontSize: 10,
                      color: isActive ? '#555555' : '#333333',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {s.artist}
                    </p>
                  )}
                </div>
              </button>
            );
          })}

          {samples.length === 0 && (
            <p style={{
              margin: '20px 18px', fontSize: 11,
              color: '#555555', letterSpacing: '0.03em',
            }}>
              No tracks found in /public/audio
            </p>
          )}
        </div>

        {/* Upload button — always at bottom */}
        <div style={{ borderTop: '1px solid #111111', flexShrink: 0 }}>
          <button
            onClick={onUpload}
            style={{
              width: '100%', padding: '14px 18px',
              background: 'transparent', border: 'none',
              cursor: 'pointer', textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: 12,
              transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#0e0e0e'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="#555555">
              <rect x="5" y="0" width="1" height="11" rx="0.5" />
              <rect x="0" y="5" width="11" height="1" rx="0.5" />
            </svg>
            <span style={{ color: '#666666', fontSize: 12, letterSpacing: '0.02em' }}>
              Upload MP3
            </span>
          </button>
        </div>
      </div>
    </>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function AudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { setPhase, setSongInfo } = useAppStore();
  const {
    samples, currentTrack, playing, currentTime, duration, volume, loop,
    setSamples, setCurrentTrack, setPlaying, setCurrentTime, setDuration,
    setVolume, setLoop,
  } = usePlayerStore();

  const makeAudio = useCallback((src: string): HTMLAudioElement => {
    const audio = new Audio(src);
    audio.volume = usePlayerStore.getState().volume;
    audio.loop = usePlayerStore.getState().loop;
    audio.addEventListener('timeupdate', () => usePlayerStore.getState().setCurrentTime(audio.currentTime));
    audio.addEventListener('durationchange', () => usePlayerStore.getState().setDuration(audio.duration));
    audio.addEventListener('play', () => usePlayerStore.getState().setPlaying(true));
    audio.addEventListener('pause', () => usePlayerStore.getState().setPlaying(false));
    audio.addEventListener('ended', () => {
      usePlayerStore.getState().setPlaying(false);
      usePlayerStore.getState().setCurrentTime(0);
    });
    return audio;
  }, []);

  useEffect(() => {
    fetch('/api/samples')
      .then((r) => r.json())
      .then((data: TrackInfo[]) => setSamples(data))
      .catch(() => {});
    return () => { audioRef.current?.pause(); audioPipeline.dispose(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume; }, [volume]);
  useEffect(() => { if (audioRef.current) audioRef.current.loop = loop; }, [loop]);

  const loadAndPlay = useCallback(async (src: string, title: string, artist: string) => {
    audioRef.current?.pause();
    audioPipeline.dispose();
    const audio = makeAudio(src);
    audioRef.current = audio;
    setSongInfo({ title, artist });
    setCurrentTrack({ title, artist, src });
    setCurrentTime(0);
    setDuration(0);
    audioPipeline.init(audio);
    try { await audio.play(); } catch (e) { console.warn('Autoplay blocked:', e); }
    setPhase('active');
    getSceneManager()?.startReactivity();
    transitionToConfig(DEFAULT_SCENE_CONFIG, 1.8);
  }, [makeAudio, setPhase, setSongInfo, setCurrentTrack, setCurrentTime, setDuration]);

  const handleUpload = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.mp3')) { alert('Only MP3 files are supported.'); return; }
    const url = URL.createObjectURL(file);
    const meta = await extractMetadata(file);
    await loadAndPlay(url, meta.title, meta.artist);
  }, [loadAndPlay]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    if (playing) audio.pause(); else audio.play().catch(() => {});
  }, [playing, currentTrack]);

  const handleSeek = useCallback((v: number) => {
    if (audioRef.current) audioRef.current.currentTime = v;
    setCurrentTime(v);
  }, [setCurrentTime]);

  useLayoutEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) { e.preventDefault(); togglePlay(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay]);

  const divider = <div style={{ width: 1, height: 28, background: '#1a1a1a', flexShrink: 0 }} />;

  return (
    <>
      {/* ── left library panel ────────────────────────────────────────────── */}
      <LibraryPanel
        samples={samples}
        currentTrack={currentTrack}
        playing={playing}
        onPlay={(s) => loadAndPlay(s.src, s.title, s.artist)}
        onUpload={() => fileInputRef.current?.click()}
      />

      {/* ── persistent bottom player bar ─────────────────────────────────── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, height: 72, zIndex: 20,
        background: 'rgba(6, 6, 6, 0.96)', backdropFilter: 'blur(24px)',
        borderTop: '1px solid #181818',
        display: 'flex', alignItems: 'center', padding: '0 24px',
        boxSizing: 'border-box',
      }}>
        {/* LEFT */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, width: 280, flexShrink: 0, paddingRight: 20 }}>
          <MiniWaveform />
          {currentTrack && (
            <div style={{ overflow: 'hidden', minWidth: 0 }}>
              <p style={{ color: '#e8e8e8', fontSize: 12, fontWeight: 500, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '0.01em' }}>
                {currentTrack.title}
              </p>
              <p style={{ color: '#444444', fontSize: 11, margin: '3px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentTrack.artist}
              </p>
            </div>
          )}
        </div>

        {divider}

        {/* CENTER */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '0 24px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <IconBtn onClick={() => { if (audioRef.current) audioRef.current.currentTime = 0; setCurrentTime(0); }} disabled={!currentTrack} title="Restart">
              <IconSkipBack />
            </IconBtn>
            <IconBtn onClick={togglePlay} disabled={!currentTrack} large active={playing} title={playing ? 'Pause (Space)' : 'Play (Space)'}>
              {playing ? <IconPause /> : <IconPlay />}
            </IconBtn>
            <IconBtn onClick={() => setLoop(!loop)} active={loop} disabled={!currentTrack} title={loop ? 'Loop: on' : 'Loop: off'}>
              <IconLoop />
            </IconBtn>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', maxWidth: 520 }}>
            <span style={{ color: '#444444', fontSize: 10, flexShrink: 0, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.03em', minWidth: 28, textAlign: 'right' }}>
              {fmt(currentTime)}
            </span>
            <Rail value={currentTime} max={duration} onChange={handleSeek} disabled={!currentTrack} />
            <span style={{ color: '#444444', fontSize: 10, flexShrink: 0, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.03em', minWidth: 28 }}>
              {fmt(duration)}
            </span>
          </div>
        </div>

        {divider}

        {/* RIGHT — volume only */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 20, flexShrink: 0 }}>
          <span style={{ color: '#444444', display: 'flex', alignItems: 'center' }}>
            <IconVolume level={volume} />
          </span>
          <Rail value={volume} max={1} onChange={setVolume} width={72} />
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept=".mp3" style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }}
      />
    </>
  );
}
