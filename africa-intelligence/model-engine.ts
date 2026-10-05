/**
 * IA AFRICA CORE — Model Engine
 * Moteur central d'exécution des modèles IA.
 */

import {
  getAvailableModels,
  type ModelDefinition,
} from "./model-registry";

export interface ModelRequest {
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  domain?: string;
  stream?: boolean;
}

export interface ModelResult {
  model: string;
  provider: string;
  output: unknown;
}

function selectModel(domain?: string): ModelDefinition | undefined {
  const models = getAvailableModels();

  if (models.length === 0) {
    return undefined;
  }

  if (domain) {
    const specialized = models
      .filter((model) => model.capabilities.includes(domain))
      .sort((a, b) => b.priority - a.priority);

    if (specialized.length > 0) {
      return specialized[0];
    }
  }

  return [...models].sort((a, b) => b.priority - a.priority)[0];
}

export async function runModel(
  ai: Ai,
  request: ModelRequest,
): Promise<ModelResult> {
  const model = selectModel(request.domain);

  if (!model) {
    throw new Error("IA AFRICA CORE : aucun modèle disponible.");
  }

  const output = await ai.run(model.name, {
    messages: request.messages,
    stream: request.stream ?? false,
  });

  return {
    model: model.id,
    provider: model.provider,
    output,
  };
}
