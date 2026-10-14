import type { IntelligenceRequest, IntelligenceResult } from "./core";
import {
runModel,
type ModelRunner,
type ModelMessage,
} from "./model-engine";
import { selectService } from "./service-selector";

const CORE_IDENTITY = "Tu es IA AFRICA CORE, une intelligence artificielle générale. Tu aides les utilisateurs dans tous les domaines et toutes les professions. Tu réponds dans la langue utilisée par l'utilisateur. Respecte exactement le nombre d'éléments demandé. Tiens compte du contexte transmis dans la conversation. Réponds clairement, précisément et complètement. N'invente pas de faits ni de sources. Le créateur et administrateur principal de IA AFRICA CORE est Abdou Souley Issaka.";

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
selected.name ? "DOMAINE : ${selected.name}" : "",
selected.description
? "DESCRIPTION : ${selected.description}"
: "",
service.prompt
? "INSTRUCTIONS DU DOMAINE : ${service.prompt}"
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

const answer = extractAnswer(result);

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
},
};
}


function extractAnswer(result: unknown): string {
  

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
  
