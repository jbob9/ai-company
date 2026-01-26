import Anthropic from "@anthropic-ai/sdk";
import type { Message, AgentConfig, AIResponseMetadata } from "../types";

// Default configuration
const DEFAULT_CONFIG: Required<AgentConfig> = {
  model: "claude-sonnet-4-20250514",
  maxTokens: 4096,
  temperature: 0.7,
};

export abstract class BaseAgent {
  protected client: Anthropic;
  protected config: Required<AgentConfig>;

  constructor(apiKey: string, config?: AgentConfig) {
    this.client = new Anthropic({ apiKey });
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get the system prompt for this agent
   */
  protected abstract getSystemPrompt(): string;

  /**
   * Send a message and get a response
   */
  protected async sendMessage(
    userMessage: string,
    history: Message[] = []
  ): Promise<{ content: string; metadata: AIResponseMetadata }> {
    const startTime = Date.now();

    // Build messages array
    const messages: Anthropic.MessageParam[] = [
      ...history
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      { role: "user", content: userMessage },
    ];

    const response = await this.client.messages.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      system: this.getSystemPrompt(),
      messages,
    });

    const responseTimeMs = Date.now() - startTime;

    // Extract text content
    const textContent = response.content.find((c) => c.type === "text");
    const content = textContent?.type === "text" ? textContent.text : "";

    return {
      content,
      metadata: {
        model: response.model,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        responseTimeMs,
      },
    };
  }

  /**
   * Send a message expecting a JSON response
   */
  protected async sendJsonMessage<T>(
    userMessage: string,
    history: Message[] = []
  ): Promise<{ data: T; metadata: AIResponseMetadata }> {
    const { content, metadata } = await this.sendMessage(userMessage, history);

    // Extract JSON from the response
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

  /**
   * Chat with the agent
   */
  async chat(
    message: string,
    history: Message[] = []
  ): Promise<{ content: string; metadata: AIResponseMetadata }> {
    return this.sendMessage(message, history);
  }
}
