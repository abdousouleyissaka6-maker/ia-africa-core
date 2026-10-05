/**
 * IA AFRICA CORE — Response Builder
 *
 * Prépare une réponse propre et cohérente
 * avant de la retourner à l'utilisateur.
 */

export interface ResponseBuildInput {
  response: unknown;
  domain: string;
  confidence: number;
  verified: boolean;
}

export interface BuiltResponse {
  answer: string;
  domain: string;
  confidence: number;
  verified: boolean;
}

export function buildResponse(
  input: ResponseBuildInput,
): BuiltResponse {

  const answer = extractAnswer(input.response);

  return {
    answer: cleanAnswer(answer),
    domain: input.domain,
    confidence: Math.max(
      0,
      Math.min(1, input.confidence),
    ),
    verified: input.verified,
  };
}

function extractAnswer(response: unknown): string {

  if (typeof response === "string") {
    return response;
  }

  if (
    typeof response === "object" &&
    response !== null &&
    "response" in response
  ) {
    const value = (response as {
      response?: unknown;
    }).response;

    if (typeof value === "string") {
      return value;
    }
  }

  return String(response ?? "");
}

function cleanAnswer(answer: string): string {

  return answer
    .replace(/\r\n/g, "\n")
    .trim();
}
