
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
  MEMORY: {
    get(key: string): Promise<string | null>;
    put(key: string, value: string): Promise<void>;
  };
  WHATSAPP_ACCESS_TOKEN?: string;
  WHATSAPP_PHONE_NUMBER_ID?: string;
  WHATSAPP_VERIFY_TOKEN?: string;
  RUNWAY_API_KEY?: string;
  OPENAI_API_KEY?: string;
  TAVILY_API_KEY?: string;
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
      return "Les coordonnées semblent invalides. Vérifiez-les.";
    }
  } else {
    const locationMatch = message.match(
      /\b(?:à|a|au|aux|dans|de|du|des|pour|in|at)\s+([\p{L}\d][\p{L}\d\s,'’-]{1,50}?)(?=[?.!,;:]|$)/iu,
    );

    if (!locationMatch) {
      return "Précisez la ville ou le lieu pour consulter les données environnementales.";
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
      if (!found) return "Je n'ai pas trouvé ce lieu. Précisez le nom de la ville.";

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
      temperature !== null ? "Température moyenne : " + temperature + " °C" : "",
      rain !== null ? "Précipitations estimées : " + rain + " mm/jour" : "",
      humidity !== null ? "Humidité relative : " + humidity + " %" : "",
      wind !== null ? "Vitesse du vent à 2 m : " + wind + " m/s" : "",
      "Ces données sont généralement différées et ne constituent pas une prévision météo en direct.",
    ]
      .filter(Boolean)
      .join("\n");
  } catch {
    return null;
  }
}

const CURRENT_INFO_PATTERN =
  /\b(actuel(?:le|s)?|aujourd'hui|aujourd’hui|maintenant|en ce moment|dernier(?:e|s)?|récent(?:e|s)?|actualités?|news|today|current|latest|recent|président|ministre|gouvernement)\b/i;

async function getWebSearchContext(
  message: string,
  apiKey?: string,
): Promise<string | null> {
  if (!CURRENT_INFO_PATTERN.test(message)) return null;

  if (!apiKey) {
    console.error("TAVILY ERREUR : clé API absente.");
    return "La recherche Internet n'est pas configurée.";
  }

  const query = message
    .replace(/donne[zr]?\s+(?:moi\s+)?(?:trois|3|cinq|5)\s+sources[^.?!]*/gi, "")
    .replace(/avec leurs liens directs/gi, "")
    .replace(/et leurs dates de publication/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey,
      },
      body: JSON.stringify({
        query,
        search_depth: "advanced",
        max_results: 8,
        topic: "news",
        include_answer: false,
        include_raw_content: false,
      }),
    });

    if (!response.ok) {
      const errorDetails = await response.text();
      console.error("TAVILY HTTP ERROR :", {
        status: response.status,
        details: errorDetails.slice(0, 1500),
      });
      return "La recherche Internet a échoué. Code HTTP Tavily : " + response.status;
    }

    const data = await response.json() as {
      results?: Array<{
        title?: string;
        url?: string;
        content?: string;
        published_date?: string;
      }>;
    };

    const results = (data.results ?? []).filter(
      (item) => item.title && item.url && item.content,
    );

    console.log("TAVILY RECHERCHE :", {
      query,
      resultCount: results.length,
      titles: results.map((item) => item.title),
    });

    if (results.length === 0) {
      console.error("TAVILY : aucun résultat exploitable.");
      return "Aucun résultat Internet exploitable trouvé.";
    }

    return [
      "RÉSULTATS DE RECHERCHE INTERNET TAVILY :",
      "Répondez directement à la question avec ces résultats.",
      "Privilégiez les sources officielles et les médias fiables.",
      "Vérifiez la pertinence de chaque source.",
      "Ne fabriquez jamais de titres, dates ou liens.",
      ...results.map((item, index) =>
        [
          "[" + (index + 1) + "] " + item.title,
          "URL : " + item.url,
          "Date : " + (item.published_date ?? "Non indiquée"),
          "Extrait : " + item.content!.slice(0, 1500),
        ].join("\n"),
      ),
    ].join("\n\n");
  } catch (error) {
    console.error("TAVILY EXCEPTION :", error);
    return "La recherche Internet est temporairement indisponible.";
  }
}

/* =========================================
   MÉMOIRE UTILISATEUR - VERSION 2
   Les anciennes conversations ne sont plus relues.
   Les réponses générées par l'IA ne sont plus stockées.
========================================= */

function getMemoryKey(userId: string): string {
  return "user-memory-v2:" + userId;
}

async function readUserMemory(
  env: Env,
  userId: string,
): Promise<string> {
  try {
    return (await env.MEMORY.get(getMemoryKey(userId))) ?? "";
  } catch (error) {
    console.error("Erreur lecture mémoire :", error);
    return "";
  }
}

async function saveUserMemory(
  env: Env,
  userId: string,
  question: string,
): Promise<{ saved: boolean; error?: string }> {
  try {
    if (!env.MEMORY) {
      throw new Error("Binding MEMORY absent dans Cloudflare.");
    }

    const cleanQuestion = question.trim();

    if (
      !cleanQuestion ||
      /^[a-zA-Z0-9_-]{8,100}$/.test(cleanQuestion) ||
      /mot de passe|password|api[_ -]?key|token|code de mémoire|code secret/i.test(cleanQuestion)
    ) {
      return {
        saved: false,
        error: "Message ignoré pour protéger les informations sensibles.",
      };
    }

    const key = getMemoryKey(userId);
    const previous = await env.MEMORY.get(key);

    const entry =
      "\n\nMessage envoyé par l'utilisateur : " +
      cleanQuestion.slice(0, 1000);

    const updated = (previous ?? "") + entry;

    await env.MEMORY.put(key, updated.slice(-6000));

    const verification = await env.MEMORY.get(key);

    if (verification === null) {
      throw new Error("La vérification après écriture a échoué.");
    }

    console.log("NOUVELLE MÉMOIRE UTILISATEUR ENREGISTRÉE :", {
      key,
      characters: verification.length,
    });

    return { saved: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur KV inconnue.";

    console.error("ERREUR ENREGISTREMENT MÉMOIRE KV :", message);

    return { saved: false, error: message };
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
    return Response.json({ error: "Corps JSON invalide." }, { status: 400 });
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
    const originalQuestion = content;

    const userId =
      typeof input.userId === "string" &&
      /^[a-zA-Z0-9_-]{8,100}$/.test(input.userId)
        ? input.userId
        : undefined;

    if (userId) {
      const previousMemory = await readUserMemory(env, userId);

      if (previousMemory) {
        content +=
          "\n\nHISTORIQUE DES MESSAGES DE L'UTILISATEUR :\n" +
          previousMemory +
          "\n\nIMPORTANT : cet historique contient uniquement des messages envoyés par l'utilisateur. Ce ne sont pas automatiquement des faits vérifiés. Ne présente jamais un ancien code, identifiant ou secret comme actuel. N'invente aucun souvenir.";
      }
    }

    const satelliteContext = await getSatelliteContext(originalQuestion);
    if (satelliteContext) {
      content += "\n\n" + satelliteContext;
    }

    const webContext = await getWebSearchContext(
      originalQuestion,
      env.TAVILY_API_KEY
    );

    if (webContext) {
      content += "\n\n" + webContext;
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

    const runner = createCloudflareModelRunner(env.AI, env.OPENAI_API_KEY);
    const result = await runAfricaCore(intelligenceRequest, runner);

    let memoryStatus = {
      bindingConfigured: !!env.MEMORY,
      userIdReceived: !!userId,
      saved: false,
      error: undefined as string | undefined,
    };

    if (userId && result.answer) {
      const memoryResult = await saveUserMemory(
        env,
        userId,
        originalQuestion,
      );

      memoryStatus = {
        bindingConfigured: !!env.MEMORY,
        userIdReceived: true,
        saved: memoryResult.saved,
        error: memoryResult.error,
      };
    }

    return Response.json({
      success: true,
      ...result,
      memoryStatus,
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

async function handleWhatsAppWebhook(
  request: Request,
  env: Env,
): Promise<Response> {
  if (request.method === "GET") {
    const url = new URL(request.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (
      mode === "subscribe" &&
      token &&
      token === env.WHATSAPP_VERIFY_TOKEN &&
      challenge
    ) {
      return new Response(challenge, { status: 200 });
    }

    return new Response("Vérification WhatsApp refusée.", { status: 403 });
  }

  if (request.method !== "POST") {
    return Response.json({ error: "Méthode non autorisée." }, { status: 405 });
  }

  if (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
    return Response.json(
      { error: "Configuration WhatsApp incomplète." },
      { status: 500 },
    );
  }

  let payload: any;

  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "JSON invalide." }, { status: 400 });
  }

  for (const entry of payload?.entry ?? []) {
    for (const change of entry?.changes ?? []) {
      for (const status of change?.value?.statuses ?? []) {
        console.log("Statut de livraison WhatsApp :", {
          status: status.status,
          recipient: status.recipient_id,
          messageId: status.id,
          errors: status.errors?.map((error: any) => ({
            code: error.code,
            title: error.title,
            details: error.message,
          })) ?? [],
        });
      }
    }
  }

  for (const entry of payload?.entry ?? []) {
    for (const change of entry?.changes ?? []) {
      for (const message of change?.value?.messages ?? []) {
        if (
          message?.type !== "text" ||
          !message?.from ||
          typeof message?.text?.body !== "string"
        ) {
          continue;
        }

        try {
          const chatResponse = await handleChat(
            new Request("https://internal.local/api/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: "text",
                content: message.text.body,
                userId: message.from,
                language: "fr",
                sessionId: "whatsapp-" + message.from,
              }),
            }),
            env,
          );

          const chatData: any = await chatResponse.json();

          if (!chatResponse.ok || chatData?.success === false) {
            throw new Error(
              chatData?.error || "Le moteur IA n'a pas répondu.",
            );
          }

          const answer =
            chatData?.answer ??
            chatData?.response ??
            chatData?.message;

          const replyText =
            typeof answer === "string"
              ? answer
              : answer != null
                ? JSON.stringify(answer)
                : "Désolé, je n'ai pas pu préparer une réponse.";

          const sendResponse = await fetch(
            "https://graph.facebook.com/v23.0/" +
              env.WHATSAPP_PHONE_NUMBER_ID +
              "/messages",
            {
              method: "POST",
              headers: {
                Authorization: "Bearer " + env.WHATSAPP_ACCESS_TOKEN,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: message.from,
                type: "text",
                text: {
                  preview_url: false,
                  body: replyText.slice(0, 4000),
                },
              }),
            },
          );

          if (!sendResponse.ok) {
            const sendError = await sendResponse.text();

            console.error(
              "Erreur d'envoi WhatsApp (HTTP " +
                sendResponse.status +
                "):",
              sendError,
            );
          } else {
            const sendData = await sendResponse.json();

            console.log("Réponse WhatsApp envoyée.", {
              recipient: message.from,
              messageId: sendData?.messages?.[0]?.id ?? null,
            });
          }
        } catch (error) {
          console.error("Erreur de réponse WhatsApp:", error);
        }
      }
    }
  }

  return Response.json({ success: true, received: true });
}

async function handleRunwayVideo(
  request: Request,
  env: Env,
): Promise<Response> {
  if (!env.RUNWAY_API_KEY) {
    return Response.json(
      { error: "La clé Runway n'est pas configurée dans Cloudflare." },
      { status: 500 },
    );
  }

  const headers = {
    Authorization: "Bearer " + env.RUNWAY_API_KEY,
    "X-Runway-Version": "2024-11-06",
    "Content-Type": "application/json",
  };

  try {
    if (request.method === "POST") {
      const body = (await request.json()) as {
        prompt?: string;
      };

      const prompt = body.prompt?.trim();

      if (!prompt || prompt.length > 1000) {
        return Response.json(
          { error: "Saisissez une description de 1 à 1000 caractères." },
          { status: 400 },
        );
      }

      const response = await fetch(
        "https://api.dev.runwayml.com/v1/image_to_video",
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: "gen4.5",
            promptText: prompt,
            ratio: "1280:720",
            duration: 5,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        return Response.json(
          { error: "Runway n'a pas pu lancer la vidéo.", details: data },
          { status: response.status },
        );
      }

      return Response.json(data, { status: 202 });
    }

    if (request.method === "GET") {
      const taskId = new URL(request.url).searchParams.get("taskId");

      if (!taskId || !/^[a-zA-Z0-9_-]+$/.test(taskId)) {
        return Response.json(
          { error: "Identifiant de tâche invalide." },
          { status: 400 },
        );
      }

      const response = await fetch(
        "https://api.dev.runwayml.com/v1/tasks/" +
          encodeURIComponent(taskId),
        { headers },
      );

      const data = await response.json();

      return Response.json(data, { status: response.status });
    }

    return Response.json(
      { error: "Utilisez POST ou GET." },
      { status: 405 },
    );
  } catch {
    return Response.json(
      { error: "Impossible de contacter Runway pour le moment." },
      { status: 502 },
    );
  }
}

export default {
  async fetch(r
