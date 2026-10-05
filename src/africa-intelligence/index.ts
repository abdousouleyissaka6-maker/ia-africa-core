/**
 * IA AFRICA CORE — Public API
 *
 * Point d'entrée du moteur central d'intelligence.
 */

export {
  runAfricaCore,
} from "./intelligence-pipeline";

export type {
  IntelligenceRequest,
  IntelligenceResult,
  AfricaCore,
} from "./core";

export {
  selectService,
  getServiceId,
  getSelectedServicePrompt,
} from "./service-selector";

export type {
  ServiceSelection,
} from "./service-selector";

export {
  getServicePrompt,
} from "./service-prompts";

export {
  runModel,
} from "./model-engine";

export type {
  ModelRunner,
  ModelRequest,
  ModelMessage,
  ModelExecutionResult,
} from "./model-engine";
