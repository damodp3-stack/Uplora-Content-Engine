import { Injectable, Logger } from "@nestjs/common";
import { CreativeConceptDTO } from "./creative-director.agent";

export interface VisualBibleDTO {
  artDirectionStyle:
    | "cinematic_industrial"
    | "minimalist_tech"
    | "vibrant_modern"
    | "dark_mode_sleek";
  colorPalette: {
    primaryHex: string;
    secondaryHex: string;
    accentHex: string;
    backgroundHex: string;
  };
  lightingStyle: string;
  cameraLens: string;
  aspectRatio: "9:16";
  negativePrompt: string;
}

@Injectable()
export class VisualDirectorAgent {
  private readonly logger = new Logger(VisualDirectorAgent.name);

  async createVisualBible(
    concept: CreativeConceptDTO,
  ): Promise<VisualBibleDTO> {
    this.logger.log(`Creating Visual Bible for concept: ${concept.title}`);

    return {
      artDirectionStyle: "cinematic_industrial",
      colorPalette: {
        primaryHex: "#0F172A",
        secondaryHex: "#3B82F6",
        accentHex: "#10B981",
        backgroundHex: "#020617",
      },
      lightingStyle:
        "Cinematic volumetrix lighting with cyan and amber rim light",
      cameraLens: "35mm anamorphic prime lens, shallow depth of field",
      aspectRatio: "9:16",
      negativePrompt:
        "blurry, low quality, distorted text, ugly faces, bad anatomy, noise, artifacts",
    };
  }
}
