import React, { useRef, useState } from 'react';

const PRESETS = [
  { id: 'nebula-drift', label: 'Nebula Drift', genre: 'Ambient', icon: '1' },
];

const LIBRARY = [
  { file: 'Adele - Hello (Lyrics).mp3',                        label: 'Adele — Hello' },
  { file: 'Michael Jackson - Smooth Criminal [Lyrics].mp3',    label: 'MJ — Smooth Criminal' },
];

export default function UI({
  isPlaying, activePreset, volume, bloom, particleCount, uploadLabel,
  activeLibrary, onLibrarySelect,
  onPresetSelect, onTogglePlay, onVolumeChange, onBloomChange,
  onParticleToggle, onFileUpload,
}) {
  const fileInputRef = useRef(null);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
    <aside id="ui" className={collapsed ? 'collapsed' : ''}>
      <h1>Music Particles</h1>

      {/* Preset tracks */}
      <section>
        <p className="section-title">Preset Tracks</p>
        <div id="preset-grid">
          {PRESETS.map(p => (
            <div
              key={p.id}
              className={`preset-card${activePreset === p.id ? ' active' : ''}`}
              style={{ '--accent': p.color }}
              onClick={() => onPresetSelect(p.id)}
            >
              <span className="card-icon">{p.icon}</span>
              <span className="card-label">{p.label}</span>
              <span className="card-genre">{p.genre}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Library */}
      <section>
        <p className="section-title">Library</p>
        <div id="library-list">
          {LIBRARY.map(track => (
            <div
              key={track.file}
              className={`library-track${activeLibrary === track.file ? ' active' : ''}`}
              onClick={() => onLibrarySelect(track.file)}
            >
              <span className="library-icon">♪</span>
              <span className="library-label">{track.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Upload */}
      <section className="upload-row">
        <p className="section-title">Your Music</p>
        <button id="btn-upload" onClick={() => fileInputRef.current?.click()}>
          Upload Audio File
        </button>
        <span id="upload-label">{uploadLabel}</span>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files[0]; if (f) onFileUpload(f); }}
        />
      </section>

      {/* Playback */}
      <section>
        <p className="section-title">Playback</p>
        <div className="controls-row">
          <button
            id="btn-play"
            className={isPlaying ? 'playing' : ''}
            onClick={onTogglePlay}
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
        </div>
      </section>

      {/* Volume */}
      <section className="slider-row">
        <div className="slider-label-row"><span>Volume</span></div>
        <input
          type="range"
          id="vol-slider"
          min="0" max="100"
          value={volume}
          onChange={e => onVolumeChange(Number(e.target.value))}
        />
      </section>

      {/* Bloom */}
      <section className="slider-row">
        <div className="slider-label-row"><span>Bloom</span></div>
        <input
          type="range"
          id="bloom-slider"
          min="5" max="100"
          value={bloom}
          onChange={e => onBloomChange(Number(e.target.value))}
        />
      </section>

      {/* VU meter — widths updated directly by NebulaApp's animation loop */}
      <section className="vu-meter">
        <p className="section-title">Frequencies</p>
        <div className="vu-row">
          <span>Sub</span>
          <div className="vu-track"><div className="vu-bar" id="vu-sub" /></div>
        </div>
        <div className="vu-row">
          <span>Bass</span>
          <div className="vu-track"><div className="vu-bar" id="vu-bass" /></div>
        </div>
        <div className="vu-row">
          <span>Mid</span>
          <div className="vu-track"><div className="vu-bar" id="vu-mid" /></div>
        </div>
        <div className="vu-row">
          <span>Pres</span>
          <div className="vu-track"><div className="vu-bar" id="vu-presence" /></div>
        </div>
        <div className="vu-row">
          <span>High</span>
          <div className="vu-track"><div className="vu-bar" id="vu-high" /></div>
        </div>
        <div className="vu-row">
          <span>Cent</span>
          <div className="vu-track"><div className="vu-bar" id="vu-centroid" /></div>
        </div>
        <div className="vu-row">
          <span>Flux</span>
          <div className="vu-track"><div className="vu-bar" id="vu-flux" /></div>
        </div>
        <div className="vu-row">
          <span>BPM</span>
          <div className="vu-track" style={{display:'flex', alignItems:'center'}}>
            <span id="vu-bpm" style={{fontSize:'0.65rem', color:'var(--text2)', paddingLeft:'4px'}}>—</span>
          </div>
        </div>
      </section>

      {/* Particle count */}
      <section>
        <p className="section-title">Settings</p>
        <button id="btn-particles" onClick={onParticleToggle}>
          Particles: {particleCount / 1000}k
        </button>
      </section>

      <p className="tip">
        Click <strong>Play</strong> to start a preset, or upload your own audio. Drag to orbit, scroll to zoom.
      </p>
    </aside>
    <button
      id="panel-toggle"
      className={collapsed ? 'collapsed' : ''}
      onClick={() => setCollapsed(c => !c)}
      title={collapsed ? 'Show panel' : 'Hide panel'}
    >
      {collapsed ? '›' : '‹'}
    </button>
    </>
  );
}
