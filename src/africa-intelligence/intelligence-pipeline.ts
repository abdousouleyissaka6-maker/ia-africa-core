import type {
  IntelligenceRequest,
  IntelligenceResult,
} from "./core";

import {
  runModel,
  type ModelRunner,
  type ModelMessage,
} from "./model-engine";

/**
 * IA AFRICA CORE — Intelligence Pipeline
 *
 * Flux :
 * Comprendre
 * → Classer
 * → Choisir le modèle
 * → Exécuter le modèle
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
      },
    };
  }

  const domain = detectDomain(content);

  const messages: ModelMessage[] = [
    {
      role: "system",
      content:
        "Tu es le moteur d'intelligence de IA AFRICA CORE. " +
        "Comprends la demande, réponds clairement et de manière utile. " +
        "Adapte ta réponse au domaine détecté.",
    },
    {
      role: "user",
      content,
    },
  ];

  const result = await runModel(runner, {
    messages,
    domain,
    stream: false,
  });

  const answer = extractAnswer(result.response);

  return {
    answer,
    domain,
    confidence: domain === "general" ? 0.7 : 0.9,
    verified: false,
    metadata: {
      inputType: request.type,
      language: request.language ?? "auto",
      model: result.model,
      provider: result.provider,
    },
  };
}

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

function detectDomain(text: string): string {
  const value = text.toLowerCase();

  if (
    value.includes("école") ||
    value.includes("élève") ||
    value.includes("enseign") ||
    value.includes("pédagog") ||
    value.includes("cours") ||
    value.includes("formation")
  ) {
    return "education";
  }

  if (
    value.includes("agriculture") ||
    value.includes("culture") ||
    value.includes("élevage") ||
    value.includes("ferme") ||
    value.includes("récolte")
  ) {
    return "agriculture";
  }

  if (
    value.includes("entreprise") ||
    value.includes("business") ||
    value.includes("commerce") ||
    value.includes("vente") ||
    value.includes("marché")
  ) {
    return "business";
  }

  if (
    value.includes("emploi") ||
    value.includes("travail") ||
    value.includes("cv") ||
    value.includes("recrutement")
  ) {
    return "employment";
  }

  if (
    value.includes("traduire") ||
    value.includes("traduction") ||
    value.includes("anglais") ||
    value.includes("français") ||
    value.includes("zarma") ||
    value.includes("haoussa")
  ) {
    return "languages";
  }

  if (
    value.includes("pdf") ||
    value.includes("document") ||
    value.includes("lettre") ||
    value.includes("rapport")
  ) {
    return "documents";
  }

  return "general";
}
