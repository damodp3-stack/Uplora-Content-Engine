import * as dotenv from "dotenv";
import * as path from "path";
import { ConfigService } from "@nestjs/config";
import { GeminiProvider } from "../src/modules/ai-engine/providers/gemini.provider";
import { z } from "zod";

// Load root .env
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
// Also load cwd .env if available
dotenv.config();

const MinimalVerificationSchema = z.object({
  status: z.string(),
  message: z.string(),
  providerCheck: z.string(),
});

async function runGeminiVerification() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey === "YOUR_REAL_KEY") {
    console.log("----------------------------------------");
    console.log("Gemini API connection: FAIL");
    console.log("Error: GEMINI_API_KEY is not configured in local .env");
    console.log("Credential exposed: NO");
    console.log("----------------------------------------");
    process.exit(1);
  }

  const configService = new ConfigService({
    GEMINI_API_KEY: apiKey,
    GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-1.5-flash",
  });

  const provider = new GeminiProvider(configService);

  let connectionPass = false;
  let generationPass = false;
  let jsonPass = false;
  let zodPass = false;

  let modelUsed = "N/A";
  let latency = 0;
  let tokens = 0;
  let cost = 0;
  let errorMessage = "";

  try {
    // 1. Connection check
    const health = await provider.getStatus();
    if (health.status === "AVAILABLE") {
      connectionPass = true;
    } else {
      throw new Error(health.message || "Provider health check failed");
    }

    // 2. Generation test
    const systemPrompt =
      "You are a minimal test assistant. You MUST respond with ONLY valid JSON strictly matching the schema: {\"status\": \"ok\", \"message\": \"Gemini test successful\", \"providerCheck\": \"gemini\"}. Do not include markdown code block formatting like ```json.";
    const userPrompt = "Perform a minimal API health test.";

    const output = await provider.generate(systemPrompt, userPrompt, 200);

    generationPass = true;
    modelUsed = output.model;
    latency = output.latencyMs;
    tokens = output.tokens;
    cost = output.estimatedCostUSD;

    // 3. Structured JSON check
    let rawText = output.content.trim();
    if (rawText.startsWith("```json")) {
      rawText = rawText.replace(/^```json\s*/, "").replace(/```$/, "").trim();
    } else if (rawText.startsWith("```")) {
      rawText = rawText.replace(/^```\s*/, "").replace(/```$/, "").trim();
    }

    const parsedJson = JSON.parse(rawText);
    jsonPass = true;

    // 4. Zod validation check
    MinimalVerificationSchema.parse(parsedJson);
    zodPass = true;
  } catch (err: any) {
    errorMessage = err.message || String(err);
  }

  console.log("\n================ GEMINI REAL API VERIFICATION REPORT ================");
  console.log(`Gemini API connection: ${connectionPass ? "PASS" : "FAIL"}`);
  console.log(`Generation:            ${generationPass ? "PASS" : "FAIL"}`);
  console.log(`Structured JSON:       ${jsonPass ? "PASS" : "FAIL"}`);
  console.log(`Zod validation:        ${zodPass ? "PASS" : "FAIL"}`);
  console.log(`Model:                 ${modelUsed}`);
  console.log(`Latency:               ${latency}ms`);
  console.log(`Token usage:           ${tokens}`);
  console.log(`Estimated cost:        $${cost.toFixed(6)}`);
  console.log(`Credential exposed:    NO`);

  if (errorMessage) {
    console.log(`\nExact provider error:\n${errorMessage}`);
  }
  console.log("===================================================================\n");
}

runGeminiVerification();
