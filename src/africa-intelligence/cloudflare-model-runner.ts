
/**
 * IA AFRICA CORE — Cloudflare and OpenAI Model Runner
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
  openaiApiKey?: string,
): ModelRunner {
  return {
    async run(model, request) {
      const messages = request.messages.map((message, index) =>
        index === 0 && message.role === "system"
          ? {
              ...message,
              content:
                message.content + "\n\n" + RESPONSE_INSTRUCTIONS,
            }
          : message,
      );

      if (model.startsWith("gpt-")) {
        if (!openaiApiKey) {
          throw new Error("La clé API OpenAI est absente.");
        }

        const response = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${openaiApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model,
              messages,
              max_completion_tokens: 2048,
              store: false,
            }),
          },
        );

        const raw = await response.text();

        let data: unknown;
        try {
          data = raw ? JSON.parse(raw) : {};
        } catch {
          throw new Error("Réponse OpenAI illisible.");
        }

        if (!response.ok) {
          const errorData = data as {
            error?: { message?: string };
          };

          throw new Error(
            errorData.error?.message ||
              `Erreur OpenAI : ${response.status}`,
          );
        }

        return data;
      }

      return ai.run(model, {
        messages,
        stream: request.stream ?? false,
        max_tokens: 4096,
        temperature: 0.3,
      });
    },
  };
}

