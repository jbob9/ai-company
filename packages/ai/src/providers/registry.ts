import type { AIProvider, ProviderConfig, ProviderName } from "./types";
import { DEFAULT_MODELS } from "./types";
import { AnthropicProvider } from "./anthropic";
import { GeminiProvider } from "./gemini";
import { OpenAIProvider } from "./openai";

type ProviderFactory = (apiKey: string) => AIProvider;

const registry = new Map<string, ProviderFactory>();

// Register built-in providers
registry.set("anthropic", (key) => new AnthropicProvider(key));
registry.set("gemini", (key) => new GeminiProvider(key));
registry.set("openai", (key) => new OpenAIProvider(key));

/**
 * Register a custom AI provider.
 *
 * @example
 * ```ts
 * registerProvider("mistral", (apiKey) => new MistralProvider(apiKey));
 * ```
 */
export function registerProvider(name: string, factory: ProviderFactory): void {
  registry.set(name, factory);
}

/**
 * Create a provider instance by name.
 */
export function createProvider(name: ProviderName, apiKey: string): AIProvider {
  const factory = registry.get(name);
  if (!factory) {
    const available = Array.from(registry.keys()).join(", ");
    throw new Error(
      `Unknown AI provider "${name}". Available: ${available}`
    );
  }
  return factory(apiKey);
}

/**
 * Create a provider from a ProviderConfig.
 */
export function createProviderFromConfig(config: ProviderConfig): AIProvider {
  return createProvider(config.provider, config.apiKey);
}

/**
 * Get the default model for a provider.
 */
export function getDefaultModel(providerName: string): string {
  return DEFAULT_MODELS[providerName] ?? "default";
}

/**
 * List all registered provider names.
 */
export function listProviders(): string[] {
  return Array.from(registry.keys());
}
