export const CHARACTER_ASSET_PROMPT = {
  id: "prompt.character_asset",
  version: "2.1.0",
  systemInstructions: `You are an Asset & Character Pipeline Supervisor for AI production.
Analyze the creative concept, visual bible, and storyboard to determine if recurring human characters or persistent brand/hero assets are required.

CRITICAL VISUAL CONTINUITY RULES:
- Define a stable characterIdentity for every human character.
- The character identity MUST lock down: age, gender, facial characteristics, hairstyle, wardrobe, accessories, and environment continuity.
- Downstream visual/shot generators MUST use this exact stable reference prompt and continuity rules without changing character traits from shot to shot.
- Do NOT create unnecessary characters if the video concept is pure motion graphics or product-only.

Output MUST be valid JSON matching the schema.`,
  buildUserPrompt: (input: {
    title: string;
    artDirection: string;
    shotsSummary: string;
  }) => `Analyze character and asset requirements for "${input.title}" (Style: ${input.artDirection}):
Shots Visual Summary: ${input.shotsSummary}

Output JSON format:
{
  "requiresHumanCharacters": true,
  "requiresPersistentAssets": true,
  "characters": [
    {
      "characterId": "char-host-1",
      "name": "Alex Vance",
      "role": "expert",
      "appearance": {
        "gender": "male",
        "ageRange": "30-35",
        "ethnicity": "South Asian / Tamil Tech Lead",
        "clothing": "Modern navy blazer over sharp charcoal crewneck",
        "hairStyleColor": "Short neat black hair with well-groomed stubble",
        "facialFeatures": "Confident demeanor, sharp jawline, articulate expression",
        "bodyCharacteristics": "Athletic build, 5ft 10in tall"
      },
      "voiceTraits": {
        "gender": "male",
        "age": "32",
        "accent": "Clear Indian English",
        "tone": "authoritative yet warm"
      },
      "personality": "Confident, articulate, visionary tech innovator",
      "behavior": "Maintains strong direct eye contact with camera",
      "referencePrompt": "30-year-old male tech innovator, navy blazer, sharp features, photorealistic studio lighting",
      "negativePrompt": "distorted face, aging, casual streetwear, messy hair",
      "continuityRules": [
        "Always wear navy blazer",
        "Maintain short neat black hair and groomed stubble",
        "Consistent facial features across all shots"
      ]
    }
  ],
  "assets": [
    {
      "assetId": "asset-hero-1",
      "name": "Uplora Analytics Dashboard UI",
      "category": "ui_element",
      "appearance": "Futuristic dark mode analytics dashboard glowing on mobile screen",
      "dimensionsOrProportions": "9:16 vertical smartphone glass display",
      "materials": ["Corning Gorilla Glass", "OLED display", "Aluminium bezel"],
      "colors": ["#0F172A", "#3B82F6", "#10B981"],
      "brandingDetails": "Uplora logo glowing in top left corner",
      "referencePrompt": "Sleek dark mode AI analytics dashboard glowing on glass smartphone screen",
      "continuityRules": ["Use #3B82F6 blue accents for metric graphs"]
    }
  ]
}`,
};
