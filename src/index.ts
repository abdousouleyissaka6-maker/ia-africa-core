
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    const whatsapp = env as Env & {
      WHATSAPP_VERIFY_TOKEN?: string;
      WHATSAPP_ACCESS_TOKEN?: string;
      WHATSAPP_PHONE_NUMBER_ID?: string;
    };

    // 1. Vérification du webhook WhatsApp par Meta
    if (url.pathname === "/webhook" && request.method === "GET") {
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      if (
        mode === "subscribe" &&
        token === whatsapp.WHATSAPP_VERIFY_TOKEN &&
        challenge
      ) {
        return new Response(challenge, { status: 200 });
      }

      return new Response("Vérification refusée", { status: 403 });
    }

    // 2. Réception des messages WhatsApp
    if (url.pathname === "/webhook" && request.method === "POST") {
      if (
        !whatsapp.WHATSAPP_ACCESS_TOKEN ||
        !whatsapp.WHATSAPP_PHONE_NUMBER_ID
      ) {
        return Response.json(
          { error: "Configuration WhatsApp manquante." },
          { status: 500 },
        );
      }

      try {
        const data = await request.json() as {
          entry?: Array<{
            changes?: Array<{
              value?: {
                messages?: Array<{
                  from?: string;
                  type?: string;
                  text?: { body?: string };
                }>;
              };
            }>;
          }>;
        };

        const messages = (data.entry ?? []).flatMap(entry =>
          (entry.changes ?? []).flatMap(change =>
            change.value?.messages ?? [],
          ),
        );

        for (const msg of messages) {
          const from = msg.from;
          const text = msg.text?.body?.trim();

          if (msg.type !== "text" || !from || !text) continue;

          const chatRequest = new Request(
            new URL("/api/chat", url.origin),
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                message: text,
                userId: from,
                sessionId: from,
              }),
            },
          );

          const chat = await handleChat(chatRequest, env);
          if (!chat.ok) continue;

          const result = await chat.json() as {
            answer?: string;
            response?: string;
            message?: string;
          };

          const answer = (
            result.answer ?? result.response ?? result.message ?? ""
          ).trim();

          if (!answer) continue;

          await fetch(
            `https://graph.facebook.com/v23.0/${whatsapp.WHATSAPP_PHONE_NUMBER_ID}/messages`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${whatsapp.WHATSAPP_ACCESS_TOKEN}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                messaging_product: "whatsapp",
                to: from,
                type: "text",
                text: { body: answer },
              }),
            },
          );
        }

        return Response.json({ success: true });
      } catch {
        return Response.json(
          { error: "Erreur de traitement WhatsApp." },
          { status: 500 },
        );
      }
    }

    // 3. Accueil de IA AFRICA CORE
    if (request.method === "GET" && url.pathname === "/") {
      return env.ASSETS.fetch(request);
    }

    // 4. Chat de IA AFRICA CORE
    if (request.method === "POST" && url.pathname === "/api/chat") {
      return handleChat(request, env);
    }

    // 5. Routes disponibles
    return Response.json(
      {
        error: "Route introuvable.",
        routes: ["/", "/api/chat", "/webhook"],
      },
      { status: 404 },
    );
  },
};

