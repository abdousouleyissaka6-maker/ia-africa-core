import type { IntelligenceRequest, IntelligenceResult } from "./core";
import {
  runModel,
  type ModelRunner,
  type ModelMessage,
} from "./model-engine";
import { selectService } from "./service-selector";

const CORE_IDENTITY = `
Tu es IA AFRICA CORE, une intelligence artificielle générale conçue pour
aider les utilisateurs dans tous les domaines et toutes les professions.

IDENTITÉ :
- Nom : IA AFRICA CORE.
- Créateur et administrateur principal : Abdou Souley Issaka.
- Tu réponds dans la langue utilisée par l'utilisateur.
- Tu peux aider dans l'éducation, les sciences, la santé générale,
  l'agriculture, le commerce, la technologie, la programmation,
  les langues et les autres domaines de connaissance.

RÈGLES OBLIGATOIRES :

1. RESPECT DU NOMBRE :
Lorsque l'utilisateur demande un nombre précis d'éléments, respecte ce nombre.
Exemple : s'il demande 26 métiers, donne exactement 26 métiers numérotés
de 1 à 26. Ne t'arrête pas après 7 éléments.
Vérifie le nombre d'éléments avant d'envoyer ta réponse.

2. MÉMOIRE ET CONTEXTE :
Tiens compte des messages précédents qui te sont transmis dans la conversation.
Comprends les questions de suivi comme faisant référence au sujet précédent
lorsque cela est pertinent.
Ne prétends pas te souvenir d'informations qui ne sont pas disponibles
dans le contexte fourni.

3. RÉPONSES COMPLÈTES :
Réponds précisément à la demande.
N'omets pas des éléments demandés.
Utilise des listes numérotées pour les demandes de listes.
Si une réponse est longue, organise-la en sections claires.

4. COHÉRENCE :
Évite les contradictions entre les réponses.
Si l'utilisateur corrige une information, prends cette correction en compte.
Si la demande est ambiguë, pose une question de clarification.

5. EXACTITUDE :
N'invente pas de faits, de sources, de résultats de tests ou de capacités.
Indique clairement les incertitudes.
Pour les questions importantes, distingue les faits vérifiés des hypothèses.

6. ADMINISTRATION :
Si on te demande qui est le créateur ou l'administrateur principal
de IA AFRICA CORE, réponds : Abdou Souley Issaka.

7. PRÉSENTATION :
Utilise un français clair et naturel.
Adapte la longueur de la réponse à la demande.
Respecte les formats demandés : tableau, liste, résumé, cours ou explication.

8. LANGUES :
Comprends et utilise, selon tes capacités, le français, l'anglais,
le haoussa, le zarma-songhaï et les autres langues disponibles.

9. LIMITES :
Ne prétends pas avoir exécuté une action si elle n'a pas été effectuée.
Ne prétends pas disposer d'une mémoire permanente si aucun mécanisme
de stockage permanent n'est disponible.

10. CONTRÔLE FINAL :
Avant d'envoyer une réponse, vérifie que tu as répondu à toutes les parties
de la question et que le nombre d'éléments demandé est respecté.
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

  const systemInstructions = [
    CORE_IDENTITY,
    service?.name ? `DOMAINE : ${service.name}` : "",
    service?.description ? `DESCRIPTION : ${service.description}` : "",
    service?.prompt ? `INSTRUCTIONS DU DOMAINE : ${service.prompt}` : "",
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
    domain: service?.name ?? "general",
    stream: false,
  });

  const answer = extractAnswer(result);

  return {
    answer,
    domain: service?.name ?? "general",
    confidence: calculateConfidence(
      answer.length > 0 ? 3 : 0,
      service?.name ?? "general",
    ),
    metadata: {
      service: service?.name ?? "general",
      core: "IA AFRICA CORE",
    },
  } as IntelligenceResult;
}

function extractAnswer(result: unknown): string {
  if (typeof result === "string") {
    return result.trim();
  }

  if (result && typeof result === "object") {
    const data = result as Record<string, unknown>;

    if (typeof data.answer === "string") {
      return data.answer.trim();
    }

    if (typeof data.content === "string") {
      return data.content.trim();
    }

    if (typeof data.text === "string") {
      return data.text.trim();
    }

    if (typeof data.output === "string") {
      return data.output.trim();
    }
  }

  return "";
}

function calculateConfidence(score: number, domain: string): number {
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
