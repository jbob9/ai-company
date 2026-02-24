import type { ProviderName } from "./providers/model";

export type ModelPresetId = "gemini-flash" | "gpt4o" | "claude-sonnet";

export interface ModelPreset {
  id: ModelPresetId;
  provider: ProviderName;
  model: string;
  label: string;
  description?: string;
  isDefault?: boolean;
}

export const MODEL_PRESETS: ModelPreset[] = [
  {
    id: "gemini-flash",
    provider: "gemini",
    model: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    description: "Fast, cost-effective general model (default).",
    isDefault: true,
  },
  {
    id: "gpt4o",
    provider: "openai",
    model: "gpt-4o",
    label: "GPT‑4o",
    description: "Balanced reasoning and generation from OpenAI.",
  },
  {
    id: "claude-sonnet",
    provider: "anthropic",
    model: "claude-3.5-sonnet",
    label: "Claude 3.5 Sonnet",
    description: "Strong reasoning and analysis from Anthropic.",
  },
];

export function getPresetById(id: ModelPresetId): ModelPreset | undefined {
  return MODEL_PRESETS.find((preset) => preset.id === id);
}

export function getDefaultPreset(): ModelPreset {
  return MODEL_PRESETS.find((preset) => preset.isDefault) ?? MODEL_PRESETS[0]!;
}

