/**
 * IA AFRICA CORE — Search Orchestrator
 *
 * Orchestre la recherche :
 * recherche externe → classement → sélection
 * des meilleures sources.
 */

import {
  searchWeb,
  type SearchProvider,
  type SearchResult,
} from "./search-engine";

import {
  rankSources,
  type RankedSource,
} from "./source-ranking";

export interface SearchOrchestrationResult {
  query: string;
  results: SearchResult[];
  rankedSources: RankedSource[];
}

export async function orchestrateSearch(
  provider: SearchProvider,
  query: string,
  maxResults = 5,
): Promise<SearchOrchestrationResult> {

  const cleanQuery = query.trim();

  if (!cleanQuery) {
    return {
      query: "",
      results: [],
      rankedSources: [],
    };
  }

  const results = await searchWeb(
    provider,
    cleanQuery,
    maxResults,
  );

  const rankedSources = rankSources(
    results,
    cleanQuery,
  );

  return {
    query: cleanQuery,
    results,
    rankedSources,
  };
}
