
/**
 * IA AFRICA CORE — Cloudflare Model Runner
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
      max_tokens?: number;
      temperature?: number;
    },
  ): Promise<unknown>;
}

const RESPONSE_INSTRUCTIONS = `
RÈGLE PRIORITAIRE DE RÉPONSE :
Réponds dans la langue de l'utilisateur.
Pour une question simple, réponds directement.
Pour un cours, une analyse, une recherche ou une explication complexe,
fournis une réponse complète, claire et structurée.
Explique les notions importantes avec des exemples concrets utiles.
Pour un sujet scolaire, présente les étapes et les raisonnements nécessaires.
Respecte exactement le nombre d'éléments demandé.
Évite les répétitions, mais ne supprime pas les informations essentielles.
N'invente ni faits ni sources.
`;

export function createCloudflareModelRunner(
  ai: CloudflareAI,
): ModelRunner {
  return {
    async run(model, request) {
      const messages = request.messages.map((message, index) =>
        index === 0 && message.role === "system"
          ? {
              ...message,
              content: message.content + "\n\n" + RESPONSE_INSTRUCTIONS,
            }
          : message,
      );

      return ai.run(model, {
        messages,
        stream: request.stream ?? false,
        max_tokens: 4096,
        temperature: 0.3,
      });
    },
  };
}

