/**
 * IA AFRICA CORE — Registre des modèles
 */

export interface ModelDefinition {
  id: string;
  provider: string;
  name: string;
  capabilities: string[];
  enabled: boolean;
  priority: number;
}

const ALL_CAPABILITIES = [
  "general",
  "education",
  "agriculture",
  "business",
  "employment",
  "languages",
  "documents",
  "health",
  "science",
  "technology",
  "programming",
  "law",
  "history",
  "geography",
  "mathematics",
  "research",
];

export const MODEL_REGISTRY: ModelDefinition[] = [
  {
    id: "llama-3.3-70b-fast",
    provider: "cloudflare",
    name: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    capabilities: ALL_CAPABILITIES,
    enabled: true,
    priority: 100,
  },
];

export function getAvailableModels(): ModelDefinition[] {
  return MODEL_REGISTRY.filter((model) => model.enabled);
}
