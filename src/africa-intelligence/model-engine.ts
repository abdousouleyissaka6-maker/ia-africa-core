
/**
 * IA AFRICA CORE — Model Engine
 * Moteur central d'exécution des modèles IA.
 */

import {
  getAvailableModels,
  type ModelDefinition,
} from "./model-registry";

import { selectModel } from "./model-selector";
import { getFallbackModels } from "./model-fallback";
import { getHealthyModels } from "./model-health";
import { rankModels } from "./model-priority";

export interface ModelMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ModelRequest {
  messages: ModelMessage[];
  domain?: string;
  stream?: boolean;
}

export interface ModelExecutionResult {
  model: string;
  provider: string;
  response: unknown;
  fallbackUsed: boolean;
  attemptedModels: string[];
}

export interface ModelRunner {
  run(
    modelName: string,
    input: {
      messages: ModelMessage[];
      stream?: boolean;
    },
  ): Promise<unknown>;
}

export async function runModel(
  runner: ModelRunner,
  request: ModelRequest,
): Promise<ModelExecutionResult> {
  const availableModels = getAvailableModels();

  if (availableModels.length === 0) {
    throw new Error("Aucun modèle IA disponible.");
  }

  const healthyModels = getHealthyModels();

  if (healthyModels.length === 0) {
    throw new Error("Aucun modèle IA opérationnel.");
  }

  const healthyIds = new Set(
    healthyModels.map((model) => model.id),
  );

  const selected = selectModel(request.domain);
  const rankedModels = rankModels(request.domain);
  const fallbackModels = getFallbackModels(selected.id);

  const orderedModels: ModelDefinition[] = [
    ...(healthyIds.has(selected.id) ? [selected] : []),
    ...rankedModels.filter(
      (model) => model.enabled && healthyIds.has(model.id),
    ),
    ...fallbackModels.filter(
      (model) => model.enabled && healthyIds.has(model.id),
    ),
  ];

  const uniqueModels = orderedModels.filter(
    (model, index, array) =>
      array.findIndex((item) => item.id === model.id) === index,
  );

  if (uniqueModels.length === 0) {
    throw new Error(
      "Aucun modèle IA opérationnel disponible pour cette demande.",
    );
  }

  const errors: string[] = [];
  const attemptedModels: string[] = [];

  for (const model of uniqueModels) {
    attemptedModels.push(model.name);

    try {
      const response = await runner.run(model.name, {
        messages: request.messages,
        stream: request.stream ?? false,
      });

      return {
        model: model.name,
        provider: model.provider,
        response,
        fallbackUsed: model.id !== selected.id,
        attemptedModels,
      };
    } catch (error) {
      errors.push(
        `${model.name}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  throw new Error(
    `Tous les modèles IA opérationnels ont échoué. ${errors.join(" | ")}`,
  );
}

  
