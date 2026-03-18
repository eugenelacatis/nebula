# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: Nebula

An audio-reactive space visualization app. Users drop an MP3 and get a personalized real-time journey through deep space — a Three.js warp tunnel where the cosmos is shaped by the music.

## Core Architecture

### Audio Pipeline
- On MP3 upload, extract audio features in real-time: bass, mids, highs, BPM, spectral energy
- Simultaneously, fire a background Claude API call with song metadata to generate a **scene seed**: colors, warp speed, star density, cosmic tension, etc.
- If the Claude API call fails, fall back to sensible defaults

### Scene Seed → Visual Mapping
The Claude-generated scene seed drives all visual parameters. The scene adapts to the cultural/emotional identity of the music, not just raw audio levels.

### Three.js Visualization
- **Warp tunnel**: stars streak toward the camera in sync with beats
- **Nebulae**: pulse flares on beat
- **Waveform**: rendered as a 3D ribbon coming toward the user. The user appears to fly toward it. It reacts to every beat.
  - Drag interaction: dragging from center-right steers left (like a train track bending), then straightens out

### Tech Stack
- **Framework**: Next.js (App Router)
- **3D**: Three.js
- **AI**: Claude API (scene seed generation from song metadata)
- **State**: Zustand stores (audio, player, scene, controls, app)
- **Language**: TypeScript
