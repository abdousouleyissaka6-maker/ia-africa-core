/**
 * IA AFRICA CORE — Model Fallback
 * Permet de basculer automatiquement vers un autre modèle
 * lorsqu'un modèle principal échoue.
 */

import {
  getAvailableModels,
  type ModelDefinition,
} from "./model-registry";

export function getFallbackModels(
  failedModelId?: string,
): ModelDefinition[] {
  return getAvailableModels()
    .filter((model) => model.id !== failedModelId)
    .sort((a, b) => b.priority - a.priority);
}

export function getNextFallbackModel(
  failedModelId?: string,
): ModelDefinition | undefined {
  return getFallbackModels(failedModelId)[0];
}
