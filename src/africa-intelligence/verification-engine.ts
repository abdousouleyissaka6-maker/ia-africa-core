/**
 * IA AFRICA CORE — Verification Engine
 *
 * Vérifie l'état minimal d'une réponse avant
 * sa transmission à l'utilisateur.
 */

export interface VerificationInput {
  answer: string;
  confidence: number;
  domain: string;
}

export interface VerificationResult {
  verified: boolean;
  confidence: number;
  warnings: string[];
}

export function verifyResponse(
  input: VerificationInput,
): VerificationResult {

  const warnings: string[] = [];

  if (!input.answer.trim()) {
    warnings.push("La réponse générée est vide.");
  }

  if (input.confidence < 0.5) {
    warnings.push(
      "Le niveau de confiance est faible.",
    );
  }

  if (!input.domain) {
    warnings.push(
      "Le domaine de la demande n'est pas déterminé.",
    );
  }

  return {
    verified:
      warnings.length === 0 &&
      input.answer.trim().length > 0,
    confidence: Math.max(
      0,
      Math.min(1, input.confidence),
    ),
    warnings,
  };
}
