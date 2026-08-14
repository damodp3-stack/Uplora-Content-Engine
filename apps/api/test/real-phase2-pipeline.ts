import * as dotenv from "dotenv";
import * as path from "path";
import { ConfigService } from "@nestjs/config";
import { GeminiProvider } from "../src/modules/ai-engine/providers/gemini.provider";
import { OpenAIProvider } from "../src/modules/ai-engine/providers/openai.provider";
import { OllamaProvider } from "../src/modules/ai-engine/providers/ollama.provider";
import { HuggingFaceProvider } from "../src/modules/ai-engine/providers/huggingface.provider";
import { PromptEngineService } from "../src/modules/ai-engine/prompt-engine.service";
import { AIEngineService } from "../src/modules/ai-engine/ai-engine.service";

import { CreativeDirectorAgent } from "../src/modules/video-studio/agents/creative-director.agent";
import { ResearchAgent } from "../src/modules/video-studio/agents/research.agent";
import { ContentStrategistAgent } from "../src/modules/video-studio/agents/content-strategist.agent";
import { ScriptWriterAgent } from "../src/modules/video-studio/agents/script-writer.agent";
import { StoryboardDirectorAgent } from "../src/modules/video-studio/agents/storyboard-director.agent";
import { VisualDirectorAgent } from "../src/modules/video-studio/agents/visual-director.agent";
import { CharacterAssetAgent } from "../src/modules/video-studio/agents/character-asset.agent";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

async function runRealPhase2Pipeline() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey === "YOUR_REAL_KEY") {
    console.error("❌ GEMINI_API_KEY is not configured in local .env");
    process.exit(1);
  }

  const configService = new ConfigService({
    GEMINI_API_KEY: apiKey,
    AI_DEFAULT_PROVIDER: "gemini",
    GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-1.5-flash",
  });

  const promptEngine = new PromptEngineService();
  const geminiProvider = new GeminiProvider(configService);
  const openaiProvider = new OpenAIProvider(configService);
  const ollamaProvider = new OllamaProvider(configService);
  const huggingfaceProvider = new HuggingFaceProvider(configService);

  const aiEngine = new AIEngineService(
    configService,
    promptEngine,
    geminiProvider,
    openaiProvider,
    ollamaProvider,
    huggingfaceProvider,
  );

  const creativeDirector = new CreativeDirectorAgent(aiEngine);
  const researchAgent = new ResearchAgent(aiEngine);
  const contentStrategist = new ContentStrategistAgent(aiEngine);
  const scriptWriter = new ScriptWriterAgent(aiEngine);
  const storyboardDirector = new StoryboardDirectorAgent(aiEngine);
  const visualDirector = new VisualDirectorAgent(aiEngine);
  const characterAsset = new CharacterAssetAgent(aiEngine);

  const rawPrompt =
    "Create a 30-second Instagram Reel for Uplora explaining why industrial companies need a professional website.";

  console.log("=================================================================");
  console.log("🎬 STARTING REAL PHASE 2 CREATIVE PIPELINE (POWERED BY GEMINI)");
  console.log(`Prompt: "${rawPrompt}"`);
  console.log("=================================================================\n");

  try {
    // 1. Creative Director
    console.log("--> Stage 1: Creative Director (Developing Concept)...");
    const concept = await creativeDirector.developConcept(
      rawPrompt,
      "instagram_reels",
      30,
      "english",
    );
    console.log("✅ Concept developed.");

    // 2. Research Agent
    console.log("--> Stage 2: Research Agent (Collecting Insights)...");
    const research = await researchAgent.collectResearch(
      rawPrompt,
      concept.targetAudience?.persona || "Industrial Decision Makers",
    );
    console.log("✅ Research collected.");

    // 3. Content Strategist Agent
    console.log("--> Stage 3: Content Strategist (Building Strategy)...");
    const strategy = await contentStrategist.buildStrategy(concept, research);
    console.log("✅ Strategy built.");

    // 4. Script Writer Agent
    console.log("--> Stage 4: Script Writer (Writing Script)...");
    const script = await scriptWriter.writeScript(concept, strategy, research);
    console.log("✅ Script written.");

    // 5. Storyboard Director Agent
    console.log("--> Stage 5: Storyboard Director (Creating Storyboard & Shot Plan)...");
    const storyboard = await storyboardDirector.createStoryboard(script);
    console.log("✅ Storyboard created.");

    // 6. Visual Director Agent
    console.log("--> Stage 6: Visual Director (Building Visual Bible)...");
    const visualBible = await visualDirector.createVisualBible(concept);
    console.log("✅ Visual Bible created.");

    // 7. Character & Asset Agent
    console.log("--> Stage 7: Character & Asset Agent (Generating Assets & Profiles)...");
    const characterAssetPkg = await characterAsset.generateProfiles(
      concept,
      visualBible,
      storyboard,
    );
    console.log("✅ Characters & Assets generated.");

    const finalPipelineOutput = {
      prompt: rawPrompt,
      provider: "gemini",
      stages: {
        concept,
        research,
        strategy,
        script,
        storyboard,
        visualBible,
        characterAssetPkg,
      },
    };

    console.log("\n=================================================================");
    console.log("   PHASE 2 CREATIVE PIPELINE FULL REAL AI GENERATION OUTPUT");
    console.log("=================================================================\n");
    console.log(JSON.stringify(finalPipelineOutput, null, 2));

  } catch (err: any) {
    console.error("❌ Phase 2 Creative Pipeline Execution Failed:");
    console.error(err.message || String(err));
    process.exit(1);
  }
}

runRealPhase2Pipeline();
