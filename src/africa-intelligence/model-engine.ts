/**
 * IA AFRICA CORE — Model Engine
 * Moteur central d'exécution et de secours des modèles IA.
 */

import {
  getAvailableModels,
  type ModelDefinition,
} from "./model-registry";

import { selectModel } from "./model-selector";

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

/**
 * Exécute le modèle choisi par IA AFRICA CORE.
 *
 * Si le modèle principal échoue, CORE essaie
 * automatiquement un autre modèle disponible.
 */
export async function runModel(
  runner: ModelRunner,
  request: ModelRequest,
): Promise<ModelExecutionResult> {
  const models = getAvailableModels();

  if (models.length === 0) {
    throw new Error("Aucun modèle IA disponible.");
  }

  const selected = selectModel(request.domain);

  const orderedModels: ModelDefinition[] = [
    selected,
    ...models
      .filter((model) => model.id !== selected.id)
      .sort((a, b) => b.priority - a.priority),
  ];

  const errors: string[] = [];

  for (const model of orderedModels) {
    try {
      const response = await runner.run(model.name, {
        messages: request.messages,
        stream: request.stream ?? false,
      });

      return {
        model: model.name,
        provider: model.provider,
        response,
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
    `Tous les modèles IA ont échoué. ${errors.join(" | ")}`,
  );
}
