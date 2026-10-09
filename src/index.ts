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

const NASA_POWER_URL =
  "https://power.larc.nasa.gov/api/temporal/daily/point";

async function getSatelliteData(lat: number, lon: number): Promise<unknown> {
  const endDate = new Date();
  endDate.setUTCDate(endDate.getUTCDate() - 5);
  const end = endDate.toISOString().slice(0, 10).replace(/-/g, "");
  endDate.setUTCDate(endDate.getUTCDate() - 6);
  const start = endDate.toISOString().slice(0, 10).replace(/-/g, "");

  const nasa = new URL(NASA_POWER_URL);
  nasa.searchParams.set("parameters", "T2M,PRECTOTCORR,RH2M,WS2M");
  nasa.searchParams.set("community", "AG");
  nasa.searchParams.set("latitude", String(lat));
  nasa.searchParams.set("longitude", String(lon));
  nasa.searchParams.set("start", start);
  nasa.searchParams.set("end", end);
  nasa.searchParams.set("format", "JSON");

  const response = await fetch(nasa.toString());

  if (!response.ok) {
    throw new Error("Le service NASA POWER est temporairement inaccessible.");
  }

  return response.json();
}

async function getSatelliteContext(
  message: string,
): Promise<string | null> {
  const weatherQuestion =
    /m[eé]t[eé]o|temp[eé]rature|pluie|pr[eé]cipitation|humidit[eé]|vent|conditions?\s+climatiques?|weather|rainfall/i.test(
      message,
    );

  if (!weatherQuestion) return null;

  let lat: number | null = null;
  let lon: number | null = null;
  let place = "";

  const coordinateMatch = message.match(
    /(-?\d{1,2}(?:\.\d+)?)\s*[,;]\s*(-?\d{1,3}(?:\.\d+)?)/,
  );

  if (coordinateMatch) {
    lat = Number(coordinateMatch[1]);
    lon = Number(coordinateMatch[2]);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      lat < -90 ||
      lat > 90 ||
      lon < -180 ||
      lon > 180
    ) {
      return "Les coordonnées semblent invalides. Demandez à l'utilisateur de les vérifier.";
    }
  } else {
    const locationMatch = message.match(
      /\b(?:à|a|au|aux|dans|de|du|des|pour|in|at)\s+([\p{L}\d][\p{L}\d\s,'’-]{1,50}?)(?=[?.!,;:]|$)/iu,
    );

    if (!locationMatch) {
      return "Pour consulter les données environnementales, demandez à l'utilisateur de préciser la ville ou le lieu.";
    }

    place = locationMatch[1].trim();

    try {
      const geoUrl = new URL(
        "https://geocoding-api.open-meteo.com/v1/search",
      );
      geoUrl.searchParams.set("name", place);
      geoUrl.searchParams.set("count", "1");
      geoUrl.searchParams.set("language", "fr");
      geoUrl.searchParams.set("format", "json");

      const geoResponse = await fetch(geoUrl.toString());

      if (!geoResponse.ok) return null;

      const geo = (await geoResponse.json()) as {
        results?: Array<{
          latitude: number;
          longitude: number;
          name: string;
          country?: string;
        }>;
      };

      const found = geo.results?.[0];

      if (!found) {
        return "Je n'ai pas trouvé ce lieu. Demandez à l'utilisateur de préciser le nom de la ville.";
      }

      lat = found.latitude;
      lon = found.longitude;
      place = found.name + (found.country ? ", " + found.country : "");
    } catch {
      return null;
    }
  }

  if (lat === null || lon === null) return null;

  try {
    const raw = (await getSatelliteData(lat, lon)) as {
      properties?: {
        parameter?: Record<string, Record<string, number>>;
      };
    };

    const parameters = raw.properties?.parameter;
    if (!parameters) return null;

    const dates = Object.keys(parameters.T2M ?? {}).filter(
      (day) => Number.isFinite(parameters.T2M?.[day]),
    );
    dates.sort();

    const latest = dates[dates.length - 1];
    if (!latest) return null;

    const value = (key: string): number | null => {
      const result = parameters[key]?.[latest];
      return typeof result === "number" &&
        Number.isFinite(result) &&
        result > -900
        ? result
        : null;
    };

    const temperature = value("T2M");
    const rain = value("PRECTOTCORR");
    const humidity = value("RH2M");
    const wind = value("WS2M");

    const readableDate =
      latest.slice(0, 4) +
      "-" +
      latest.slice(4, 6) +
      "-" +
      latest.slice(6, 8);

    return [
      "DONNÉES ENVIRONNEMENTALES NASA POWER :",
      "Lieu : " + (place || "coordonnées fournies"),
      "Latitude : " + lat + ", longitude : " + lon,
      "Date des données : " + readableDate,
      temperature !== null
        ? "Température moyenne : " + temperature + " °C"
        : "",
      rain !== null ? "Précipitations estimées : " + rain + " mm/jour" : "",
      humidity !== null ? "Humidité relative : " + humidity + " %" : "",
      wind !== null ? "Vitesse du vent à 2 m : " + wind + " m/s" : "",
      "Consigne : répondez clairement à la question de l'utilisateur en français, en expliquant les valeurs utiles. Précisez la date des données. Ces données quotidiennes sont généralement différées : elles ne représentent ni des mesures en direct ni une prévision météorologique. Ne prétendez pas qu'elles indiquent avec certitude le temps qu'il fera demain.",
    ]
      .filter(Boolean)
      .join("\n");
  } catch {
    return null;
  }
}

async function handleChat(
  request: Request,
  env: Env,
): Promise<Response> {
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
  const originalContent = input.content ?? input.message ?? "";
  let content =
    typeof originalContent === "string"
      ? originalContent
      : String(originalContent);

  try {
    const satelliteContext = await getSatelliteContext(content);

    if (satelliteContext) {
      content += "\n\n" + satelliteContext;
    }

    const intelligenceRequest: IntelligenceRequest = {
      type:
        input.type === "voice" ||
        input.type === "image" ||
        input.type === "document"
          ? input.type
          : "text",
      content,
      language:
        typeof input.language === "string" ? input.language : undefined,
      userId:
        typeof input.userId === "string" ? input.userId : undefined,
      sessionId:
        typeof input.sessionId === "string" ? input.sessionId : undefined,
    };

    const runner = createCloudflareModelRunner(env.AI);
    const result = await runAfricaCore(intelligenceRequest, runner);

    return Response.json({ success: true, ...result });
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

    if (request.method === "GET" && url.pathname === "/") {
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

      try {
        const data = await getSatelliteData(lat, lon);

        return Response.json(data, {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=300",
          },
        });
      } catch {
        return Response.json(
          {
            error: "Le service NASA POWER est temporairement inaccessible.",
          },
          { status: 502 },
        );
      }
    }

    if (request.method === "POST" && url.pathname === "/api/chat") {
      return handleChat(request, env);
    }

    return Response.json(
      {
        error: "Route introuvable.",
        routes: ["/", "/api/chat", "/api/satellite"],
      },
      { status: 404 },
    );
  },
};
