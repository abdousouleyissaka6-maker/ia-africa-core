/**
 * IA AFRICA CORE — Cloudflare Model Runner
 * Moteur de génération des réponses.
 */

import type {
  ModelMessage,
  ModelRunner,
} from "./model-engine";

export interface CloudflareAI {
  run(
    model: string,
    inputs: {
      messages: ModelMessage[];
      stream?: boolean;
      temperature?: number;
      top_p?: number;
      max_tokens?: number;
    },
  ): Promise<unknown>;
}

export function createCloudflareModelRunner(
  ai: CloudflareAI,
): ModelRunner {
  return {
    async run(model, request) {
      return ai.run(model, {
        messages: request.messages,
        stream: request.stream ?? false,
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 1024,
      });
    },
  };
}
