# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nebula is an audio-reactive space travel web app: drop an MP3, fly through a cosmos shaped by real-time audio analysis and a Claude-generated scene config. 72-hour hackathon project (Spring 2026, 4-person team).

## Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run lint         # ESLint + TypeScript checks
npx tsc --noEmit    # Type-check only
```

CI runs lint + build on every PR via `.github/workflows/ci.yml`. Never merge with a failing CI.

Environment: copy `.env.local` and set `ANTHROPIC_API_KEY`. Never commit this file.

## Architecture

**Data flow:** MP3 upload → Web Audio API (FFT per frame) + Claude API (`/api/scene-seed`) → Zustand stores → Three.js render loop → fullscreen canvas

**Key separation:** Three.js and React are kept entirely separate. React renders only the UI overlay (absolutely positioned divs). Three.js is a vanilla JS class hierarchy. They communicate exclusively via Zustand's `getState()` — no props, no refs, no react-three-fiber.

**Three stores, single writer each:**
- `audioStore` — written by audio pipeline (bass/mids/highs/energy/beat per frame)
- `sceneStore` — written by API route and GSAP transition timeline
- `appStore` — written by UI components (idle | loading | active phase)

**Canvas mounting:** `components/Canvas.tsx` uses `dynamic(() => import(...), { ssr: false })`. Three.js cannot run server-side.

**Audio analysis:** `analyser.getByteFrequencyData()` called inside the rAF loop each frame. Never use ScriptProcessorNode (deprecated) or AudioWorklet (overkill for read-only FFT).

**Claude API (`/api/scene-seed`):** 3s `AbortController` timeout. Fallback defaults load immediately on upload. If the seed arrives late, apply it anyway via GSAP transition. The AI is progressive enhancement — never block playback on it.

**GSAP vs lerp:** GSAP handles config-level transitions (cosmos awakening, seed arrival). Linear lerp handles per-frame audio smoothing (e.g., `smoothedBass = lerp(smoothedBass, rawBass, 0.15)`).

## Planned File Structure

```
src/
  app/
    page.tsx                 # Mounts Canvas + Upload + HUD
    api/scene-seed/route.ts  # POST: song metadata → Claude → scene config JSON
  components/
    Canvas.tsx               # Dynamic import wrapper (ssr: false)
    Upload.tsx               # Drag-and-drop, file validation
    HUD.tsx                  # Song title/artist overlay
  three/
    SceneManager.ts          # Init, animate loop, dispose
    StarField.ts             # BufferGeometry Points + LineSegments streaks
    Nebula.ts                # ShaderMaterial sprite particles
    CameraRig.ts             # Forward fly + bass shake
    PostProcessing.ts        # EffectComposer + UnrealBloomPass
  audio/
    AudioPipeline.ts         # AudioContext, AnalyserNode, decode
    FeatureExtractor.ts      # Band split, RMS, beat detection
  store/
    audioStore.ts / sceneStore.ts / appStore.ts
  config/
    sceneConfig.ts           # SceneConfig type + fallback defaults
    apiContract.ts           # Request/response types for /api/scene-seed
  lib/
    metadata.ts              # jsmediatags wrapper for ID3
    transitions.ts           # GSAP timeline for config-level lerp
  shaders/
    nebulaVertex.glsl / nebulaFragment.glsl
```

## Locked Technical Decisions

Do not revisit these without a concrete reason:

- **Stars:** `Points` (BufferGeometry + PointsMaterial) + separate `LineSegments` for streaks. No Sprites or instanced meshes — draw call overhead kills frame rate at 10k+ particles.
- **No react-three-fiber** — raw Three.js for render loop control and debugging clarity.
- **Zustand** over Redux (boilerplate) or Context (re-renders on every frame write).
- **rAF polling** for audio — not ScriptProcessorNode, not AudioWorklet.
- **3s hard timeout** on Claude API with AbortController. Never block the experience.
- **GSAP** for multi-property config transitions; manual lerp for per-frame smoothing.

## Claude API Scene Config Schema

`/api/scene-seed` returns JSON with these fields (renderer clamps out-of-range values):

| Field | Type | Range |
|-------|------|-------|
| `primaryColor`, `secondaryColor`, `accentColor` | `#RRGGBB` | — |
| `warpSpeedBase` | number | 0.3–3.0 |
| `starDensity` | number | 0.3–1.0 |
| `streakLengthMultiplier` | number | 0.5–2.0 |
| `nebulaIntensity` | number | 0.0–1.0 |
| `bloomStrengthBase` | number | 0.3–1.5 |
| `cameraShakeIntensity` | number | 0.0–1.0 |
| `cosmicTension` | number | 0.0–1.0 |
| `mood` | enum | `serene \| melancholic \| euphoric \| aggressive \| mysterious \| triumphant \| chaotic \| ethereal` |

Use `claude-sonnet-4-20250514`, `max_tokens: 500`. System prompt instructs Claude to return only raw JSON (no markdown, no explanation).

## Performance Targets

- 60fps at 10k stars on a 2020 MacBook Air. Profile by hour 36.
- Every frame must be under 20ms at demo time.
- Low-quality fallback: half particle count, nebula disabled. Activated via a flag in sceneConfig.

## Audio-Reactive Mappings (Active State)

- **Bass (20–250 Hz):** warp speed + camera shake
- **Mids (250–4k Hz):** star brightness + nebula color saturation
- **Highs (4k–16k Hz):** star color temperature + small particle spawn rate
- **Energy (RMS):** bloom strength
- **Beat events:** accentColor flash (200ms decay), streak length spike ×1.5, camera micro-lurch
