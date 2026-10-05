/**
 * IA AFRICA CORE — Service Registry
 * Registre central des services de IA AFRICA.
 */

export interface ServiceDefinition {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  enabled: boolean;
}

export const SERVICE_REGISTRY: ServiceDefinition[] = [
  {
    id: "education",
    name: "Éducation",
    description: "Enseignement, pédagogie, apprentissage et formation.",
    keywords: [
      "école",
      "élève",
      "enseignant",
      "professeur",
      "pédagogie",
      "cours",
      "formation",
      "enseignement",
      "éducation",
    ],
    enabled: true,
  },

  {
    id: "agriculture",
    name: "Agriculture",
    description: "Agriculture, élevage, cultures et activités rurales.",
    keywords: [
      "agriculture",
      "agriculteur",
      "culture",
      "récolte",
      "élevage",
      "ferme",
      "bétail",
      "semence",
      "sol",
    ],
    enabled: true,
  },

  {
    id: "business",
    name: "Business",
    description: "Entreprise, commerce, entrepreneuriat et activités économiques.",
    keywords: [
      "business",
      "entreprise",
      "commerce",
      "commercial",
      "entrepreneur",
      "entrepreneuriat",
      "vente",
      "marché",
      "client",
    ],
    enabled: true,
  },

  {
    id: "employment",
    name: "Emploi",
    description: "Emploi, recrutement, CV, métiers et carrière.",
    keywords: [
      "emploi",
      "travail",
      "recrutement",
      "emploi",
      "cv",
      "carrière",
      "métier",
      "profession",
      "candidature",
    ],
    enabled: true,
  },

  {
    id: "languages",
    name: "Langues",
    description: "Traduction, apprentissage et compréhension des langues.",
    keywords: [
      "traduction",
      "anglais",
      "français",
      "zarma",
      "haoussa",
      "langue",
      "traduire",
      "grammar",
      "vocabulaire",
    ],
    enabled: true,
  },

  {
    id: "documents",
    name: "Documents",
    description: "Création, analyse, correction et organisation de documents.",
    keywords: [
      "document",
      "pdf",
      "lettre",
      "rapport",
      "contrat",
      "dossier",
      "cv",
      "correction",
      "texte",
    ],
    enabled: true,
  },

  {
    id: "general",
    name: "Général",
    description: "Questions générales ne correspondant pas à un service spécialisé.",
    keywords: [],
    enabled: true,
  },
];

export function getServices(): ServiceDefinition[] {
  return SERVICE_REGISTRY.filter(
    (service) => service.enabled,
  );
}

export function getServiceById(
  id: string,
): ServiceDefinition | undefined {
  return SERVICE_REGISTRY.find(
    (service) => service.id === id && service.enabled,
    );
}
