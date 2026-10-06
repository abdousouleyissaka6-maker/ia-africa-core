const message = document.getElementById("message");
const send = document.getElementById("send");
const answer = document.getElementById("answer");

send.addEventListener("click", async () => {
  const content = message.value.trim();

  if (!content) {
    answer.textContent = "Écrivez d'abord votre demande.";
    return;
  }

  send.disabled = true;
  send.textContent = "Traitement...";
  answer.textContent = "IA AFRICA réfléchit...";

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        type: "text",
        content: content
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.error || "Erreur lors de l'envoi."
      );
    }

    answer.textContent =
      data.answer || "Aucune réponse générée.";

  } catch (error) {
    answer.textContent =
      error instanceof Error
        ? error.message
        : "Erreur de connexion avec IA AFRICA CORE.";

  } finally {
    send.disabled = false;
    send.textContent = "Envoyer";
  }
});
