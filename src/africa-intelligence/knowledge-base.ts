/**
 * IA AFRICA CORE — Knowledge Base
 *
 * Couche centrale de gestion des connaissances.
 *
 * Elle permet au CORE de rechercher des connaissances
 * structurées avant de produire une réponse.
 */

export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  domain: string;
  language?: string;
  keywords: string[];
  source?: string;
}

export interface KnowledgeSearchResult {
  entry: KnowledgeEntry;
  score: number;
  matchedKeywords: string[];
}

/**
 * Base initiale de connaissances.
 *
 * Elle pourra ensuite être remplacée ou complétée
 * par une véritable base de données / RAG.
 */
const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  {
    id: "education-general",
    title: "Éducation",
    content:
      "L'éducation regroupe les processus d'enseignement, d'apprentissage, de formation et de développement des compétences.",
    domain: "education",
    language: "fr",
    keywords: [
      "education",
      "enseignement",
      "apprentissage",
      "ecole",
      "eleve",
      "pedagogie",
    ],
  },
  {
    id: "agriculture-general",
    title: "Agriculture",
    content:
      "L'agriculture concerne la production végétale, l'élevage, la gestion des ressources naturelles et les activités liées à la production alimentaire.",
    domain: "agriculture",
    language: "fr",
    keywords: [
      "agriculture",
      "agriculteur",
      "culture",
      "elevage",
      "semence",
      "sol",
      "irrigation",
    ],
  },
  {
    id: "business-general",
    title: "Business",
    content:
      "Le business regroupe les activités de création, de production, de vente, de services, de gestion et de développement d'une activité économique.",
    domain: "business",
    language: "fr",
    keywords: [
      "business",
      "entreprise",
      "commerce",
      "vente",
      "entrepreneur",
      "marche",
    ],
  },
];

/**
 * Retourne toutes les connaissances disponibles.
 */
export function getKnowledgeBase(): KnowledgeEntry[] {
  return [...KNOWLEDGE_BASE];
}

/**
 * Recherche des connaissances correspondant à un texte.
 */
export function searchKnowledge(
  text: string,
  domain?: string,
): KnowledgeSearchResult[] {

  const normalizedText = normalize(text);

  return KNOWLEDGE_BASE
    .map((entry) => {

      const matchedKeywords = entry.keywords.filter(
        (keyword) =>
          normalizedText.includes(normalize(keyword)),
      );

      let score = matchedKeywords.length;

      if (domain && entry.domain === domain) {
        score += 2;
      }

      return {
        entry,
        score,
        matchedKeywords,
      };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score);
}

/**
 * Recherche la connaissance la plus pertinente.
 */
export function getBestKnowledge(
  text: string,
  domain?: string,
): KnowledgeSearchResult | undefined {

  return searchKnowledge(text, domain)[0];
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  }
