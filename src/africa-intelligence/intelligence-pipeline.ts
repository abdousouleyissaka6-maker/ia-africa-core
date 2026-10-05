import type {
  IntelligenceRequest,
  IntelligenceResult,
} from "./core";

/**
 * Premier pipeline exécutable de IA AFRICA CORE.
 *
 * Flux :
 * Comprendre → Classer → Préparer
 */
export async function runAfricaCore(
  request: IntelligenceRequest,
): Promise<IntelligenceResult> {
  const content = String(request.content ?? "").trim();
  const domain = detectDomain(content);

  return {
    answer: "",
    domain,
    confidence: domain === "general" ? 0.5 : 0.8,
    verified: false,
    metadata: {
      inputType: request.type,
      language: request.language ?? "auto",
    },
  };
}

function detectDomain(text: string): string {
  const value = text.toLowerCase();

  if (
    value.includes("école") ||
    value.includes("élève") ||
    value.includes("enseign") ||
    value.includes("pédagog") ||
    value.includes("cours") ||
    value.includes("formation")
  ) {
    return "education";
  }

  if (
    value.includes("agriculture") ||
    value.includes("culture") ||
    value.includes("élevage") ||
    value.includes("ferme") ||
    value.includes("récolte")
  ) {
    return "agriculture";
  }

  if (
    value.includes("entreprise") ||
    value.includes("business") ||
    value.includes("commerce") ||
    value.includes("vente") ||
    value.includes("marché")
  ) {
    return "business";
  }

  if (
    value.includes("emploi") ||
    value.includes("travail") ||
    value.includes("cv") ||
    value.includes("recrutement")
  ) {
    return "employment";
  }

  if (
    value.includes("traduire") ||
    value.includes("traduction") ||
    value.includes("anglais") ||
    value.includes("français") ||
    value.includes("zarma") ||
    value.includes("haoussa")
  ) {
    return "languages";
  }

  if (
    value.includes("pdf") ||
    value.includes("document") ||
    value.includes("lettre") ||
    value.includes("rapport")
  ) {
    return "documents";
  }

  return "general";
}
