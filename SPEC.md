# Music Particle System — Project Spec

## Overview

A browser-based Three.js application that visualises music as a 3D particle galaxy. Audio is either synthesised in-browser (three preset tracks) or loaded from a local file. The particle system reacts in real time to bass, mid, and high frequency energy extracted via the Web Audio API.

No build step required. Run with any static file server:

```
python3 -m http.server 8080
# then open http://localhost:8080
```

---

## File Structure

```
CMPE280-Project/
├── index.html              # Shell, importmap, HTML structure
├── style.css               # Dark space-themed UI (side panel)
└── src/
    ├── main.js             # App class — orchestrates everything
    ├── AudioEngine.js      # Web Audio API wrapper + beat detection
    ├── SynthEngine.js      # Procedural music synthesiser
    └── ParticleSystem.js   # Three.js Points + custom GLSL shaders
```

---

## Architecture

### `App` class (`src/main.js`)

Single top-level class instantiated on `DOMContentLoaded`.

**Key state:**
- `this.audio` — `AudioEngine` instance (always exists)
- `this.synth` — `SynthEngine` instance (created lazily on first Play click, requires AudioContext)
- `this.ps` — `ParticleSystem` instance (created lazily on first Play click)
- `this.isPlaying`, `this.activePreset`, `this.useUploadedFile`

**Lifecycle:**
- `AudioContext` must be created inside a user gesture (Play button / file upload). This is why `audio.init()` and `new SynthEngine(...)` are deferred to `_togglePlay()` / `_loadUploadedFile()`.
- Switching presets while playing calls `synth.stop()` then `synth.play(newId)`.
- Uploading a file stops synth, decodes the file into a `AudioBufferSourceNode` (looped), and connects it to the gain node.

**Render loop (`_animate`):**
1. `audio.update()` — reads FFT data, computes bass/mid/high/overall/beatDetected
2. Camera slow-orbits (`sin/cos` of `elapsedTime * 0.06`) with mouse parallax
3. `bloomPass.strength` driven by `0.55 + audio.bass * 0.35`
4. `ps.update(dt, audio)` — pushes audio values into GLSL uniforms
5. `composer.render()` — UnrealBloomPass + OutputPass
6. `_updateVU()` — updates the three CSS width bars in the panel

---

### `AudioEngine` (`src/AudioEngine.js`)

Wraps Web Audio API. Owns:
- `AudioContext`
- `AnalyserNode` (fftSize 2048, smoothingTimeConstant 0.82)
- `GainNode` → AnalyserNode → destination

**Frequency bands** (computed each frame from `getByteFrequencyData`):
- `bass`: 0–250 Hz → `this.bass` (0–1)
- `mid`: 250–2500 Hz → `this.mid` (0–1)
- `high`: 2500–16000 Hz → `this.high` (0–1)
- `overall`: `bass*0.5 + mid*0.3 + high*0.2`

**Beat detection:** rolling 43-sample average of `bass`. A beat fires when `bass > avg * 1.45 && bass > 0.18`. After a beat, a 12-frame cooldown prevents double-firing.

**File loading:** `loadFile(file)` → `file.arrayBuffer()` → `decodeAudioData` → looped `AudioBufferSourceNode` connected to the gain node. Previous file node is stopped and disconnected first.

---

### `SynthEngine` (`src/SynthEngine.js`)

Procedural drum machine + synth. All sound is generated in real time — no audio files.

**Shared resources:**
- Convolution reverb (2-second exponential impulse response, gain 0.22)

**One track:**

| ID | Name | Style | BPM | Interval |
|---|---|---|---|---|
| `nebula-drift` | Nebula Drift | Ambient | — | Chord every 5 s, drone oscillator |

**Instrument primitives:**
- `_kick(t, gain)` — sine osc with frequency sweep 160 Hz → 40 Hz over 0.35 s
- `_snare(t, gain)` — bandpass-filtered noise (1800 Hz) + 200 Hz tone body
- `_hat(t, gain)` — highpass-filtered noise (7 kHz), 50 ms decay
- `_bassNote(freq, t, duration, gain)` — sawtooth osc + lowpass filter (400 Hz, Q=2)
- `_synthLead(freq, t, duration, gain)` — two detuned sawtooth oscs + filter sweep, routed to reverb
- `_pad(freq, t, duration, gain)` — four slightly detuned sine oscs with slow attack/release, routed to reverb
- `_shimmer(_, t)` — four high sine tones (C7–F7) staggered 180 ms, routed to reverb

**`play(trackId)` / `stop()`:** all active intervals/oscillators are registered in `this._stopFns[]` and cancelled on `stop()`.

---

### `ParticleSystem` (`src/ParticleSystem.js`)

**Geometry:** `THREE.Points` backed by `THREE.BufferGeometry`.

Default count: **18 000** particles. Toggleable via UI to 8k / 18k / 35k.

**Per-particle attributes:**

| Attribute | Type | Description |
|---|---|---|
| `position` | vec3 | Initial world position |
| `aScale` | float | Random size multiplier (0.3–1.0) |
| `aColor` | vec3 | Per-arm colour (see below) |
| `aVelocity` | vec3 | Unused in shader (reserved) |
| `aOffset` | float | Random phase offset (0–1) |

**Galaxy layout:** 3 spiral arms. 15% of particles form a dense core (radius 0–3.5). The rest form the disk (radius 3.5–15.5). Arm angle = `armIndex/3 * 2π`, winding angle increases with radius.

**Arm colours:**
- Core (innerT > 0.6): white-blue
- Arm 0: purple / magenta
- Arm 1: cyan / blue
- Arm 2: pink / orange

**GLSL uniforms (updated every frame):**

| Uniform | Source |
|---|---|
| `uTime` | accumulated dt |
| `uBass` | `audio.bass` |
| `uMid` | `audio.mid` |
| `uHigh` | `audio.high` |
| `uOverall` | `audio.overall` |
| `uBeat` | decays from 1.0 at rate 4.0/s on beat |

**Vertex shader effects:**
- **Orbital drift**: particles drift tangentially proportional to radius × `uOverall`
- **Bass pulse**: radial displacement `uBass * 2.8 * aScale`
- **Mid oscillation**: vertical sine wave `uMid * 1.2`
- **Beat explosion**: radial burst `uBeat * 3.5`
- **Point size**: `aScale * (4 + uBass*14 + uHigh*6) + uBeat*8`, clamped 0.5–18 px

**Fragment shader effects:**
- Soft circular mask via `smoothstep` on `gl_PointCoord`
- Bright inner core (`smoothstep(0, 0.45, d)`)
- Colour additive overlays: bass → pink, high → cyan, beat → warm yellow

**Material:** `THREE.AdditiveBlending`, `depthWrite: false`, `transparent: true`

---

### Post-processing

`EffectComposer` pipeline:
1. `RenderPass`
2. `UnrealBloomPass` — strength `0.55 + bass*0.35`, radius `0.25`, threshold `0.6`
3. `OutputPass`

Bloom slider in UI maps `0–100` → `0–1.2` strength (overrides the dynamic value while dragging).

---

## UI Panel (`index.html` + `style.css`)

Fixed 300 px left panel, `backdrop-filter: blur(18px)`.

| Element | ID | Function |
|---|---|---|
| Preset cards | `#preset-grid` | Built from `PRESETS[]` array in `main.js`; each card has a CSS `--accent` var for colour |
| Upload button | `#btn-upload` | Triggers hidden `#file-input` |
| Upload label | `#upload-label` | Shows filename after upload |
| Play/Pause | `#btn-play` | Initialises AudioContext on first click |
| Volume slider | `#vol-slider` | `0–100` → `GainNode.gain` `0–2` |
| Bloom slider | `#bloom-slider` | `5–100` → bloom strength `0–1.2` |
| VU bars | `#vu-bass/mid/high` | CSS `width%` updated each frame |
| Particle toggle | `#btn-particles` | Cycles 8k → 18k → 35k, calls `_rebuildParticles()` |

---

## Known Constraints & Gotchas

- **AudioContext must be created on a user gesture.** All audio init is deferred to the first Play/Upload interaction.
- **CORS:** No external audio files are fetched. Synth is 100% procedural. Uploaded files are loaded via `file.arrayBuffer()` (no network).
- **importmap** requires a real HTTP server — opening `index.html` directly as `file://` will fail to load Three.js modules from CDN.
- **`aVelocity` attribute** is populated but currently unused in the vertex shader (reserved for a future CPU-side velocity integration feature).
- **`_basePos` array** in `ParticleSystem` is allocated but not read back — it was intended for a snap-back behaviour that was not implemented. Safe to remove or use.
- Bloom slider input handler sets `bloomPass.strength` directly, which will be overwritten on the next frame by the bass-driven dynamic formula in `_animate`. This means the slider only takes effect transiently while dragging. If static user control is desired, the dynamic formula in `_animate` should be removed or gated.

---

## Potential Next Features

- Snap-back: use `_basePos` to lerp particles back to rest after a beat explosion
- Colour theme selector per track (different palettes for each preset)
- Camera modes: orbit / fly-through / locked
- Microphone input as an audio source
- Export/screenshot button
- Mobile touch support (touch events for mouse parallax)
