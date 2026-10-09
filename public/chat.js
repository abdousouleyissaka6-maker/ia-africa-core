const message = document.getElementById("message");
const send = document.getElementById("send");
const answer = document.getElementById("answer");

send.addEventListener("click", async () => {
const content = message.value.trim();

if (!content) {
answer.textContent = "Écrivez d'abord votre demande.";
return;
}

// Effacer le champ immédiatement après la récupération du message
message.value = "";

send.disabled = true;
send.textContent = "IA AFRICA réfléchit...";
answer.textContent = "🧠 IA AFRICA CORE analyse votre demande...";

try {
const response = await fetch("/api/chat", {
method: "POST",
headers: {
"Content-Type": "application/json"
},
body: JSON.stringify({
type: "text",
content: content,
language: "fr"
})
});

const data = await response.json();

if (!response.ok || !data.success) {
  throw new Error(
    data.error || "IA AFRICA CORE n'a pas pu traiter la demande."
  );
}

answer.textContent = data.answer || "Aucune réponse générée.";

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
