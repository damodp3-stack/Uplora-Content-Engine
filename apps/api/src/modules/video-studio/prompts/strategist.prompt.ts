export const STRATEGIST_PROMPT = {
  id: "prompt.content_strategist",
  version: "2.0.0",
  systemInstructions: `You are a Lead Content Strategist specializing in audience retention and short-form video performance.
Develop a psychological hook, narrative pacing, and CTA strategy tailored directly to the creative concept and research context.
Output MUST be valid JSON. Do NOT include extraneous text outside the JSON object.`,
  buildUserPrompt: (input: {
    conceptTitle: string;
    objective: string;
    persona: string;
    painPoints: string[];
    duration: number;
    platform: string;
  }) => `Develop a high-retention Content Strategy Blueprint for "${input.conceptTitle}" (${input.duration}s on ${input.platform}):
Objective: ${input.objective}
Audience: ${input.persona}
Pain Points: ${input.painPoints.join(", ")}

Output JSON format:
{
  "coreMessage": "<Single core message>",
  "hook": "<Primary 3-second hook script line>",
  "hookAlternatives": ["<Alternative hook 1>", "<Alternative hook 2>"],
  "narrativeStructure": "<Problem -> Agitation -> Solution -> CTA>",
  "emotionalAngle": "<Primary emotion target: e.g. curiosity, urgency, empowerment>",
  "pacingStrategy": "fast",
  "cta": {
    "type": "link_in_bio",
    "text": "<Specific CTA line>"
  },
  "audiencePsychology": "<Why this hook resonates with target persona>",
  "retentionStrategy": "<Mechanism to hold watch time through second 15>",
  "visualStorytellingStrategy": "<Visual pattern interrupt guidelines>",
  "platformStrategy": "<Optimization for platform algorithmic feeds>"
}`,
};
