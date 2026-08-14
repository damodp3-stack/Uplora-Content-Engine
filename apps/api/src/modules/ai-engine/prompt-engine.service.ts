import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";

export interface PromptTemplate {
  id: string;
  name: string;
  system_prompt_id: string;
  category: string;
  user_prompt: string;
  character_limit?: number;
  length_options?: Record<string, { words: string; section_count?: string }>;
  default_variables?: Record<string, string>;
}

export interface SystemPrompt {
  id: string;
  content?: string;
  template?: string;
  required_variables?: string[];
  response_format?: string;
}

export interface ValidationResult {
  isValid: boolean;
  issues: string[];
  retryPrompt?: string;
}

export interface BuildResult {
  systemPrompt: string;
  userPrompt: string;
  templateId: string;
  missingVariables: string[];
}

@Injectable()
export class PromptEngineService implements OnModuleInit {
  private readonly logger = new Logger(PromptEngineService.name);

  private config: {
    version: string;
    providers: Record<string, any>;
    system_prompts: Record<string, SystemPrompt>;
    prompt_templates: Record<string, PromptTemplate>;
    response_validation: {
      content_rules: {
        min_word_count: number;
        forbidden_openings: string[];
        forbidden_placeholders: string[];
        retry_on_violation: boolean;
        max_retries: number;
        retry_instruction: string;
      };
      json_rules: {
        extraction_pattern: string;
        fallback_on_parse_failure: boolean;
      };
    };
    platform_requirements: Record<string, string>;
  };

  onModuleInit(): void {
    this.loadConfig();
  }

  private loadConfig(): void {
    const configPath = path.resolve(__dirname, "config", "master-prompts.json");

    try {
      if (fs.existsSync(configPath)) {
        const raw = fs.readFileSync(configPath, "utf-8");
        this.config = JSON.parse(raw);
        this.logger.log(
          `✅ master-prompts.json v${this.config.version} loaded successfully`,
        );
      } else {
        this.config = this.buildDefaultConfig();
      }
    } catch (error) {
      this.logger.warn(
        `Failed to parse master-prompts.json, using fallback defaults: ${error.message}`,
      );
      this.config = this.buildDefaultConfig();
    }
  }

  build(
    templateId: string,
    variables: Record<string, string> = {},
  ): BuildResult {
    if (templateId === "raw" || templateId === "agent_json") {
      return {
        systemPrompt: variables.systemPrompt || "",
        userPrompt: variables.prompt || variables.topic || "",
        templateId,
        missingVariables: [],
      };
    }

    const template =
      this.config.prompt_templates[templateId] ||
      this.config.prompt_templates["blog_post"];
    const systemPromptDef =
      this.config.system_prompts[template.system_prompt_id] ||
      this.config.system_prompts["content_writer"];

    const mergedVars: Record<string, string> = {
      ...template.default_variables,
      ...variables,
    };

    const systemRaw =
      systemPromptDef?.template ||
      systemPromptDef?.content ||
      this.config.system_prompts.base?.content ||
      "";
    const systemPrompt = this.interpolate(systemRaw, mergedVars);
    const userPrompt = this.interpolate(template.user_prompt, mergedVars);

    const required = systemPromptDef?.required_variables || [];
    const missingVariables = required.filter(
      (v) => !mergedVars[v] || mergedVars[v] === "",
    );

    return {
      systemPrompt,
      userPrompt,
      templateId,
      missingVariables,
    };
  }

  validate(content: string): ValidationResult {
    const rules = this.config.response_validation?.content_rules;
    if (!rules) return { isValid: true, issues: [] };

    const issues: string[] = [];
    const wordCount = content.split(/\s+/).filter(Boolean).length;

    if (wordCount < (rules.min_word_count || 50)) {
      issues.push(
        `Too short: ${wordCount} words (min ${rules.min_word_count})`,
      );
    }

    const lower = content.toLowerCase().trimStart();
    for (const phrase of rules.forbidden_openings || []) {
      if (lower.startsWith(phrase.toLowerCase())) {
        issues.push(`Starts with forbidden phrase: "${phrase}"`);
        break;
      }
    }

    for (const placeholder of rules.forbidden_placeholders || []) {
      if (content.includes(placeholder)) {
        issues.push(`Contains placeholder: "${placeholder}"`);
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      retryPrompt:
        issues.length > 0
          ? `${rules.retry_instruction}\nIssues found: ${issues.join("; ")}`
          : undefined,
    };
  }

  extractJSON(text: string): Record<string, unknown> | null {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      return null;
    }
  }

  getLengthGuide(templateId: string, length: string): string {
    const template = this.config.prompt_templates[templateId];
    if (!template?.length_options) return "1200-1800 words";
    return template.length_options[length]?.words || "1200-1800 words";
  }

  getSectionCount(templateId: string, length: string): string {
    const template = this.config.prompt_templates[templateId];
    return template?.length_options?.[length]?.section_count || "5";
  }

  getTemplateIds(): string[] {
    return Object.keys(this.config.prompt_templates || {});
  }

  getTemplate(id: string): PromptTemplate | null {
    return this.config.prompt_templates?.[id] || null;
  }

  getVersion(): string {
    return this.config?.version || "3.0.0";
  }

  getMaxRetries(): number {
    return this.config?.response_validation?.content_rules?.max_retries ?? 2;
  }

  private interpolate(template: string, vars: Record<string, string>): string {
    return template.replace(/\{(\w+)\}/g, (_, key) => {
      return vars[key] !== undefined && vars[key] !== null
        ? String(vars[key])
        : "";
    });
  }

  private buildDefaultConfig() {
    return {
      version: "3.0.0-fallback",
      providers: {},
      system_prompts: {
        base: {
          id: "base",
          content: "You are Uplora AI, an expert content creator.",
        },
        content_writer: {
          id: "content_writer",
          content: "You are Uplora AI copywriter.",
        },
      },
      prompt_templates: {
        blog_post: {
          id: "blog_post",
          name: "Blog Post",
          system_prompt_id: "content_writer",
          category: "long_form",
          user_prompt: "Write a blog post about {topic}",
        },
      },
      response_validation: {
        content_rules: {
          min_word_count: 50,
          forbidden_openings: ["Here is", "Here's"],
          forbidden_placeholders: ["[Your Name]"],
          retry_on_violation: true,
          max_retries: 2,
          retry_instruction: "Rewrite content directly.",
        },
        json_rules: {
          extraction_pattern: "first_complete_json_object",
          fallback_on_parse_failure: true,
        },
      },
      platform_requirements: {},
    };
  }
}
