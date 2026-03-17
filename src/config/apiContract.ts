import { SceneConfig } from './sceneConfig';

export interface SceneSeedRequest {
  title: string;
  artist: string;
}

export interface SceneSeedResponse {
  config: SceneConfig;
  fromAI: boolean;
}
