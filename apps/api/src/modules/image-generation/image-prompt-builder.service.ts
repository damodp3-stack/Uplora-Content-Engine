import { Injectable, Logger } from "@nestjs/common";
import { ImageGenerationOptions } from "./providers/image-provider.interface";

export interface ShotPromptInput {
  shot: {
    shotNumber: number;
    visualDescription: string;
    cameraAngle?: string;
    cameraMovement?: string;
    composition?: string;
    subjectAction?: string;
    environment?: string;
    generationPrompt?: string;
  };
  concept?: {
    title?: string;
    creativeDirection?: string;
  };
  visualBible?: {
    artDirection?: string;
    visualStyle?: string;
    colorPalette?: {
      primaryHex?: string;
      secondaryHex?: string;
      accentHex?: string;
    };
    lighting?: string;
    lensStyle?: string;
    compositionRules?: string[];
    texture?: string;
    negativePrompts?: string;
  };
  characterIdentity?: {
    characterId?: string;
    name?: string;
    appearance?: {
      gender?: string;
      ageRange?: string;
      ethnicity?: string;
      clothing?: string;
      hairStyleColor?: string;
      facialFeatures?: string;
      bodyCharacteristics?: string;
    };
    continuityRules?: string[];
  };
  platform?: string;
  targetWidth?: number;
  targetHeight?: number;
}

@Injectable()
export class ImagePromptBuilderService {
  private readonly logger = new Logger(ImagePromptBuilderService.name);

  buildPrompt(input: ShotPromptInput): ImageGenerationOptions {
    const { shot, visualBible, characterIdentity, platform = "instagram_reels" } = input;

    // 1. Core Visual Description & Subject Action
    const baseVisual = shot.generationPrompt || shot.visualDescription;
    const subjectActionStr = shot.subjectAction ? `Subject Action: ${shot.subjectAction}.` : "";
    const environmentStr = shot.environment ? `Environment: ${shot.environment}.` : "";

    // 2. Visual Bible Direction Injection
    const styleStr = visualBible?.visualStyle || visualBible?.artDirection || "Cinematic 35mm photography";
    const lightingStr = visualBible?.lighting ? `Lighting: ${visualBible.lighting}.` : "";
    const lensStr = visualBible?.lensStyle ? `Shot on ${visualBible.lensStyle}.` : "";

    let colorPaletteStr = "";
    if (visualBible?.colorPalette) {
      const { primaryHex, secondaryHex, accentHex } = visualBible.colorPalette;
      colorPaletteStr = `Color Grade: dominant tones ${primaryHex || ""}, ${secondaryHex || ""}, accented with ${accentHex || ""}.`;
    }

    // 3. Persistent Character Identity Injection
    let characterStr = "";
    if (characterIdentity && characterIdentity.appearance) {
      const app = characterIdentity.appearance;
      characterStr = `Featured Character: ${app.ageRange || "30yo"} ${app.gender || "person"} ${app.ethnicity || ""}, ${app.hairStyleColor || "black hair"}, ${app.facialFeatures || ""}, wearing ${app.clothing || "navy blazer"}. Consistent identity contract (${characterIdentity.characterId || "char-1"}).`;
    }

    // 4. Camera & Platform Framing (9:16 Vertical Reel)
    const cameraStr = `Framing: ${shot.cameraAngle || "eye_level"} camera angle, ${shot.composition || "centered vertical framing"}, 9:16 vertical ratio for Instagram Reels feed.`;
    const resolutionStr = "8k resolution, photorealistic masterwork, highly detailed texture, cinematic depth of field.";

    // Assemble Positive Prompt
    const positivePrompt = [
      baseVisual,
      subjectActionStr,
      environmentStr,
      characterStr,
      styleStr,
      lightingStr,
      lensStr,
      colorPaletteStr,
      cameraStr,
      resolutionStr,
    ]
      .filter(Boolean)
      .join(" ");

    // Assemble Negative Prompt
    const defaultNegative =
      "blurry, low quality, distorted anatomy, extra limbs, ugly faces, bad eyes, text artifacts, watermark, logo, oversaturated, cropped head, horizontal framing, 16:9 widescreen";
    const negativePrompt = visualBible?.negativePrompts
      ? `${visualBible.negativePrompts}, ${defaultNegative}`
      : defaultNegative;

    // Platform Dimensions (9:16 Vertical)
    const width = input.targetWidth || 768;
    const height = input.targetHeight || 1344;
    const seed = shot.shotNumber ? 42000 + shot.shotNumber : 42001;

    return {
      prompt: baseVisual,
      positivePrompt,
      negativePrompt,
      aspectRatio: "9:16",
      width,
      height,
      seed,
      characterIdentity: characterIdentity ? (characterIdentity as Record<string, any>) : undefined,
      style: styleStr,
    };
  }
}
