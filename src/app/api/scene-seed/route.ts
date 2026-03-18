import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { sanitizeSceneConfig } from "@/config/apiContract";
import { DEFAULT_SCENE_CONFIG } from "@/config/sceneConfig";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const { title, artist } = await req.json();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    try {
      const message = await client.messages.create(
        {
          model: "claude-sonnet-4-6",
          max_tokens: 512,
          messages: [
            {
              role: "user",
              content: `You are a visual designer for a space visualization app. Given a song, generate a JSON scene configuration.

Song: "${title}" by "${artist}"

Return ONLY valid JSON with these exact fields:
{
  "primaryColor": "#rrggbb",
  "secondaryColor": "#rrggbb",
  "accentColor": "#rrggbb",
  "backgroundColor": "#rrggbb",
  "warpSpeedBase": 1.0,
  "cosmicTension": 0.5,
  "cameraShakeIntensity": 0.4,
  "starDensity": 1.0,
  "nebulaIntensity": 0.6,
  "bloomStrengthBase": 1.2,
  "streakLengthMultiplier": 1.0,
  "mood": "string"
}

Constraints:
- warpSpeedBase: 0.5–3.0
- cosmicTension: 0.0–1.0
- cameraShakeIntensity: 0.0–1.0
- starDensity: 0.1–2.0
- nebulaIntensity: 0.0–1.0
- bloomStrengthBase: 0.0–3.0
- streakLengthMultiplier: 0.5–3.0
- backgroundColor should be very dark (near black)
- Make colors emotionally match the song's genre/mood/energy`,
            },
          ],
        },
        { signal: controller.signal }
      );

      clearTimeout(timeout);

      const text = message.content[0].type === "text" ? message.content[0].text : "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON in response");

      const raw = JSON.parse(jsonMatch[0]);
      const config = sanitizeSceneConfig(raw);

      return NextResponse.json(config);
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  } catch (err) {
    console.error("scene-seed error:", err);
    return NextResponse.json(DEFAULT_SCENE_CONFIG);
  }
}
