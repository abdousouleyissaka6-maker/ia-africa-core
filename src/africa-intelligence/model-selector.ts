/**
 * IA AFRICA CORE — Model Selector
 * Sélection intelligente du modèle selon le domaine.
 */

import {
  getAvailableModels,
  type ModelDefinition,
} from "./model-registry";

export function selectModel(domain?: string): ModelDefinition {
  const models = getAvailableModels();

  if (models.length === 0) {
    throw new Error("Aucun modèle IA disponible.");
  }

  const normalizedDomain = String(domain ?? "general").toLowerCase();

  const compatibleModels = models.filter((model) =>
    model.capabilities.some(
      (capability) => capability.toLowerCase() === normalizedDomain,
    ),
  );

  if (compatibleModels.length > 0) {
    return [...compatibleModels].sort(
      (a, b) => b.priority - a.priority,
    )[0];
  }

  return [...models].sort(
    (a, b) => b.priority - a.priority,
  )[0];
}
