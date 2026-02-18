import OpenAI from "openai";
import type { AIProvider, ChatParams, ChatResult } from "./types";

export class OpenAIProvider implements AIProvider {
  readonly name = "openai";
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async chat(params: ChatParams): Promise<ChatResult> {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

    if (params.system) {
      messages.push({ role: "system", content: params.system });
    }

    for (const msg of params.messages) {
      messages.push({ role: msg.role, content: msg.content });
    }

    const response = await this.client.chat.completions.create({
      model: params.model,
      messages,
      max_tokens: params.maxTokens,
      temperature: params.temperature,
    });

    const content = response.choices[0]?.message?.content ?? "";

    return {
      content,
      model: response.model,
      usage: {
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
      },
    };
  }
}
