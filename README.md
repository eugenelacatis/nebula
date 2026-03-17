# Nebula

**Audio-Reactive Space Travel for the Web**

> Drop a song, fly through its universe.

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Install

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

Copy `.env.local.example` to `.env.local` and add your Anthropic API key:

```
ANTHROPIC_API_KEY=your_api_key_here
```

### Build

```bash
npm run build
```

### Lint

```bash
npm run lint
```

## Tech Stack

- **Next.js** (App Router) — Framework & API routes
- **Three.js** — WebGL rendering (stars, streaks, bloom)
- **Web Audio API** — Real-time FFT analysis
- **GSAP** — Transition timelines
- **Zustand** — State management
- **Claude API** — AI scene seed generation
- **Tailwind CSS** — Styling
- **Vercel** — Deployment
- **GitHub Actions** — CI (lint + build)

## Project Structure

```
src/
  app/           # Next.js pages & API routes
  components/    # React UI components (Canvas, Upload, HUD)
  three/         # Three.js scene classes (vanilla TS)
  audio/         # Web Audio API pipeline
  shaders/       # GLSL shaders
  config/        # Types & defaults
  store/         # Zustand stores
  lib/           # Utilities (metadata, transitions)
```