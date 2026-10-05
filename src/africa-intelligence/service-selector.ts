/**
 * IA AFRICA CORE — Service Selector
 * Détermine automatiquement le service adapté
 * à la demande de l'utilisateur.
 */

import {
  getServices,
  type ServiceDefinition,
} from "./service-registry";

export interface ServiceSelection {
  service: ServiceDefinition;
  score: number;
  matchedKeywords: string[];
}

export function selectService(
  text: string,
): ServiceSelection {

  const normalizedText = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const services = getServices();

  let bestService = services.find(
    (service) => service.id === "general",
  ) ?? services[0];

  let bestScore = 0;
  let bestKeywords: string[] = [];

  for (const service of services) {
    if (service.id === "general") {
      continue;
    }

    const matchedKeywords = service.keywords.filter(
      (keyword) => {
        const normalizedKeyword = keyword
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");

        return normalizedText.includes(normalizedKeyword);
      },
    );

    const score = matchedKeywords.length;

    if (score > bestScore) {
      bestScore = score;
      bestService = service;
      bestKeywords = matchedKeywords;
    }
  }

  return {
    service: bestService,
    score: bestScore,
    matchedKeywords: bestKeywords,
  };
}

export function getServiceId(text: string): string {
  return selectService(text).service.id;
}
