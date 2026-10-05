/**
 * IA AFRICA CORE — Model Registry
 * Registre central des modèles IA utilisables par IA AFRICA.
 */

export interface ModelDefinition {
  id: string;
  provider: string;
  name: string;
  capabilities: string[];
  enabled: boolean;
  priority: number;
}

export const MODEL_REGISTRY: ModelDefinition[] = [
  {
    id: "llama-3.2-3b",
    provider: "cloudflare",
    name: "@cf/meta/llama-3.2-3b-instruct",
    capabilities: [
      "general",
      "education",
      "agriculture",
      "business",
      "employment",
      "languages",
      "documents",
    ],
    enabled: true,
    priority: 100,
  },
];

export function getAvailableModels(): ModelDefinition[] {
  return MODEL_REGISTRY.filter((model) => model.enabled);
}
