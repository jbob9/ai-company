/**
 * Unified interface that all AI providers must implement.
 * To add a new provider, implement this interface and register it.
 */
export interface AIProvider {
  readonly name: string;

  chat(params: ChatParams): Promise<ChatResult>;
}

export interface ChatParams {
  model: string;
  messages: ChatMessage[];
  system?: string;
  maxTokens: number;
  temperature?: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResult {
  content: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export type ProviderName = "gemini" | "openai" | "anthropic" | (string & {});

export interface ProviderConfig {
  provider: ProviderName;
  apiKey: string;
  defaultModel?: string;
}

/**
 * Default models for each built-in provider.
 * Used when no model is explicitly specified.
 */
export const DEFAULT_MODELS: Record<string, string> = {
  gemini: "gemini-2.5-flash",
  openai: "gpt-4o",
  anthropic: "claude-sonnet-4-20250514",
};
