/**
 * IA AFRICA CORE — Source Ranking
 *
 * Classe les sources de recherche selon leur
 * pertinence et leur qualité apparente.
 */

import type {
  SearchResult,
} from "./search-engine";

export interface RankedSource {
  result: SearchResult;
  score: number;
}

export function rankSources(
  results: SearchResult[],
  query: string,
): RankedSource[] {

  const normalizedQuery = normalize(query);

  return results
    .map((result) => {

      let score = result.score ?? 0;

      const title = normalize(result.title);
      const snippet = normalize(
        result.snippet ?? "",
      );

      if (
        title.includes(normalizedQuery)
      ) {
        score += 5;
      }

      if (
        snippet.includes(normalizedQuery)
      ) {
        score += 3;
      }

      if (
        result.url.startsWith("https://")
      ) {
        score += 1;
      }

      return {
        result,
        score,
      };
    })
    .sort(
      (a, b) => b.score - a.score,
    );
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}
