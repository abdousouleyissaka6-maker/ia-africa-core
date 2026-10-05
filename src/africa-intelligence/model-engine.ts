/**
 * IA AFRICA CORE — Model Engine
 * Moteur central d'exécution des modèles IA.
 *
 * Flux :
 * Registry → Health → Selector → Priority → Fallback → Exécution
 */

import {
  getAvailableModels,
  type ModelDefinition,
} from "./model-registry";

import { selectModel } from "./model-selector";

import {
  getFallbackModels,
} from "./model-fallback";

import {
  getHealthyModels,
} from "./model-health";

import {
  rankModels,
} from "./model-priority";

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
 * Exécute le meilleur modèle disponible.
 *
 * IA AFRICA CORE :
 * 1. Vérifie les modèles disponibles.
 * 2. Vérifie leur état.
 * 3. Sélectionne le modèle adapté.
 * 4. Classe les modèles par priorité.
 * 5. Utilise automatiquement un modèle de secours
 *    si le modèle principal échoue.
 */
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

  const selected = selectModel(request.domain);

  const rankedModels = rankModels(request.domain);

  const fallbackModels = getFallbackModels(selected.id);

  const orderedModels: ModelDefinition[] = [
    selected,

    ...rankedModels.filter(
      (model) =>
        model.id !== selected.id &&
        model.enabled,
    ),

    ...fallbackModels.filter(
      (model) =>
        model.id !== selected.id &&
        model.enabled,
    ),
  ];

  const uniqueModels = orderedModels.filter(
    (model, index, array) =>
      array.findIndex(
        (item) => item.id === model.id,
      ) === index,
  );

  const errors: string[] = [];

  for (const model of uniqueModels) {
    try {

      const response = await runner.run(
        model.name,
        {
          messages: request.messages,
          stream: request.stream ?? false,
        },
      );

      return {
        model: model.name,
        provider: model.provider,
        response,
      };

    } catch (error) {

      errors.push(
        `${model.name}: ${
          error instanceof Error
            ? error.message
            : String(error)
        }`,
      );
    }
  }

  throw new Error(
    `Tous les modèles IA ont échoué. ${errors.join(" | ")}`,
  );
}
