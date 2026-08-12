import { Injectable } from "@nestjs/common";

@Injectable()
export class TemplatesService {
  async getPrebuiltTemplates() {
    return [
      {
        id: "tmpl-1",
        title: "Viral Twitter Thread Blueprint",
        category: "Social Media",
        description:
          "Hook, 5 value points, and a strong conversion call-to-action.",
        promptTemplate:
          "Write a viral 7-tweet thread about {topic} for {targetAudience}.",
        icon: "twitter",
      },
      {
        id: "tmpl-2",
        title: "SEO Pillar Article Framework",
        category: "Blogging",
        description: "Comprehensive 2000-word SEO structured longform article.",
        promptTemplate:
          "Write an ultimate guide to {topic} optimized for keyword {keyword}.",
        icon: "file-text",
      },
      {
        id: "tmpl-3",
        title: "LinkedIn Thought Leadership Post",
        category: "Social Media",
        description:
          "Engaging narrative format with line breaks and industry insights.",
        promptTemplate:
          "Write a high-converting LinkedIn post about a lessons-learned story regarding {topic}.",
        icon: "linkedin",
      },
    ];
  }
}
