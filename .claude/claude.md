# Nebula — Project Conventions

**Audio-Reactive Space Travel for the Web**

This document defines project-specific conventions for AI-assisted development on Nebula.

---

## Project Overview

Nebula turns any MP3 into a personalized journey through deep space. Users drop a song, real-time audio analysis extracts frequency bands and energy, and an optional Claude API call generates a scene seed (colors, warp speed, star density) matched to the song's cultural identity. The result is a Three.js warp tunnel with stars, nebulae, and bloom synced to every beat.

**One-liner:** "Drop a song, fly through its universe."

---

## Tech Stack

| Technology | Purpose |
|---|---|
| **Next.js (App Router)** | Framework with file-based routing, API routes for Claude proxy, Vercel deployment |
| **Three.js** | Raw WebGL rendering — BufferGeometry, PointsMaterial, LineSegments, ShaderMaterial, UnrealBloomPass |
| **Web Audio API** | AnalyserNode for per-frame FFT data (no libraries like Tone.js or Howler.js) |
| **GSAP** | Tweening and timeline sequencing for config transitions |
| **Claude API** | Generates scene config JSON from song metadata |
| **Zustand** | Lightweight state management readable outside React via `getState()` |
| **Tailwind CSS** | Utility-first styling for minimal UI chrome |
| **TypeScript** | Strict typing throughout |
| **Vercel** | Deployment platform |
| **GitHub Actions** | CI: lint + build on PR |

---

## Architecture Rules

### Three.js + React Separation

- Three.js scene lives in **vanilla TypeScript classes** under `src/three/`, NOT React components.
- Do NOT use react-three-fiber. Raw Three.js gives more render loop control.
- React renders UI overlays as absolutely positioned divs on top of the canvas.
- Three.js and React share state exclusively through **Zustand** stores (via `getState()`), never through props or refs.
- The Canvas component uses `dynamic(() => import(...), { ssr: false })` to avoid SSR issues.

### State Management Pattern

Three Zustand stores, each with a **single writer** and one or more readers:

| Store | Writer | Readers | Contents |
|---|---|---|---|
| `audioStore` | Audio pipeline (rAF loop) | Three.js renderer | bass, mids, highs, energy, beat |
| `sceneStore` | API response / GSAP transitions | Three.js renderer | colors, speeds, densities, mood |
| `appStore` | UI components | UI + Three.js | phase (idle \| loading \| active), metadata |

### Audio Pipeline

- Use `requestAnimationFrame` to poll `analyser.getByteFrequencyData()` each frame.
- Do NOT use ScriptProcessorNode (deprecated) or AudioWorklet (overkill for read-only analysis).
- Frequency bands: bass (20–250 Hz), mids (250–4k Hz), highs (4k–16k Hz).
- Beat detection: energy threshold + 200ms time gate. Fall back to energy pulses if unreliable.
- Smoothing: `smoothedValue = lerp(smoothedValue, rawValue, 0.15)` per frame.

### AI Integration

- The Claude API call is a **progressive enhancement**, not a gate. If it fails, the cosmos loads with defaults.
- 3-second timeout via `AbortController`. On timeout, load defaults and start music.
- If a late response arrives after timeout, apply it anyway via GSAP transition.
- API route: `POST /api/scene-seed` — proxies to Claude, never expose API key client-side.

---

## File Structure

```
nebula/
  src/
    app/
      page.tsx                   # Mounts Canvas + Upload + HUD
      layout.tsx                 # Root layout, global styles
      api/
        scene-seed/
          route.ts               # POST: metadata in, scene config out
    components/
      Canvas.tsx                 # Dynamic import wrapper for Three.js
      Upload.tsx                 # Drag-and-drop zone, file validation
      HUD.tsx                    # Song title, artist overlay
    three/
      SceneManager.ts            # Init, animate, dispose
      StarField.ts               # Points + streak lines, recycling
      Nebula.ts                  # Soft sprite particles, color shift
      CameraRig.ts               # Forward fly, bass shake
      PostProcessing.ts          # EffectComposer, UnrealBloomPass
    audio/
      AudioPipeline.ts           # AudioContext, AnalyserNode, decode
      FeatureExtractor.ts        # Band split, RMS, beat detection
      constants.ts               # Freq ranges, smoothing factors
    shaders/
      nebulaVertex.glsl
      nebulaFragment.glsl
    config/
      sceneConfig.ts             # TS type + default values
      apiContract.ts             # Request/response types
    store/
      audioStore.ts              # bass, mids, highs, beat, energy
      sceneStore.ts              # colors, speeds, densities
      appStore.ts                # idle | loading | active
    lib/
      metadata.ts                # jsmediatags wrapper
      transitions.ts             # GSAP timeline for config lerp
  public/
    demo-track.mp3               # Fallback for presentations
  .github/workflows/ci.yml
  next.config.js
  tailwind.config.js
  tsconfig.json
  .env.local                     # ANTHROPIC_API_KEY (never commit)
```

---

## Scene Config Schema

Every field has a defined range. The renderer must clamp out-of-range values.

| Field | Type | Range | Description |
|---|---|---|---|
| `primaryColor` | string | `#RRGGBB` | Dominant nebula/ambient color |
| `secondaryColor` | string | `#RRGGBB` | Accent for star highlights and bloom tint |
| `accentColor` | string | `#RRGGBB` | Beat flash and particle burst color |
| `warpSpeedBase` | number | 0.3–3.0 | Base camera speed before audio modulation |
| `starDensity` | number | 0.3–1.0 | Multiplier on star count (base 8000) |
| `streakLengthMultiplier` | number | 0.5–2.0 | Multiplier on streak line length |
| `nebulaIntensity` | number | 0.0–1.0 | Opacity of nebula sprites |
| `bloomStrengthBase` | number | 0.3–1.5 | Base bloom before audio modulation |
| `cameraShakeIntensity` | number | 0.0–1.0 | How much bass impacts camera shake |
| `cosmicTension` | number | 0.0–1.0 | Maps to particle spread and color contrast |
| `mood` | string | enum | serene \| melancholic \| euphoric \| aggressive \| mysterious \| triumphant \| chaotic \| ethereal |

### Fallback Defaults

```json
{
  "primaryColor": "#1a1a3e",
  "secondaryColor": "#2d2d6b",
  "accentColor": "#4a4aff",
  "warpSpeedBase": 0.8,
  "starDensity": 0.5,
  "streakLengthMultiplier": 1.0,
  "nebulaIntensity": 0.3,
  "bloomStrengthBase": 0.6,
  "cameraShakeIntensity": 0.2,
  "cosmicTension": 0.3,
  "mood": "serene"
}
```

---

## Visual States

### Idle (Before Upload)
- Background: deep navy `#0a0a1a`. Stars: cool white `#c8d0e0`. No nebula.
- ~4000 stars (half density), points only, no streaks.
- Camera: slow forward drift at 0.3 units/frame, slight Z-rotation (0.001 rad/frame), no shake.
- Bloom: strength 0.4, radius 0.8, threshold 0.6.

### Transition (Cosmos Awakening, 2–3s)
- Star count ramps to target density. Streaks appear. Nebula fades in. Colors shift to seed palette.
- Camera speed ramps from 0.3 to `warpSpeedBase` via GSAP `power2.inOut`.
- Audio reactivity starts at 50%, lerps to 100% over 2s.

### Active (Audio-Reactive)
- Bass → warp speed + camera shake
- Mids → star brightness + nebula saturation
- Highs → star color temperature (blue-shift) + particle spawn rate
- Energy (RMS) → bloom strength
- Beat events → accent color flash (200ms fade), streak spike 1.5x, camera micro-lurch

---

## Particle & Performance Rules

- **Star representation:** Points (BufferGeometry + PointsMaterial) for main field. LineSegments for streak trails. Do NOT use Sprites or instanced meshes.
- **Particle budget:** Target 10k points at 60fps on a 2020 MacBook.
- **Every frame must be under 20ms.**
- Streak line length is proportional to current warp speed.

---

## Code Conventions

- All source code lives under `src/`.
- Use TypeScript strict mode.
- Prefer `const` over `let`. No `var`.
- Three.js classes are vanilla TS — no React hooks or JSX inside `src/three/`.
- Store access in Three.js: `useAudioStore.getState()` — never `useAudioStore()` (that's a React hook).
- GSAP for config-level transitions (multi-property, eased). Simple `lerp()` for per-frame audio smoothing.
- API keys go in `.env.local`, never committed. Access via `process.env.ANTHROPIC_API_KEY` in API routes only.
- Tailwind for all styling. No CSS modules or styled-components.

---

## Key Decisions (Locked)

These are locked decisions. Do not revisit unless provably broken.

1. **Raw Three.js over react-three-fiber** — more control, less abstraction overhead.
2. **rAF for audio polling** — one FFT read per frame, exactly what the render loop needs.
3. **3s API timeout** — covers Claude p95 latency. Hard cutoff, apply late responses via transition.
4. **GSAP for config transitions, lerp for per-frame smoothing** — different jobs, different tools.
5. **Zustand with 3 stores** — single writer per store, readable outside React.
6. **Dynamic import with ssr: false** — the only safe way to mount Three.js in Next.js App Router.
