/**
 * IA AFRICA CORE — Model Priority
 * Classe les modèles selon leur pertinence pour le domaine demandé.
 */

import {
  getAvailableModels,
  type ModelDefinition,
} from "./model-registry";

export function rankModels(domain?: string): ModelDefinition[] {
  const models = getAvailableModels();

  if (!domain) {
    return [...models].sort((a, b) => b.priority - a.priority);
  }

  return [...models].sort((a, b) => {
    const aMatch = a.capabilities.includes(domain) ? 1 : 0;
    const bMatch = b.capabilities.includes(domain) ? 1 : 0;

    if (aMatch !== bMatch) {
      return bMatch - aMatch;
    }

    return b.priority - a.priority;
  });
}
