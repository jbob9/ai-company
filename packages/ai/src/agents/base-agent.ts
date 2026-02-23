import { generateText, streamText, type LanguageModel } from "ai";
import type { Message, AgentConfig, AIResponseMetadata } from "../types";

export type ChatStream = ReturnType<typeof streamText>;

export abstract class BaseAgent {
  protected model: LanguageModel;
  protected config: Required<AgentConfig>;

  constructor(model: LanguageModel, config: Required<AgentConfig>) {
    this.model = model;
    this.config = config;
  }

  protected abstract getSystemPrompt(): string;

  protected async sendMessage(
    userMessage: string,
    history: Message[] = [],
  ): Promise<{ content: string; metadata: AIResponseMetadata }> {
    const startTime = Date.now();

    const messages = [
      ...history
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      { role: "user" as const, content: userMessage },
    ];

    const result = await generateText({
      model: this.model,
      system: this.getSystemPrompt(),
      messages,
      maxOutputTokens: this.config.maxTokens,
      temperature: this.config.temperature,
    });

    return {
      content: result.text,
      metadata: {
        model: result.response.modelId,
        inputTokens: result.usage.inputTokens ?? 0,
        outputTokens: result.usage.outputTokens ?? 0,
        responseTimeMs: Date.now() - startTime,
      },
    };
  }

  protected async sendJsonMessage<T>(
    userMessage: string,
    history: Message[] = [],
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
    history: Message[] = [],
  ): Promise<{ content: string; metadata: AIResponseMetadata }> {
    return this.sendMessage(message, history);
  }

  streamChat(message: string, history: Message[] = []): ChatStream {
    const messages = [
      ...history
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      { role: "user" as const, content: message },
    ];

    return streamText({
      model: this.model,
      system: this.getSystemPrompt(),
      messages,
      maxOutputTokens: this.config.maxTokens,
      temperature: this.config.temperature,
    });
  }
}
