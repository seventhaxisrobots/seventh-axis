import { initSite } from "../site/site.ts";
import { bindForm } from "../site/forms.ts";
import "../styles/landing.css";

initSite();

const form = document.querySelector<HTMLFormElement>("[data-waitlist]");

if (form) {
  bindForm({
    form,
    endpoint: "/api/waitlist",
    required: {
      name: "Please enter your name.",
      email: "Please enter a valid work email.",
      consent: "Please tick the box so we can contact you.",
    },
    payload: (data) => ({
      name: String(data.get("name") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      company: String(data.get("company") ?? "").trim(),
      consent: data.get("consent") === "on",
      website: String(data.get("website") ?? ""),
    }),
    onSuccess: (res) => {
      const panel = document.createElement("div");
      panel.className = "pilot__done";
      panel.tabIndex = -1;
      panel.innerHTML = "<h3>You're on the list.</h3><p></p>";
      panel.querySelector("p")!.textContent = res.duplicate
        ? "We already had your details. We'll be in touch."
        : "Thank you. We'll email you about the pilot soon.";
      form.replaceWith(panel);
      panel.focus();
    },
  });
}
