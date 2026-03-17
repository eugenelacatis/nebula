import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_SCENE_CONFIG } from '@/config/sceneConfig';
import type { SceneSeedRequest, SceneSeedResponse } from '@/config/apiContract';

// Phase 1: Returns hardcoded JSON
// Phase 3 (API & Config domain) will integrate Claude API here
export async function POST(request: NextRequest): Promise<NextResponse<SceneSeedResponse>> {
  try {
    const body: SceneSeedRequest = await request.json();
    console.log('[scene-seed] Received request:', body.title, '-', body.artist);

    // TODO: Replace with Claude API call in Phase 3
    // For now, return the default config as if AI generated it
    const config = {
      ...DEFAULT_SCENE_CONFIG,
      // Slightly different from defaults to prove the endpoint works
      primaryColor: '#2a1a4e',
      secondaryColor: '#3d2d7b',
      accentColor: '#6a4aff',
      warpSpeedBase: 1.2,
      starDensity: 0.7,
      bloomStrengthBase: 0.8,
      mood: 'euphoric' as const,
    };

    return NextResponse.json({
      config,
      fromAI: false, // Will be true once Claude integration is live
    });
  } catch (error) {
    console.error('[scene-seed] Error:', error);
    return NextResponse.json({
      config: DEFAULT_SCENE_CONFIG,
      fromAI: false,
    });
  }
}
