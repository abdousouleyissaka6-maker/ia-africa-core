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
  return env.ASSETS.fetch(request);
                          }
    if (url.pathname === "/api/satellite") {
      if (request.method !== "GET") {
        return Response.json(
          { error: "Utilisez la méthode GET." },
          { status: 405 },
        );
      }

      const latParam = url.searchParams.get("lat");
      const lonParam = url.searchParams.get("lon");
      const lat = Number(latParam);
      const lon = Number(lonParam);

      if (
        latParam === null ||
        lonParam === null ||
        !Number.isFinite(lat) ||
        !Number.isFinite(lon) ||
        lat < -90 ||
        lat > 90 ||
        lon < -180 ||
        lon > 180
      ) {
        return Response.json(
          {
            error: "Coordonnées invalides.",
            exemple: "/api/satellite?lat=13.5116&lon=2.1254",
          },
          { status: 400 },
        );
      }

      const date = new Date();
      date.setUTCDate(date.getUTCDate() - 5);

      const end = date.toISOString()
        .slice(0, 10)
        .replace(/-/g, "");

      date.setUTCDate(date.getUTCDate() - 6);

      const start = date.toISOString()
        .slice(0, 10)
        .replace(/-/g, "");

      const nasa = new URL(
        "https://power.larc.nasa.gov/api/temporal/daily/point",
      );

      nasa.searchParams.set(
        "parameters",
        "T2M,PRECTOTCORR,RH2M,WS2M",
      );
      nasa.searchParams.set("community", "AG");
      nasa.searchParams.set("latitude", String(lat));
      nasa.searchParams.set("longitude", String(lon));
      nasa.searchParams.set("start", start);
      nasa.searchParams.set("end", end);
      nasa.searchParams.set("format", "JSON");

      try {
        const response = await fetch(nasa.toString());
        const data = await response.text();

        return new Response(data, {
          status: response.ok ? 200 : 502,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=300",
          },
        });
      } catch {
        return Response.json(
          {
            error:
              "Le service NASA POWER est temporairement inaccessible.",
          },
          { status: 502 },
        );
      }
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
