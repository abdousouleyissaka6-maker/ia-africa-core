/**
 * IA AFRICA CORE — Model Engine
 * Moteur central d'exécution des modèles IA.
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
 * Exécute le modèle sélectionné par IA AFRICA CORE.
 */
export async function runModel(
  runner: ModelRunner,
  request: ModelRequest,
): Promise<ModelExecutionResult> {
  const models = getAvailableModels();

  if (models.length === 0) {
    throw new Error("Aucun modèle IA disponible.");
  }

  const selected: ModelDefinition = selectModel(request.domain);

  try {
    const response = await runner.run(selected.name, {
      messages: request.messages,
      stream: request.stream ?? false,
    });

    return {
      model: selected.name,
      provider: selected.provider,
      response,
    };
  } catch (error) {
    throw new Error(
      `Échec de l'exécution du modèle ${selected.name}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  }
