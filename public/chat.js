const message = document.getElementById("message");
const send = document.getElementById("send");
const answer = document.getElementById("answer");

const MEMORY_KEY = "ia_africa_core_conversation";
const MAX_HISTORY = 10;

let history = [];

try {
const savedHistory = sessionStorage.getItem(MEMORY_KEY);
if (savedHistory) {
const parsed = JSON.parse(savedHistory);
if (Array.isArray(parsed)) {
history = parsed.slice(-MAX_HISTORY);
}
}
} catch {
history = [];
}

send.addEventListener("click", async () => {
const content = message.value.trim();

if (!content) {
answer.textContent = "Écrivez d'abord votre demande.";
return;
}

message.value = "";
send.disabled = true;
send.textContent = "IA AFRICA réfléchit...";
answer.textContent = "🧠 IA AFRICA CORE analyse votre demande...";

try {
const context = history
.map((item) => {
return (item.role === "user" ? "Utilisateur" : "IA AFRICA CORE")
+ " : " + item.content;
})
.join("\n\n");

const contextualMessage = context
  ? "HISTORIQUE DE LA CONVERSATION :\n"
    + context
    + "\n\nNOUVELLE QUESTION DE L'UTILISATEUR :\n"
    + content
  : content;

const response = await fetch("/api/chat", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    type: "text",
    content: contextualMessage,
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

history.push({ role: "user", content: content });
history.push({ role: "assistant", content: reply });
history = history.slice(-MAX_HISTORY);

try {
  sessionStorage.setItem(MEMORY_KEY, JSON.stringify(history));
} catch {
  // La conversation continue même si le navigateur ne peut pas sauvegarder.
}

answer.textContent = reply;

} catch (error) {
answer.textContent =
error instanceof Error
? "⚠️ " + error.message
: "⚠️ Erreur de connexion avec IA AFRICA CORE.";

} finally {
send.disabled = false;
send.textContent = "Envoyer à IA AFRICA CORE";
}
});
