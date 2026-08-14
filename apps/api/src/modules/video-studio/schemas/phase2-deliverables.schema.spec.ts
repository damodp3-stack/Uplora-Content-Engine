import {
  CreativeConceptSchema,
  StrategyBlueprintSchema,
  ScriptDocumentSchema,
  StoryboardSchema,
  VisualBibleSchema,
  CharacterAssetPackageSchema,
} from "./phase2-deliverables.schema";

describe("Phase 2 Zod Deliverables Schema Validation", () => {
  it("should validate a complete CreativeConceptDTO", () => {
    const validData = {
      title: "Test Concept",
      objective: "Educate viewers",
      targetAudience: {
        persona: "Tech Execs",
        painPoints: ["Legacy tech"],
        desiredOutcome: "Modernization"
      },
      narrativeAngle: "Hook first",
      contentFormat: "instagram_reels",
      platform: "instagram_reels",
      duration: 30,
      language: "english",
      tone: "authoritative",
      hookStrategy: "Stat interrupt",
      creativeDirection: "High tech visuals"
    };

    const parsed = CreativeConceptSchema.parse(validData);
    expect(parsed.title).toBe("Test Concept");
  });

  it("should throw a ZodError when required fields are missing", () => {
    const invalidData = {
      title: "Incomplete Concept"
      // missing targetAudience, objective, etc.
    };

    expect(() => CreativeConceptSchema.parse(invalidData)).toThrow();
  });
});
