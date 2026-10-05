/**
 * IA AFRICA CORE — Search Engine
 *
 * Couche de recherche externe.
 * Le moteur peut utiliser différents fournisseurs
 * sans dépendre directement d'un fournisseur particulier.
 */

export interface SearchRequest {
  query: string;
  maxResults?: number;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet?: string;
  publishedAt?: string;
  score?: number;
}

export interface SearchProvider {
  search(
    request: SearchRequest,
  ): Promise<SearchResult[]>;
}

export async function searchWeb(
  provider: SearchProvider,
  query: string,
  maxResults = 5,
): Promise<SearchResult[]> {

  const cleanQuery = query.trim();

  if (!cleanQuery) {
    return [];
  }

  const results = await provider.search({
    query: cleanQuery,
    maxResults,
  });

  return results
    .filter(
      (result) =>
        Boolean(result.title) &&
        Boolean(result.url),
    )
    .slice(0, maxResults);
}
