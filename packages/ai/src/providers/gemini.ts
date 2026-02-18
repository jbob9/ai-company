import { GoogleGenAI } from "@google/genai";
import type { AIProvider, ChatParams, ChatResult } from "./types";

export class GeminiProvider implements AIProvider {
  readonly name = "gemini";
  private client: GoogleGenAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async chat(params: ChatParams): Promise<ChatResult> {
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    for (const msg of params.messages) {
      contents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      });
    }

    const response = await this.client.models.generateContent({
      model: params.model,
      contents,
      config: {
        maxOutputTokens: params.maxTokens,
        temperature: params.temperature,
        systemInstruction: params.system,
      },
    });

    const content = response.text ?? "";
    const inputTokens = response.usageMetadata?.promptTokenCount ?? 0;
    const outputTokens = response.usageMetadata?.candidatesTokenCount ?? 0;

    return {
      content,
      model: params.model,
      usage: {
        inputTokens,
        outputTokens,
      },
    };
  }
}
