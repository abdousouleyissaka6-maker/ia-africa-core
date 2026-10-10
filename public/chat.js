const message = document.getElementById("message");
const send = document.getElementById("send");
const answer = document.getElementById("answer");

const HISTORY_KEY = "ia_africa_core_conversation";
const MAX_MESSAGES = 10;

function loadHistory() {
  try {
    const saved = sessionStorage.getItem(HISTORY_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(history) {
  try {
    sessionStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(history.slice(-MAX_MESSAGES))
    );
  } catch {
    // Le chat continue même si le stockage est indisponible.
  }
}

send.addEventListener("click", async () => {
  const content = message.value.trim();

  if (!content) {
    answer.textContent = "Écrivez d'abord votre demande.";
    return;
  }

  const history = loadHistory();

  const historyText = history.length
    ? history.map((item) =>
        (item.role === "user" ? "UTILISATEUR" : "IA AFRICA CORE") +
        " : " + item.content
      ).join("\n\n")
    : "";

  const contextualContent = historyText
    ? "HISTORIQUE DE LA CONVERSATION :\n" +
      historyText +
      "\n\nNOUVELLE QUESTION DE L'UTILISATEUR :\n" +
      content +
      "\n\nConsigne : réponds à la nouvelle question en tenant compte de l'historique. Ne répète pas automatiquement une ancienne réponse. Si l'utilisateur fait référence à un élément précédent, utilise le contexte fourni. Respecte précisément le nombre d'éléments demandé."
    : content;

  message.value = "";
  send.disabled = true;
  send.textContent = "IA AFRICA réfléchit...";
  answer.textContent =
    "IA AFRICA CORE analyse votre question et le contexte précédent...";

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        type: "text",
        content: contextualContent,
        language: "fr"
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.error || "IA AFRICA CORE n'a pas pu traiter la demande."
      );
    }

    const reply = data.answer || "Aucune réponse générée.";
    answer.textContent = reply;

    history.push({
      role: "user",
      content: content
    });

    history.push({
      role: "assistant",
      content: reply
    });

    saveHistory(history);

  } catch (error) {
    answer.textContent = error instanceof Error
      ? "Erreur : " + error.message
      : "Erreur de connexion avec IA AFRICA CORE.";

  } finally {
    send.disabled = false;
    send.textContent = "Envoyer à IA AFRICA CORE";
  }
});
