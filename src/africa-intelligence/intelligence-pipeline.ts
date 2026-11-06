
import type { IntelligenceRequest, IntelligenceResult } from "./core";
import {
  runModel,
  type ModelRunner,
  type ModelMessage,
} from "./model-engine";
import { selectService } from "./service-selector";


const CORE_IDENTITY = `
Tu es IA AFRICA CORE, une intelligence artificielle générale créée et administrée par Abdou Souley Issaka.

Tu aides les utilisateurs dans tous les domaines et toutes les professions.
Tu réponds dans la langue utilisée par l'utilisateur.
Tu respectes exactement le nombre d'éléments demandé.
Tu tiens compte du contexte de la conversation.
Tu réponds clairement, précisément et complètement.
Tu n'inventes jamais de faits.

RECHERCHE INTERNET ET VÉRIFICATION DES SOURCES :

Lorsque des résultats de recherche Internet sont présents dans le message de l'utilisateur, tu dois obligatoirement les exploiter.

Pour les questions d'actualité :
1. Identifie les informations qui répondent directement à la question.
2. Privilégie les sources officielles, les agences de presse reconnues et les médias fiables.
3. Vérifie que le titre et le contenu de chaque source sont réellement liés au sujet.
4. Compare plusieurs sources indépendantes lorsque c'est possible.
5. Privilégie les publications les plus récentes et indique leurs dates exactes.
6. Présente les liens directs des articles, jamais uniquement les pages d'accueil.
7. Respecte exactement le nombre de sources demandé lorsque les résultats le permettent.

FORMAT DES SOURCES :
Pour chaque source, indique :
- Le nom du média ou de l'organisme.
- Le titre exact de l'article.
- La date de publication si elle est disponible.
- Le lien direct vers l'article.
- Ce que cette source permet de confirmer.

RÈGLES DE FIABILITÉ :
- Ne considère pas un article comme une preuve s'il ne traite pas directement du sujet.
- Ne confonds pas la date de consultation et la date de publication.
- N'invente jamais un titre, une date, une citation ou un lien.
- Si une date est absente, indique clairement « Date non indiquée ».
- Si les sources se contredisent, explique les divergences.
- Si les résultats sont insuffisants, reconnais cette limite.
- Ne prétends jamais ne pas avoir accès à Internet lorsque des résultats de recherche sont fournis.

La priorité est l'exactitude, la pertinence, la transparence et la qualité des informations.
`;

  

export async function runAfricaCore(
  request: IntelligenceRequest,
  runner: ModelRunner,
): Promise<IntelligenceResult> {
  const content = String(request.content ?? "").trim();

  if (!content) {
    throw new Error("Veuillez saisir votre question.");
  }

  const service = selectService(content);
  const selected = service.service;

  const systemInstructions = [
    CORE_IDENTITY,
    selected.name ? `DOMAINE : ${selected.name}` : "",
    selected.description
      ? `DESCRIPTION : ${selected.description}`
      : "",
    service.prompt
      ? `INSTRUCTIONS DU DOMAINE : ${service.prompt}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const messages: ModelMessage[] = [
    {
      role: "system",
      content: systemInstructions,
    },
    {
      role: "user",
      content,
    },
  ];

  const result = await runModel(runner, {
    messages,
    domain: selected.name ?? "general",
    stream: false,
  });

  const answer = extractAnswer(result.response);

  if (!answer) {
    throw new Error(
      "IA AFRICA CORE n'a reçu aucune réponse du moteur de modèle.",
    );
  }

  return {
    answer,
    domain: selected.name ?? "general",
    confidence: calculateConfidence(
      answer.length > 0 ? 3 : 0,
      selected.name ?? "general",
    ),
    verified: false,
    metadata: {
      service: selected.name ?? "general",
      core: "IA AFRICA CORE",
      model: result.model,
      provider: result.provider,
      fallbackUsed: result.fallbackUsed,
      attemptedModels: result.attemptedModels,
    },
  };
}

function extractAnswer(result: unknown): string {
  if (typeof result === "string") {
    return result.trim();
  }

  if (!result || typeof result !== "object") {
    return "";
  }

  const data = result as Record<string, unknown>;

  const response =
    data.response && typeof data.response === "object"
      ? (data.response as Record<string, unknown>)
      : undefined;

  const payload =
    data.response && typeof data.response === "object"
      ? (data.response as Record<string, unknown>)
      : data;

  const choices = Array.isArray(payload.choices)
    ? payload.choices
    : [];

  const firstChoice =
    choices[0] && typeof choices[0] === "object"
      ? (choices[0] as Record<string, unknown>)
      : undefined;

  const message =
    firstChoice?.message &&
    typeof firstChoice.message === "object"
      ? (firstChoice.message as Record<string, unknown>)
      : undefined;

  const candidates: unknown[] = [
    message?.content,
    data.answer,
    data.content,
    data.text,
    data.output,
    response?.answer,
    response?.content,
    response?.text,
    response?.output,
    response?.response,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return "";
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


  
