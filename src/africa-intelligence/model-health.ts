/**
 * IA AFRICA CORE — Model Health
 * Vérifie l'état des modèles disponibles.
 */

import {
  getAvailableModels,
  type ModelDefinition,
} from "./model-registry";

export interface ModelHealth {
  modelId: string;
  provider: string;
  enabled: boolean;
  status: "healthy" | "disabled";
}

export function checkModelHealth(
  model: ModelDefinition,
): ModelHealth {
  return {
    modelId: model.id,
    provider: model.provider,
    enabled: model.enabled,
    status: model.enabled ? "healthy" : "disabled",
  };
}

export function getModelsHealth(): ModelHealth[] {
  return getAvailableModels().map(checkModelHealth);
}

export function getHealthyModels(): ModelDefinition[] {
  return getAvailableModels().filter((model) => model.enabled);
}
