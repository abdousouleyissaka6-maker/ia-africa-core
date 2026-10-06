import {
  runAfricaCore,
  createCloudflareModelRunner,
  type IntelligenceRequest,
  type CloudflareAI,
} from "./africa-intelligence/index";

export interface Env {
  AI: CloudflareAI;
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
}

async function handleChat(request: Request, env: Env): Promise<Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Corps JSON invalide." },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object") {
    return Response.json(
      { error: "La requête doit être un objet JSON." },
      { status: 400 },
    );
  }

  const input = body as Record<string, unknown>;

  const intelligenceRequest: IntelligenceRequest = {
    type:
      input.type === "voice" ||
      input.type === "image" ||
      input.type === "document"
        ? input.type
        : "text",

    content: input.content ?? input.message ?? "",

    language:
      typeof input.language === "string"
        ? input.language
        : undefined,

    userId:
      typeof input.userId === "string"
        ? input.userId
        : undefined,

    sessionId:
      typeof input.sessionId === "string"
        ? input.sessionId
        : undefined,
  };

  try {
    const runner = createCloudflareModelRunner(env.AI);

    const result = await runAfricaCore(
      intelligenceRequest,
      runner,
    );

    return Response.json({
      success: true,
      ...result,
    });

  } catch (error) {
    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erreur interne de IA AFRICA CORE.",
      },
      { status: 500 },
    );
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (
      request.method === "GET" &&
      url.pathname === "/"
    ) {
      return Response.json({
        name: "IA AFRICA CORE",
        status: "online",
        message:
          "Le moteur central de IA AFRICA est opérationnel.",
      });
    }

    if (
      request.method === "POST" &&
      url.pathname === "/api/chat"
    ) {
      return handleChat(request, env);
    }

    return Response.json(
      {
        error: "Route introuvable.",
        routes: ["/", "/api/chat"],
      },
      { status: 404 },
    );
  },
};
