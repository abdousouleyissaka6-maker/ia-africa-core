/**
 * IA AFRICA CORE — Exa Search Provider
 *
 * Adaptateur de recherche Exa.
 * La clé API reste fournie par l'application hôte.
 */

import type {
  SearchProvider,
  SearchRequest,
  SearchResult,
} from "./search-engine";

export interface ExaSearchProviderOptions {
  apiKey: string;
  endpoint?: string;
}

interface ExaResponse {
  results?: Array<{
    title?: string;
    url?: string;
    text?: string;
    publishedDate?: string;
    score?: number;
  }>;
}

export class ExaSearchProvider
  implements SearchProvider {

  private readonly apiKey: string;
  private readonly endpoint: string;

  constructor(
    options: ExaSearchProviderOptions,
  ) {
    this.apiKey = options.apiKey;
    this.endpoint =
      options.endpoint ??
      "https://api.exa.ai/search";
  }

  async search(
    request: SearchRequest,
  ): Promise<SearchResult[]> {

    const response = await fetch(
      this.endpoint,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
        },
        body: JSON.stringify({
          query: request.query,
          numResults: request.maxResults ?? 5,
          contents: {
            text: true,
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Exa search failed: ${response.status}`,
      );
    }

    const data =
      await response.json() as ExaResponse;

    return (data.results ?? [])
      .filter(
        (result) =>
          Boolean(result.title) &&
          Boolean(result.url),
      )
      .map((result) => ({
        title: result.title!,
        url: result.url!,
        snippet: result.text,
        publishedAt: result.publishedDate,
        score: result.score,
      }));
  }
  }
