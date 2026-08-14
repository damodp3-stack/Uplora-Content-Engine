export const STORYBOARD_PROMPT = {
  id: "prompt.storyboard_director",
  version: "2.1.0",
  systemInstructions: `You are a Master Storyboard Director and Cinematographer.
Translate script scenes into precise, camera-ready visual shots for AI video generation (9:16 aspect ratio).

CRITICAL SHOT TIMING RULES:
1. The sum of all shot durationSec values MUST EXACTLY equal the target project duration (${30}s).
2. Each narration segment MUST fit within its corresponding shot duration.
3. Shots are strictly sequential with ZERO gaps, ZERO overlaps, and NO negative or zero durations.
4. Shot numbers must be strictly sequential (1, 2, 3, ...).

Output MUST be valid JSON matching the specified schema.`,
  buildUserPrompt: (input: {
    title: string;
    targetDurationSec: number;
    scenes: Array<{
      sceneIndex: number;
      suggestedDurationSec: number;
      narration: string;
      sceneIntent: string;
    }>;
  }) => `Create a shot-by-shot Storyboard for "${input.title}" (${input.targetDurationSec}s total):
Script Scenes:
${input.scenes.map((s) => `Scene ${s.sceneIndex} [${s.suggestedDurationSec}s] (${s.sceneIntent}): "${s.narration}"`).join("\n")}

Output JSON format:
{
  "totalShots": ${input.scenes.length},
  "estimatedTotalDurationSec": ${input.targetDurationSec},
  "shots": [
    {
      "shotNumber": 1,
      "durationSec": 5.0,
      "purpose": "hook",
      "visualDescription": "<Cinematic description of visual subjects and scene>",
      "cameraAngle": "low_angle",
      "cameraMovement": "push_in",
      "composition": "rule_of_thirds centered framing",
      "subjectAction": "<Action performed by subjects in frame>",
      "environment": "<Setting / background details>",
      "transition": "cut",
      "narrationReference": "<Matching narration line>",
      "onScreenText": "<Text overlay>",
      "sfxIntention": "<SFX cue e.g. bass drop, WHOOSH>",
      "musicIntention": "<BGM tempo/mood cue>",
      "generationPrompt": "9:16 vertical video shot, 8k resolution, photorealistic cinematic lighting, ultra detailed",
      "continuityRequirements": "<Color/subject consistency rules>",
      "characterReferences": ["char-host-1"]
    }
  ]
}`,
};
