// ─── Preset metadata sent to Claude as context ────────────────────────────────
const PRESET_META = {
  'cosmic-pulse': {
    label: 'Cosmic Pulse',
    genre: 'Techno',
    bpm: 128,
    mood: 'intense, mechanical, electric, driving, relentless',
  },
  'nebula-drift': {
    label: 'Nebula Drift',
    genre: 'Ambient',
    bpm: null,
    mood: 'floating, dreamlike, vast, peaceful, ethereal, weightless',
  },
  'solar-winds': {
    label: 'Solar Winds',
    genre: 'Drum & Bass',
    bpm: 170,
    mood: 'explosive, chaotic, fast, raw power, turbulent',
  },
};

export function presetMetadata(id) {
  return PRESET_META[id] ?? { label: id, genre: 'Unknown' };
}

// ─── Prompt ────────────────────────────────────────────────────────────────────
function buildPrompt(metadata) {
  return `You are a creative director for a real-time space nebula music visualizer. Your job is to generate a skybox theme that looks *dramatically* different depending on the music's genre and mood — someone switching between tracks should feel like they've jumped to a completely different region of space.

Music metadata:
${JSON.stringify(metadata, null, 2)}

Return ONLY a valid JSON object — absolutely no markdown, no code fences, no explanation. Just raw JSON.

{
  "primaryColor":    "#rrggbb",
  "secondaryColor":  "#rrggbb",
  "accentColor":     "#rrggbb",
  "backgroundColor": "#rrggbb",
  "nebulaOpacity":   <0.2–1.0>,
  "cloudScale":      <1.0–6.0>,
  "wispiness":       <0.0–1.0>,
  "starDensity":     <0.0–1.0>,
  "starBrightness":  <0.3–1.5>,
  "energy":          <0.3–0.85>,
  "animSpeed":       <0.05–2.0>,
  "colorBias":       <0.0–1.0>
}

Parameter guide — use the full range boldly:
- primaryColor / secondaryColor / accentColor: three distinct cosmic colors matching the mood. Never pick colors that are similar to each other.
- backgroundColor: the deep space void, usually near-black but tinted with the dominant hue
- nebulaOpacity: cloud density (0.2 = faint wisps barely visible, 1.0 = thick dense formations)
- cloudScale: 1.0 = vast sweeping galaxy-sized formations, 6.0 = tight intricate turbulent detail
- wispiness: 0.0 = razor-sharp dramatic cloud edges with harsh contrast, 1.0 = soft diffuse organic mist
- starDensity: 0.0 = empty void, 1.0 = densely packed starfield
- starBrightness: star point intensity (0.3 = barely visible, 1.5 = brilliant blazing)
- energy: overall luminosity (0.3 = dark moody underworld, 0.85 = vivid bright)
- animSpeed: nebula drift (0.05 = geological stillness, 2.0 = fast turbulent churning)
- colorBias: 0.0 = primaryColor dominates, 1.0 = secondaryColor dominates

Mandatory style targets — each must look nothing like the others:

TECHNO / HIGH BPM (≥120 bpm):
  Tight swirling clouds (cloudScale 4.5–6.0), razor edges (wispiness 0.0–0.15),
  electric neon colors (hot magenta + electric cyan + white), dense stars,
  vivid energy (0.75–0.85), fast animation (1.3–2.0)

AMBIENT / CHILL:
  Vast misty formations (cloudScale 1.0–1.8), extremely wispy (0.75–1.0),
  deep cool hues (midnight navy + deep teal + soft indigo), very sparse stars (0.1–0.25),
  dim glowing energy (0.5–0.8), near-frozen drift (0.05–0.15)

DRUM & BASS / VERY HIGH BPM (≥160 bpm):
  Streaky turbulent clouds (cloudScale 3.5–5.5), semi-sharp (wispiness 0.1–0.3),
  explosive warm colors (volcanic orange + deep crimson + solar gold),
  dense bright stars, vivid energy (0.78–0.85), fast swirling animation (1.6–2.0)

JAZZ / BLUES:
  Organic flowing clouds (cloudScale 2.0–3.5), medium wispiness (0.35–0.6),
  warm rich colors (amber gold + sapphire blue + burgundy), moderate stars,
  warm glowing energy (0.9–1.3), slow languid drift (0.15–0.4)

CLASSICAL / ORCHESTRAL:
  Vast elegant formations (cloudScale 1.2–2.2), very wispy (0.65–0.9),
  cool noble colors (pearl silver + deep violet + rose gold), sparse stars,
  dignified moderate energy (0.8–1.2), very slow majestic drift (0.05–0.2)

POP / INDIE:
  Balanced medium clouds (cloudScale 2.5–4.0), moderate wispiness (0.3–0.55),
  vivid uplifting colors (bright rose + sky blue + golden yellow), moderate stars,
  bright cheerful energy (1.1–1.5), lively animation (0.5–1.0)

If the genre doesn't match any above, use your creative judgement to make it unique.
For user-uploaded files, infer genre and mood from the filename if possible.`;
}

// ─── Main export ──────────────────────────────────────────────────────────────
export async function fetchSkyboxParams(metadata) {
  const key = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!key) {
    console.warn('[NebulaSkybox] VITE_ANTHROPIC_API_KEY not set — using defaults.');
    return null;
  }

  try {
    const res = await fetch('/api/claude/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-api-key':       key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages:   [{ role: 'user', content: buildPrompt(metadata) }],
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);

    const data     = await res.json();
    const rawText  = data.content[0].text.trim();
    // Strip markdown fences if Claude wraps the JSON anyway
    const jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    return JSON.parse(jsonText);
  } catch (err) {
    console.error('[NebulaSkybox] Claude API error:', err);
    return null;
  }
}
