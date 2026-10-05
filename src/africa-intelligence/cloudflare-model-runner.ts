/**
 * IA AFRICA CORE — Cloudflare Model Runner
 *
 * Adaptateur entre IA AFRICA CORE et Cloudflare Workers AI.
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
      });
    },
  };
}
