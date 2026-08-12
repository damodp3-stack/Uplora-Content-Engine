import { Injectable, Logger } from "@nestjs/common";
import { CreativeConceptDTO } from "./creative-director.agent";
import { VisualBibleDTO } from "./visual-director.agent";

export interface CharacterProfileDTO {
  characterId: string;
  name: string;
  role: "host" | "customer" | "expert" | "narrator";
  appearance: {
    gender: string;
    ageRange: string;
    ethnicity: string;
    clothing: string;
    hairStyleColor: string;
    facialFeatures: string;
  };
  voiceTraits: {
    gender: string;
    age: string;
    accent: string;
    tone: string;
  };
  referenceSeed: number;
}

@Injectable()
export class CharacterAssetAgent {
  private readonly logger = new Logger(CharacterAssetAgent.name);

  async generateProfiles(
    concept: CreativeConceptDTO,
    visualBible: VisualBibleDTO,
  ): Promise<CharacterProfileDTO[]> {
    this.logger.log(
      `Generating character profiles for concept: ${concept.title}`,
    );

    return [
      {
        characterId: "char-host-1",
        name: "Alex Vance",
        role: "expert",
        appearance: {
          gender: "male",
          ageRange: "30-35",
          ethnicity: "South Asian / Tamil Tech Lead",
          clothing: "Modern navy blazer over sharp charcoal crewneck",
          hairStyleColor: "Short neat black hair with well-groomed stubble",
          facialFeatures:
            "Confident demeanor, sharp jawline, articulate expression",
        },
        voiceTraits: {
          gender: "male",
          age: "32",
          accent: "Indian English / Clear Tamil accent",
          tone: "authoritative yet warm",
        },
        referenceSeed: 104258,
      },
    ];
  }
}
