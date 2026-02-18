import type { AIProvider, ChatMessage } from "../providers/types";
import type { Message, AgentConfig, AIResponseMetadata } from "../types";

export abstract class BaseAgent {
  protected provider: AIProvider;
  protected config: Required<AgentConfig>;

  constructor(provider: AIProvider, config: Required<AgentConfig>) {
    this.provider = provider;
    this.config = config;
  }

  protected abstract getSystemPrompt(): string;

  protected async sendMessage(
    userMessage: string,
    history: Message[] = []
  ): Promise<{ content: string; metadata: AIResponseMetadata }> {
    const startTime = Date.now();

    const messages: ChatMessage[] = [
      ...history
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      { role: "user" as const, content: userMessage },
    ];

    const result = await this.provider.chat({
      model: this.config.model,
      messages,
      system: this.getSystemPrompt(),
      maxTokens: this.config.maxTokens,
      temperature: this.config.temperature,
    });

    return {
      content: result.content,
      metadata: {
        model: result.model,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        responseTimeMs: Date.now() - startTime,
      },
    };
  }

  protected async sendJsonMessage<T>(
    userMessage: string,
    history: Message[] = []
  ): Promise<{ data: T; metadata: AIResponseMetadata }> {
    const { content, metadata } = await this.sendMessage(userMessage, history);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    try {
      const data = JSON.parse(jsonMatch[0]) as T;
      return { data, metadata };
    } catch (error) {
      throw new Error(`Failed to parse JSON response: ${error}`);
    }
  }

  async chat(
    message: string,
    history: Message[] = []
  ): Promise<{ content: string; metadata: AIResponseMetadata }> {
    return this.sendMessage(message, history);
  }
}
