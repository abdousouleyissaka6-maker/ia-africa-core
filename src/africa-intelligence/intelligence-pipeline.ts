import type {
  IntelligenceRequest,
  IntelligenceResult,
} from "./core";

import {
  runModel,
  type ModelRunner,
  type ModelMessage,
} from "./model-engine";

import {
  selectService,
} from "./service-selector";

/**
 * IA AFRICA CORE — Intelligence Pipeline
 *
 * Flux central :
 *
 * Comprendre
 * → Classer
 * → Choisir le service
 * → Choisir le modèle
 * → Exécuter
 * → Préparer la réponse
 */

export async function runAfricaCore(
  request: IntelligenceRequest,
  runner: ModelRunner,
): Promise<IntelligenceResult> {

  const content = String(request.content ?? "").trim();

  if (!content) {
    return {
      answer: "Je n'ai reçu aucune question.",
      domain: "general",
      confidence: 0,
      verified: false,
      metadata: {
        inputType: request.type,
        language: request.language ?? "auto",
        service: "general",
      },
    };
  }

  /*
   * 1. Comprendre et classer la demande
   */
  const selection = selectService(content);

  const service = selection.service;
  const domain = service.id;

  /*
   * 2. Préparer le contexte du service
   */
  const messages: ModelMessage[] = [
    {
      role: "system",
      content:
        "Tu es le moteur d'intelligence de IA AFRICA CORE. " +
        "Comprends la demande de l'utilisateur avant de répondre. " +
        `Le service sélectionné est : ${service.name}. ` +
        `Description du service : ${service.description}. ` +
        "Réponds de manière claire, utile et adaptée au contexte africain. " +
        "Ne prétends pas avoir effectué une action que tu n'as pas effectuée.",
    },
    {
      role: "user",
      content,
    },
  ];

  /*
   * 3. Choisir et exécuter le modèle
   */
  const result = await runModel(runner, {
    messages,
    domain,
    stream: false,
  });

  /*
   * 4. Extraire la réponse
   */
  const answer = extractAnswer(result.response);

  /*
   * 5. Retourner le résultat du CORE
   */
  return {
    answer,
    domain,
    confidence: calculateConfidence(
      selection.score,
      domain,
    ),
    verified: false,
    metadata: {
      inputType: request.type,
      language: request.language ?? "auto",
      service: service.id,
      serviceName: service.name,
      matchedKeywords: selection.matchedKeywords,
      model: result.model,
      provider: result.provider,
    },
  };
}

/**
 * Extrait proprement le texte retourné par le modèle.
 */
function extractAnswer(response: unknown): string {

  if (typeof response === "string") {
    return response;
  }

  if (
    response &&
    typeof response === "object" &&
    "response" in response &&
    typeof (response as { response?: unknown }).response === "string"
  ) {
    return (response as { response: string }).response;
  }

  return String(response ?? "");
}

/**
 * Calcule une confiance simple à partir
 * de la qualité du classement du service.
 */
function calculateConfidence(
  score: number,
  domain: string,
): number {

  if (domain === "general") {
    return 0.7;
  }

  if (score >= 3) {
    return 0.95;
  }

  if (score === 2) {
    return 0.9;
  }

  if (score === 1) {
    return 0.8;
  }

  return 0.7;
            
