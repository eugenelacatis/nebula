# NEBULA

**Audio-Reactive Space Travel for the Web**

Technical Steering Document · 72-Hour Build · 4-Person Team · Spring 2026 · v1.0

---

## 1. Project Vision

Nebula turns any MP3 into a personalized journey through deep space. Drop a song, and a real-time audio analysis pipeline extracts bass, mids, highs, BPM, and spectral energy while a background call to Claude reads the song's metadata and generates a scene seed — colors, warp speed, star density, cosmic tension — that shapes the cosmos to match the music's cultural identity. The result is a Three.js warp tunnel where stars streak, nebulae pulse, and bloom flares in sync with every beat.

If the AI call fails, the cosmos loads anyway with a calm default palette. The AI is a progressive enhancement, not a gate.

**One-liner:** "Drop a song, fly through its universe."

---

## 2. System Architecture

Full data flow from file upload through render loop:

```
USER DROPS MP3
       |
       v
+----------------------------------------------+
|  UPLOAD HANDLER (React component)             |
|  - Validates file type/size                   |
|  - Reads ID3 metadata (title, artist)         |
|  - Creates object URL for <audio> element     |
+----------------------------------------------+
       |                          |
       v                          v
+-------------------+   +---------------------------+
| AUDIO PIPELINE    |   | AI SEED PIPELINE          |
| (Web Audio API)   |   | (Async, non-blocking)     |
|                   |   |                           |
| AudioContext       |   | POST /api/scene-seed     |
|   -> AnalyserNode |   |   -> Claude API           |
|   -> getByteFreq  |   |   -> JSON scene config    |
|                   |   |                           |
| Extracts/frame:   |   | 3s timeout -> fallback   |
|  - bass (20-250)  |   | On success -> lerp to     |
|  - mids (250-4k)  |   |   new config over 2-3s    |
|  - highs (4k-16k) |   +---------------------------+
|  - energy (RMS)   |
|  - beat detection  |
+-------------------+
       |
       v
+----------------------------------------------+
|  SHARED STATE (Zustand store)                 |
|  - audioFeatures: {bass, mids, highs, ...}   |
|  - sceneConfig: {colors, warpSpeed, ...}     |
|  - phase: idle | loading | active             |
+----------------------------------------------+
       |
       v
+----------------------------------------------+
|  THREE.JS RENDER LOOP (rAF)                   |
|  Reads audioFeatures + sceneConfig each frame  |
|                                                |
|  Scene components:                             |
|   - StarField (BufferGeometry + LineSegments)  |
|   - NebulaParticles (ShaderMaterial)           |
|   - Camera (forward fly + shake)              |
|   - Bloom (UnrealBloomPass)                   |
|   - GSAP tweens config transitions             |
+----------------------------------------------+
       |
       v
     CANVAS (fullscreen, behind UI overlay)
```

---

## 3. Tech Stack Justification

| Technology | Why This, Not Something Else |
|---|---|
| **Next.js (App Router)** | File-based routing, API routes for the Claude proxy, zero-config Vercel deployment. CRA is dead and Vite doesn't give us a backend. |
| **Three.js** | Only mature WebGL library with a real ecosystem for post-processing, shaders, and BufferGeometry. Babylon is heavier and less suited to particle-heavy scenes. |
| **Web Audio API** | AnalyserNode gives direct FFT access per frame with no library overhead. Tone.js and Howler.js add abstractions we don't need. |
| **GSAP** | Battle-tested tweening with timeline sequencing. Manual lerp breaks down when coordinating 8+ properties simultaneously. |
| **Claude API** | Structured JSON output from a prompt. Claude's system prompt control and JSON mode are cleaner than OpenAI function calling for this use case. |
| **Zustand** | Lightweight state readable outside React's render cycle. Three.js reads via getState() in rAF. Redux is overkill, Context re-renders too much. |
| **Tailwind CSS** | Utility classes for minimal UI chrome. No component library needed when 90% of the UI is canvas. |
| **Vercel** | One-click deploy from GitHub, automatic preview deploys on PR, free tier. Native Next.js support. |
| **GitHub Actions** | Lint + build on PR. Configured in 20 lines of YAML. |
| **Sentry (optional)** | Client-side error capture with source maps. If Three.js crashes in production, we'll know why. |

---

## 4. Team Structure & Build Plan

One person builds the end-to-end scaffold in the first ~12 hours. The other three review it, present their own versions/ideas, then fork off the working skeleton and build in parallel. This avoids the 72-hour death spiral where four people build four disconnected slices and spend the last 24 hours on merge conflict triage.

### Phase 1: Scaffold (Hours 0–12)

**Owner: Scaffold Lead** — the strongest full-stack person on the team.

At the end of hour 12, the following must be true:

- Next.js project deploys to Vercel with CI green on GitHub Actions
- Three.js canvas mounts via dynamic import (ssr: false) with a basic star field and forward camera
- Web Audio API decodes an MP3, AnalyserNode is connected, raw FFT data logged to console
- Zustand stores exist (audioStore, sceneStore, appStore) with typed interfaces
- /api/scene-seed route returns hardcoded JSON
- Drag-and-drop upload zone works, file triggers audio decode

The scaffold doesn't need to be pretty. Stars can be white dots. The upload zone can be unstyled. The point is that every interface exists and data flows end-to-end.

### Phase 2: Present & Align (Hour ~12)

All four team members review the scaffold. Each person presents their own ideas, critiques, or alternative approaches for their area. The team aligns on the store shapes, the scene config schema, the audio feature format, and the component boundaries. Then everyone forks from the same commit.

### Phase 3: Parallel Build (Hours 12–60)

After forking, each person owns a domain. They work against real interfaces, not guesses, because the scaffold already defines them.

| Domain | Responsibilities | Owned Files | Key Risk |
|---|---|---|---|
| **Scene** | Star field (points + streak lines), nebula particles, camera rig (fly + bass shake), UnrealBloomPass, per-frame update reading audioFeatures and sceneConfig from store. | `src/three/`, `src/shaders/`, `components/Canvas.tsx` | Performance is the risk. Set a particle budget (target: 10k points, 60fps on 2020 MacBook). Profile by hour 36. |
| **Audio** | AudioContext setup, AnalyserNode, frequency band splitting (bass/mids/highs), RMS energy, beat detection, smoothing layer. Write features to audioStore every frame. | `src/audio/`, `src/store/audioStore.ts` | Beat detection is hard. Start with energy threshold + 200ms time gate. If unreliable by hour 48, fall back to energy pulses. |
| **API & Config** | Claude API integration in /api/scene-seed, scene config TypeScript types, 3s AbortController timeout, fallback defaults, GSAP transition timeline on seed arrival. | `src/app/api/`, `src/config/`, `src/store/sceneStore.ts`, `src/lib/transitions.ts` | API latency. The 3s timeout is a hard cutoff. If the seed arrives late, apply it anyway via transition. Never block the experience. |
| **UI & Glue** | Upload component, HUD overlay (song title, artist), loading/phase states, ID3 extraction (jsmediatags), mobile/browser compatibility, Sentry if pursuing bonus. | `src/components/`, `src/app/page.tsx`, `src/lib/metadata.ts`, `src/store/appStore.ts` | Canvas mounting in Next.js App Router is the single blocking risk. The scaffold lead should have solved this, but verify it on your branch. |

### Phase 4: Polish & Freeze (Hours 60–68)

- Feature freeze at hour 60. No new features, only bug fixes and visual tuning.
- Performance audit: every frame must be under 20ms.
- Test with 3 songs across genres (beat-heavy, vocal ballad, ambient).
- Record a 60-second backup demo video in case WiFi or hardware fails during presentation.
- Test on the actual demo machine if possible.

### Phase 5: Demo Prep (Hours 68–72)

- Rehearse the demo walkthrough at least twice.
- Prepare two MP3 files: one dramatic/beat-heavy, one calm/ambient to show contrast.
- Each person should be able to explain their domain in 30 seconds.

---

## 5. Core Technical Decisions

These are locked. Don't revisit them unless something is provably broken. The cost of bikeshedding any one of these is higher than the cost of picking the wrong answer.

### Star/Particle Representation

**Decision:** Points (BufferGeometry + PointsMaterial) for the main star field. LineSegments (separate geometry) for streak trails, with line length proportional to current warp speed. Do NOT use Sprites or instanced meshes for stars.

**Rationale:** Points alone look like a screensaver. Streaks sell the feeling of speed. Instanced geometry draw call overhead kills frame rate at 10k+ particles.

### Audio Polling Strategy

**Decision:** requestAnimationFrame callback. Inside the rAF loop, call `analyser.getByteFrequencyData()` to fill a Uint8Array, then compute band energies and write to the store. Do NOT use ScriptProcessorNode (deprecated) or AudioWorklet (overkill for read-only analysis).

**Rationale:** We only read FFT data, not process audio. rAF gives one read per frame, which is exactly what the render loop needs. AudioWorklet would require postMessage, adding latency for zero benefit.

### Scene Seed API Timeout

**Decision:** 3000ms via AbortController. On timeout, load defaults and start the music. If the response arrives late (race condition), check a flag and apply it via transition anyway.

**Rationale:** Claude's median response time is ~1.5s for a short prompt. 3s covers the p95. Anything longer means something is wrong or the network is flaky.

### Transitions: GSAP vs Manual Lerp

**Decision:** GSAP for all config-level transitions (the 2.5s cosmos awakening on seed arrival). The render loop uses simple linear lerp for per-frame audio-reactive smoothing (e.g., `smoothedBass = lerp(smoothedBass, rawBass, 0.15)`). Different jobs, different tools.

**Rationale:** GSAP handles easing curves and multi-property timelines. Rolling your own for 8+ simultaneous tweens is a waste of 72-hour project time.

### State Management

**Decision:** Zustand. Three stores: audioStore (features, written by audio pipeline), sceneStore (config, written by API/transitions), appStore (phase, written by UI). Each store has a single writer and one or more readers.

**Rationale:** Zustand lets Three.js read state via `getState()` outside React entirely. Context triggers re-renders. Redux is three files of boilerplate per store.

### Three.js + Next.js Coexistence

**Decision:** Dynamic import with `ssr: false` for the Canvas wrapper. Three.js scene lives in a vanilla JS class, not React components. React renders the UI overlay as absolutely positioned divs on top. They share state via Zustand, not props or refs.

**Rationale:** Three.js and React rendering are fundamentally incompatible. react-three-fiber adds abstraction that costs performance and debugging time in a 72-hour build. Keep them separate.

---

## 6. File & Folder Structure

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
      CameraRig.ts              # Forward fly, bass shake
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
  .github/workflows/ci.yml       # Lint + build on PR
  next.config.js
  tailwind.config.js
  tsconfig.json
  .env.local                     # ANTHROPIC_API_KEY (never commit)
  README.md
```

---

## 7. API Contract

### 7a. Claude Scene Seed Request

The Next.js API route sends this to the Anthropic Messages API:

```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 500,
  "system": "You generate scene configurations for an audio-reactive space visualization. Given a song title and artist, return a JSON object that captures the cultural and emotional identity of the song as visual parameters for a deep-space scene. Consider genre, mood, era, cultural context. Return ONLY valid JSON, no markdown, no explanation.",
  "messages": [{
    "role": "user",
    "content": "Song: Bohemian Rhapsody | Artist: Queen"
  }]
}
```

### 7b. Scene Seed Response Schema

Every field has a defined range. The renderer clamps out-of-range values.

| Field | Type | Range | Description |
|---|---|---|---|
| `primaryColor` | string | `#RRGGBB` | Dominant nebula/ambient color. Core mood. |
| `secondaryColor` | string | `#RRGGBB` | Accent for star highlights and bloom tint. |
| `accentColor` | string | `#RRGGBB` | Beat flash and particle burst color. |
| `warpSpeedBase` | number | 0.3–3.0 | Base camera speed before audio modulation. |
| `starDensity` | number | 0.3–1.0 | Multiplier on star count (base 8000). |
| `streakLengthMultiplier` | number | 0.5–2.0 | Multiplier on streak line length. |
| `nebulaIntensity` | number | 0.0–1.0 | Opacity of nebula sprites. |
| `bloomStrengthBase` | number | 0.3–1.5 | Base bloom before audio modulation. |
| `cameraShakeIntensity` | number | 0.0–1.0 | How much bass impacts camera shake. |
| `cosmicTension` | number | 0.0–1.0 | Maps to particle spread and color contrast. |
| `mood` | string | enum | serene \| melancholic \| euphoric \| aggressive \| mysterious \| triumphant \| chaotic \| ethereal |

### 7c. Fallback Default Config

Applied immediately on upload. Overwritten by seed if it arrives within 3 seconds.

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

## 8. Visual Direction

Nebula should feel like movement through a living cosmic environment shaped by music, not just a flight through a fixed warp tunnel. The core experience is still forward travel through space, but the world should behave like responsive matter: luminous particle fields, drifting atmospheres, dense clusters, voids, and flowing structures that reorganize themselves around the song.

The visual identity should prioritize atmosphere, depth, glow, and restraint over literal sci-fi tropes. Instead of relying primarily on constant streaks, vanishing-point warp lines, and aggressive camera motion, the scene should emphasize volumetric particle behavior and the sense that the listener is passing through a dynamic phenomenon. Travel remains central, but the environment should feel discovered and transformed by the music, not predefined.

Music should affect more than speed and brightness. Audio should reshape the character of the environment itself: density, cohesion, turbulence, spatial tension, color drift, and structural flow. Bass can compress or expand the field, mids can bend or organize particle motion, highs can excite shimmer and fragmentation, and beats can trigger larger spatial events such as ripples, openings, bursts, or temporary alignments. The result should feel like the song is continuously re-sculpting the universe around the viewer.

Visually, the target is luminous, hypnotic, and elegant. The experience should feel cosmic, but not generic; expressive, but not chaotic; reactive, but not noisy. Streaks, flashes, and dramatic speed cues should be treated as accents, not the default identity. At its best, Nebula should feel less like a screensaver or a spaceship ride and more like traveling through music as living light.

### 8a. Visual Systems Implementation Brief

The renderer should implement three linked visual mechanics: particle field morphology, flow field traversal, and structural events. Particle field morphology gives the environment shape by allowing the main particle system to form dense clusters, layered bands, and void pockets rather than behaving like a uniform star tunnel. Flow field traversal preserves forward movement through space while bending particles through drifting currents, arcs, and soft directional pressure. Structural events turn beats into short-lived spatial changes such as pulses, openings, collapses, or temporary alignments instead of only bloom spikes and camera lurches.

`StarField` is the primary system for these mechanics. It should own particle density, local clustering, flow motion, and selective streaking. `Nebula` should reinforce atmosphere and regional glow rather than carrying the whole visual identity. `CameraRig` should preserve traversal through space while shifting from aggressive shake toward subtle acceleration, orientation drift, and occasional emphasis during major events. `SceneManager` should coordinate beat-driven event lifecycles and distribute temporary modifiers across the scene.

Audio mapping should favor environmental change over simple intensity scaling. Bass should compress or expand the field and strengthen directional pull. Mids should increase cohesion and reshape the flow. Highs should add shimmer, fragmentation, and fine turbulence. Beat events should trigger brief structural transformations that read as changes in the world itself. Bloom and streaking should remain present, but mostly as accents layered on top of these deeper spatial responses.

The implementation order should be: first, refactor the main particle field so it can cluster, diffuse, and create voids while preserving forward travel; second, add procedural flow behavior so particles move through arcs and currents instead of only linear warp motion; third, add a small event system that triggers pulses, openings, and collapses on beats. This order prioritizes a stronger baseline identity before adding spectacle.

---

## 9. Bonus Points Strategy

Each integration is load-bearing. During the presentation, explicitly name each technology and explain what it does in one sentence.

| Technology | Integration | Presentation Line |
|---|---|---|
| **Three.js** | Entire rendering engine: BufferGeometry, LineSegments, ShaderMaterial, UnrealBloomPass. | "Real-time 3D rendering from scratch. Every star, streak, and glow is WebGL at 60fps." |
| **Vercel** | Deployment with auto preview deploys per PR and prod deploy on merge. | "Every PR got a live preview URL. We tested each other's work before merging." |
| **GitHub Actions** | CI: ESLint + TypeScript + Next.js build. Blocks merge on failure. | "Our CI pipeline runs lint, types, and a full build on every PR. We never merged broken code." |
| **Claude API** | Scene seed from song metadata. Cultural/emotional identity → visual parameters. | "Claude analyzes the song's identity and generates a unique visual config. That's why each song's cosmos feels different." |
| **Sentry** | Client-side error monitoring with source maps. Captures WebGL context loss. | "If the WebGL context crashes on a user's device, we get a stack trace. We can show the dashboard." |

---

## 10. Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| 1 | Three.js < 30fps on demo hardware | Med | High | Set particle budget by hour 36. Profile with Chrome DevTools. Have a "low quality" flag that halves particles and disables nebula. Test on demo machine by hour 60. |
| 2 | Claude API slow/down during demo | Low | Med | 3s timeout + fallback means demo works without API. Prepare two flows: one with AI (show transition), one without (show fallback). Either is impressive. |
| 3 | Beat detection fires erratically | Med | Med | Calibrate with 3 test songs by hour 48. If unreliable, fall back to energy threshold pulses. Never demo a broken feature. |
| 4 | Canvas fails to mount in Next.js App Router | Low | Critical | Scaffold lead tests dynamic import with ssr:false in the first 4 hours. If it fails, eject to a static HTML page. This is the only truly blocking risk. |
| 5 | Team member falls behind or goes silent | Med | High | Standups every 8 hours (async in Discord). If stuck for 4+ hours, raise a flag. Roles are designed so any one can be descoped without killing the demo. |

---

## 11. Demo Script

3–5 minutes. The audience should feel the experience first, then understand the tech. Do not open with architecture.

### Setup

- Browser open to deployed Vercel URL. Fullscreen.
- Two MP3s on desktop: (1) dramatic/beat-heavy (e.g., Bohemian Rhapsody), (2) calm ambient (e.g., Brian Eno).
- Backup: 60-second screen recording of best demo run.
- Audio through room speakers.

### Script

| Time | Beat | Script |
|---|---|---|
| 0:00–0:15 | HOOK | Idle cosmos on screen. "This is Nebula. Right now it's just drifting through space. Watch what happens when we give it music." |
| 0:15–0:30 | THE DROP | Drag the dramatic MP3 onto the page. Don't talk. Let the cosmos awaken: stars multiply, streaks appear, colors shift, bloom intensifies. 15 seconds of pure experience. |
| 0:30–1:30 | REACTIVITY | "Every visual is driven by real-time audio analysis. Bass drives speed and shake. Mids control brightness. Highs shift color. And on every beat—" (wait for a beat) "—that." Let it play for 30 more seconds. |
| 1:30–2:15 | AI | "What makes this different from a random visualizer is the AI. When you drop a song, we send the title and artist to Claude, and it returns a scene config matched to the song's cultural identity." Pause. Drop the ambient track. "Watch the cosmos change." Let the transition happen. "Same engine, completely different cosmos. That's the AI." |
| 2:15–3:00 | TECH | "Under the hood: Three.js for 3D at 60fps. Web Audio API for frequency analysis every frame. GSAP for smooth transitions. Next.js on Vercel with CI via GitHub Actions. Claude's API as a creative backend with a 3-second timeout and seamless fallback." |
| 3:00–3:30 | DECISIONS | "We skipped react-three-fiber for raw Three.js — more control over the render loop. Zustand over Context because Three.js reads state outside React. The AI is a progressive enhancement: if Claude is down, you still fly through space." |
| 3:30–4:00 | CLOSE | "Drop a song, fly through its universe." Leave the active cosmos running during Q&A. |