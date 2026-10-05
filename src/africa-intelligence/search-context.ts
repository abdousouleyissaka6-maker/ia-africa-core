/**
 * IA AFRICA CORE — Search Context
 *
 * Transforme les résultats de recherche en contexte
 * exploitable par le moteur d'intelligence.
 */

import type {
  RankedSource,
} from "./source-ranking";

export interface SearchContext {
  text: string;
  sources: RankedSource[];
}

export function buildSearchContext(
  sources: RankedSource[],
  maxSources = 5,
): SearchContext {

  const selectedSources = sources
    .slice(0, maxSources);

  const text = selectedSources
    .map((source, index) => {
      const result = source.result;

      return [
        `[SOURCE ${index + 1}]`,
        `Titre: ${result.title}`,
        `URL: ${result.url}`,
        result.snippet
          ? `Résumé: ${result.snippet}`
          : "",
        result.publishedAt
          ? `Date: ${result.publishedAt}`
          : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");

  return {
    text,
    sources: selectedSources,
  };
}
