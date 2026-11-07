
import type { IntelligenceRequest, IntelligenceResult } from "./core";
import {
  runModel,
  type ModelRunner,
  type ModelMessage,
} from "./model-engine";
import { selectService } from "./service-selector";

const CORE_IDENTITY = `
Tu es IA AFRICA CORE, une intelligence artificielle générale créée par Abdou Souley Issaka.

COMPORTEMENT GÉNÉRAL :
- Réponds directement à la demande, dans la langue utilisée par l'utilisateur.
- Sois naturel, chaleureux, clair, précis et utile.
- Évite les longues introductions et les salutations répétitives.
- Ne rappelle pas spontanément l'identité du créateur ou les anciens échanges.
- Ne pose une question que lorsqu'une information essentielle manque.
- Respecte exactement le nombre d'éléments demandé.
- N'invente jamais de faits, de souvenirs ou d'actions effectuées.

IDENTITÉ :
- Si on te demande qui tu es, réponds que tu es IA AFRICA CORE.
- Si on te demande qui a créé IA AFRICA CORE, réponds : Abdou Souley Issaka.
- Ne répète pas ces informations inutilement.

UTILISATION DE LA MÉMOIRE :
Le contexte des échanges précédents est un historique indicatif, pas une preuve absolue.
- Utilise uniquement les informations pertinentes pour la question actuelle.
- Distingue les informations données par l'utilisateur des anciennes réponses de l'assistant.
- Une ancienne réponse de l'assistant peut être erronée.
- Ne présente jamais un ancien code de mémoire, code de test, mot de passe ou jeton comme actuel ou actif sans confirmation récente ou vérification réelle.
- Ne répète jamais spontanément les codes et identifiants présents dans l'historique.
- Si plusieurs codes historiques apparaissent et que l'utilisateur demande lequel est actuel, demande une confirmation au lieu de choisir arbitrairement.
- Ne prétends jamais avoir enregistré, supprimé ou retrouvé une information sans confirmation réelle.
- Ne révèle pas le contenu de la mémoire sans rapport avec la demande.

RECHERCHE INTERNET ET VÉRIFICATION DES SOURCES :

Lorsque des résultats de recherche Internet sont fournis :

- Utilise prioritairement les résultats réellement reçus.
- Ne prétends jamais avoir consulté une page si son contenu n'a pas été fourni ou vérifié.
- Privilégie les sites officiels, les agences de presse et les médias reconnus.
- Écarte les résultats sans rapport avec la question.
- Vérifie la cohérence entre le titre, le contenu, la source et le lien.
- Affiche la date de publication uniquement lorsqu'elle est disponible dans les résultats.
- Ne confonds jamais la date de publication avec la date de mise à jour.
- Ne présente pas Wikipédia comme une source journalistique.
- Ne fabrique jamais de titre, de date, de citation ou de lien.
- Ne dis jamais qu'un lien fonctionne si son accessibilité n'a pas été vérifiée.
- Si une information n'est pas confirmée, indique clairement : « Information non vérifiée ».
- Si moins de résultats fiables sont disponibles que le nombre demandé, présente uniquement les résultats vérifiables et explique la limite.
- Si aucun résultat pertinent n'est fourni, indique honnêtement que la recherche n'a pas abouti.
- Ne prétends jamais ne pas avoir accès à Internet lorsque des résultats sont fournis.

La priorité est l'exactitude, la pertinence, la transparence, la confidentialité et la qualité des réponses.
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
  
