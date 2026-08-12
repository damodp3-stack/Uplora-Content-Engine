import { Injectable, Logger } from "@nestjs/common";
import { ScriptDocumentDTO } from "./script-writer.agent";

export interface StoryboardDTO {
  totalShots: number;
  shots: Array<{
    shotNumber: number;
    durationSec: number;
    purpose: "hook" | "problem" | "solution" | "proof" | "cta";
    narrationText: string;
    visualDescription: string;
    cameraMovement:
      | "push_in"
      | "pull_out"
      | "pan_right"
      | "pan_left"
      | "static"
      | "drone_overhead";
    cameraAngle:
      "eye_level" | "low_angle" | "high_angle" | "close_up" | "wide_shot";
    lighting: string;
    environment: string;
    transition: "cut" | "fade" | "whip_pan" | "zoom_blur";
    onScreenText?: string;
    sfxCue?: string;
    generationPrompt: string;
  }>;
}

@Injectable()
export class StoryboardDirectorAgent {
  private readonly logger = new Logger(StoryboardDirectorAgent.name);

  async createStoryboard(script: ScriptDocumentDTO): Promise<StoryboardDTO> {
    this.logger.log(
      `Creating shot-by-shot storyboard from script with ${script.narrationLines.length} lines`,
    );

    const shots = script.narrationLines.map((line, idx) => {
      const isFirst = idx === 0;
      const isLast = idx === script.narrationLines.length - 1;

      return {
        shotNumber: line.lineIndex,
        durationSec: line.suggestedDurationSec,
        purpose: (isFirst ? "hook" : isLast ? "cta" : "solution") as any,
        narrationText: line.text,
        visualDescription: isFirst
          ? "Sleek dark office building exterior with glowing tech lights"
          : isLast
            ? "Uplora dashboard glowing on a modern smartphone screen with CTA button"
            : `Industrial automation facility with robotic arm shot ${line.lineIndex}`,
        cameraMovement: (isFirst ? "push_in" : "pan_right") as any,
        cameraAngle: (isFirst ? "low_angle" : "eye_level") as any,
        lighting: "Dramatic moody blue & cyan industrial lighting",
        environment: "Modern high-tech industrial complex",
        transition: (isLast ? "fade" : "cut") as any,
        onScreenText: line.emphasisWords.join(" • "),
        sfxCue: isFirst ? "whoosh_bass_drop" : "subtle_click",
        generationPrompt: `9:16 vertical shot, ${isFirst ? "modern factory skyline" : "tech dashboard UI"}, 8k resolution, cinematic lighting, photorealistic`,
      };
    });

    return {
      totalShots: shots.length,
      shots,
    };
  }
}
