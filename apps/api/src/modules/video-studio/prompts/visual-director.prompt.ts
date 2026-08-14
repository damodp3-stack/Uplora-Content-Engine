export const VISUAL_DIRECTOR_PROMPT = {
  id: "prompt.visual_director",
  version: "2.0.0",
  systemInstructions: `You are a World-Class Production Designer and Visual Effects Director.
Define the Visual Bible (art direction, color palette, lighting, camera lens parameters, motion language, and negative prompts) to maintain flawless visual coherence across all shots.
Output MUST be valid JSON.`,
  buildUserPrompt: (input: {
    title: string;
    creativeDirection: string;
    platform: string;
  }) => `Develop a production-ready Visual Bible for "${input.title}":
Creative Direction: ${input.creativeDirection}
Platform Format: 9:16 vertical ${input.platform}

Output JSON format:
{
  "artDirection": "<e.g. Cinematic Industrial Tech, Dark Modern Sleek>",
  "visualStyle": "<e.g. Photorealistic 35mm anamorphic film style with high contrast>",
  "colorPalette": {
    "primaryHex": "#0F172A",
    "secondaryHex": "#3B82F6",
    "accentHex": "#10B981",
    "backgroundHex": "#020617",
    "neutralHex": "#64748B"
  },
  "lighting": "<e.g. Dramatic volumetric moody cyan and amber rim lighting>",
  "cameraLanguage": "<e.g. Dynamic camera movements with smooth gimbal tracking>",
  "lensStyle": "<e.g. 35mm anamorphic prime lens, shallow depth of field, f/1.8>",
  "compositionRules": ["Rule of thirds", "Leading lines", "Vertical center subject alignment"],
  "environmentStyle": "<e.g. High-tech modern industrial automation facility>",
  "texture": "<e.g. Metallic matte finishes, reflective glass, subtle particle dust>",
  "motionLanguage": "<e.g. Fluid 60fps micro-movements with energetic transitions>",
  "typographyDirection": "<e.g. Bold sans-serif Outfit font with cyan highlight callouts>",
  "negativePrompts": "blurry, low quality, distorted text, ugly faces, bad anatomy, noise, extra limbs, grain",
  "consistencyRules": ["Maintain cyan rim lighting across all indoor shots", "Keep primary background dark navy #0F172A"]
}`,
};
