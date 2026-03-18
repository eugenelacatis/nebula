import { AudioPipeline } from "@/audio/AudioPipeline";
import { usePlayerStore } from "@/store/playerStore";
import { transitionSceneConfig } from "@/lib/transitions";
import { sanitizeSceneConfig } from "@/config/apiContract";
import { extractMetadata } from "@/lib/metadata";

export let globalAudioEl: HTMLAudioElement | null = null;
let pipeline: AudioPipeline | null = null;

function stopCurrent() {
  pipeline?.stop();
  pipeline?.dispose();
  pipeline = null;
  if (globalAudioEl) {
    globalAudioEl.pause();
    globalAudioEl.src = "";
    globalAudioEl = null;
  }
}

function startPipeline(audioEl: HTMLAudioElement) {
  pipeline = new AudioPipeline();
  pipeline.init(audioEl);
  audioEl.play().catch(() => {});
  pipeline.start();
}

function triggerSceneSeed(title: string, artist: string) {
  fetch("/api/scene-seed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, artist }),
  })
    .then((r) => r.json())
    .then((raw) => transitionSceneConfig(sanitizeSceneConfig(raw)))
    .catch(() => {});
}

export async function loadAudioFile(file: File): Promise<void> {
  if (!file.type.includes("audio") && !file.name.endsWith(".mp3")) return;
  stopCurrent();

  const meta = await extractMetadata(file);
  usePlayerStore.getState().setTrackInfo(meta.title, meta.artist);

  const audioEl = new Audio();
  audioEl.src = URL.createObjectURL(file);
  audioEl.loop = true;
  globalAudioEl = audioEl;
  startPipeline(audioEl);
  triggerSceneSeed(meta.title, meta.artist);
}

export async function loadAudioUrl(url: string): Promise<void> {
  stopCurrent();

  // Derive a title from the filename
  const filename = decodeURIComponent(url.split("/").pop() ?? url);
  const title  = filename.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
  const artist = "Unknown Artist";
  usePlayerStore.getState().setTrackInfo(title, artist);

  const audioEl = new Audio();
  audioEl.src = url;
  audioEl.loop = true;
  globalAudioEl = audioEl;
  startPipeline(audioEl);
  triggerSceneSeed(title, artist);
}
