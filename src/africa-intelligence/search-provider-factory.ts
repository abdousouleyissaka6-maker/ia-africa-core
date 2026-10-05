/**
 * IA AFRICA CORE — Search Provider Factory
 *
 * Crée le fournisseur de recherche utilisé
 * par l'application hôte.
 */

import {
  ExaSearchProvider,
} from "./exa-search-provider";

export function createExaSearchProvider(
  apiKey: string,
) {
  if (!apiKey.trim()) {
    throw new Error(
      "EXA_API_KEY est obligatoire.",
    );
  }

  return new ExaSearchProvider({
    apiKey,
  });
}
