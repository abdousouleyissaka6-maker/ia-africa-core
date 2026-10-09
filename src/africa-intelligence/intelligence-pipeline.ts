import type {
  IntelligenceRequest,
  IntelligenceResult,
} from "./core";

import {
  runModel,
  type ModelRunner,
  type ModelMessage,
} from "./model-engine";

import {
  selectService,
} from "./service-selector";

/**
 * IA AFRICA CORE
 * Moteur d'intelligence générale.
 * Identité, contexte et continuité des réponses.
 */

const CORE_IDENTITY = `
IDENTITÉ OFFICIELLE DE IA AFRICA CORE

Nom de la plateforme : IA AFRICA CORE.
Administrateur et créateur du projet : Abdou Souley Issaka.

MISSION :
IA AFRICA CORE est une plateforme d'intelligence artificielle générale
destinée à répondre aux besoins des utilisateurs dans de nombreux domaines :
éducation, sciences, santé, agriculture, technologie, informatique,
entrepreneuriat, communication, culture, recherche et vie quotidienne.

La plateforme doit pouvoir aider différentes professions et différents
types d'utilisateurs, partout dans le monde.

RÈGLES DE CONNAISSANCE :
1. Si l'utilisateur demande le nom de la plateforme, réponds :
   IA AFRICA CORE.
2. Si l'utilisateur demande qui est l'administrateur ou le créateur
   du projet, réponds : Abdou Souley Issaka.
3. Ne prétends pas connaître des informations internes qui ne figurent
   pas dans le contexte ou dans les données accessibles.
4. Ne confonds pas l'administrateur de la plateforme avec l'utilisateur
   qui pose une question.
5. Ne prétends pas avoir consulté une base de données, un fichier,
   un site web ou un historique si cela n'a pas été effectué.
6. Réponds dans la langue utilisée par l'utilisateur lorsque c'est possible.
7. Fournis des réponses précises, structurées, cohérentes et utiles.
8. Respecte le nombre d'éléments demandé par l'utilisateur.
9. Pour une question complémentaire, utilise les messages précédents
   qui sont réellement fournis dans le contexte.
10. Si l'historique précédent n'est pas disponible, ne prétends pas
    t'en souvenir. Demande une précision si elle est nécessaire.

GESTION DES DONNÉES :
- Distingue les informations confirmées des suppositions.
- Pour les données environnementales ou satellitaires ajoutées à la
  question, utilise-les avec prudence et indique leur date lorsqu'elle
  est disponible.
- Ne présente jamais des données différées comme des mesures en direct.
- N'invente ni résultats, ni statistiques, ni actions réalisées.

OBJECTIF :
Fournir une assistance intelligente, générale, cohérente et honnête.
`;

export async function runAfricaCore(
  request: IntelligenceRequest,
  runner: ModelRunner,
): Promise<IntelligenceResult> {
  const content = String(request.content ?? "").trim();

  if (!content) {
    return {
      answer: "Je n'ai reçu aucune question. Comment puis-je vous aider ?",
      domain: "general",
      confidence: 0,
      verified: false,
      metadata: {
        inputType: request.type,
        language: request.language ?? "auto",
        service: "general",
      },
    };
  }

  // 1. Identifier le domaine de la demande.
  const selection = selectService(content);
  const service = selection.service;
  const domain = service.id;

  // 2. Récupérer les instructions du service sélectionné.
  const servicePrompt = selection.prompt;

  // 3. Construire les messages envoyés au modèle.
  const messages: ModelMessage[] = [
    {
      role: "system",
      content:
        CORE_IDENTITY +
        "\n\nSERVICE SÉLECTIONNÉ : " +
        service.name +
        "\nDESCRIPTION DU SERVICE : " +
        service.description +
        "\n\nINSTRUCTIONS SPÉCIALISÉES :\n" +
        servicePrompt +
        "\n\nRÈGLES DE RÉPONSE :\n" +
        "- Comprends la question avant de répondre.\n" +
        "- Réponds directement et clairement.\n" +
        "- Utilise les informations présentes dans le message.\n" +
        "- Tiens compte du contexte précédent lorsqu'il est fourni.\n" +
        "- N'invente pas de mémoire ou d'informations absentes.\n" +
        "- Ne prétends pas avoir réalisé une action non effectuée.",
    },
    {
      role: "user",
      content,
    },
  ];

  // 4. Exécuter le modèle d'intelligence artificielle.
  const result = await runModel(runner, {
    messages,
    domain,
    stream: false,
  });

  // 5. Extraire la réponse du modèle.
  const answer = extractAnswer(result.response);

  // 6. Retourner une réponse structurée.
  return {
    answer,
    domain,
    confidence: calculateConfidence(selection.score, domain),
    verified: false,
    metadata: {
      inputType: request.type,
      language: request.language ?? "auto",
      service: service.id,
      serviceName: service.name,
      matchedKeywords: selection.matchedKeywords,
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

function calculateConfidence(
  score: number,
  domain: string,
): number {
  if (domain === "general") {
    return 0.7;
  }

  if (score >= 3) {
    return 0.95;
  }

  if (score === 2) {
    return 0.9;
  }

  if (score === 1) {
    return 0.8;
  }

  return 0.7;
    }
