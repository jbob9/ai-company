import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

export type ProviderName = "openai" | "anthropic" | "gemini" | (string & {});

export const DEFAULT_MODELS: Record<string, string> = {
  gemini: "gemini-2.5-flash",
  openai: "gpt-4o",
  anthropic: "claude-sonnet-4-20250514",
};

export function getModel(
  provider: ProviderName,
  apiKey: string,
  modelName?: string,
): LanguageModel {
  const model = modelName ?? DEFAULT_MODELS[provider] ?? "default";

  switch (provider) {
    case "openai": {
      const openai = createOpenAI({ apiKey });
      return openai(model);
    }
    case "anthropic": {
      const anthropic = createAnthropic({ apiKey });
      return anthropic(model);
    }
    case "gemini": {
      const google = createGoogleGenerativeAI({ apiKey });
      return google(model);
    }
    default:
      throw new Error(`Unknown AI provider "${provider}". Available: openai, anthropic, gemini`);
  }
}
