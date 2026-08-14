export const SCRIPT_WRITER_PROMPT = {
  id: "prompt.script_writer",
  version: "2.1.0",
  systemInstructions: `You are an Expert Video Scriptwriter for short-form commercial and educational videos.
Write a scene-by-scene timed narration script.

CRITICAL CLAIM SAFETY RULE:
- If research is RESEARCH_UNAVAILABLE or unverified, DO NOT present numerical, statistical, or dollar claims (e.g. "$5,000,000 contract", "94% of buyers") as factual statistics.
- Rewrite unsupported claims as creative framing or opinion (e.g. "high-value manufacturing contracts", "the vast majority of B2B buyers").

CRITICAL SPEECH TIMING RULE:
- Spoken word count MUST match the target video duration at a standard speaking rate of 145 WPM (words per minute).
- Target word count formula: targetWordCount = Math.round((targetDurationSec * 145) / 60).
- For a 30-second script, total narration words MUST be between 68 and 76 words total across all scenes.
- The sum of suggestedDurationSec across all scenes MUST equal the target duration within +/- 0.5 seconds.

Output MUST be valid JSON matching the schema.`,
  buildUserPrompt: (input: {
    title: string;
    targetDurationSec: number;
    hook: string;
    coreMessage: string;
    ctaText: string;
    language: string;
    researchStatus?: string;
    targetWpm?: number;
  }) => {
    const wpm = input.targetWpm || 145;
    const targetWords = Math.round((input.targetDurationSec * wpm) / 60);
    const researchNote =
      input.researchStatus === "RESEARCH_UNAVAILABLE"
        ? "NOTE: Research is RESEARCH_UNAVAILABLE. Do NOT include fake percentages, dollar amounts, or statistical facts in narration. Use creative framing."
        : "";

    return `Write a timed ${input.targetDurationSec}-second script for "${input.title}" in ${input.language}.
Primary Hook: "${input.hook}"
Core Message: "${input.coreMessage}"
CTA: "${input.ctaText}"
${researchNote}

TARGET NARRATION LENGTH: Exactly ${targetWords} words total across all scenes (at ${wpm} WPM for ${input.targetDurationSec} seconds).

Output JSON format:
{
  "title": "${input.title}",
  "estimatedDurationSec": ${input.targetDurationSec},
  "language": {
    "script": "${input.language}",
    "voice": "${input.language}",
    "subtitles": "${input.language}"
  },
  "scenes": [
    {
      "sceneIndex": 1,
      "suggestedDurationSec": 5.0,
      "sceneIntent": "hook",
      "narration": "<Hook narration line>",
      "dialogue": "",
      "onScreenText": "<Key words for subtitle/graphic overlay>",
      "ctaText": "",
      "pacing": "fast",
      "emotionalDelivery": "authoritative",
      "pronunciationNotes": []
    }
  ]
}`;
  },
  buildRevisionUserPrompt: (input: {
    title: string;
    targetDurationSec: number;
    currentWordCount: number;
    currentSpeechDurationMs: number;
    targetDurationMs: number;
    varianceMs: number;
    targetWords: number;
    wpm: number;
    previousScriptJson: string;
    researchStatus?: string;
  }) => {
    const direction = input.varianceMs < 0 ? "EXPAND" : "TRIM";
    const deltaWords = Math.abs(input.targetWords - input.currentWordCount);
    const researchNote =
      input.researchStatus === "RESEARCH_UNAVAILABLE"
        ? "REMINDER: Research is RESEARCH_UNAVAILABLE. Absolutely NO fabricated numbers, percentages, or dollar amounts."
        : "";

    return `REVISION REQUIRED FOR SCRIPT DURATION TIMING:
The previous script narration was ${input.currentWordCount} words (~${(input.currentSpeechDurationMs / 1000).toFixed(1)}s at ${input.wpm} WPM), which deviates from target duration (${input.targetDurationSec}s / ${input.targetDurationMs}ms) by ${input.varianceMs}ms.

Instruction: Please ${direction} the narration by approximately ${deltaWords} words so total narration words = ${input.targetWords} words (matching exactly ${input.targetDurationSec} seconds at ${input.wpm} WPM).
${researchNote}

Previous Script:
${input.previousScriptJson}

Output updated script JSON adhering strictly to target word count (${input.targetWords} words) and exact total duration (${input.targetDurationSec}s).`;
  },
};
