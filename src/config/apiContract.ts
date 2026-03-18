import type { SceneConfig } from './sceneConfig';

export interface SceneSeedRequest {
  title: string;
  artist: string;
}

export type SceneSeedResponse = SceneConfig;
